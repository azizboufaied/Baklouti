import type { Structure } from "./types";

/**
 * Conversions vers les formats d'export. GeoJSON est le format d'echange
 * standard des SIG (QGIS, Leaflet, PostGIS) ; le CSV sert aux tableurs.
 */

export type StructureFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: {
    id: number;
    slug: string;
    nom: string;
    sigle: string | null;
    localisation: string;
    ville: string | null;
    contact: string | null;
    siteWeb: string | null;
    precision: string;
    national: boolean;
    categories: string[];
    activites: {
      categorie: string;
      thematique: string | null;
      domaine: string | null;
      activite: string | null;
    }[];
  };
};

export function versFeature(structure: Structure): StructureFeature {
  return {
    type: "Feature",
    // GeoJSON impose l'ordre [longitude, latitude].
    geometry:
      structure.lat !== null && structure.lng !== null
        ? { type: "Point", coordinates: [structure.lng, structure.lat] }
        : null,
    properties: {
      id: structure.id,
      slug: structure.slug,
      nom: structure.nom,
      sigle: structure.sigle,
      localisation: structure.localisation,
      ville: structure.ville,
      contact: structure.contact,
      siteWeb: structure.siteWeb,
      precision: structure.precision,
      national: structure.national,
      categories: [...new Set(structure.activites.map((a) => a.categorie))],
      activites: structure.activites.map(({ categorie, thematique, domaine, activite }) => ({
        categorie,
        thematique,
        domaine,
        activite,
      })),
    },
  };
}

export function versFeatureCollection(structures: Structure[]) {
  return {
    type: "FeatureCollection" as const,
    features: structures.map(versFeature),
  };
}

const COLONNES_CSV = [
  "nom",
  "sigle",
  "categories",
  "thematiques",
  "domaines",
  "activites",
  "localisation",
  "ville",
  "latitude",
  "longitude",
  "precision",
  "portee_nationale",
  "contact",
  "site_web",
] as const;

function echapper(valeur: string | number | null): string {
  if (valeur === null) return "";
  const texte = String(valeur);
  return /[",;\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

function joindre(valeurs: (string | null)[]): string {
  return [...new Set(valeurs.filter((v): v is string => Boolean(v)))].join(" | ");
}

/**
 * CSV separe par des points-virgules et prefixé d'un BOM : c'est ce qu'attend
 * Excel en locale francaise, sinon les accents et les colonnes sont cassés.
 */
export function versCsv(structures: Structure[]): string {
  const lignes = [COLONNES_CSV.join(";")];

  for (const structure of structures) {
    lignes.push(
      [
        structure.nom,
        structure.sigle,
        joindre(structure.activites.map((a) => a.categorie)),
        joindre(structure.activites.map((a) => a.thematique)),
        joindre(structure.activites.map((a) => a.domaine)),
        joindre(structure.activites.map((a) => a.activite)),
        structure.localisation,
        structure.ville,
        structure.lat,
        structure.lng,
        structure.precision,
        structure.national ? "oui" : "non",
        structure.contact,
        structure.siteWeb,
      ]
        .map(echapper)
        .join(";"),
    );
  }

  return "﻿" + lignes.join("\r\n") + "\r\n";
}
