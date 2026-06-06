-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  ÉTAPE 4 : attribuer les rôles aux 6 membres du bureau.
--
--  /!\ À FAIRE APRÈS avoir invité les 6 personnes
--      (Supabase → Authentication → Users → Invite user).
--      L'invitation crée le compte + un profil par défaut (rôle 'adherent') ;
--      ce script élève ensuite chacun au bon rôle.
--
--  À faire : Supabase → SQL Editor → New query → coller tout → Run.
--  Ré-exécutable sans risque.
-- ============================================================================

update profiles p
set role = v.role::role_app,
    display_name = v.display_name
from (values
  ('n.toumboucombo@gmail.com',     'president',          'Nayel (Président)'),
  ('benardcloeetudiant@gmail.com', 'vice_president',     'Cloé (Vice-présidente)'),
  ('romanebilien@laposte.net',     'secretaire',         'Romane (Secrétaire générale)'),
  ('romain.broband@gmail.com',     'secretaire_adjoint', 'Romain (Secrétaire adjoint)'),
  ('evan.struillou@outlook.fr',    'tresorier_adjoint',  'Evan (Trésorier adjoint)'),
  ('camacb56@yahoo.fr',            'membre',             'Camille (Communication)')
) as v(email, role, display_name)
join auth.users u on lower(u.email) = v.email
where p.id = u.id;

-- Vérification : affiche chaque membre du bureau et son rôle.
select u.email, p.display_name, p.role, p.active
from profiles p
join auth.users u on u.id = p.id
order by p.role;
