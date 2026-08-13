"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Legende from "./legende";
import ListeStructures from "./liste-structures";
import MenuExport from "./menu-export";
import PanneauDetail from "./panneau-detail";
import { normaliser } from "@/lib/texte";
import type { Structure } from "@/lib/types";

// Leaflet accède à `window` au chargement : jamais de rendu serveur.
const Carte = dynamic(() => import("./carte"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ardoise-100 text-sm text-ardoise-500">
      Chargement de la carte…
    </div>
  ),
});

type Props = {
  structures: Structure[];
  categories: { categorie: string; total: number }[];
};

/** Index de recherche : tout le texte d'une fiche, normalisé une seule fois. */
function indexer(structure: Structure): string {
  return normaliser(
    [
      structure.nom,
      structure.sigle,
      structure.localisation,
      structure.ville,
      ...structure.activites.flatMap((a) => [a.categorie, a.thematique, a.domaine, a.activite]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export default function Annuaire({ structures, categories }: Props) {
  const [categoriesActives, setCategoriesActives] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState("");
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [vueMobile, setVueMobile] = useState<"carte" | "liste">("carte");

  // La frappe reste fluide même si le filtrage prend un rendu de retard.
  const rechercheDifferee = useDeferredValue(recherche);

  const index = useMemo(
    () => new Map(structures.map((structure) => [structure.id, indexer(structure)])),
    [structures],
  );

  const structuresFiltrees = useMemo(() => {
    const termes = normaliser(rechercheDifferee).split(/\s+/).filter(Boolean);

    return structures.filter((structure) => {
      if (categoriesActives.size > 0) {
        const correspond = structure.activites.some((a) => categoriesActives.has(a.categorie));
        if (!correspond) return false;
      }
      if (termes.length === 0) return true;

      const texte = index.get(structure.id) ?? "";
      return termes.every((terme) => texte.includes(terme));
    });
  }, [structures, categoriesActives, rechercheDifferee, index]);

  const selection = useMemo(
    () => structuresFiltrees.find((structure) => structure.id === selectionId) ?? null,
    [structuresFiltrees, selectionId],
  );

  const basculerCategorie = useCallback((categorie: string) => {
    setCategoriesActives((precedent) => {
      const suivant = new Set(precedent);
      if (!suivant.delete(categorie)) suivant.add(categorie);
      return suivant;
    });
  }, []);

  const selectionner = useCallback((id: number | null) => setSelectionId(id), []);

  const surCarte = structuresFiltrees.filter((structure) => structure.lat !== null).length;

  const parametresExport = new URLSearchParams();
  for (const categorie of categoriesActives) parametresExport.append("categorie", categorie);
  if (recherche.trim()) parametresExport.set("q", recherche.trim());

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-30 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-ardoise-200 bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="text-xl leading-none">
            🌶️
          </span>
          <div className="min-w-0">
            <h1 className="flex items-baseline gap-2 truncate text-sm font-semibold text-ardoise-900">
              Baklouti
              <span className="truncate font-normal text-ardoise-500">
                Cartographie des acteurs du piment en Tunisie
              </span>
            </h1>
            <p className="text-xs text-ardoise-500">
              {structures.length} acteurs · {categories.length} catégories
            </p>
          </div>
        </div>

        <nav className="ms-auto flex items-center gap-1 text-sm">
          <Link
            href="/proposer"
            className="rounded-lg px-2.5 py-1.5 font-medium text-ardoise-700 transition-colors hover:bg-ardoise-100"
          >
            Proposer un acteur
          </Link>
          <MenuExport parametres={parametresExport.toString()} />
          <Link
            href="/admin"
            className="rounded-lg px-2.5 py-1.5 font-medium text-ardoise-400 transition-colors hover:bg-ardoise-100 hover:text-ardoise-700"
          >
            Admin
          </Link>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`w-full shrink-0 flex-col border-e border-ardoise-200 bg-white md:flex md:w-[22rem] lg:w-[24rem] ${
            vueMobile === "liste" ? "flex" : "hidden"
          }`}
        >
          <div className="shrink-0 space-y-4 border-b border-ardoise-100 px-4 py-3.5">
            <div className="relative">
              <svg
                viewBox="0 0 20 20"
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ardoise-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="M13.5 13.5L17 17" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={recherche}
                onChange={(evenement) => setRecherche(evenement.target.value)}
                placeholder="Rechercher : capsaïcine, Sfax, semences…"
                aria-label="Rechercher un acteur, une ville ou une thématique"
                className="w-full rounded-lg border border-ardoise-200 bg-ardoise-50 py-2 ps-9 pe-3 text-sm text-ardoise-900 placeholder:text-ardoise-400 focus:border-braise-400 focus:bg-white focus:outline-none"
              />
            </div>

            <Legende
              categories={categories}
              actives={categoriesActives}
              onBascule={basculerCategorie}
              onToutAfficher={() => setCategoriesActives(new Set())}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <p className="mb-2 px-2 text-xs text-ardoise-500">
              {structuresFiltrees.length} résultat{structuresFiltrees.length > 1 ? "s" : ""}
              {surCarte < structuresFiltrees.length && ` · ${surCarte} sur la carte`}
            </p>
            <ListeStructures
              structures={structuresFiltrees}
              selectionId={selectionId}
              onSelection={(id) => {
                selectionner(id);
                setVueMobile("carte");
              }}
            />
          </div>
        </aside>

        <main className={`relative min-w-0 flex-1 ${vueMobile === "liste" ? "hidden md:block" : "block"}`}>
          <Carte
            structures={structuresFiltrees}
            selectionId={selectionId}
            onSelection={selectionner}
          />

          {selection && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex justify-end md:inset-y-3 md:start-auto md:end-3 md:w-[22rem]">
              <div className="pointer-events-auto max-h-[55vh] w-full md:max-h-full">
                <PanneauDetail structure={selection} onFermer={() => selectionner(null)} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bascule carte/liste : sur mobile les deux ne tiennent pas côte à côte. */}
      <button
        type="button"
        onClick={() => setVueMobile((vue) => (vue === "carte" ? "liste" : "carte"))}
        className="fixed bottom-4 left-1/2 z-[600] -translate-x-1/2 rounded-full bg-ardoise-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg md:hidden"
      >
        {vueMobile === "carte" ? `Liste (${structuresFiltrees.length})` : "Carte"}
      </button>
    </div>
  );
}
