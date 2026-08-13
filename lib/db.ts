import "server-only";
import postgres from "postgres";

/**
 * Connexion Postgres (Supabase).
 *
 * Tout l'accès aux données passe par ce module et `lib/repo.ts` : les pages et
 * les routes ne connaissent que les types de `lib/types.ts`.
 *
 * La connexion est ouverte paresseusement, à la première requête. Sans cela,
 * `next build` échouerait dès l'analyse des routes sur une machine sans
 * `.env.local`, alors qu'aucune requête n'est réellement exécutée à ce moment.
 */

const MESSAGE_ABSENCE =
  "DATABASE_URL est absente.\n" +
  "Copiez .env.local.example en .env.local et renseignez la chaîne de connexion\n" +
  "Supabase (Project Settings → Database → Connection string → Transaction pooler).";

const globalForDb = globalThis as unknown as { __bakloutiSql?: postgres.Sql };

function instance(): postgres.Sql {
  if (globalForDb.__bakloutiSql) return globalForDb.__bakloutiSql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(MESSAGE_ABSENCE);

  const client = postgres(url, {
    // Le pooler Supabase (port 6543) fonctionne en mode « transaction » : les
    // requêtes préparées ne survivent pas d'une transaction à l'autre.
    prepare: false,
    // Chaque instance serverless ouvre son propre pool : on reste modeste pour
    // ne pas épuiser les connexions disponibles côté Supabase.
    max: process.env.NODE_ENV === "production" ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });

  // Mis en cache y compris en production : le module est réévalué à chaque
  // rechargement à chaud en développement, et une fois par instance en serverless.
  globalForDb.__bakloutiSql = client;
  return client;
}

/**
 * `sql` se comporte exactement comme le client postgres.js — appel en gabarit
 * balisé (`` sql`SELECT …` ``) comme accès aux méthodes (`sql.begin`) — mais
 * n'ouvre la connexion qu'au premier usage réel.
 */
export const sql: postgres.Sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply(_cible, _contexte, arguments_) {
    const client = instance() as unknown as (...args: unknown[]) => unknown;
    return client(...arguments_);
  },
  get(_cible, propriete) {
    const client = instance();
    const valeur = Reflect.get(client, propriete);
    // Les méthodes doivent rester liées au client, pas au proxy.
    return typeof valeur === "function" ? valeur.bind(client) : valeur;
  },
});
