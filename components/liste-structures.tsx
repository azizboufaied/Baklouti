"use client";

import { couleurCategorie } from "@/lib/categories";
import type { Structure } from "@/lib/types";

type Props = {
  structures: Structure[];
  selectionId: number | null;
  onSelection: (id: number) => void;
};

function Puces({ structure }: { structure: Structure }) {
  const categories = [...new Set(structure.activites.map((a) => a.categorie))];
  return (
    <span className="flex shrink-0 gap-1 pt-1" aria-hidden>
      {categories.map((categorie) => (
        <span
          key={categorie}
          className="size-2.5 rounded-full ring-2 ring-white"
          style={{ background: couleurCategorie(categorie) }}
        />
      ))}
    </span>
  );
}

export default function ListeStructures({ structures, selectionId, onSelection }: Props) {
  const localisees = structures.filter((structure) => !structure.national);
  const nationales = structures.filter((structure) => structure.national);

  if (structures.length === 0) {
    return (
      <p className="rounded-lg bg-ardoise-100 px-3 py-6 text-center text-sm text-ardoise-500">
        Aucun acteur ne correspond à ces critères.
      </p>
    );
  }

  const rendreItem = (structure: Structure) => {
    const actif = structure.id === selectionId;
    return (
      <li key={structure.id}>
        <button
          type="button"
          onClick={() => onSelection(structure.id)}
          aria-current={actif ? "true" : undefined}
          className={`flex w-full gap-2.5 rounded-lg border px-3 py-2.5 text-start transition-colors ${
            actif
              ? "border-braise-200 bg-braise-50"
              : "border-transparent hover:border-ardoise-200 hover:bg-white"
          }`}
        >
          <Puces structure={structure} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ardoise-900">
              {structure.sigle ?? structure.nom}
            </span>
            <span className="mt-0.5 block truncate text-xs text-ardoise-500">
              {structure.sigle ? structure.libelle : structure.localisation}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {localisees.length > 0 && <ul className="space-y-0.5">{localisees.map(rendreItem)}</ul>}

      {nationales.length > 0 && (
        <section>
          <h3 className="mb-1.5 px-3 text-xs font-semibold tracking-wide text-ardoise-500 uppercase">
            Portée nationale
          </h3>
          {/* Ces acteurs couvrent tout le pays : aucune adresse ne les représente
              honnêtement, ils sont donc listés hors carte plutôt qu'épinglés. */}
          <p className="mb-1.5 px-3 text-xs leading-snug text-ardoise-400">
            Sans localisation ponctuelle, ces acteurs n’apparaissent pas sur la carte.
          </p>
          <ul className="space-y-0.5">{nationales.map(rendreItem)}</ul>
        </section>
      )}
    </div>
  );
}
