import type { Metadata } from "next";
import CarteEmbarquee from "@/components/carte-embarquee";
import { listerStructures } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte embarquée",
  robots: { index: false, follow: false },
};

/**
 * Carte destinée à être intégrée en iframe sur un site tiers :
 *
 *   <iframe src="https://…/embed?categorie=Industrie%20%26%20Transformation"
 *           width="100%" height="480" style="border:0" loading="lazy"></iframe>
 *
 * Les mêmes filtres que l'API sont acceptés en paramètres d'URL, ce qui permet
 * d'embarquer une vue thématique plutôt que la carte entière.
 */
export default async function PageEmbed({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string | string[]; q?: string }>;
}) {
  const { categorie, q } = await searchParams;
  const categories = categorie ? (Array.isArray(categorie) ? categorie : [categorie]) : [];

  const structures = listerStructures({ statut: "publie", categories, recherche: q });

  return <CarteEmbarquee structures={structures} />;
}
