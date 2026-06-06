-- ============================================================================
--  >>> C'EST CE FICHIER-CI QU'IL FAUT EXÉCUTER MAINTENANT <<<
--
--  PRISME QUIMPER — corrige « Database error saving new user » (invitations).
--
--  Supabase → SQL Editor → New query → EFFACER le contenu → coller TOUT ce
--  fichier → Run.  Résultat attendu : « Success » + une ligne avec
--  security_definer = true et config = {search_path=public}.
--
--  (NE PAS relancer SUPABASE-ETAPE-1 : les tables existent déjà.)
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
    raise warning 'handle_new_user a echoue: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

select proname as fonction, prosecdef as security_definer, proconfig as config
from pg_proc
where proname = 'handle_new_user';
