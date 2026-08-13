import Link from "next/link";
import FormulaireStructure from "@/components/admin/formulaire-structure";
import { listerCategories } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function PageNouvelleStructure() {
  const categories = listerCategories().map((entree) => entree.categorie);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/admin" className="inline-block text-sm text-ardoise-500 hover:text-braise-600">
        <span aria-hidden>←</span> Tous les acteurs
      </Link>

      <h1 className="text-xl font-semibold text-ardoise-900">Nouvel acteur</h1>

      <FormulaireStructure categoriesConnues={categories} />
    </div>
  );
}
