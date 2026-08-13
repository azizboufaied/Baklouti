"use client";

import { categorieCourte, couleurCategorie } from "@/lib/categories";

type Props = {
  categories: { categorie: string; total: number }[];
  actives: Set<string>;
  onBascule: (categorie: string) => void;
  onToutAfficher: () => void;
};

/**
 * Légende cliquable : chaque catégorie est un filtre. Aucune catégorie
 * sélectionnée = tout est affiché (plus lisible qu'un état vide).
 */
export default function Legende({ categories, actives, onBascule, onToutAfficher }: Props) {
  const filtreActif = actives.size > 0;

  return (
    <fieldset className="border-0 p-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <legend className="text-xs font-semibold tracking-wide text-ardoise-500 uppercase">
          Catégories
        </legend>
        {filtreActif && (
          <button
            type="button"
            onClick={onToutAfficher}
            className="text-xs font-medium text-braise-600 hover:text-braise-700 hover:underline"
          >
            Tout afficher
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {categories.map(({ categorie, total }) => {
          const active = actives.has(categorie);
          const couleur = couleurCategorie(categorie);

          return (
            <li key={categorie}>
              <button
                type="button"
                onClick={() => onBascule(categorie)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm transition-colors ${
                  active
                    ? "bg-ardoise-100 font-medium text-ardoise-900"
                    : "text-ardoise-700 hover:bg-ardoise-100/60"
                } ${filtreActif && !active ? "opacity-55" : ""}`}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ background: couleur, boxShadow: `0 0 0 1px ${couleur}55` }}
                />
                <span className="min-w-0 flex-1 leading-snug">{categorieCourte(categorie)}</span>
                <span className="shrink-0 text-xs tabular-nums text-ardoise-400">{total}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
