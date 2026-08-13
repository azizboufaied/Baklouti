-- Recherche insensible aux accents.
--
-- L'interface filtre côté client en normalisant le texte (lib/texte.ts), si bien
-- que « genetique » trouve « Génétique ». Le SQL, lui, faisait un ILIKE brut :
-- l'export et l'API renvoyaient donc moins de lignes que la carte n'en affichait
-- pour la même recherche. L'extension unaccent aligne les deux comportements.

create extension if not exists unaccent;

-- unaccent() est déclarée STABLE car elle dépend d'un dictionnaire modifiable.
-- On enveloppe l'appel dans une fonction IMMUTABLE : c'est ce qui permettra
-- d'indexer la recherche si le volume augmente.
create or replace function normaliser_texte(valeur text)
  returns text
  language sql
  immutable
  parallel safe
  returns null on null input
as $$
  select lower(public.unaccent('public.unaccent', valeur))
$$;
