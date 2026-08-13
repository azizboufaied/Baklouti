"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PanneauDetail from "./panneau-detail";
import type { Structure } from "@/lib/types";

const Carte = dynamic(() => import("./carte"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ardoise-100 text-sm text-ardoise-500">
      Chargement de la carte…
    </div>
  ),
});

/**
 * Version sans chrome, destinée à l'iframe : la carte occupe tout le cadre,
 * seul le panneau de détail se superpose au clic.
 */
export default function CarteEmbarquee({ structures }: { structures: Structure[] }) {
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const selection = structures.find((structure) => structure.id === selectionId) ?? null;

  return (
    <div className="relative h-dvh w-full">
      <Carte structures={structures} selectionId={selectionId} onSelection={setSelectionId} />

      {selection && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[500] sm:inset-y-2 sm:start-auto sm:end-2 sm:w-80">
          <div className="pointer-events-auto max-h-[60vh] sm:max-h-full">
            <PanneauDetail structure={selection} onFermer={() => setSelectionId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
