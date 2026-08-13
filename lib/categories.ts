/**
 * Couleurs de la legende. Les cinq categories du fichier source ont une couleur
 * stable ; toute categorie ajoutee ensuite (admin, proposition) reçoit une couleur
 * de la palette de secours, choisie de façon deterministe a partir de son nom —
 * la meme categorie garde donc toujours la meme couleur.
 */

export const COULEURS_CATEGORIES: Record<string, string> = {
  "Recherche & Universités": "#2563eb",
  "Agronomie, Génétique & Production": "#16a34a",
  "Molécules bioactives & Biochimie": "#7c3aed",
  "Semences & Entreprises (Production)": "#d97706",
  "Industrie & Transformation": "#dc2626",
};

const PALETTE_SECOURS = ["#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5", "#0d9488"];

export function couleurCategorie(categorie: string): string {
  const connue = COULEURS_CATEGORIES[categorie];
  if (connue) return connue;

  let empreinte = 0;
  for (let i = 0; i < categorie.length; i++) {
    empreinte = (empreinte * 31 + categorie.charCodeAt(i)) % 100000;
  }
  return PALETTE_SECOURS[empreinte % PALETTE_SECOURS.length];
}

/** Libelle court pour les puces de la legende, qui manquent de place. */
export function categorieCourte(categorie: string): string {
  return categorie.replace(/\s*\(.*?\)\s*$/, "").trim();
}
