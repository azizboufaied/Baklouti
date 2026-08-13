import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Authentification admin minimale : un mot de passe partagé, une session signée
 * en cookie HttpOnly. Suffisant pour un annuaire a un seul administrateur.
 * Si le projet gagne plusieurs comptes, remplacer ce module par un vrai
 * fournisseur d'identite — rien d'autre n'a besoin de changer.
 */

const NOM_COOKIE = "annuaire_session";
const DUREE_SECONDES = 60 * 60 * 12;

const MOT_DE_PASSE_DEFAUT = "piment";

function motDePasseAttendu(): string {
  return process.env.ADMIN_PASSWORD || MOT_DE_PASSE_DEFAUT;
}

function secret(): string {
  // Sans secret explicite, on en derive un du mot de passe : les sessions sont
  // invalidees si le mot de passe change, ce qui est le comportement souhaité.
  return process.env.SESSION_SECRET || `annuaire::${motDePasseAttendu()}`;
}

export function utiliseMotDePasseParDefaut(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

function signer(charge: string): string {
  return crypto.createHmac("sha256", secret()).update(charge).digest("hex");
}

/** Comparaison a temps constant, pour ne pas fuiter le mot de passe par chronometrage. */
function egaliteSure(a: string, b: string): boolean {
  const tamponA = Buffer.from(a);
  const tamponB = Buffer.from(b);
  if (tamponA.length !== tamponB.length) return false;
  return crypto.timingSafeEqual(tamponA, tamponB);
}

export function motDePasseValide(saisi: string): boolean {
  return egaliteSure(saisi, motDePasseAttendu());
}

export async function ouvrirSession(): Promise<void> {
  const expiration = Date.now() + DUREE_SECONDES * 1000;
  const charge = String(expiration);
  const magasin = await cookies();

  magasin.set(NOM_COOKIE, `${charge}.${signer(charge)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SECONDES,
  });
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(NOM_COOKIE);
}

export async function sessionActive(): Promise<boolean> {
  const valeur = (await cookies()).get(NOM_COOKIE)?.value;
  if (!valeur) return false;

  const separateur = valeur.lastIndexOf(".");
  if (separateur < 1) return false;

  const charge = valeur.slice(0, separateur);
  const signature = valeur.slice(separateur + 1);
  if (!egaliteSure(signature, signer(charge))) return false;

  const expiration = Number(charge);
  return Number.isFinite(expiration) && expiration > Date.now();
}
