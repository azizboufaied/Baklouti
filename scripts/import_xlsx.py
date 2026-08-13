#!/usr/bin/env python3
"""
Importe la cartographie des acteurs du piment (xlsx) et produit data/structures.seed.json.

Le fichier source liste une ligne par (etablissement x categorie) : CRRHAB et INRAT
apparaissent donc deux fois. On normalise en deux niveaux :

    structure  -> un etablissement, un point sur la carte
    activite   -> categorie / thematique / domaine / activite, plusieurs par structure

Le geocodage utilise Nominatim (OpenStreetMap). On essaie plusieurs requetes par
structure, de la plus precise (nom de l'etablissement) a la plus generique (ville),
et on retient le premier resultat. Les reponses sont mises en cache dans
scripts/.geocode-cache.json pour que les executions suivantes soient instantanees
et n'abusent pas du service public.

Usage:
    python scripts/import_xlsx.py <chemin/vers/cartographique.xlsx>
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(ROOT, "scripts", ".geocode-cache.json")
OUT_PATH = os.path.join(ROOT, "data", "structures.seed.json")

NOMINATIM = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "annuaire-piment-tn/1.0 (cartographie acteurs du piment, usage academique)"
RATE_LIMIT_SECONDS = 1.1  # politique d'usage Nominatim : 1 requete/seconde max

# Valeurs du fichier source qui signifient "vide".
EMPTY_VALUES = {"", "-", "non renseigne", "non renseigné", "n/a", "na"}

# Localisations sans point precis : acteurs a rayonnement national.
NATIONAL_LOCATIONS = {"tunisie", "national", "tout le pays"}

# Requetes de geocodage supplementaires, de la plus precise a la plus generique.
# La derniere entree de chaque liste doit etre une localite qui existe surement.
GEOCODE_HINTS: dict[str, list[str]] = {
    "chott mariem, sousse": [
        "Institut Supérieur Agronomique de Chott Mariem, Tunisie",
        "Chott Mariem, Sousse, Tunisie",
    ],
    "ariana, tunis": [
        "Institut National de la Recherche Agronomique de Tunisie, Ariana",
        "Ariana, Tunisie",
    ],
    "medenine": [
        "Institut des Régions Arides, Médenine, Tunisie",
        "Médenine, Tunisie",
    ],
    "faculte des sciences de tunis": [
        "Faculté des Sciences de Tunis, Tunisie",
        "Campus universitaire El Manar, Tunis, Tunisie",
        "Tunis, Tunisie",
    ],
    "ecole nationale d'ingenieurs de sfax": [
        "École Nationale d'Ingénieurs de Sfax, Tunisie",
        "Sfax, Tunisie",
    ],
    "haut institut de biotechnologie de sfax": [
        "Institut Supérieur de Biotechnologie de Sfax, Tunisie",
        "Sfax, Tunisie",
    ],
    "faculte de medecine dentaire de monastir": [
        "Faculté de Médecine Dentaire de Monastir, Tunisie",
        "Monastir, Tunisie",
    ],
    "megrine": [
        "Mégrine, Ben Arous, Tunisie",
        "Ben Arous, Tunisie",
    ],
    "tunis": ["Tunis, Tunisie"],
}

# Rang Nominatim -> precision affichee. Plus le place_rank est bas, plus c'est precis.
def precision_from_result(result: dict) -> str:
    try:
        rank = int(result.get("place_rank", 30))
    except (TypeError, ValueError):
        rank = 30
    if rank >= 26:
        return "etablissement"
    if rank >= 16:
        return "localite"
    return "zone"


def strip_accents(value: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFD", value) if unicodedata.category(ch) != "Mn"
    )


def norm_key(value: str) -> str:
    """Cle de comparaison : sans accents, minuscules, espaces normalises."""
    return re.sub(r"\s+", " ", strip_accents(value or "").lower()).strip()


def clean(value) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    if norm_key(text) in EMPTY_VALUES:
        return None
    return text or None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", strip_accents(value).lower()).strip("-")
    return slug[:60] or "structure"


def split_sigle(nom: str) -> tuple[str | None, str]:
    """'CRRHAB - Centre Regional...' -> ('CRRHAB', 'Centre Regional...')."""
    for sep in (" – ", " — ", " - "):
        if sep in nom:
            head, tail = nom.split(sep, 1)
            head, tail = head.strip(), tail.strip()
            # Un sigle : court, sans espace interne, majoritairement en majuscules.
            if head and len(head) <= 12 and " " not in head and head.upper() == head:
                return head, tail
            break
    return None, nom


def ville_from_localisation(localisation: str) -> str | None:
    """Derniere composante utile d'une localisation ('Chott Mariem, Sousse' -> 'Sousse')."""
    parts = [p.strip() for p in localisation.split(",") if p.strip()]
    return parts[-1] if parts else None


# --------------------------------------------------------------------------- geocodage

def load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, encoding="utf-8") as handle:
            return json.load(handle)
    return {}


def save_cache(cache: dict) -> None:
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, ensure_ascii=False, indent=2, sort_keys=True)


_last_call = 0.0


def nominatim(query: str, cache: dict) -> dict | None:
    """Un appel Nominatim, mis en cache et limite en debit."""
    global _last_call

    if query in cache:
        return cache[query]

    elapsed = time.monotonic() - _last_call
    if elapsed < RATE_LIMIT_SECONDS:
        time.sleep(RATE_LIMIT_SECONDS - elapsed)

    params = urllib.parse.urlencode(
        {"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "tn", "addressdetails": 1}
    )
    request = urllib.request.Request(
        f"{NOMINATIM}?{params}", headers={"User-Agent": USER_AGENT, "Accept-Language": "fr"}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except Exception as error:  # reseau coupe, 429, etc. -> on n'ecrit rien en cache
        print(f"    ! echec Nominatim ({error}) pour: {query}", file=sys.stderr)
        return None
    finally:
        _last_call = time.monotonic()

    result = payload[0] if payload else None
    cache[query] = result
    save_cache(cache)
    return result


def geocode(localisation: str, nom: str, cache: dict) -> dict | None:
    """Essaie plusieurs formulations, de la plus precise a la plus generique."""
    candidates: list[str] = []

    sigle, libelle = split_sigle(nom)
    if len(libelle) <= 90:
        candidates.append(f"{libelle}, {localisation}, Tunisie")
    candidates.extend(GEOCODE_HINTS.get(norm_key(localisation), []))
    candidates.append(f"{localisation}, Tunisie")

    seen: set[str] = set()
    for query in candidates:
        if query in seen:
            continue
        seen.add(query)
        result = nominatim(query, cache)
        if result:
            print(f"    -> {query}  ({result['lat']}, {result['lon']})")
            return {
                "lat": round(float(result["lat"]), 6),
                "lng": round(float(result["lon"]), 6),
                "precision": precision_from_result(result),
                "geocode_query": query,
                "geocode_display_name": result.get("display_name"),
            }
    return None


# --------------------------------------------------------------------------- import

def read_rows(path: str) -> list[dict]:
    workbook = openpyxl.load_workbook(path, data_only=True)
    sheet = workbook.worksheets[0]

    rows = list(sheet.iter_rows(values_only=True))
    header_index = next(
        (i for i, row in enumerate(rows) if norm_key(str(row[1] or "")) == "nom etablissement"),
        None,
    )
    if header_index is None:
        raise SystemExit("En-tete introuvable : aucune colonne 'Nom établissement'.")

    headers = [norm_key(str(cell or "")) for cell in rows[header_index]]
    column = {name: i for i, name in enumerate(headers) if name}

    required = ["nom etablissement", "categorie", "localisation"]
    missing = [name for name in required if name not in column]
    if missing:
        raise SystemExit(f"Colonnes manquantes dans le fichier source : {missing}")

    def cell(row, name):
        index = column.get(name)
        return clean(row[index]) if index is not None and index < len(row) else None

    records = []
    for row in rows[header_index + 1 :]:
        nom = cell(row, "nom etablissement")
        if not nom:
            continue
        records.append(
            {
                "nom": nom,
                "categorie": cell(row, "categorie") or "Non classé",
                "thematique": cell(row, "thematique"),
                "domaine": cell(row, "domaine"),
                "activite": cell(row, "activite"),
                "localisation": cell(row, "localisation") or "Tunisie",
                "contact": cell(row, "contact"),
            }
        )
    return records


def build(records: list[dict], cache: dict) -> list[dict]:
    structures: dict[str, dict] = {}
    order: list[str] = []

    for record in records:
        key = norm_key(record["nom"])
        if key not in structures:
            sigle, libelle = split_sigle(record["nom"])
            structures[key] = {
                "slug": slugify(sigle or libelle),
                "nom": record["nom"],
                "sigle": sigle,
                "libelle": libelle,
                "localisation": record["localisation"],
                "ville": ville_from_localisation(record["localisation"]),
                "contact": record["contact"],
                "national": norm_key(record["localisation"]) in NATIONAL_LOCATIONS,
                "lat": None,
                "lng": None,
                "precision": None,
                "geocode_query": None,
                "geocode_display_name": None,
                "activites": [],
            }
            order.append(key)

        structure = structures[key]
        activite = {
            "categorie": record["categorie"],
            "thematique": record["thematique"],
            "domaine": record["domaine"],
            "activite": record["activite"],
        }
        if activite not in structure["activites"]:
            structure["activites"].append(activite)
        if not structure["contact"] and record["contact"]:
            structure["contact"] = record["contact"]

    # Les slugs doivent rester uniques meme si deux sigles se ressemblent.
    used: set[str] = set()
    for key in order:
        structure = structures[key]
        slug, suffix = structure["slug"], 2
        while slug in used:
            slug = f"{structure['slug']}-{suffix}"
            suffix += 1
        used.add(slug)
        structure["slug"] = slug

    total = len(order)
    for index, key in enumerate(order, start=1):
        structure = structures[key]
        print(f"[{index}/{total}] {structure['nom']}")
        if structure["national"]:
            structure["precision"] = "national"
            print("    -> portee nationale, pas de point precis")
            continue

        located = geocode(structure["localisation"], structure["nom"], cache)
        if located:
            structure.update(located)
        else:
            structure["precision"] = "inconnue"
            print(f"    ! non geocode : {structure['localisation']}", file=sys.stderr)

    return [structures[key] for key in order]


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python scripts/import_xlsx.py <cartographique.xlsx>")

    source = sys.argv[1]
    records = read_rows(source)
    print(f"{len(records)} lignes lues depuis {os.path.basename(source)}\n")

    cache = load_cache()
    structures = build(records, cache)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": os.path.basename(source),
        "titre": "Cartographie des acteurs du piment en Tunisie",
        "structures": structures,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)

    located = sum(1 for s in structures if s["lat"] is not None)
    national = sum(1 for s in structures if s["national"])
    activites = sum(len(s["activites"]) for s in structures)
    categories = sorted({a["categorie"] for s in structures for a in s["activites"]})

    print(f"\n{len(structures)} structures / {activites} activites -> data/structures.seed.json")
    print(f"   {located} geolocalisees, {national} a portee nationale")
    print(f"   {len(categories)} categories : " + ", ".join(categories))


if __name__ == "__main__":
    main()
