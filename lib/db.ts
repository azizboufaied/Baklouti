import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Base SQLite locale (module `node:sqlite`, aucune dependance native a compiler).
 *
 * Tout l'acces aux donnees passe par ce module et `lib/repo.ts`. Pour migrer vers
 * Postgres/PostGIS plus tard, seuls ces deux fichiers changent : les pages et les
 * routes ne connaissent que les types de `lib/types.ts`.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DATA_DIR, "annuaire.db");
const SEED_PATH = path.join(DATA_DIR, "structures.seed.json");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS structures (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                  TEXT    NOT NULL UNIQUE,
  nom                   TEXT    NOT NULL,
  sigle                 TEXT,
  libelle               TEXT    NOT NULL,
  localisation          TEXT    NOT NULL,
  ville                 TEXT,
  contact               TEXT,
  site_web              TEXT,
  lat                   REAL,
  lng                   REAL,
  precision             TEXT    NOT NULL DEFAULT 'inconnue',
  national              INTEGER NOT NULL DEFAULT 0,
  geocode_query         TEXT,
  geocode_display_name  TEXT,
  statut                TEXT    NOT NULL DEFAULT 'publie',
  source                TEXT    NOT NULL DEFAULT 'import',
  proposant_nom         TEXT,
  proposant_email       TEXT,
  note_proposition      TEXT,
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS activites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id  INTEGER NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
  categorie     TEXT    NOT NULL,
  thematique    TEXT,
  domaine       TEXT,
  activite      TEXT,
  position      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_activites_structure ON activites(structure_id);
CREATE INDEX IF NOT EXISTS idx_activites_categorie ON activites(categorie);
CREATE INDEX IF NOT EXISTS idx_structures_statut    ON structures(statut);
`;

type SeedActivite = {
  categorie: string;
  thematique: string | null;
  domaine: string | null;
  activite: string | null;
};

type SeedStructure = {
  slug: string;
  nom: string;
  sigle: string | null;
  libelle: string;
  localisation: string;
  ville: string | null;
  contact: string | null;
  lat: number | null;
  lng: number | null;
  precision: string | null;
  national: boolean;
  geocode_query: string | null;
  geocode_display_name: string | null;
  activites: SeedActivite[];
};

function seed(db: DatabaseSync): void {
  if (!fs.existsSync(SEED_PATH)) {
    console.warn(
      `[db] ${path.relative(process.cwd(), SEED_PATH)} introuvable — base vide.\n` +
        `     Lancez : npm run import -- <chemin/vers/cartographique.xlsx>`,
    );
    return;
  }

  const payload = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8")) as {
    structures: SeedStructure[];
  };
  const now = new Date().toISOString();

  const insertStructure = db.prepare(`
    INSERT INTO structures (
      slug, nom, sigle, libelle, localisation, ville, contact, site_web,
      lat, lng, precision, national, geocode_query, geocode_display_name,
      statut, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'publie', 'import', ?, ?)
  `);
  const insertActivite = db.prepare(`
    INSERT INTO activites (structure_id, categorie, thematique, domaine, activite, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const structure of payload.structures) {
      const { lastInsertRowid } = insertStructure.run(
        structure.slug,
        structure.nom,
        structure.sigle,
        structure.libelle,
        structure.localisation,
        structure.ville,
        structure.contact,
        structure.lat,
        structure.lng,
        structure.precision ?? "inconnue",
        structure.national ? 1 : 0,
        structure.geocode_query,
        structure.geocode_display_name,
        now,
        now,
      );
      structure.activites.forEach((activite, index) => {
        insertActivite.run(
          Number(lastInsertRowid),
          activite.categorie,
          activite.thematique,
          activite.domaine,
          activite.activite,
          index,
        );
      });
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  console.log(`[db] base initialisée avec ${payload.structures.length} structures`);
}

function connect(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);

  const { total } = db.prepare("SELECT COUNT(*) AS total FROM structures").get() as {
    total: number;
  };
  if (total === 0) seed(db);

  return db;
}

// Le rechargement a chaud recree les modules : on garde la connexion sur globalThis
// pour ne pas ouvrir un handle SQLite par edition de fichier en developpement.
const globalForDb = globalThis as unknown as { __annuaireDb?: DatabaseSync };

export const db: DatabaseSync = globalForDb.__annuaireDb ?? connect();

if (process.env.NODE_ENV !== "production") globalForDb.__annuaireDb = db;
