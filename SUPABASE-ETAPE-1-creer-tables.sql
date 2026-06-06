-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  INSTALLATION COMPLÈTE DE LA BASE — version propre et RÉ-EXÉCUTABLE.
--
--  Ce fichier crée/maintient TOUT : tables, sécurité (RLS), trigger de profil
--  et stockage. Il inclut déjà les correctifs (search_path, trigger non bloquant).
--  Vous pouvez le relancer autant de fois que vous voulez : aucune erreur, il
--  ne casse rien et ne touche pas aux données existantes.
--
--  À FAIRE : Supabase → SQL Editor → New query → coller TOUT → Run.
--  Résultat attendu : « Success ».
-- ============================================================================

create extension if not exists "uuid-ossp";

-- --- Types énumérés (créés seulement s'ils n'existent pas déjà) --------------
do $$ begin create type role_app as enum ('president','vice_president','secretaire','secretaire_adjoint','tresorier','tresorier_adjoint','membre','adherent'); exception when duplicate_object then null; end $$;
do $$ begin create type event_type as enum ('reunion','evenement','echeance','autre'); exception when duplicate_object then null; end $$;
do $$ begin create type instance_type as enum ('ag','ag_extra','ca','bureau'); exception when duplicate_object then null; end $$;
do $$ begin create type convocation_statut as enum ('brouillon','envoyee'); exception when duplicate_object then null; end $$;
do $$ begin create type registre_type as enum ('statuts','dirigeants','siege','autre'); exception when duplicate_object then null; end $$;
do $$ begin create type member_status as enum ('adherent','actif','ancien'); exception when duplicate_object then null; end $$;
do $$ begin create type civilite as enum ('Mme','M.','Autre'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_mode as enum ('espece','cheque','virement','cb','autre'); exception when duplicate_object then null; end $$;
do $$ begin create type cotisation_status as enum ('paye','attente','annule'); exception when duplicate_object then null; end $$;
do $$ begin create type don_type as enum ('ponctuel','regulier'); exception when duplicate_object then null; end $$;
do $$ begin create type project_status as enum ('idee','valide','en_cours','cloture'); exception when duplicate_object then null; end $$;
do $$ begin create type pole as enum ('culture','evenementiel','communication','partenariats','bureau'); exception when duplicate_object then null; end $$;
do $$ begin create type budget_type as enum ('recette','depense'); exception when duplicate_object then null; end $$;
do $$ begin create type doc_category as enum ('statuts','comptabilite','compte_rendu','communication','projet','autre'); exception when duplicate_object then null; end $$;
do $$ begin create type doc_source as enum ('lien_m365','lien_externe','fichier'); exception when duplicate_object then null; end $$;
do $$ begin create type office_kind as enum ('word','excel','powerpoint','pdf','autre'); exception when duplicate_object then null; end $$;

-- --- Tables (créées seulement si absentes) ----------------------------------
create table if not exists members (
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

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role role_app not null default 'adherent',
  member_id uuid references members(id) on delete set null,
  active boolean not null default true,
  email text,
  created_at timestamptz not null default now()
);
-- Pour les bases déjà créées avant l'ajout de la colonne email :
alter table profiles add column if not exists email text;

create table if not exists cotisations (
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

create table if not exists projects (
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

create table if not exists dons (
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

create table if not exists budget_lines (
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

create table if not exists documents (
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

create table if not exists agenda_events (
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

create table if not exists proces_verbaux (
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

create table if not exists convocations (
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

create table if not exists registre_entries (
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

-- --- Index (créés seulement si absents) -------------------------------------
create index if not exists idx_cotisations_member on cotisations(member_id);
create index if not exists idx_cotisations_saison on cotisations(saison);
create index if not exists idx_budget_project   on budget_lines(project_id);
create index if not exists idx_agenda_date      on agenda_events(date);
create index if not exists idx_pv_date          on proces_verbaux(date);
create index if not exists idx_registre_date    on registre_entries(date);

-- ====================  SÉCURITÉ (Row Level Security)  =======================
-- Fonctions qui lisent `profiles` : SECURITY DEFINER + search_path = public
-- (sinon récursion RLS « stack depth limit exceeded »).
create or replace function current_role_app()
returns role_app language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;
create or replace function is_authenticated_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;
create or replace function is_admin()
returns boolean language sql stable as $$
  select current_role_app() in ('president','vice_president');
$$;
create or replace function can_write_compta()
returns boolean language sql stable as $$
  select current_role_app() in ('president','vice_president','tresorier','tresorier_adjoint');
$$;
create or replace function can_read_compta()
returns boolean language sql stable as $$
  select current_role_app() in ('president','vice_president','tresorier','tresorier_adjoint');
$$;
create or replace function can_write_adherents()
returns boolean language sql stable as $$
  select current_role_app() in ('president','vice_president','secretaire','secretaire_adjoint','tresorier','tresorier_adjoint','membre');
$$;
create or replace function can_write_projets()
returns boolean language sql stable as $$
  select current_role_app() in ('president','vice_president','secretaire','secretaire_adjoint','tresorier','tresorier_adjoint','membre');
$$;
create or replace function can_write_secretariat()
returns boolean language sql stable as $$
  select current_role_app() in ('president','vice_president','secretaire','secretaire_adjoint');
$$;

alter table members          enable row level security;
alter table profiles         enable row level security;
alter table cotisations      enable row level security;
alter table dons             enable row level security;
alter table projects         enable row level security;
alter table budget_lines     enable row level security;
alter table documents        enable row level security;
alter table agenda_events    enable row level security;
alter table proces_verbaux   enable row level security;
alter table convocations     enable row level security;
alter table registre_entries enable row level security;

-- Politiques : (re)créées proprement (drop si existe puis create).
drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles for select using (id = auth.uid() or is_admin());
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (is_admin()) with check (is_admin());

drop policy if exists "members_read" on members;
create policy "members_read" on members for select using (can_write_adherents());
drop policy if exists "members_write" on members;
create policy "members_write" on members for all using (can_write_adherents()) with check (can_write_adherents());

drop policy if exists "cotisations_read" on cotisations;
create policy "cotisations_read" on cotisations for select using (can_read_compta());
drop policy if exists "cotisations_write" on cotisations;
create policy "cotisations_write" on cotisations for all using (can_write_compta()) with check (can_write_compta());

drop policy if exists "dons_read" on dons;
create policy "dons_read" on dons for select using (can_read_compta());
drop policy if exists "dons_write" on dons;
create policy "dons_write" on dons for all using (can_write_compta()) with check (can_write_compta());

drop policy if exists "projects_read" on projects;
create policy "projects_read" on projects for select using (is_authenticated_member());
drop policy if exists "projects_write" on projects;
create policy "projects_write" on projects for all using (can_write_projets()) with check (can_write_projets());

drop policy if exists "budget_read" on budget_lines;
create policy "budget_read" on budget_lines for select using (is_authenticated_member());
drop policy if exists "budget_write" on budget_lines;
create policy "budget_write" on budget_lines for all using (can_write_projets()) with check (can_write_projets());

drop policy if exists "documents_read" on documents;
create policy "documents_read" on documents for select using (is_authenticated_member());
drop policy if exists "documents_write" on documents;
create policy "documents_write" on documents for all using (can_write_projets()) with check (can_write_projets());

drop policy if exists "agenda_read" on agenda_events;
create policy "agenda_read" on agenda_events for select using (is_authenticated_member());
drop policy if exists "agenda_write" on agenda_events;
create policy "agenda_write" on agenda_events for all using (can_write_projets()) with check (can_write_projets());

drop policy if exists "pv_read" on proces_verbaux;
create policy "pv_read" on proces_verbaux for select using (is_authenticated_member());
drop policy if exists "pv_write" on proces_verbaux;
create policy "pv_write" on proces_verbaux for all using (can_write_secretariat()) with check (can_write_secretariat());

drop policy if exists "convocations_read" on convocations;
create policy "convocations_read" on convocations for select using (is_authenticated_member());
drop policy if exists "convocations_write" on convocations;
create policy "convocations_write" on convocations for all using (can_write_secretariat()) with check (can_write_secretariat());

drop policy if exists "registre_read" on registre_entries;
create policy "registre_read" on registre_entries for select using (is_authenticated_member());
drop policy if exists "registre_write" on registre_entries;
create policy "registre_write" on registre_entries for all using (can_write_secretariat()) with check (can_write_secretariat());

-- --- Profil créé automatiquement à chaque nouveau compte Auth ---------------
-- NON BLOQUANT : si l'insertion du profil échoue, on ne casse pas la création
-- du compte (l'invitation part quand même). SECURITY DEFINER + search_path.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.profiles (id, email, display_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email), 'adherent')
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user a echoue: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ====================  STOCKAGE (justificatifs, bucket privé)  ==============
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;

drop policy if exists "justif_read" on storage.objects;
create policy "justif_read" on storage.objects for select
  using (bucket_id = 'justificatifs' and is_authenticated_member());
drop policy if exists "justif_insert" on storage.objects;
create policy "justif_insert" on storage.objects for insert
  with check (bucket_id = 'justificatifs' and can_write_projets());
drop policy if exists "justif_update" on storage.objects;
create policy "justif_update" on storage.objects for update
  using (bucket_id = 'justificatifs' and can_write_projets())
  with check (bucket_id = 'justificatifs' and can_write_projets());
drop policy if exists "justif_delete" on storage.objects;
create policy "justif_delete" on storage.objects for delete
  using (bucket_id = 'justificatifs' and can_write_projets());

select 'Installation PRISME QUIMPER : OK' as resultat;
