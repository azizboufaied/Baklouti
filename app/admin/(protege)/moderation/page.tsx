import Link from "next/link";
import ActionsModeration from "@/components/admin/actions-moderation";
import { listerStructures } from "@/lib/repo";
import type { Structure } from "@/lib/types";

export const dynamic = "force-dynamic";

function Fiche({ structure }: { structure: Structure }) {
  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-4">
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/structures/${structure.id}`}
          className="text-sm font-medium text-ardoise-900 hover:text-braise-600 hover:underline"
        >
          {structure.nom}
        </Link>

        <p className="mt-0.5 text-xs text-ardoise-500">
          {structure.localisation}
          {structure.contact && ` · ${structure.contact}`}
        </p>

        <ul className="mt-2 flex flex-wrap gap-1.5">
          {structure.activites.map((activite) => (
            <li
              key={activite.id}
              className="rounded-full bg-ardoise-100 px-2 py-0.5 text-xs text-ardoise-700"
            >
              {activite.categorie}
            </li>
          ))}
        </ul>

        <p className="mt-2 text-xs text-ardoise-400">
          Proposé par {structure.proposantNom ?? "—"}
          {structure.proposantEmail && ` (${structure.proposantEmail})`} le{" "}
          {new Date(structure.createdAt).toLocaleDateString("fr-FR")}
        </p>

        {structure.noteProposition && (
          <p className="mt-1.5 border-s-2 border-ardoise-200 ps-2.5 text-sm text-ardoise-700">
            {structure.noteProposition}
          </p>
        )}
      </div>

      <ActionsModeration id={structure.id} statut={structure.statut} />
    </li>
  );
}

export default function PageModeration() {
  const enAttente = listerStructures({ statut: "en_attente" });
  const rejetees = listerStructures({ statut: "rejete" });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-ardoise-900">Propositions en attente</h1>
          <p className="mt-0.5 text-sm text-ardoise-500">
            Les fiches proposées par le public n’apparaissent sur la carte qu’après publication.
            Le géocodage est lancé à ce moment-là.
          </p>
        </div>

        {enAttente.length === 0 ? (
          <p className="rounded-xl border border-ardoise-200 bg-white px-4 py-8 text-center text-sm text-ardoise-500">
            Aucune proposition en attente.
          </p>
        ) : (
          <ul className="divide-y divide-ardoise-100 overflow-hidden rounded-xl border border-ardoise-200 bg-white">
            {enAttente.map((structure) => (
              <Fiche key={structure.id} structure={structure} />
            ))}
          </ul>
        )}
      </section>

      {rejetees.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ardoise-700">
            Rejetées ({rejetees.length})
          </h2>
          <ul className="divide-y divide-ardoise-100 overflow-hidden rounded-xl border border-ardoise-200 bg-white opacity-75">
            {rejetees.map((structure) => (
              <Fiche key={structure.id} structure={structure} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
