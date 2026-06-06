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
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email), 'adherent');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
