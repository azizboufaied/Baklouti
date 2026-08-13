"use client";

import { useTransition } from "react";
import { regeocoderAction, supprimerStructureAction } from "@/lib/actions";

/**
 * Actions destructives ou lentes d'une fiche. Client uniquement pour la
 * confirmation de suppression et l'état « en cours » — le travail reste serveur.
 */
export default function ActionsFiche({ id, nom }: { id: number; nom: string }) {
  const [enCours, demarrer] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={enCours}
        onClick={() => demarrer(() => regeocoderAction(id))}
        className="rounded-lg border border-ardoise-200 bg-white px-3 py-1.5 text-sm font-medium text-ardoise-700 transition-colors hover:bg-ardoise-50 disabled:opacity-60"
      >
        {enCours ? "Géocodage…" : "Re-géocoder depuis la localisation"}
      </button>

      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          if (confirm(`Supprimer définitivement « ${nom} » ?`)) {
            demarrer(() => supprimerStructureAction(id));
          }
        }}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-braise-700 transition-colors hover:bg-braise-50 disabled:opacity-60"
      >
        Supprimer
      </button>
    </div>
  );
}
