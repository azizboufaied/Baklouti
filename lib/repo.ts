import "server-only";
import type postgres from "postgres";
import { sql } from "./db";
import type { Activite, Precision, Source, Statut, Structure, StructureFilters } from "./types";
import type { ActiviteInput, StructureInput } from "./schemas";

/**
 * Seul module qui écrit du SQL. Les pages et routes consomment uniquement les
 * types de `lib/types.ts` : changer de base ne touche que `db.ts` et ce fichier.
 */

type LigneStructure = {
  id: string | number;
  slug: string;
  nom: string;
  sigle: string | null;
  libelle: string;
  localisation: string;
  ville: string | null;
  contact: string | null;
  site_web: string | null;
  lat: number | null;
  lng: number | null;
  precision_geo: string;
  national: boolean;
  geocode_query: string | null;
  geocode_display_name: string | null;
  statut: string;
  source: string;
  proposant_nom: string | null;
  proposant_email: string | null;
  note_proposition: string | null;
  created_at: Date;
  updated_at: Date;
};

type LigneActivite = {
  id: string | number;
  structure_id: string | number;
  categorie: string;
  thematique: string | null;
  domaine: string | null;
  activite: string | null;
};

function versActivite(ligne: LigneActivite): Activite {
  return {
    id: Number(ligne.id),
    structureId: Number(ligne.structure_id),
    categorie: ligne.categorie,
    thematique: ligne.thematique,
    domaine: ligne.domaine,
    activite: ligne.activite,
  };
}

function versStructure(ligne: LigneStructure, activites: Activite[]): Structure {
  return {
    id: Number(ligne.id),
    slug: ligne.slug,
    nom: ligne.nom,
    sigle: ligne.sigle,
    libelle: ligne.libelle,
    localisation: ligne.localisation,
    ville: ligne.ville,
    contact: ligne.contact,
    siteWeb: ligne.site_web,
    lat: ligne.lat,
    lng: ligne.lng,
    precision: ligne.precision_geo as Precision,
    national: ligne.national,
    geocodeQuery: ligne.geocode_query,
    geocodeDisplayName: ligne.geocode_display_name,
    statut: ligne.statut as Statut,
    source: ligne.source as Source,
    proposantNom: ligne.proposant_nom,
    proposantEmail: ligne.proposant_email,
    noteProposition: ligne.note_proposition,
    // Sérialisable tel quel vers les composants client, contrairement à un Date.
    createdAt: ligne.created_at.toISOString(),
    updatedAt: ligne.updated_at.toISOString(),
    activites,
  };
}

/** Charge les activités de plusieurs structures en une requête (évite le N+1). */
async function activitesPar(structureIds: number[]): Promise<Map<number, Activite[]>> {
  const groupes = new Map<number, Activite[]>();
  if (structureIds.length === 0) return groupes;

  const lignes = (await sql`
    SELECT id, structure_id, categorie, thematique, domaine, activite
      FROM activites
     WHERE structure_id = ANY(${structureIds})
     ORDER BY structure_id, position, id
  `) as unknown as LigneActivite[];

  for (const ligne of lignes) {
    const cle = Number(ligne.structure_id);
    const liste = groupes.get(cle) ?? [];
    liste.push(versActivite(ligne));
    groupes.set(cle, liste);
  }
  return groupes;
}

async function assembler(lignes: LigneStructure[]): Promise<Structure[]> {
  const groupes = await activitesPar(lignes.map((ligne) => Number(ligne.id)));
  return lignes.map((ligne) => versStructure(ligne, groupes.get(Number(ligne.id)) ?? []));
}

export async function listerStructures(filtres: StructureFilters = {}): Promise<Structure[]> {
  const { categories, recherche, statut = "publie" } = filtres;

  const filtreCategories =
    categories && categories.length > 0
      ? sql`AND EXISTS (
              SELECT 1 FROM activites a
               WHERE a.structure_id = s.id AND a.categorie = ANY(${categories})
            )`
      : sql``;

  const terme = recherche?.trim();
  const filtreRecherche = terme
    ? sql`AND (
            s.nom ILIKE ${"%" + terme + "%"}
         OR s.localisation ILIKE ${"%" + terme + "%"}
         OR s.ville ILIKE ${"%" + terme + "%"}
         OR EXISTS (
              SELECT 1 FROM activites a
               WHERE a.structure_id = s.id
                 AND (a.categorie   ILIKE ${"%" + terme + "%"}
                   OR a.thematique  ILIKE ${"%" + terme + "%"}
                   OR a.domaine     ILIKE ${"%" + terme + "%"}
                   OR a.activite    ILIKE ${"%" + terme + "%"})
            )
          )`
    : sql``;

  const lignes = (await sql`
    SELECT * FROM structures s
     WHERE s.statut = ${statut}
       ${filtreCategories}
       ${filtreRecherche}
     ORDER BY s.national ASC, s.nom ASC
  `) as unknown as LigneStructure[];

  return assembler(lignes);
}

export async function compterParStatut(): Promise<Record<Statut, number>> {
  const lignes = (await sql`
    SELECT statut, COUNT(*)::int AS total FROM structures GROUP BY statut
  `) as unknown as { statut: string; total: number }[];

  const compteurs: Record<Statut, number> = { publie: 0, en_attente: 0, rejete: 0 };
  for (const ligne of lignes) compteurs[ligne.statut as Statut] = ligne.total;
  return compteurs;
}

export async function obtenirStructure(id: number): Promise<Structure | null> {
  const lignes = (await sql`
    SELECT * FROM structures WHERE id = ${id}
  `) as unknown as LigneStructure[];

  if (lignes.length === 0) return null;
  return (await assembler(lignes))[0];
}

export async function obtenirStructureParSlug(slug: string): Promise<Structure | null> {
  const lignes = (await sql`
    SELECT * FROM structures WHERE slug = ${slug}
  `) as unknown as LigneStructure[];

  if (lignes.length === 0) return null;
  return (await assembler(lignes))[0];
}

/** Toutes les catégories publiées, avec le nombre de structures concernées. */
export async function listerCategories(): Promise<{ categorie: string; total: number }[]> {
  const lignes = (await sql`
    SELECT a.categorie AS categorie, COUNT(DISTINCT s.id)::int AS total
      FROM activites a
      JOIN structures s ON s.id = a.structure_id
     WHERE s.statut = 'publie'
     GROUP BY a.categorie
     ORDER BY total DESC, a.categorie ASC
  `) as unknown as { categorie: string; total: number }[];

  return lignes.map((ligne) => ({ categorie: ligne.categorie, total: ligne.total }));
}

// ------------------------------------------------------------------- écriture

function decouperSigle(nom: string): { sigle: string | null; libelle: string } {
  for (const separateur of [" – ", " — ", " - "]) {
    const index = nom.indexOf(separateur);
    if (index > 0) {
      const tete = nom.slice(0, index).trim();
      const reste = nom.slice(index + separateur.length).trim();
      if (tete && tete.length <= 12 && !tete.includes(" ") && tete === tete.toUpperCase()) {
        return { sigle: tete, libelle: reste };
      }
      break;
    }
  }
  return { sigle: null, libelle: nom };
}

function slugifier(valeur: string): string {
  return (
    valeur
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "structure"
  );
}

async function slugUnique(base: string, exclureId?: number): Promise<string> {
  const pris = (await sql`
    SELECT slug FROM structures
     WHERE slug LIKE ${base + "%"} ${exclureId ? sql`AND id <> ${exclureId}` : sql``}
  `) as unknown as { slug: string }[];

  const occupes = new Set(pris.map((ligne) => ligne.slug));
  if (!occupes.has(base)) return base;

  let suffixe = 2;
  while (occupes.has(`${base}-${suffixe}`)) suffixe++;
  return `${base}-${suffixe}`;
}

type Transaction = postgres.TransactionSql;

async function remplacerActivites(
  tx: Transaction,
  structureId: number,
  activites: ActiviteInput[],
): Promise<void> {
  await tx`DELETE FROM activites WHERE structure_id = ${structureId}`;

  if (activites.length === 0) return;

  await tx`
    INSERT INTO activites ${tx(
      activites.map((activite, index) => ({
        structure_id: structureId,
        categorie: activite.categorie,
        thematique: activite.thematique,
        domaine: activite.domaine,
        activite: activite.activite,
        position: index,
      })),
    )}
  `;
}

/** Précision déduite quand les coordonnées sont saisies ou géocodées. */
function precisionPour(donnees: {
  national: boolean;
  lat: number | null;
  lng: number | null;
  precision?: Precision;
}): Precision {
  if (donnees.national) return "national";
  if (donnees.lat === null || donnees.lng === null) return "inconnue";
  return donnees.precision ?? "etablissement";
}

type DonneesCreation = StructureInput & {
  statut?: Statut;
  source?: Source;
  precision?: Precision;
  geocodeQuery?: string | null;
  geocodeDisplayName?: string | null;
  proposantNom?: string | null;
  proposantEmail?: string | null;
  noteProposition?: string | null;
};

export async function creerStructure(donnees: DonneesCreation): Promise<Structure> {
  const { sigle, libelle } = decouperSigle(donnees.nom);
  const slug = await slugUnique(slugifier(sigle ?? libelle));

  const id = await sql.begin(async (tx) => {
    const [ligne] = (await tx`
      INSERT INTO structures (
        slug, nom, sigle, libelle, localisation, ville, contact, site_web,
        lat, lng, precision_geo, national, geocode_query, geocode_display_name,
        statut, source, proposant_nom, proposant_email, note_proposition
      ) VALUES (
        ${slug}, ${donnees.nom}, ${sigle}, ${libelle}, ${donnees.localisation},
        ${donnees.ville}, ${donnees.contact}, ${donnees.siteWeb},
        ${donnees.lat}, ${donnees.lng}, ${precisionPour(donnees)}, ${donnees.national},
        ${donnees.geocodeQuery ?? null}, ${donnees.geocodeDisplayName ?? null},
        ${donnees.statut ?? "publie"}, ${donnees.source ?? "admin"},
        ${donnees.proposantNom ?? null}, ${donnees.proposantEmail ?? null},
        ${donnees.noteProposition ?? null}
      )
      RETURNING id
    `) as unknown as { id: string | number }[];

    const identifiant = Number(ligne.id);
    await remplacerActivites(tx, identifiant, donnees.activites);
    return identifiant;
  });

  return (await obtenirStructure(id))!;
}

type DonneesModification = StructureInput & {
  precision?: Precision;
  geocodeQuery?: string | null;
  geocodeDisplayName?: string | null;
};

export async function modifierStructure(
  id: number,
  donnees: DonneesModification,
): Promise<Structure | null> {
  const existante = await obtenirStructure(id);
  if (!existante) return null;

  const { sigle, libelle } = decouperSigle(donnees.nom);
  const slug =
    existante.nom === donnees.nom
      ? existante.slug
      : await slugUnique(slugifier(sigle ?? libelle), id);

  await sql.begin(async (tx) => {
    await tx`
      UPDATE structures SET
        slug = ${slug}, nom = ${donnees.nom}, sigle = ${sigle}, libelle = ${libelle},
        localisation = ${donnees.localisation}, ville = ${donnees.ville},
        contact = ${donnees.contact}, site_web = ${donnees.siteWeb},
        lat = ${donnees.lat}, lng = ${donnees.lng},
        precision_geo = ${precisionPour({
          ...donnees,
          precision: donnees.precision ?? existante.precision,
        })},
        national = ${donnees.national},
        geocode_query = ${donnees.geocodeQuery ?? existante.geocodeQuery},
        geocode_display_name = ${donnees.geocodeDisplayName ?? existante.geocodeDisplayName},
        updated_at = now()
      WHERE id = ${id}
    `;
    await remplacerActivites(tx, id, donnees.activites);
  });

  return obtenirStructure(id);
}

export async function changerStatut(id: number, statut: Statut): Promise<Structure | null> {
  const lignes = (await sql`
    UPDATE structures SET statut = ${statut}, updated_at = now()
     WHERE id = ${id}
     RETURNING id
  `) as unknown as { id: string | number }[];

  return lignes.length > 0 ? obtenirStructure(id) : null;
}

export async function supprimerStructure(id: number): Promise<boolean> {
  const lignes = (await sql`
    DELETE FROM structures WHERE id = ${id} RETURNING id
  `) as unknown as { id: string | number }[];

  return lignes.length > 0;
}

/** Applique des coordonnées issues du géocodage serveur. */
export async function appliquerGeocodage(
  id: number,
  resultat: { lat: number; lng: number; precision: Precision; query: string; displayName: string },
): Promise<Structure | null> {
  const lignes = (await sql`
    UPDATE structures SET
      lat = ${resultat.lat}, lng = ${resultat.lng},
      precision_geo = ${resultat.precision},
      geocode_query = ${resultat.query},
      geocode_display_name = ${resultat.displayName},
      updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `) as unknown as { id: string | number }[];

  return lignes.length > 0 ? obtenirStructure(id) : null;
}
