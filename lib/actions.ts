"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fermerSession, motDePasseValide, ouvrirSession, sessionActive } from "./auth";
import { geocoder } from "./geocode";
import {
  changerStatut,
  creerStructure,
  modifierStructure,
  appliquerGeocodage,
  obtenirStructure,
  supprimerStructure,
} from "./repo";
import { erreursDeFormulaire, propositionSchema, structureSchema } from "./schemas";
import type { EtatFormulaire } from "./formulaires";
import type { Statut } from "./types";

/** Toute action d'écriture admin passe par ce garde-fou. */
async function exigerSession(): Promise<void> {
  if (!(await sessionActive())) redirect("/admin/connexion");
}

function rafraichir(): void {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
}

/**
 * Les lignes d'activité arrivent en colonnes parallèles (`categorie[]`,
 * `thematique[]`…) : on les recompose ligne par ligne et on écarte les lignes
 * vides laissées par le formulaire.
 */
function lireActivites(donnees: FormData) {
  const categories = donnees.getAll("categorie").map(String);
  const thematiques = donnees.getAll("thematique").map(String);
  const domaines = donnees.getAll("domaine").map(String);
  const activites = donnees.getAll("activite").map(String);

  return categories
    .map((categorie, index) => ({
      categorie: categorie.trim(),
      thematique: thematiques[index] ?? "",
      domaine: domaines[index] ?? "",
      activite: activites[index] ?? "",
    }))
    .filter((ligne) => ligne.categorie.length > 0);
}

// ------------------------------------------------------------------ session

export async function connexionAction(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const motDePasse = String(donnees.get("motDePasse") ?? "");

  if (!motDePasse) {
    return { ok: false, erreurs: { motDePasse: "Mot de passe requis." } };
  }
  if (!motDePasseValide(motDePasse)) {
    return { ok: false, erreurs: { motDePasse: "Mot de passe incorrect." } };
  }

  await ouvrirSession();
  redirect("/admin");
}

export async function deconnexionAction(): Promise<void> {
  await fermerSession();
  redirect("/admin/connexion");
}

// ---------------------------------------------------------------- structures

export async function enregistrerStructureAction(
  id: number | null,
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  await exigerSession();

  const analyse = structureSchema.safeParse({
    nom: donnees.get("nom") ?? "",
    localisation: donnees.get("localisation") ?? "",
    ville: donnees.get("ville") ?? "",
    contact: donnees.get("contact") ?? "",
    siteWeb: donnees.get("siteWeb") ?? "",
    lat: donnees.get("lat") ?? "",
    lng: donnees.get("lng") ?? "",
    national: donnees.get("national") === "on",
    activites: lireActivites(donnees),
  });

  if (!analyse.success) {
    return { ok: false, erreurs: erreursDeFormulaire(analyse.error) };
  }

  const valeurs = analyse.data;
  let complement: { precision?: "etablissement" | "localite" | "zone"; geocodeQuery?: string; geocodeDisplayName?: string } = {};

  // Coordonnées laissées vides : on tente le géocodage automatique. Un échec
  // n'annule pas l'enregistrement, la fiche reste corrigeable à la main.
  if (!valeurs.national && (valeurs.lat === null || valeurs.lng === null)) {
    const resultat = await geocoder(valeurs.localisation, valeurs.nom);
    if (resultat) {
      valeurs.lat = resultat.lat;
      valeurs.lng = resultat.lng;
      complement = {
        precision: resultat.precision as "etablissement" | "localite" | "zone",
        geocodeQuery: resultat.query,
        geocodeDisplayName: resultat.displayName,
      };
    }
  }

  if (id === null) {
    const creee = creerStructure({ ...valeurs, ...complement, statut: "publie", source: "admin" });
    rafraichir();
    redirect(`/admin/structures/${creee.id}?enregistre=1`);
  }

  const modifiee = modifierStructure(id, { ...valeurs, ...complement });
  if (!modifiee) return { ok: false, message: "Cette fiche n'existe plus." };

  rafraichir();
  return { ok: true, message: "Fiche enregistrée." };
}

export async function supprimerStructureAction(id: number): Promise<void> {
  await exigerSession();
  supprimerStructure(id);
  rafraichir();
  redirect("/admin");
}

export async function changerStatutAction(id: number, statut: Statut): Promise<void> {
  await exigerSession();

  if (!(["publie", "en_attente", "rejete"] as const).includes(statut)) return;

  // Une proposition acceptée n'a pas encore de coordonnées : on géocode au
  // moment de la publication, pas avant, pour ne pas solliciter Nominatim
  // depuis un formulaire public.
  if (statut === "publie") {
    const structure = obtenirStructure(id);
    if (structure && !structure.national && structure.lat === null) {
      const resultat = await geocoder(structure.localisation, structure.nom);
      if (resultat) appliquerGeocodage(id, resultat);
    }
  }

  changerStatut(id, statut);
  rafraichir();
}

export async function regeocoderAction(id: number): Promise<void> {
  await exigerSession();

  const structure = obtenirStructure(id);
  if (!structure) return;

  const resultat = await geocoder(structure.localisation, structure.nom);
  if (resultat) appliquerGeocodage(id, resultat);

  revalidatePath(`/admin/structures/${id}`);
  revalidatePath("/");
}

// --------------------------------------------------------------- propositions

/** Formulaire public : aucune session requise, la fiche part en modération. */
export async function proposerStructureAction(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const analyse = propositionSchema.safeParse({
    nom: donnees.get("nom") ?? "",
    localisation: donnees.get("localisation") ?? "",
    ville: donnees.get("ville") ?? "",
    contact: donnees.get("contact") ?? "",
    siteWeb: donnees.get("siteWeb") ?? "",
    proposantNom: donnees.get("proposantNom") ?? "",
    proposantEmail: donnees.get("proposantEmail") ?? "",
    noteProposition: donnees.get("noteProposition") ?? "",
    siteInternet: donnees.get("siteInternet") ?? "",
    activites: lireActivites(donnees),
  });

  if (!analyse.success) {
    return { ok: false, erreurs: erreursDeFormulaire(analyse.error as z.ZodError) };
  }

  const { proposantNom, proposantEmail, noteProposition, ...structure } = analyse.data;

  creerStructure({
    ...structure,
    lat: null,
    lng: null,
    national: false,
    statut: "en_attente",
    source: "proposition",
    proposantNom,
    proposantEmail,
    noteProposition,
  });

  revalidatePath("/admin/moderation");

  return {
    ok: true,
    message:
      "Merci ! Votre proposition a bien été enregistrée. Elle sera publiée après vérification.",
  };
}
