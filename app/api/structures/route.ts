import { NextResponse } from "next/server";
import { listerStructures } from "@/lib/repo";
import { versFeatureCollection } from "@/lib/geojson";

export const dynamic = "force-dynamic";

/**
 * GET /api/structures — les acteurs publiés, en GeoJSON.
 *
 *   ?categorie=Recherche & Universités   (répétable)
 *   ?q=capsaïcine                        (recherche plein texte)
 *
 * Format d'échange standard : consommable tel quel par QGIS, Leaflet ou PostGIS.
 */
export async function GET(requete: Request) {
  const parametres = new URL(requete.url).searchParams;

  const structures = await listerStructures({
    statut: "publie",
    categories: parametres.getAll("categorie").filter(Boolean),
    recherche: parametres.get("q") ?? undefined,
  });

  return NextResponse.json(versFeatureCollection(structures), {
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      // Annuaire public en lecture seule : l'embarquement iframe le consomme aussi.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
