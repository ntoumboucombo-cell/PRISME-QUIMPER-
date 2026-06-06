-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  CORRECTIF : « Database error saving new user » lors de la création / invitation
--  de comptes.
--
--  Le trigger handle_new_user() (création du profil à chaque nouveau compte Auth)
--  faisait échouer la création du compte. On le rend :
--    - SECURITY DEFINER + search_path = public (table `profiles` toujours résolue) ;
--    - NON BLOQUANT : si l'insertion du profil échoue, on logue un avertissement
--      mais on N'ANNULE PAS la création du compte (l'e-mail d'invitation part).
--      Le script invite-bureau.mjs renseigne ensuite le profil (upsert).
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
  begin
    insert into public.profiles (id, email, display_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'display_name', new.email),
      'adherent'
    )
    on conflict (id) do nothing;
  exception when others then
    -- Ne bloque jamais la création du compte ; l'erreur réelle reste visible
    -- dans Supabase → Logs → Postgres.
    raise warning 'handle_new_user a echoue: %', sqlerrm;
  end;
  return new;
end;
$$;

-- (Re)création propre du trigger.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- VÉRIFICATION — doit afficher security_definer = true et config = {search_path=public}
select proname   as fonction,
       prosecdef as security_definer,
       proconfig as config
from pg_proc
where proname = 'handle_new_user';
