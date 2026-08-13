/** Precision du geocodage, du plus fin au plus flou. */
export type Precision = "etablissement" | "localite" | "zone" | "national" | "inconnue";

/** Cycle de vie d'une fiche : les propositions publiques arrivent en `en_attente`. */
export type Statut = "publie" | "en_attente" | "rejete";

/** Origine de la fiche : import du xlsx, saisie admin, ou proposition publique. */
export type Source = "import" | "admin" | "proposition";

export type Activite = {
  id: number;
  structureId: number;
  categorie: string;
  thematique: string | null;
  domaine: string | null;
  activite: string | null;
};

export type Structure = {
  id: number;
  slug: string;
  nom: string;
  sigle: string | null;
  libelle: string;
  localisation: string;
  ville: string | null;
  contact: string | null;
  siteWeb: string | null;
  lat: number | null;
  lng: number | null;
  precision: Precision;
  national: boolean;
  geocodeQuery: string | null;
  geocodeDisplayName: string | null;
  statut: Statut;
  source: Source;
  proposantNom: string | null;
  proposantEmail: string | null;
  noteProposition: string | null;
  createdAt: string;
  updatedAt: string;
  activites: Activite[];
};

/** Filtres appliques a la carte et a l'annuaire. */
export type StructureFilters = {
  categories?: string[];
  recherche?: string;
  statut?: Statut;
};
