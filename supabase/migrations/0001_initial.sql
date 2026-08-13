-- Schéma initial de Baklouti. Idempotent : réexécutable sans risque.
--
-- Deux niveaux, parce que le tableau source liste une ligne par
-- « établissement × catégorie » : CRRHAB et INRAT y apparaissent deux fois.
--   structures -> un établissement, un point sur la carte
--   activites  -> catégorie / thématique / domaine / activité (0..n par structure)

create table if not exists structures (
  id                    bigint generated always as identity primary key,
  slug                  text        not null unique,
  nom                   text        not null,
  sigle                 text,
  libelle               text        not null,
  localisation          text        not null,
  ville                 text,
  contact               text,
  site_web              text,
  lat                   double precision,
  lng                   double precision,
  -- « precision » est un mot-clé SQL : suffixé pour éviter toute ambiguïté.
  precision_geo         text        not null default 'inconnue'
                          check (precision_geo in
                            ('etablissement', 'localite', 'zone', 'national', 'inconnue')),
  national              boolean     not null default false,
  geocode_query         text,
  geocode_display_name  text,
  statut                text        not null default 'publie'
                          check (statut in ('publie', 'en_attente', 'rejete')),
  source                text        not null default 'import'
                          check (source in ('import', 'admin', 'proposition')),
  proposant_nom         text,
  proposant_email       text,
  note_proposition      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Une fiche localisée a soit les deux coordonnées, soit aucune.
  constraint coordonnees_completes check ((lat is null) = (lng is null))
);

create table if not exists activites (
  id            bigint generated always as identity primary key,
  structure_id  bigint  not null references structures(id) on delete cascade,
  categorie     text    not null,
  thematique    text,
  domaine       text,
  activite      text,
  position      integer not null default 0
);

create index if not exists idx_activites_structure on activites(structure_id);
create index if not exists idx_activites_categorie on activites(categorie);
create index if not exists idx_structures_statut   on structures(statut);

-- Sécurité Supabase : le schéma « public » est automatiquement exposé en API
-- REST avec la clé anonyme, qui est publique. Sans RLS, n'importe qui pourrait
-- lire et écrire ces tables. On active RLS sans définir la moindre politique :
-- l'API anonyme est donc entièrement fermée, tandis que l'application, qui se
-- connecte en direct avec le rôle propriétaire, continue de fonctionner.
alter table structures enable row level security;
alter table activites  enable row level security;
