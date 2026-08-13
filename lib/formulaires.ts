/**
 * État partagé des formulaires.
 *
 * Volontairement séparé de `lib/actions.ts` : un module « use server » ne peut
 * exporter que des fonctions asynchrones, pas des constantes.
 */

export type EtatFormulaire = {
  ok: boolean;
  message?: string;
  erreurs?: Record<string, string>;
};

export const ETAT_INITIAL: EtatFormulaire = { ok: false };
