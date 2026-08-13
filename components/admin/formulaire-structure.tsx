"use client";

import { useActionState, useState } from "react";
import { Alerte, BoutonEnvoi, Champ, CLASSE_CHAMP } from "./champs";
import { enregistrerStructureAction } from "@/lib/actions";
import { ETAT_INITIAL } from "@/lib/formulaires";
import type { Structure } from "@/lib/types";

type LigneActivite = {
  cle: string;
  categorie: string;
  thematique: string;
  domaine: string;
  activite: string;
};

const LIGNE_VIDE = (): LigneActivite => ({
  cle: crypto.randomUUID(),
  categorie: "",
  thematique: "",
  domaine: "",
  activite: "",
});

function lignesInitiales(structure?: Structure): LigneActivite[] {
  if (!structure || structure.activites.length === 0) return [LIGNE_VIDE()];
  return structure.activites.map((activite) => ({
    cle: `activite-${activite.id}`,
    categorie: activite.categorie,
    thematique: activite.thematique ?? "",
    domaine: activite.domaine ?? "",
    activite: activite.activite ?? "",
  }));
}

export default function FormulaireStructure({
  structure,
  categoriesConnues,
}: {
  structure?: Structure;
  categoriesConnues: string[];
}) {
  const [etat, action] = useActionState(
    enregistrerStructureAction.bind(null, structure?.id ?? null),
    ETAT_INITIAL,
  );
  const [lignes, setLignes] = useState<LigneActivite[]>(() => lignesInitiales(structure));

  const erreurs = etat.erreurs ?? {};

  return (
    <form action={action} className="space-y-6">
      {etat.message && <Alerte ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Alerte>}

      <section className="space-y-4 rounded-xl border border-ardoise-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ardoise-900">Identité</h2>

        <Champ
          nom="nom"
          libelle="Nom de l'établissement"
          obligatoire
          defaut={structure?.nom}
          erreur={erreurs.nom}
          placeholder="CRRHAB – Centre Régional des Recherches…"
          aide="Le sigle placé avant un tiret est détecté automatiquement."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            nom="contact"
            libelle="Contact"
            defaut={structure?.contact}
            erreur={erreurs.contact}
            placeholder="Téléphone ou e-mail"
          />
          <Champ
            nom="siteWeb"
            libelle="Site web"
            type="url"
            defaut={structure?.siteWeb}
            erreur={erreurs.siteWeb}
            placeholder="https://…"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-ardoise-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ardoise-900">Localisation</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            nom="localisation"
            libelle="Localisation"
            obligatoire
            defaut={structure?.localisation}
            erreur={erreurs.localisation}
            placeholder="Chott Mariem, Sousse"
          />
          <Champ
            nom="ville"
            libelle="Ville"
            defaut={structure?.ville}
            erreur={erreurs.ville}
            placeholder="Sousse"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            nom="lat"
            libelle="Latitude"
            defaut={structure?.lat}
            erreur={erreurs.lat}
            placeholder="35.937869"
            aide="Laissez vide pour géocoder automatiquement."
          />
          <Champ
            nom="lng"
            libelle="Longitude"
            defaut={structure?.lng}
            erreur={erreurs.lng}
            placeholder="10.548995"
          />
        </div>

        <label className="flex items-start gap-2.5 rounded-lg bg-ardoise-50 p-3 text-sm">
          <input
            type="checkbox"
            name="national"
            defaultChecked={structure?.national}
            className="mt-0.5 size-4 accent-braise-600"
          />
          <span>
            <span className="font-medium text-ardoise-900">Acteur à portée nationale</span>
            <span className="mt-0.5 block text-xs text-ardoise-500">
              Aucune adresse ponctuelle : la fiche est listée hors carte plutôt qu’épinglée
              à un point arbitraire.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-ardoise-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ardoise-900">Axes d’intervention</h2>
          <button
            type="button"
            onClick={() => setLignes((precedent) => [...precedent, LIGNE_VIDE()])}
            className="text-sm font-medium text-braise-600 hover:underline"
          >
            + Ajouter un axe
          </button>
        </div>

        <p className="text-xs text-ardoise-500">
          Un établissement présent dans plusieurs catégories garde une seule fiche et un seul
          point sur la carte : ajoutez un axe par catégorie.
        </p>

        {erreurs.activites && (
          <p role="alert" className="text-xs font-medium text-braise-700">
            {erreurs.activites}
          </p>
        )}

        {/* Datalist partagée : réutiliser une catégorie existante évite les
            quasi-doublons qui multiplieraient les entrées de légende. */}
        <datalist id="categories-connues">
          {categoriesConnues.map((categorie) => (
            <option key={categorie} value={categorie} />
          ))}
        </datalist>

        {lignes.map((ligne, index) => (
          <fieldset
            key={ligne.cle}
            className="space-y-3 rounded-lg border border-ardoise-100 bg-ardoise-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <legend className="text-xs font-semibold tracking-wide text-ardoise-500 uppercase">
                Axe {index + 1}
              </legend>
              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLignes((precedent) => precedent.filter((l) => l.cle !== ligne.cle))}
                  className="text-xs font-medium text-ardoise-500 hover:text-braise-700"
                >
                  Retirer
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">
                Catégorie<span className="ms-0.5 text-braise-600">*</span>
              </label>
              <input
                name="categorie"
                list="categories-connues"
                defaultValue={ligne.categorie}
                placeholder="Recherche & Universités"
                className={CLASSE_CHAMP}
              />
              {erreurs[`activites.${index}.categorie`] && (
                <p role="alert" className="mt-1 text-xs font-medium text-braise-700">
                  {erreurs[`activites.${index}.categorie`]}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">Thématique</label>
              <input
                name="thematique"
                defaultValue={ligne.thematique}
                placeholder="Amélioration génétique et sélection variétale"
                className={CLASSE_CHAMP}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">Domaine</label>
              <input name="domaine" defaultValue={ligne.domaine} className={CLASSE_CHAMP} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">Activité</label>
              <textarea
                name="activite"
                rows={2}
                defaultValue={ligne.activite}
                className={`${CLASSE_CHAMP} resize-y`}
              />
            </div>
          </fieldset>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <BoutonEnvoi enCours="Enregistrement…">
          {structure ? "Enregistrer les modifications" : "Créer la fiche"}
        </BoutonEnvoi>
        {!structure && (
          <p className="text-xs text-ardoise-500">
            Sans coordonnées saisies, la fiche est géocodée à l’enregistrement.
          </p>
        )}
      </div>
    </form>
  );
}
