import type { Metadata } from "next";
import Link from "next/link";
import FormulaireProposition from "@/components/formulaire-proposition";
import { listerCategories } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposer un acteur",
  description:
    "Signaler un centre de recherche, un laboratoire, un semencier ou un industriel " +
    "de la filière piment absent de la cartographie.",
};

export default function PageProposer() {
  const categories = listerCategories().map((entree) => entree.categorie);

  return (
    <div className="min-h-dvh bg-ardoise-50">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/" className="inline-block text-sm text-ardoise-500 hover:text-braise-600">
          <span aria-hidden>←</span> Retour à la carte
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-balance text-ardoise-900">
          Proposer un acteur de la filière piment
        </h1>
        <p className="mt-2 mb-7 text-sm leading-relaxed text-ardoise-700">
          Un laboratoire, un centre technique, un semencier ou un transformateur manque à la
          cartographie ? Décrivez-le ici. Chaque proposition est vérifiée avant d’apparaître
          sur la carte.
        </p>

        <FormulaireProposition categoriesConnues={categories} />
      </main>
    </div>
  );
}
