-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  CORRECTIF : « Database error saving new user » lors de la création / invitation
--  de comptes.
--
--  Cause : le trigger handle_new_user() (qui crée un profil à chaque nouveau
--  compte Auth) échoue, ce qui annule la création du compte côté Supabase Auth.
--  Raisons classiques : search_path manquant (table `profiles` non résolue) et/ou
--  droits du rôle d'authentification.
--
--  Ce correctif : recrée la fonction (SECURITY DEFINER + search_path), accorde les
--  droits au rôle d'auth, recrée le trigger, et VÉRIFIE la configuration.
--
--  À faire : Supabase → SQL Editor → New query → coller tout → Run.
--  Idempotent, sans risque, ne touche pas aux données.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    'adherent'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Le rôle d'authentification doit pouvoir accéder au schéma public et à la fonction.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- (Re)création propre du trigger.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- VÉRIFICATION — doit afficher security_definer = true et config = {search_path=public}
select proname            as fonction,
       prosecdef          as security_definer,
       proconfig          as config
from pg_proc
where proname = 'handle_new_user';
