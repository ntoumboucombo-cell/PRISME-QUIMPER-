-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  CORRECTIF : « Database error saving new user » lors de la création / invitation
--  de comptes.
--
--  Cause : le trigger handle_new_user() (qui crée un profil à chaque nouveau
--  compte Auth) est SECURITY DEFINER mais sans search_path explicite. Au moment
--  où Supabase Auth crée l'utilisateur, la table `profiles` n'est pas résolue,
--  l'insertion échoue, et toute la création du compte est annulée.
--
--  Solution : fixer search_path = public et schématiser la table (public.profiles).
--  Le trigger on_auth_user_created existant pointe déjà sur cette fonction :
--  il suffit de remplacer le corps de la fonction.
--
--  À faire : Supabase → SQL Editor → New query → coller tout → Run.
--  Sans risque, ne touche pas aux données.
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
  );
  return new;
end;
$$;
