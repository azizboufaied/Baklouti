import Link from "next/link";
import { couleurCategorie } from "@/lib/categories";
import { compterParStatut, listerCategories, listerStructures } from "@/lib/repo";
import { LIBELLES_PRECISION } from "@/lib/texte";

export const dynamic = "force-dynamic";

export default function PageAdmin() {
  const structures = listerStructures({ statut: "publie" });
  const categories = listerCategories();
  const compteurs = compterParStatut();

  const sansCoordonnees = structures.filter(
    (structure) => !structure.national && structure.lat === null,
  );
  const approximatives = structures.filter(
    (structure) => structure.precision === "localite" || structure.precision === "zone",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ardoise-900">Acteurs publiés</h1>
          <p className="mt-0.5 text-sm text-ardoise-500">
            {structures.length} fiches · {categories.length} catégories ·{" "}
            {compteurs.en_attente} proposition{compteurs.en_attente > 1 ? "s" : ""} en attente
          </p>
        </div>
        <Link
          href="/admin/structures/nouveau"
          className="rounded-lg bg-braise-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-braise-700"
        >
          Nouvel acteur
        </Link>
      </div>

      {sansCoordonnees.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {sansCoordonnees.length} fiche{sansCoordonnees.length > 1 ? "s" : ""} sans coordonnées
          n’apparaî{sansCoordonnees.length > 1 ? "ssent" : "t"} pas sur la carte.
        </p>
      )}

      {approximatives.length > 0 && (
        <p className="rounded-lg border border-ardoise-200 bg-white px-3 py-2 text-sm text-ardoise-700">
          {approximatives.length} fiche{approximatives.length > 1 ? "s" : ""} pointe
          {approximatives.length > 1 ? "nt" : ""} sur un centre de localité plutôt que sur
          l’établissement. Ouvrez la fiche pour affiner les coordonnées à la main.
        </p>
      )}

      <ul className="divide-y divide-ardoise-100 overflow-hidden rounded-xl border border-ardoise-200 bg-white">
        {structures.map((structure) => (
          <li key={structure.id}>
            <Link
              href={`/admin/structures/${structure.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-ardoise-50"
            >
              <span className="flex shrink-0 gap-1 pt-1.5" aria-hidden>
                {[...new Set(structure.activites.map((a) => a.categorie))].map((categorie) => (
                  <span
                    key={categorie}
                    className="size-2.5 rounded-full"
                    style={{ background: couleurCategorie(categorie) }}
                  />
                ))}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ardoise-900">
                  {structure.sigle ? `${structure.sigle} — ${structure.libelle}` : structure.nom}
                </span>
                <span className="mt-0.5 block text-xs text-ardoise-500">
                  {structure.localisation} ·{" "}
                  {structure.national
                    ? "portée nationale"
                    : (LIBELLES_PRECISION[structure.precision] ?? structure.precision)}
                  {structure.activites.length > 1 && ` · ${structure.activites.length} axes`}
                </span>
              </span>

              {structure.source === "proposition" && (
                <span className="shrink-0 rounded-full bg-ardoise-100 px-2 py-0.5 text-xs text-ardoise-500">
                  proposée
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
