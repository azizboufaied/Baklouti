import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/sante — état de santé de l'application.
 *
 * Appelé une fois par jour par le cron Vercel (voir `vercel.json`). Sa raison
 * d'être : un projet Supabase gratuit est mis en pause après environ sept jours
 * sans activité, et le site tombe alors jusqu'à une reprise manuelle. Une
 * requête quotidienne suffit à réarmer ce compteur.
 *
 * Il sert aussi de sonde de supervision : l'ouvrir dit immédiatement si la base
 * répond, sans avoir à charger la carte.
 */

// Impératif : sans cela la réponse serait mise en cache et le cron n'atteindrait
// jamais la base — l'effet « anti-pause » serait perdu sans que rien ne le signale.
export const dynamic = "force-dynamic";

export async function GET(requete: Request) {
  // Vercel envoie automatiquement cet en-tête si la variable CRON_SECRET existe.
  // Sans secret configuré, la route reste publique : ce n'est qu'un état de santé.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const entete = requete.headers.get("authorization");
    if (entete !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, erreur: "Non autorisé" }, { status: 401 });
    }
  }

  const debut = Date.now();

  try {
    const [ligne] = (await sql`
      SELECT
        (SELECT COUNT(*)::int FROM structures WHERE statut = 'publie')     AS publiees,
        (SELECT COUNT(*)::int FROM structures WHERE statut = 'en_attente') AS en_attente
    `) as unknown as { publiees: number; en_attente: number }[];

    return NextResponse.json(
      {
        ok: true,
        base: "accessible",
        latenceMs: Date.now() - debut,
        structuresPubliees: ligne.publiees,
        propositionsEnAttente: ligne.en_attente,
        horodatage: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erreur) {
    // 503 plutôt que 500 : la panne est celle d'une dépendance, et c'est ce que
    // guettent les outils de supervision.
    return NextResponse.json(
      {
        ok: false,
        base: "injoignable",
        latenceMs: Date.now() - debut,
        erreur: erreur instanceof Error ? erreur.message : "erreur inconnue",
        horodatage: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
