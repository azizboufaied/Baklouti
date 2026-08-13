import Link from "next/link";
import { redirect } from "next/navigation";
import { deconnexionAction } from "@/lib/actions";
import { sessionActive } from "@/lib/auth";
import { compterParStatut } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Toutes les pages de ce groupe exigent une session valide. */
export default async function LayoutProtege({ children }: { children: React.ReactNode }) {
  if (!(await sessionActive())) redirect("/admin/connexion");

  const compteurs = compterParStatut();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-ardoise-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-ardoise-900">
            <span aria-hidden>🌶️</span>
            <span className="text-sm">Administration</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin"
              className="rounded-lg px-2.5 py-1.5 text-ardoise-700 transition-colors hover:bg-ardoise-100"
            >
              Acteurs
            </Link>
            <Link
              href="/admin/moderation"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ardoise-700 transition-colors hover:bg-ardoise-100"
            >
              Propositions
              {compteurs.en_attente > 0 && (
                <span className="rounded-full bg-braise-600 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                  {compteurs.en_attente}
                </span>
              )}
            </Link>
          </nav>

          <div className="ms-auto flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-1.5 text-ardoise-500 transition-colors hover:bg-ardoise-100 hover:text-ardoise-700"
            >
              Voir la carte
            </Link>
            <form action={deconnexionAction}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-ardoise-500 transition-colors hover:bg-ardoise-100 hover:text-ardoise-700"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
