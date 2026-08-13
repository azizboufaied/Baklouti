import Annuaire from "@/components/annuaire";
import { listerCategories, listerStructures } from "@/lib/repo";

// Les données viennent de SQLite à chaque requête : une modification dans
// l'admin doit être visible immédiatement, sans revalidation à attendre.
export const dynamic = "force-dynamic";

export default function PageAccueil() {
  const structures = listerStructures({ statut: "publie" });
  const categories = listerCategories();

  return <Annuaire structures={structures} categories={categories} />;
}
