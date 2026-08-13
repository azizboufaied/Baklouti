"use client";

import { couleurCategorie } from "@/lib/categories";
import { LIBELLES_PRECISION, lignesActivite } from "@/lib/texte";
import type { Structure } from "@/lib/types";

type Props = {
  structure: Structure;
  onFermer: () => void;
};

export default function PanneauDetail({ structure, onFermer }: Props) {
  return (
    <aside
      aria-label={`Fiche : ${structure.nom}`}
      className="flex max-h-full flex-col overflow-hidden rounded-xl border border-ardoise-200 bg-white shadow-xl"
    >
      <header className="flex items-start gap-3 border-b border-ardoise-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          {structure.sigle && (
            <p className="text-xs font-semibold tracking-wide text-braise-600 uppercase">
              {structure.sigle}
            </p>
          )}
          <h2 className="text-base leading-snug font-semibold text-balance text-ardoise-900">
            {structure.libelle}
          </h2>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer la fiche"
          className="-me-1 shrink-0 rounded-md p-1 text-ardoise-400 transition-colors hover:bg-ardoise-100 hover:text-ardoise-700"
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="sr-only">Localisation</dt>
            <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-ardoise-400" fill="currentColor">
              <path d="M10 2a5.5 5.5 0 00-5.5 5.5C4.5 11.6 10 18 10 18s5.5-6.4 5.5-10.5A5.5 5.5 0 0010 2zm0 7.5a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
            <dd className="min-w-0">
              <span className="text-ardoise-900">{structure.localisation}</span>
              <span className="mt-0.5 block text-xs text-ardoise-400">
                {LIBELLES_PRECISION[structure.precision] ?? structure.precision}
              </span>
            </dd>
          </div>

          {structure.contact && (
            <div className="flex gap-2">
              <dt className="sr-only">Contact</dt>
              <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-ardoise-400" fill="currentColor">
                <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2.5 1.5L10 10l4.5-3.5" />
              </svg>
              <dd className="min-w-0 break-words text-ardoise-900">{structure.contact}</dd>
            </div>
          )}

          {structure.siteWeb && (
            <div className="flex gap-2">
              <dt className="sr-only">Site web</dt>
              <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-ardoise-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="10" cy="10" r="7" />
                <path d="M3 10h14M10 3c2 2.5 2 11 0 14M10 3c-2 2.5-2 11 0 14" />
              </svg>
              <dd className="min-w-0">
                <a
                  href={structure.siteWeb}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-all text-braise-600 hover:underline"
                >
                  {structure.siteWeb.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
        </dl>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-ardoise-500 uppercase">
            {structure.activites.length > 1
              ? `${structure.activites.length} axes d’intervention`
              : "Axe d’intervention"}
          </h3>

          {structure.activites.map((activite, index) => {
            const couleur = couleurCategorie(activite.categorie);
            return (
              <article
                key={activite.id ?? index}
                className="rounded-lg border border-ardoise-100 bg-ardoise-50/60 p-3"
              >
                <p
                  className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: `${couleur}1a`, color: couleur }}
                >
                  <span className="size-2 rounded-full" style={{ background: couleur }} aria-hidden />
                  {activite.categorie}
                </p>

                {activite.thematique && (
                  <p className="text-sm font-medium text-ardoise-900">{activite.thematique}</p>
                )}

                {lignesActivite(activite).map((ligne) => (
                  <p key={ligne} className="mt-1 text-sm leading-relaxed text-ardoise-700">
                    {ligne}
                  </p>
                ))}
              </article>
            );
          })}
        </section>

        {structure.lat !== null && structure.lng !== null && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${structure.lat}&mlon=${structure.lng}#map=15/${structure.lat}/${structure.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-ardoise-400 hover:text-braise-600 hover:underline"
          >
            {structure.lat.toFixed(4)}, {structure.lng.toFixed(4)} — ouvrir dans OpenStreetMap
          </a>
        )}
      </div>
    </aside>
  );
}
