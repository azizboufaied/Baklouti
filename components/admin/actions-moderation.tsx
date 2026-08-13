"use client";

import { useTransition } from "react";
import { changerStatutAction } from "@/lib/actions";
import type { Statut } from "@/lib/types";

export default function ActionsModeration({ id, statut }: { id: number; statut: Statut }) {
  const [enCours, demarrer] = useTransition();

  const changer = (suivant: Statut) => demarrer(() => changerStatutAction(id, suivant));

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {statut !== "publie" && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => changer("publie")}
          className="rounded-lg bg-braise-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-braise-700 disabled:opacity-60"
        >
          {/* La publication déclenche le géocodage côté serveur : ça prend une seconde. */}
          {enCours ? "Publication…" : "Publier"}
        </button>
      )}

      {statut !== "rejete" && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => changer("rejete")}
          className="rounded-lg border border-ardoise-200 bg-white px-3 py-1.5 text-sm font-medium text-ardoise-700 transition-colors hover:bg-ardoise-50 disabled:opacity-60"
        >
          Rejeter
        </button>
      )}

      {statut === "rejete" && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => changer("en_attente")}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-ardoise-500 transition-colors hover:bg-ardoise-100 disabled:opacity-60"
        >
          Remettre en attente
        </button>
      )}
    </div>
  );
}
