-- ============================================================================
--  PRISME QUIMPER - Espace Bureau
--  Migration 0001 : schema initial
--  A executer dans l'editeur SQL Supabase une fois le projet cree.
-- ============================================================================

-- Extensions utiles
create extension if not exists "uuid-ossp";

-- --- Enums ------------------------------------------------------------------
create type role_app as enum (
  'president', 'vice_president', 'secretaire', 'secretaire_adjoint',
  'tresorier', 'tresorier_adjoint', 'membre', 'adherent'
);
create type event_type as enum ('reunion', 'evenement', 'echeance', 'autre');
create type instance_type as enum ('ag', 'ag_extra', 'ca', 'bureau');
create type convocation_statut as enum ('brouillon', 'envoyee');
create type registre_type as enum ('statuts', 'dirigeants', 'siege', 'autre');
create type member_status as enum ('adherent', 'actif', 'ancien');
create type civilite as enum ('Mme', 'M.', 'Autre');
create type payment_mode as enum ('espece', 'cheque', 'virement', 'cb', 'autre');
create type cotisation_status as enum ('paye', 'attente', 'annule');
create type don_type as enum ('ponctuel', 'regulier');
create type project_status as enum ('idee', 'valide', 'en_cours', 'cloture');
create type pole as enum ('culture', 'evenementiel', 'communication', 'partenariats', 'bureau');
create type budget_type as enum ('recette', 'depense');
create type doc_category as enum ('statuts', 'comptabilite', 'compte_rendu', 'communication', 'projet', 'autre');
create type doc_source as enum ('lien_m365', 'lien_externe', 'fichier');
create type office_kind as enum ('word', 'excel', 'powerpoint', 'pdf', 'autre');

-- --- Adherents -------------------------------------------------------------
create table members (
  id uuid primary key default uuid_generate_v4(),
  civilite civilite not null default 'Autre',
  nom text not null,
  prenom text not null,
  email text,
  telephone text,
  etablissement text,
  date_naissance date,
  statut member_status not null default 'adherent',
  fonction_bureau text,
  date_adhesion date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- --- Profils / comptes (lies a auth.users de Supabase) ----------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role role_app not null default 'lecture',
  member_id uuid references members(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- --- Cotisations -----------------------------------------------------------
create table cotisations (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references members(id) on delete cascade,
  saison text not null,
  montant numeric(10,2) not null default 0,
  date_paiement date,
  mode payment_mode,
  statut cotisation_status not null default 'attente',
  recu_emis boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index on cotisations (member_id);
create index on cotisations (saison);

-- --- Projets ---------------------------------------------------------------
create table projects (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  description text,
  pole pole not null default 'bureau',
  responsable_id uuid references members(id) on delete set null,
  statut project_status not null default 'idee',
  date_debut date,
  date_fin date,
  created_at timestamptz not null default now()
);

-- --- Dons ------------------------------------------------------------------
create table dons (
  id uuid primary key default uuid_generate_v4(),
  donateur_nom text not null,
  donateur_email text,
  montant numeric(10,2) not null default 0,
  date_don date not null default current_date,
  mode payment_mode not null default 'virement',
  type don_type not null default 'ponctuel',
  recu_fiscal_emis boolean not null default false,
  project_id uuid references projects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- --- Lignes budgetaires ----------------------------------------------------
create table budget_lines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  type budget_type not null,
  categorie text not null,
  libelle text not null,
  montant_prevu numeric(10,2) not null default 0,
  montant_reel numeric(10,2) not null default 0,
  justificatif_url text,
  justificatif_nom text,
  justificatif_path text,
  created_at timestamptz not null default now()
);
create index on budget_lines (project_id);

-- --- Documents -------------------------------------------------------------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  description text,
  categorie doc_category not null default 'autre',
  source doc_source not null default 'lien_m365',
  office_kind office_kind not null default 'autre',
  url text not null,
  project_id uuid references projects(id) on delete set null,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- Agenda / planning -----------------------------------------------------
create table agenda_events (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  description text,
  type event_type not null default 'reunion',
  date date not null,
  heure time,
  lieu text,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on agenda_events (date);

-- --- Secretariat : proces-verbaux ------------------------------------------
create table proces_verbaux (
  id uuid primary key default uuid_generate_v4(),
  instance instance_type not null default 'bureau',
  date date not null,
  titre text not null,
  ordre_du_jour text,
  decisions text,
  presents text,
  excuses text,
  document_url text,
  document_nom text,
  redige_par uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on proces_verbaux (date);

-- --- Secretariat : convocations --------------------------------------------
create table convocations (
  id uuid primary key default uuid_generate_v4(),
  instance instance_type not null default 'bureau',
  date_reunion date not null,
  heure time,
  lieu text,
  ordre_du_jour text,
  date_envoi date,
  statut convocation_statut not null default 'brouillon',
  event_id uuid references agenda_events(id) on delete set null,
  created_at timestamptz not null default now()
);

-- --- Secretariat : registre special des deliberations ----------------------
create table registre_entries (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  type registre_type not null default 'autre',
  objet text not null,
  description text,
  date_declaration date,
  reference text,
  document_url text,
  created_at timestamptz not null default now()
);
create index on registre_entries (date);
