import "server-only";
import type { Precision } from "./types";

/**
 * Geocodage cote serveur via Nominatim (OpenStreetMap).
 *
 * Le script d'import Python geocode le fichier xlsx en masse ; ce module sert aux
 * ecritures qui arrivent apres l'import — fiche creee dans l'admin, proposition
 * publique, bouton « re-géocoder ».
 *
 * La politique d'usage de Nominatim impose un User-Agent identifiable et une
 * requete par seconde maximum : on serialise donc les appels.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "annuaire-piment-tn/1.0 (cartographie acteurs du piment, usage académique)";
const DELAI_MINIMAL_MS = 1100;

export type ResultatGeocodage = {
  lat: number;
  lng: number;
  precision: Precision;
  query: string;
  displayName: string;
};

type ReponseNominatim = {
  lat: string;
  lon: string;
  display_name: string;
  place_rank?: number;
};

function precisionDepuisRang(rang: number | undefined): Precision {
  const valeur = rang ?? 30;
  if (valeur >= 26) return "etablissement";
  if (valeur >= 16) return "localite";
  return "zone";
}

// Chaîne de promesses : chaque appel attend que le precedent ait laissé passer le delai.
let file: Promise<unknown> = Promise.resolve();

function aLaQueue<T>(tache: () => Promise<T>): Promise<T> {
  const resultat = file.then(tache, tache);
  file = resultat.then(
    () => new Promise((resoudre) => setTimeout(resoudre, DELAI_MINIMAL_MS)),
    () => new Promise((resoudre) => setTimeout(resoudre, DELAI_MINIMAL_MS)),
  );
  return resultat;
}

async function interroger(query: string): Promise<ResultatGeocodage | null> {
  const parametres = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "tn",
  });

  const reponse = await fetch(`${NOMINATIM}?${parametres}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!reponse.ok) throw new Error(`Nominatim a répondu ${reponse.status}`);

  const donnees = (await reponse.json()) as ReponseNominatim[];
  const premier = donnees[0];
  if (!premier) return null;

  return {
    lat: Number(Number(premier.lat).toFixed(6)),
    lng: Number(Number(premier.lon).toFixed(6)),
    precision: precisionDepuisRang(premier.place_rank),
    query,
    displayName: premier.display_name,
  };
}

/**
 * Essaie « nom, localisation » puis « localisation » seule.
 * Renvoie null si rien ne correspond ; ne leve jamais sur une panne reseau —
 * une fiche sans coordonnees reste une fiche valide, corrigeable dans l'admin.
 */
export async function geocoder(
  localisation: string,
  nom?: string,
): Promise<ResultatGeocodage | null> {
  const candidats = [
    nom && nom.length <= 90 ? `${nom}, ${localisation}, Tunisie` : null,
    `${localisation}, Tunisie`,
  ].filter((valeur): valeur is string => Boolean(valeur));

  for (const candidat of candidats) {
    try {
      const resultat = await aLaQueue(() => interroger(candidat));
      if (resultat) return resultat;
    } catch (erreur) {
      console.warn(`[geocode] échec pour « ${candidat} » :`, erreur);
    }
  }
  return null;
}
