import Link from "next/link";
import { redirect } from "next/navigation";
import FormulaireConnexion from "@/components/admin/formulaire-connexion";
import { sessionActive, utiliseMotDePasseParDefaut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PageConnexion() {
  if (await sessionActive()) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-ardoise-500 hover:text-braise-600"
        >
          <span aria-hidden>←</span> Retour à la carte
        </Link>

        <div className="rounded-xl border border-ardoise-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-ardoise-900">Administration</h1>
          <p className="mt-1 mb-5 text-sm text-ardoise-500">
            Gestion des acteurs et des propositions reçues.
          </p>

          <FormulaireConnexion />

          {utiliseMotDePasseParDefaut() && (
            <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <strong className="font-semibold">Mot de passe par défaut actif.</strong> En local :{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">piment</code>. Définissez{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">ADMIN_PASSWORD</code>{" "}
              dans <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code>{" "}
              avant toute mise en ligne.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
