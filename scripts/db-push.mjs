/**
 * Applique les migrations puis sème la base depuis data/structures.seed.json.
 *
 *   npm run db:push          -- migre, puis sème seulement si la base est vide
 *   npm run db:push -- --force  -- vide les tables et resème depuis le fichier
 *
 * Idempotent : réexécutable sans risque. La chaîne de connexion est lue dans
 * DATABASE_URL (.env.local en local, variables d'environnement sur Vercel).
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const RACINE = path.dirname(import.meta.dirname);
const DOSSIER_MIGRATIONS = path.join(RACINE, "supabase", "migrations");
const FICHIER_SEED = path.join(RACINE, "data", "structures.seed.json");

const force = process.argv.includes("--force");

if (!process.env.DATABASE_URL) {
  console.error(
    "\nDATABASE_URL est absente.\n\n" +
      "  1. Créez un projet sur https://supabase.com\n" +
      "  2. Project Settings → Database → Connection string → Transaction pooler\n" +
      "  3. Copiez .env.local.example en .env.local et collez-y la chaîne\n",
  );
  process.exit(1);
}

// Migrations : hors pooler (`prepare` par défaut), le DDL passe mieux en direct.
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 30,
  onnotice: () => {},
});

try {
  // --- Migrations ---------------------------------------------------------
  const migrations = fs
    .readdirSync(DOSSIER_MIGRATIONS)
    .filter((nom) => nom.endsWith(".sql"))
    .sort();

  for (const nom of migrations) {
    const contenu = fs.readFileSync(path.join(DOSSIER_MIGRATIONS, nom), "utf-8");
    await sql.unsafe(contenu);
    console.log(`migration appliquée : ${nom}`);
  }

  // --- Semis --------------------------------------------------------------
  const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM structures`;

  if (total > 0 && !force) {
    console.log(`\nBase déjà peuplée (${total} structures) — semis ignoré.`);
    console.log("Pour repartir du fichier source : npm run db:push -- --force\n");
    await sql.end();
    process.exit(0);
  }

  if (!fs.existsSync(FICHIER_SEED)) {
    console.error(`\nFichier de semis introuvable : ${FICHIER_SEED}`);
    console.error("Générez-le avec : npm run import -- <cartographique.xlsx>\n");
    await sql.end();
    process.exit(1);
  }

  const { structures } = JSON.parse(fs.readFileSync(FICHIER_SEED, "utf-8"));

  await sql.begin(async (tx) => {
    if (force && total > 0) {
      // `activites` disparaît par cascade ; RESTART remet les identifiants à 1.
      await tx`TRUNCATE structures RESTART IDENTITY CASCADE`;
      console.log(`${total} structures supprimées avant re-semis.`);
    }

    for (const structure of structures) {
      const [ligne] = await tx`
        INSERT INTO structures (
          slug, nom, sigle, libelle, localisation, ville, contact,
          lat, lng, precision_geo, national, geocode_query, geocode_display_name,
          statut, source
        ) VALUES (
          ${structure.slug}, ${structure.nom}, ${structure.sigle}, ${structure.libelle},
          ${structure.localisation}, ${structure.ville}, ${structure.contact},
          ${structure.lat}, ${structure.lng}, ${structure.precision ?? "inconnue"},
          ${structure.national}, ${structure.geocode_query}, ${structure.geocode_display_name},
          'publie', 'import'
        )
        RETURNING id
      `;

      if (structure.activites.length > 0) {
        await tx`
          INSERT INTO activites ${tx(
            structure.activites.map((activite, index) => ({
              structure_id: ligne.id,
              categorie: activite.categorie,
              thematique: activite.thematique,
              domaine: activite.domaine,
              activite: activite.activite,
              position: index,
            })),
          )}
        `;
      }
    }
  });

  const [resume] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM structures)                          AS structures,
      (SELECT COUNT(*)::int FROM activites)                           AS activites,
      (SELECT COUNT(*)::int FROM structures WHERE lat IS NOT NULL)    AS localisees,
      (SELECT COUNT(DISTINCT categorie)::int FROM activites)          AS categories
  `;

  console.log(
    `\n${resume.structures} structures / ${resume.activites} activités semées` +
      `\n   ${resume.localisees} géolocalisées, ${resume.categories} catégories\n`,
  );
} catch (erreur) {
  console.error("\nÉchec :", erreur.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
