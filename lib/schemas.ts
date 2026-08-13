import { z } from "zod";

/** Chaîne optionnelle : "" et espaces seuls valent null. */
const texteOptionnel = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Ce champ ne peut pas dépasser ${max} caractères.`)
    .transform((valeur) => valeur || null)
    .nullable()
    .default(null);

export const activiteSchema = z.object({
  categorie: z
    .string()
    .trim()
    .min(2, "La catégorie est obligatoire.")
    .max(120, "Catégorie trop longue."),
  thematique: texteOptionnel(300),
  domaine: texteOptionnel(500),
  activite: texteOptionnel(2000),
});

/** Coordonnee saisie a la main dans l'admin : accepte "" (= non renseigne). */
const coordonnee = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((valeur) => {
      if (valeur === null || valeur === "") return null;
      const nombre = typeof valeur === "number" ? valeur : Number(String(valeur).replace(",", "."));
      return Number.isFinite(nombre) ? nombre : NaN;
    })
    .refine((valeur) => valeur === null || (!Number.isNaN(valeur) && valeur >= min && valeur <= max), {
      message: `${label} doit être un nombre entre ${min} et ${max}.`,
    });

export const structureSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(3, "Le nom de l'établissement est obligatoire.")
    .max(300, "Nom trop long."),
  localisation: z
    .string()
    .trim()
    .min(2, "La localisation est obligatoire.")
    .max(200, "Localisation trop longue."),
  ville: texteOptionnel(120),
  contact: texteOptionnel(300),
  siteWeb: z
    .union([z.literal(""), z.string().trim().url("L'adresse du site doit être une URL valide.")])
    .transform((valeur) => valeur || null)
    .nullable()
    .default(null),
  lat: coordonnee(-90, 90, "La latitude"),
  lng: coordonnee(-180, 180, "La longitude"),
  national: z.coerce.boolean().default(false),
  activites: z
    .array(activiteSchema)
    .min(1, "Renseignez au moins une activité (catégorie).")
    .max(20, "20 activités au maximum."),
});

/**
 * Proposition publique : mêmes champs métier, plus l'identite du proposant.
 * Pas de lat/lng — le geocodage est fait par le serveur a partir de la localisation,
 * on ne fait pas confiance a des coordonnees venues du formulaire public.
 */
export const propositionSchema = structureSchema
  .omit({ lat: true, lng: true, national: true })
  .extend({
    proposantNom: z
      .string()
      .trim()
      .min(2, "Merci d'indiquer votre nom.")
      .max(150, "Nom trop long."),
    proposantEmail: z.string().trim().email("Adresse e-mail invalide.").max(200),
    noteProposition: texteOptionnel(1000),
    // Piege a robots : un champ cache que seuls les bots remplissent.
    siteInternet: z.string().max(0, "Requête rejetée.").optional().default(""),
  });

export const connexionSchema = z.object({
  motDePasse: z.string().min(1, "Mot de passe requis."),
});

export type StructureInput = z.infer<typeof structureSchema>;
export type PropositionInput = z.infer<typeof propositionSchema>;
export type ActiviteInput = z.infer<typeof activiteSchema>;

/** Aplatit les erreurs zod en { champ: "message" } pour l'affichage des formulaires. */
export function erreursDeFormulaire(erreur: z.ZodError): Record<string, string> {
  const erreurs: Record<string, string> = {};
  for (const probleme of erreur.issues) {
    const cle = probleme.path.join(".") || "_";
    if (!erreurs[cle]) erreurs[cle] = probleme.message;
  }
  return erreurs;
}
