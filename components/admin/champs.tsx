"use client";

import { useFormStatus } from "react-dom";

/** Briques de formulaire partagées par l'admin et le formulaire public. */

export const CLASSE_CHAMP =
  "w-full rounded-lg border border-ardoise-200 bg-white px-3 py-2 text-sm text-ardoise-900 " +
  "placeholder:text-ardoise-400 focus:border-braise-400 focus:outline-none disabled:bg-ardoise-50";

type ChampProps = {
  nom: string;
  libelle: string;
  erreur?: string;
  aide?: string;
  obligatoire?: boolean;
  multiligne?: boolean;
  type?: string;
  defaut?: string | number | null;
  placeholder?: string;
};

export function Champ({
  nom,
  libelle,
  erreur,
  aide,
  obligatoire,
  multiligne,
  type = "text",
  defaut,
  placeholder,
}: ChampProps) {
  const id = `champ-${nom}`;
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ardoise-700">
        {libelle}
        {obligatoire && (
          <span className="ms-0.5 text-braise-600" aria-label="obligatoire">
            *
          </span>
        )}
      </label>

      {multiligne ? (
        <textarea
          id={id}
          name={nom}
          rows={3}
          defaultValue={defaut ?? ""}
          placeholder={placeholder}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={[idAide, idErreur].filter(Boolean).join(" ") || undefined}
          className={`${CLASSE_CHAMP} resize-y`}
        />
      ) : (
        <input
          id={id}
          name={nom}
          type={type}
          defaultValue={defaut ?? ""}
          placeholder={placeholder}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={[idAide, idErreur].filter(Boolean).join(" ") || undefined}
          className={CLASSE_CHAMP}
        />
      )}

      {aide && !erreur && (
        <p id={idAide} className="mt-1 text-xs text-ardoise-400">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={idErreur} role="alert" className="mt-1 text-xs font-medium text-braise-700">
          {erreur}
        </p>
      )}
    </div>
  );
}

export function BoutonEnvoi({
  children,
  enCours,
}: {
  children: React.ReactNode;
  enCours?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-braise-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-braise-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (enCours ?? "Envoi…") : children}
    </button>
  );
}

export function Alerte({ ton, children }: { ton: "succes" | "erreur"; children: React.ReactNode }) {
  const styles =
    ton === "succes"
      ? "border-green-200 bg-green-50 text-green-900"
      : "border-braise-200 bg-braise-50 text-braise-900";

  return (
    <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}
