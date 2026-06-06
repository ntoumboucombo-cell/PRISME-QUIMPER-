-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  ÉTAPE 1 : créer les tables, la sécurité et le stockage.
--
--  À FAIRE UNE SEULE FOIS :
--    Supabase → SQL Editor → New query → coller TOUT ce fichier → Run.
--    Résultat attendu : « Success. No rows returned ».
-- ============================================================================

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

-- ====================  SECURITE (Row Level Security)  =======================
-- SECURITY DEFINER : lit `profiles` sans declencher sa propre RLS (evite la
-- recursion infinie « stack depth limit exceeded »).
create or replace function current_role_app()
returns role_app language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;
create or replace function is_admin()
returns boolean language sql stable as $$
  select current_role_app() in ('president', 'vice_president');
$$;
create or replace function can_write_compta()
returns boolean language sql stable as $$
  select current_role_app() in ('president', 'vice_president', 'tresorier', 'tresorier_adjoint');
$$;
create or replace function can_read_compta()
returns boolean language sql stable as $$
  select current_role_app() in ('president', 'vice_president', 'tresorier', 'tresorier_adjoint');
$$;
create or replace function can_write_adherents()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'secretaire', 'secretaire_adjoint',
     'tresorier', 'tresorier_adjoint', 'membre');
$$;
create or replace function can_write_projets()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'secretaire', 'secretaire_adjoint',
     'tresorier', 'tresorier_adjoint', 'membre');
$$;
create or replace function can_write_secretariat()
returns boolean language sql stable as $$
  select current_role_app() in
    ('president', 'vice_president', 'secretaire', 'secretaire_adjoint');
$$;
create or replace function is_authenticated_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

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

create policy "profiles_self_read" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_admin_all" on profiles for all
  using (is_admin()) with check (is_admin());
create policy "members_read" on members for select using (can_write_adherents());
create policy "members_write" on members for all
  using (can_write_adherents()) with check (can_write_adherents());
create policy "cotisations_read" on cotisations for select using (can_read_compta());
create policy "cotisations_write" on cotisations for all
  using (can_write_compta()) with check (can_write_compta());
create policy "dons_read" on dons for select using (can_read_compta());
create policy "dons_write" on dons for all
  using (can_write_compta()) with check (can_write_compta());
create policy "projects_read" on projects for select using (is_authenticated_member());
create policy "projects_write" on projects for all
  using (can_write_projets()) with check (can_write_projets());
create policy "budget_read" on budget_lines for select using (is_authenticated_member());
create policy "budget_write" on budget_lines for all
  using (can_write_projets()) with check (can_write_projets());
create policy "documents_read" on documents for select using (is_authenticated_member());
create policy "documents_write" on documents for all
  using (can_write_projets()) with check (can_write_projets());
create policy "agenda_read" on agenda_events for select using (is_authenticated_member());
create policy "agenda_write" on agenda_events for all
  using (can_write_projets()) with check (can_write_projets());
create policy "pv_read" on proces_verbaux for select using (is_authenticated_member());
create policy "pv_write" on proces_verbaux for all
  using (can_write_secretariat()) with check (can_write_secretariat());
create policy "convocations_read" on convocations for select using (is_authenticated_member());
create policy "convocations_write" on convocations for all
  using (can_write_secretariat()) with check (can_write_secretariat());
create policy "registre_read" on registre_entries for select using (is_authenticated_member());
create policy "registre_write" on registre_entries for all
  using (can_write_secretariat()) with check (can_write_secretariat());

-- Profil cree automatiquement a chaque nouveau compte (avec e-mail denormalise).
alter table profiles add column if not exists email text;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    'adherent'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ====================  STOCKAGE (justificatifs, bucket prive)  ==============
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;

create policy "justif_read" on storage.objects for select
  using (bucket_id = 'justificatifs' and is_authenticated_member());
create policy "justif_insert" on storage.objects for insert
  with check (bucket_id = 'justificatifs' and can_write_projets());
create policy "justif_update" on storage.objects for update
  using (bucket_id = 'justificatifs' and can_write_projets())
  with check (bucket_id = 'justificatifs' and can_write_projets());
create policy "justif_delete" on storage.objects for delete
  using (bucket_id = 'justificatifs' and can_write_projets());
