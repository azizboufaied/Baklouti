import Link from "next/link";
import { notFound } from "next/navigation";
import ActionsFiche from "@/components/admin/actions-fiche";
import FormulaireStructure from "@/components/admin/formulaire-structure";
import { listerCategories, obtenirStructure } from "@/lib/repo";
import { LIBELLES_PRECISION } from "@/lib/texte";

export const dynamic = "force-dynamic";

export default async function PageFiche({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enregistre?: string }>;
}) {
  const { id } = await params;
  const { enregistre } = await searchParams;

  const identifiant = Number(id);
  if (!Number.isInteger(identifiant)) notFound();

  const structure = obtenirStructure(identifiant);
  if (!structure) notFound();

  const categories = listerCategories().map((entree) => entree.categorie);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/admin" className="inline-block text-sm text-ardoise-500 hover:text-braise-600">
        <span aria-hidden>←</span> Tous les acteurs
      </Link>

      {enregistre && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          Fiche créée.
        </p>
      )}

      <div>
        <h1 className="text-xl font-semibold text-balance text-ardoise-900">{structure.nom}</h1>
        <p className="mt-1 text-sm text-ardoise-500">
          {structure.lat !== null && structure.lng !== null
            ? `${structure.lat.toFixed(5)}, ${structure.lng.toFixed(5)} — ${
                LIBELLES_PRECISION[structure.precision] ?? structure.precision
              }`
            : (LIBELLES_PRECISION[structure.precision] ?? "Sans coordonnées")}
        </p>
        {structure.geocodeDisplayName && (
          <p className="mt-0.5 text-xs text-ardoise-400">
            Géocodé via « {structure.geocodeQuery} » → {structure.geocodeDisplayName}
          </p>
        )}
      </div>

      {structure.source === "proposition" && (
        <section className="rounded-xl border border-ardoise-200 bg-white p-4 text-sm">
          <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-ardoise-500 uppercase">
            Proposition reçue
          </h2>
          <p className="text-ardoise-900">
            {structure.proposantNom}
            {structure.proposantEmail && (
              <span className="text-ardoise-500"> — {structure.proposantEmail}</span>
            )}
          </p>
          {structure.noteProposition && (
            <p className="mt-1 text-ardoise-700">{structure.noteProposition}</p>
          )}
        </section>
      )}

      <FormulaireStructure structure={structure} categoriesConnues={categories} />

      <hr className="border-ardoise-200" />

      <ActionsFiche id={structure.id} nom={structure.nom} />
    </div>
  );
}
