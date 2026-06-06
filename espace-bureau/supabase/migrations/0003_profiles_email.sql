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
