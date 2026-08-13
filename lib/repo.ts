import "server-only";
import { db } from "./db";
import type { Activite, Precision, Source, Statut, Structure, StructureFilters } from "./types";
import type { ActiviteInput, StructureInput } from "./schemas";

/**
 * Seul module qui écrit du SQL. Les pages et routes consomment uniquement
 * les types de `lib/types.ts`, ce qui rend le passage a Postgres/PostGIS local.
 */

type LigneStructure = {
  id: number;
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
  precision: string;
  national: number;
  geocode_query: string | null;
  geocode_display_name: string | null;
  statut: string;
  source: string;
  proposant_nom: string | null;
  proposant_email: string | null;
  note_proposition: string | null;
  created_at: string;
  updated_at: string;
};

type LigneActivite = {
  id: number;
  structure_id: number;
  categorie: string;
  thematique: string | null;
  domaine: string | null;
  activite: string | null;
};

function versActivite(ligne: LigneActivite): Activite {
  return {
    id: ligne.id,
    structureId: ligne.structure_id,
    categorie: ligne.categorie,
    thematique: ligne.thematique,
    domaine: ligne.domaine,
    activite: ligne.activite,
  };
}

function versStructure(ligne: LigneStructure, activites: Activite[]): Structure {
  return {
    id: ligne.id,
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
    precision: ligne.precision as Precision,
    national: ligne.national === 1,
    geocodeQuery: ligne.geocode_query,
    geocodeDisplayName: ligne.geocode_display_name,
    statut: ligne.statut as Statut,
    source: ligne.source as Source,
    proposantNom: ligne.proposant_nom,
    proposantEmail: ligne.proposant_email,
    noteProposition: ligne.note_proposition,
    createdAt: ligne.created_at,
    updatedAt: ligne.updated_at,
    activites,
  };
}

/** Charge les activites de plusieurs structures en une requete (evite le N+1). */
function activitesPar(structureIds: number[]): Map<number, Activite[]> {
  const groupes = new Map<number, Activite[]>();
  if (structureIds.length === 0) return groupes;

  const trous = structureIds.map(() => "?").join(", ");
  const lignes = db
    .prepare(
      `SELECT id, structure_id, categorie, thematique, domaine, activite
         FROM activites
        WHERE structure_id IN (${trous})
        ORDER BY structure_id, position, id`,
    )
    .all(...structureIds) as LigneActivite[];

  for (const ligne of lignes) {
    const liste = groupes.get(ligne.structure_id) ?? [];
    liste.push(versActivite(ligne));
    groupes.set(ligne.structure_id, liste);
  }
  return groupes;
}

export function listerStructures(filtres: StructureFilters = {}): Structure[] {
  const { categories, recherche, statut = "publie" } = filtres;

  const conditions: string[] = ["s.statut = ?"];
  const parametres: (string | number)[] = [statut];

  if (categories?.length) {
    const trous = categories.map(() => "?").join(", ");
    conditions.push(
      `EXISTS (SELECT 1 FROM activites a WHERE a.structure_id = s.id AND a.categorie IN (${trous}))`,
    );
    parametres.push(...categories);
  }

  if (recherche?.trim()) {
    const motif = `%${recherche.trim()}%`;
    conditions.push(`(
      s.nom LIKE ? OR s.localisation LIKE ? OR s.ville LIKE ?
      OR EXISTS (
        SELECT 1 FROM activites a
         WHERE a.structure_id = s.id
           AND (a.categorie LIKE ? OR a.thematique LIKE ? OR a.domaine LIKE ? OR a.activite LIKE ?)
      )
    )`);
    parametres.push(motif, motif, motif, motif, motif, motif, motif);
  }

  const lignes = db
    .prepare(
      `SELECT s.* FROM structures s
        WHERE ${conditions.join(" AND ")}
        ORDER BY s.national ASC, s.nom COLLATE NOCASE ASC`,
    )
    .all(...parametres) as LigneStructure[];

  const groupes = activitesPar(lignes.map((ligne) => ligne.id));
  return lignes.map((ligne) => versStructure(ligne, groupes.get(ligne.id) ?? []));
}

export function compterParStatut(): Record<Statut, number> {
  const lignes = db
    .prepare("SELECT statut, COUNT(*) AS total FROM structures GROUP BY statut")
    .all() as { statut: string; total: number }[];

  const compteurs: Record<Statut, number> = { publie: 0, en_attente: 0, rejete: 0 };
  for (const ligne of lignes) compteurs[ligne.statut as Statut] = ligne.total;
  return compteurs;
}

export function obtenirStructure(id: number): Structure | null {
  const ligne = db.prepare("SELECT * FROM structures WHERE id = ?").get(id) as
    | LigneStructure
    | undefined;
  if (!ligne) return null;
  return versStructure(ligne, activitesPar([ligne.id]).get(ligne.id) ?? []);
}

export function obtenirStructureParSlug(slug: string): Structure | null {
  const ligne = db.prepare("SELECT * FROM structures WHERE slug = ?").get(slug) as
    | LigneStructure
    | undefined;
  if (!ligne) return null;
  return versStructure(ligne, activitesPar([ligne.id]).get(ligne.id) ?? []);
}

/** Toutes les categories publiees, avec le nombre de structures concernees. */
export function listerCategories(): { categorie: string; total: number }[] {
  const lignes = db
    .prepare(
      `SELECT a.categorie AS categorie, COUNT(DISTINCT s.id) AS total
         FROM activites a
         JOIN structures s ON s.id = a.structure_id
        WHERE s.statut = 'publie'
        GROUP BY a.categorie
        ORDER BY total DESC, a.categorie COLLATE NOCASE ASC`,
    )
    .all() as { categorie: string; total: number }[];

  // `node:sqlite` renvoie des objets a prototype nul : React refuse de les
  // transmettre aux composants client. On recopie en objets simples.
  return lignes.map((ligne) => ({ categorie: ligne.categorie, total: ligne.total }));
}

// ------------------------------------------------------------------- ecriture

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

function slugUnique(base: string, exclureId?: number): string {
  const requete = db.prepare("SELECT id FROM structures WHERE slug = ?");
  let slug = base;
  let suffixe = 2;
  for (;;) {
    const existant = requete.get(slug) as { id: number } | undefined;
    if (!existant || existant.id === exclureId) return slug;
    slug = `${base}-${suffixe++}`;
  }
}

function remplacerActivites(structureId: number, activites: ActiviteInput[]): void {
  db.prepare("DELETE FROM activites WHERE structure_id = ?").run(structureId);
  const insertion = db.prepare(
    `INSERT INTO activites (structure_id, categorie, thematique, domaine, activite, position)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  activites.forEach((activite, index) => {
    insertion.run(
      structureId,
      activite.categorie,
      activite.thematique,
      activite.domaine,
      activite.activite,
      index,
    );
  });
}

/** Precision deduite quand les coordonnees sont saisies ou geocodees. */
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

export function creerStructure(donnees: DonneesCreation): Structure {
  const { sigle, libelle } = decouperSigle(donnees.nom);
  const maintenant = new Date().toISOString();

  db.exec("BEGIN");
  try {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO structures (
           slug, nom, sigle, libelle, localisation, ville, contact, site_web,
           lat, lng, precision, national, geocode_query, geocode_display_name,
           statut, source, proposant_nom, proposant_email, note_proposition,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        slugUnique(slugifier(sigle ?? libelle)),
        donnees.nom,
        sigle,
        libelle,
        donnees.localisation,
        donnees.ville,
        donnees.contact,
        donnees.siteWeb,
        donnees.lat,
        donnees.lng,
        precisionPour(donnees),
        donnees.national ? 1 : 0,
        donnees.geocodeQuery ?? null,
        donnees.geocodeDisplayName ?? null,
        donnees.statut ?? "publie",
        donnees.source ?? "admin",
        donnees.proposantNom ?? null,
        donnees.proposantEmail ?? null,
        donnees.noteProposition ?? null,
        maintenant,
        maintenant,
      );

    const id = Number(lastInsertRowid);
    remplacerActivites(id, donnees.activites);
    db.exec("COMMIT");
    return obtenirStructure(id)!;
  } catch (erreur) {
    db.exec("ROLLBACK");
    throw erreur;
  }
}

type DonneesModification = StructureInput & {
  precision?: Precision;
  geocodeQuery?: string | null;
  geocodeDisplayName?: string | null;
};

export function modifierStructure(id: number, donnees: DonneesModification): Structure | null {
  const existante = obtenirStructure(id);
  if (!existante) return null;

  const { sigle, libelle } = decouperSigle(donnees.nom);
  const nomChange = existante.nom !== donnees.nom;

  db.exec("BEGIN");
  try {
    db.prepare(
      `UPDATE structures SET
         slug = ?, nom = ?, sigle = ?, libelle = ?, localisation = ?, ville = ?,
         contact = ?, site_web = ?, lat = ?, lng = ?, precision = ?, national = ?,
         geocode_query = ?, geocode_display_name = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      nomChange ? slugUnique(slugifier(sigle ?? libelle), id) : existante.slug,
      donnees.nom,
      sigle,
      libelle,
      donnees.localisation,
      donnees.ville,
      donnees.contact,
      donnees.siteWeb,
      donnees.lat,
      donnees.lng,
      precisionPour({ ...donnees, precision: donnees.precision ?? existante.precision }),
      donnees.national ? 1 : 0,
      donnees.geocodeQuery ?? existante.geocodeQuery,
      donnees.geocodeDisplayName ?? existante.geocodeDisplayName,
      new Date().toISOString(),
      id,
    );
    remplacerActivites(id, donnees.activites);
    db.exec("COMMIT");
    return obtenirStructure(id);
  } catch (erreur) {
    db.exec("ROLLBACK");
    throw erreur;
  }
}

export function changerStatut(id: number, statut: Statut): Structure | null {
  const resultat = db
    .prepare("UPDATE structures SET statut = ?, updated_at = ? WHERE id = ?")
    .run(statut, new Date().toISOString(), id);
  return resultat.changes > 0 ? obtenirStructure(id) : null;
}

export function supprimerStructure(id: number): boolean {
  return db.prepare("DELETE FROM structures WHERE id = ?").run(id).changes > 0;
}

/** Applique des coordonnees issues du geocodage serveur. */
export function appliquerGeocodage(
  id: number,
  resultat: { lat: number; lng: number; precision: Precision; query: string; displayName: string },
): Structure | null {
  const changements = db
    .prepare(
      `UPDATE structures
          SET lat = ?, lng = ?, precision = ?, geocode_query = ?, geocode_display_name = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(
      resultat.lat,
      resultat.lng,
      resultat.precision,
      resultat.query,
      resultat.displayName,
      new Date().toISOString(),
      id,
    ).changes;
  return changements > 0 ? obtenirStructure(id) : null;
}
