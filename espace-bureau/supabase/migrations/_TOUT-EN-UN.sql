-- ============================================================================
-- PRISME QUIMPER — Espace Bureau
-- SCRIPT COMBINE des migrations 0001 a 0004 — a executer UNE FOIS dans
-- l'editeur SQL de Supabase (Project -> SQL Editor -> New query -> Run).
-- ============================================================================

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
  -- Par defaut, tout nouveau compte est un simple adherent (aucun acces bureau) ;
  -- un administrateur eleve ensuite le role. ('lecture' n'existe pas dans l'enum.)
  role role_app not null default 'adherent',
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


-- ============================================================================
--  Migration 0002 : Row Level Security (droits d'acces)
--
--  Modele de droits (fonctions de l'association) :
--    - president / vice_president : tout (y compris gestion des comptes/roles)
--    - tresorier / tresorier_adjoint : comptabilite complete + adherents/projets/docs
--    - membre : adherents, projets, documents, agenda (PAS la comptabilite)
--    - adherent : consultation agenda / projets / documents
--  Toute personne non authentifiee n'a aucun acces.
-- ============================================================================

-- Helper : recupere le role du compte connecte.
-- SECURITY DEFINER : lit `profiles` sans declencher sa propre RLS (sinon
-- recursion infinie « stack depth limit exceeded »).
create or replace function current_role_app()
returns role_app
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Gestion des comptes / administration
create or replace function is_admin()
returns boolean language sql stable as $$
  select current_role_app() in ('president', 'vice_president');
$$;

-- Comptabilite : cotisations, dons, lignes budgetaires
create or replace function can_write_compta()
returns boolean language sql stable as $$
  select current_role_app() in ('president', 'vice_president', 'tresorier', 'tresorier_adjoint');
$$;

-- Lecture des donnees financieres
create or replace function can_read_compta()
returns boolean language sql stable as $$
  select current_role_app() in ('president', 'vice_president', 'tresorier', 'tresorier_adjoint');
$$;

-- Adherents : tout le bureau
create or replace function can_write_adherents()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'tresorier', 'tresorier_adjoint', 'membre');
$$;

-- Projets, documents, agenda : tout le bureau en ecriture
create or replace function can_write_projets()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'secretaire', 'secretaire_adjoint',
     'tresorier', 'tresorier_adjoint', 'membre');
$$;

-- Adherents : tout le bureau (mise a jour avec les secretaires)
create or replace function can_write_adherents()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'secretaire', 'secretaire_adjoint',
     'tresorier', 'tresorier_adjoint', 'membre');
$$;

-- Secretariat (PV, convocations, registre) : ecriture Secretaires + Presidence
create or replace function can_write_secretariat()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'secretaire', 'secretaire_adjoint');
$$;

create or replace function is_authenticated_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

-- Active RLS partout
alter table members enable row level security;
alter table profiles enable row level security;
alter table cotisations enable row level security;
alter table dons enable row level security;
alter table projects enable row level security;
alter table budget_lines enable row level security;
alter table documents enable row level security;
alter table agenda_events enable row level security;
alter table proces_verbaux enable row level security;
alter table convocations enable row level security;
alter table registre_entries enable row level security;

-- --- profiles --------------------------------------------------------------
-- Chacun lit son profil ; les admins lisent/gerent tout.
create policy "profiles_self_read" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_admin_all" on profiles for all
  using (is_admin()) with check (is_admin());

-- --- members (lecture/ecriture : bureau) -----------------------------------
create policy "members_read" on members for select
  using (can_write_adherents());
create policy "members_write" on members for all
  using (can_write_adherents()) with check (can_write_adherents());

-- --- cotisations (compta : president/vp/tresoriers) ------------------------
create policy "cotisations_read" on cotisations for select
  using (can_read_compta());
create policy "cotisations_write" on cotisations for all
  using (can_write_compta()) with check (can_write_compta());

-- --- dons (compta : president/vp/tresoriers) -------------------------------
create policy "dons_read" on dons for select
  using (can_read_compta());
create policy "dons_write" on dons for all
  using (can_write_compta()) with check (can_write_compta());

-- --- projects (lecture tous, ecriture membres+) ----------------------------
create policy "projects_read" on projects for select
  using (is_authenticated_member());
create policy "projects_write" on projects for all
  using (can_write_projets()) with check (can_write_projets());

-- --- budget_lines (projets : lecture tous, ecriture bureau) ----------------
create policy "budget_read" on budget_lines for select
  using (is_authenticated_member());
create policy "budget_write" on budget_lines for all
  using (can_write_projets()) with check (can_write_projets());

-- --- documents (lecture tous, ecriture bureau) -----------------------------
create policy "documents_read" on documents for select
  using (is_authenticated_member());
create policy "documents_write" on documents for all
  using (can_write_projets()) with check (can_write_projets());

-- --- agenda_events (lecture tous, ecriture bureau) -------------------------
create policy "agenda_read" on agenda_events for select
  using (is_authenticated_member());
create policy "agenda_write" on agenda_events for all
  using (can_write_projets()) with check (can_write_projets());

-- --- secretariat : lecture tout le bureau, ecriture secretaires + presidence
create policy "pv_read" on proces_verbaux for select
  using (is_authenticated_member());
create policy "pv_write" on proces_verbaux for all
  using (can_write_secretariat()) with check (can_write_secretariat());

create policy "convocations_read" on convocations for select
  using (is_authenticated_member());
create policy "convocations_write" on convocations for all
  using (can_write_secretariat()) with check (can_write_secretariat());

create policy "registre_read" on registre_entries for select
  using (is_authenticated_member());
create policy "registre_write" on registre_entries for all
  using (can_write_secretariat()) with check (can_write_secretariat());

-- ============================================================================
--  A la creation d'un compte Auth, creer automatiquement un profil "lecture".
--  Un admin pourra ensuite elever le role.
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email), 'adherent');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================================
--  Migration 0003 : e-mail denormalise dans `profiles`
--
--  L'application a besoin d'afficher l'e-mail des comptes (page Admin), mais la
--  table `auth.users` n'est pas lisible cote navigateur avec la cle anon.
--  On stocke donc une copie de l'e-mail dans `profiles`, renseignee a la
--  creation du compte par le trigger handle_new_user().
-- ============================================================================

alter table profiles add column if not exists email text;

-- Backfill pour les comptes deja existants.
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Mise a jour du trigger : renseigne aussi l'e-mail a la creation du compte.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    'adherent'
  );
  return new;
end;
$$;


-- ============================================================================
--  Migration 0004 : stockage des justificatifs (Supabase Storage)
--
--  Bucket PRIVE `justificatifs`. Les fichiers ne sont accessibles que via une
--  URL signee temporaire ; l'acces est filtre par les memes regles que les
--  projets (fonctions definies dans 0002_rls_policies.sql).
--
--  Arborescence des cles : <projectId>/<lineId>/<uid>-<fichier>
-- ============================================================================

-- Bucket prive (idempotent).
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;

-- RLS sur storage.objects est deja active par defaut sur Supabase.

-- Lecture : tout membre du bureau authentifie.
create policy "justif_read" on storage.objects for select
  using (bucket_id = 'justificatifs' and is_authenticated_member());

-- Ecriture : roles autorises a modifier les projets/documents.
create policy "justif_insert" on storage.objects for insert
  with check (bucket_id = 'justificatifs' and can_write_projets());

create policy "justif_update" on storage.objects for update
  using (bucket_id = 'justificatifs' and can_write_projets())
  with check (bucket_id = 'justificatifs' and can_write_projets());

create policy "justif_delete" on storage.objects for delete
  using (bucket_id = 'justificatifs' and can_write_projets());
