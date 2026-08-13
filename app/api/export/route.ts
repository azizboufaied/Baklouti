import { NextResponse } from "next/server";
import { listerStructures } from "@/lib/repo";
import { versCsv, versFeatureCollection } from "@/lib/geojson";

export const dynamic = "force-dynamic";

/**
 * GET /api/export?format=csv|geojson — télécharge les résultats filtrés.
 * Les filtres (`categorie`, `q`) sont ceux de la carte : on exporte donc
 * exactement ce que l'utilisateur voit à l'écran.
 */
export async function GET(requete: Request) {
  const parametres = new URL(requete.url).searchParams;
  const format = parametres.get("format") === "geojson" ? "geojson" : "csv";

  const structures = await listerStructures({
    statut: "publie",
    categories: parametres.getAll("categorie").filter(Boolean),
    recherche: parametres.get("q") ?? undefined,
  });

  const date = new Date().toISOString().slice(0, 10);
  const nomFichier = `acteurs-piment-tunisie-${date}.${format}`;
  const disposition = `attachment; filename="${nomFichier}"`;

  if (format === "geojson") {
    return NextResponse.json(versFeatureCollection(structures), {
      headers: {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Content-Disposition": disposition,
      },
    });
  }

  return new NextResponse(versCsv(structures), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposition,
    },
  });
}
