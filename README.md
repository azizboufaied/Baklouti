# Baklouti

**Cartographie des acteurs du piment en Tunisie.**

Annuaire géolocalisé de la filière piment : centres de recherche, laboratoires,
semenciers et industriels. Carte interactive filtrable par catégorie, recherche
plein texte, fiches détaillées, back-office de gestion et formulaire de
proposition public.

Le projet porte le nom du *baklouti*, le cultivar de piment tunisien — la plante
que toute la filière cartographiée ici travaille, de la sélection variétale à la
harissa.

Inspiré de [GoGoCarto](https://gogocarto.fr), reconstruit sur une pile plus légère.

---

## Démarrage

```bash
npm install
npm run dev
```

L'application est sur <http://localhost:3000>. Aucune configuration n'est
nécessaire : au premier lancement, la base SQLite est créée et remplie
automatiquement depuis `data/structures.seed.json`.

L'administration est sur <http://localhost:3000/admin> — mot de passe `piment`
par défaut en local (voir [Configuration](#configuration)).

## Ce que contient l'annuaire

13 structures issues de `cartographique.xlsx`, dont 11 géolocalisées et 2 à
portée nationale, réparties en 5 catégories.

| Route | Rôle |
| --- | --- |
| `/` | Carte, légende filtrante, recherche, liste et fiches |
| `/proposer` | Formulaire public — la fiche part en modération |
| `/embed` | Carte sans habillage, pour intégration en iframe |
| `/admin` | Liste et édition des acteurs |
| `/admin/moderation` | File des propositions reçues |
| `/api/structures` | GeoJSON public, filtrable |
| `/api/export` | Téléchargement CSV ou GeoJSON des résultats filtrés |

## Pile technique

| Choix | Pourquoi |
| --- | --- |
| **Next.js 16** (App Router) | Un seul déployable : pages, API et mutations au même endroit. Pas de backend séparé à héberger. |
| **SQLite** via `node:sqlite` | Module intégré à Node : aucune dépendance native à compiler, aucun service à lancer. Transactions réelles, contrairement à un fichier JSON. |
| **Leaflet** (API directe) | Le regroupement de marqueurs est un greffon *vanilla* ; piloter Leaflet sans surcouche évite les décalages de version avec React. |
| **Zod** | Toute entrée — formulaire admin comme proposition publique — est validée côté serveur avant d'atteindre la base. |
| **Nominatim** (OpenStreetMap) | Géocodage gratuit et libre, sans clé d'API. |

### Modèle de données

Le fichier source liste une ligne par **établissement × catégorie** : CRRHAB et
INRAT y apparaissent deux fois. Les mettre à plat poserait deux marqueurs au même
endroit. Le schéma sépare donc :

```
structures  ─┬─ un établissement, un point sur la carte
             └─ activites : catégorie / thématique / domaine / activité (0..n)
```

Une structure remonte dans le filtre dès qu'**une** de ses activités correspond,
et sa fiche affiche tous ses axes d'intervention.

Les propositions publiques vivent dans la même table avec `statut = 'en_attente'` :
publier une proposition est un simple changement de statut, sans recopie de données.

### Précision du géocodage

Toutes les adresses ne se valent pas. Chaque fiche porte une `precision` —
`etablissement`, `localite`, `zone`, `national` ou `inconnue` — affichée dans le
panneau de détail et exportée. Un laboratoire géocodé au centre-ville de Sfax est
signalé comme tel plutôt que présenté comme une position exacte.

Les acteurs sans adresse ponctuelle (`Localisation = "Tunisie"`) sont marqués
`national` : ils sont listés hors carte au lieu d'être épinglés à un point arbitraire.

## Configuration

Copiez `.env.local.example` en `.env.local`. Tout est facultatif en local.

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `ADMIN_PASSWORD` | `piment` | Mot de passe de l'administration. **Obligatoire avant toute mise en ligne** — un bandeau d'avertissement s'affiche tant qu'il n'est pas défini. |
| `SESSION_SECRET` | dérivé du mot de passe | Signature des cookies de session. Par défaut, changer le mot de passe invalide les sessions ouvertes. |
| `DATABASE_PATH` | `data/annuaire.db` | Emplacement du fichier SQLite. |

## Mettre à jour les données

Le script d'import relit le tableur, normalise les lignes, géocode les
localisations et régénère `data/structures.seed.json` :

```bash
npm run import -- chemin/vers/cartographique.xlsx
```

Il respecte la politique d'usage de Nominatim (une requête par seconde, en-tête
`User-Agent` identifiable) et met les réponses en cache dans
`scripts/.geocode-cache.json` : les exécutions suivantes sont instantanées.

Le fichier généré ne sert qu'à **initialiser** une base vide. Pour repartir des
données du tableur en écrasant les modifications faites dans l'admin :

```bash
npm run db:reset
npm run dev
```

## Vérifications

```bash
npm run lint
npm run typecheck
npm run build
```

## Intégrer la carte ailleurs

Le menu **Exporter** de la carte génère le code prêt à coller. Les filtres actifs
sont conservés dans l'URL :

```html
<iframe src="https://votre-domaine/embed?categorie=Industrie%20%26%20Transformation"
        width="100%" height="480" style="border:0" loading="lazy"
        title="Cartographie des acteurs du piment en Tunisie"></iframe>
```

## Passer à PostgreSQL/PostGIS

Utile si le volume grossit franchement ou si des requêtes spatiales deviennent
nécessaires (« tous les acteurs dans un rayon de 50 km »). Seuls `lib/db.ts` et
`lib/repo.ts` accèdent aux données : le reste de l'application ne connaît que les
types de `lib/types.ts`. Remplacer ces deux fichiers suffit.

## Crédits

Fonds de carte et géocodage : [OpenStreetMap](https://www.openstreetmap.org/copyright)
et ses contributeurs (licence ODbL). L'attribution affichée sur la carte est
obligatoire — ne pas la retirer.
