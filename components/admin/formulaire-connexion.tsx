"use client";

import { useActionState } from "react";
import { BoutonEnvoi, Champ } from "./champs";
import { connexionAction } from "@/lib/actions";
import { ETAT_INITIAL } from "@/lib/formulaires";

export default function FormulaireConnexion() {
  const [etat, action] = useActionState(connexionAction, ETAT_INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Champ
        nom="motDePasse"
        libelle="Mot de passe"
        type="password"
        erreur={etat.erreurs?.motDePasse}
      />
      <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
    </form>
  );
}
