import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

/**
 * Coquille commune à /admin. Volontairement sans contrôle de session : la page
 * de connexion en dépend aussi. La vérification vit dans `(protege)/layout.tsx`.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ardoise-50">{children}</div>;
}
