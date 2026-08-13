"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Alerte, BoutonEnvoi, Champ, CLASSE_CHAMP } from "./admin/champs";
import { proposerStructureAction } from "@/lib/actions";
import { ETAT_INITIAL } from "@/lib/formulaires";

export default function FormulaireProposition({
  categoriesConnues,
}: {
  categoriesConnues: string[];
}) {
  const [etat, action] = useActionState(proposerStructureAction, ETAT_INITIAL);
  const [nbAxes, setNbAxes] = useState(1);

  const erreurs = etat.erreurs ?? {};

  if (etat.ok) {
    return (
      <div className="space-y-4">
        <Alerte ton="succes">{etat.message}</Alerte>
        <Link href="/" className="inline-block text-sm font-medium text-braise-600 hover:underline">
          Retour à la carte
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {etat.message && <Alerte ton="erreur">{etat.message}</Alerte>}

      <section className="space-y-4 rounded-xl border border-ardoise-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ardoise-900">L’acteur proposé</h2>

        <Champ
          nom="nom"
          libelle="Nom de l'établissement"
          obligatoire
          erreur={erreurs.nom}
          placeholder="Centre technique de l'agroalimentaire"
        />
        <Champ
          nom="localisation"
          libelle="Localisation"
          obligatoire
          erreur={erreurs.localisation}
          placeholder="Ville, gouvernorat — ou adresse complète"
          aide="Les coordonnées sont calculées automatiquement à la publication."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ nom="contact" libelle="Contact" erreur={erreurs.contact} placeholder="Téléphone ou e-mail" />
          <Champ nom="siteWeb" libelle="Site web" type="url" erreur={erreurs.siteWeb} placeholder="https://…" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-ardoise-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ardoise-900">Axes d’intervention</h2>
          {nbAxes < 5 && (
            <button
              type="button"
              onClick={() => setNbAxes((precedent) => precedent + 1)}
              className="text-sm font-medium text-braise-600 hover:underline"
            >
              + Ajouter un axe
            </button>
          )}
        </div>

        {erreurs.activites && (
          <p role="alert" className="text-xs font-medium text-braise-700">
            {erreurs.activites}
          </p>
        )}

        <datalist id="categories-proposables">
          {categoriesConnues.map((categorie) => (
            <option key={categorie} value={categorie} />
          ))}
        </datalist>

        {Array.from({ length: nbAxes }, (_, index) => (
          <fieldset
            key={index}
            className="space-y-3 rounded-lg border border-ardoise-100 bg-ardoise-50/60 p-4"
          >
            <legend className="text-xs font-semibold tracking-wide text-ardoise-500 uppercase">
              Axe {index + 1}
            </legend>

            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">
                Catégorie{index === 0 && <span className="ms-0.5 text-braise-600">*</span>}
              </label>
              <input
                name="categorie"
                list="categories-proposables"
                placeholder="Choisissez une catégorie existante ou proposez-en une"
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
              <input name="thematique" className={CLASSE_CHAMP} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">Domaine</label>
              <input name="domaine" className={CLASSE_CHAMP} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ardoise-700">
                Activité liée au piment
              </label>
              <textarea name="activite" rows={2} className={`${CLASSE_CHAMP} resize-y`} />
            </div>
          </fieldset>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-ardoise-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ardoise-900">Vous</h2>
        <p className="text-xs text-ardoise-500">
          Utilisé uniquement pour vous recontacter en cas de doute sur la fiche.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ nom="proposantNom" libelle="Votre nom" obligatoire erreur={erreurs.proposantNom} />
          <Champ
            nom="proposantEmail"
            libelle="Votre e-mail"
            type="email"
            obligatoire
            erreur={erreurs.proposantEmail}
          />
        </div>

        <Champ
          nom="noteProposition"
          libelle="Précisions (facultatif)"
          multiligne
          erreur={erreurs.noteProposition}
          placeholder="Source de l'information, contexte…"
        />

        {/* Piège à robots : invisible pour les humains, rempli par les scripts. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor="siteInternet">Ne pas remplir</label>
          <input id="siteInternet" name="siteInternet" tabIndex={-1} autoComplete="off" />
        </div>
      </section>

      <BoutonEnvoi enCours="Envoi…">Envoyer la proposition</BoutonEnvoi>
    </form>
  );
}
