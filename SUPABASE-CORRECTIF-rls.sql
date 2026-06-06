-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  CORRECTIF : boucle infinie des regles de securite (erreur « stack depth
--  limit exceeded » / code 54001) sur toutes les tables.
--  
--  Cause : current_role_app() et is_authenticated_member() lisent la table
--  `profiles`, dont la securite (RLS) rappelle ces memes fonctions -> recursion.
--  Solution : les passer en SECURITY DEFINER pour qu'elles lisent `profiles`
--  sans declencher la securite (donc sans boucle).
--
--  A faire : Supabase → SQL Editor → New query → coller tout → Run.
--  Sans risque, et ne touche pas aux donnees.
-- ============================================================================

create or replace function current_role_app()
returns role_app
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_authenticated_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;
