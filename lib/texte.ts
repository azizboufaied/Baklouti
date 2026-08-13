/** Utilitaires de texte partagés client/serveur (aucun accès base ni Node). */

/** Minuscules sans accents, pour une recherche « sfax » qui trouve « Sfax ». */
export function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export const LIBELLES_PRECISION: Record<string, string> = {
  etablissement: "Position de l'établissement",
  localite: "Position approximative (centre de la localité)",
  zone: "Position approximative (zone)",
  national: "Acteur à portée nationale",
  inconnue: "Position non déterminée",
};

/** Une seule ligne d'activité peut répéter le domaine : on évite le doublon. */
export function lignesActivite(activite: {
  domaine: string | null;
  activite: string | null;
}): string[] {
  const valeurs = [activite.domaine, activite.activite].filter(
    (valeur): valeur is string => Boolean(valeur),
  );
  return [...new Set(valeurs.map((valeur) => valeur.trim()))];
}
