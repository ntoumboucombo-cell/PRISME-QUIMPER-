-- ============================================================================
--  PRISME QUIMPER — Espace Bureau
--  Attribution des roles aux membres du bureau.
--
--  /!\ A EXECUTER **APRES** avoir invite les 6 personnes
--      (Authentication -> Users -> Invite, ou le script d'invitation).
--      L'invitation cree le compte + un profil par defaut (role 'adherent') ;
--      ce script eleve ensuite chacun au bon role.
--
--  Idempotent : peut etre relance sans risque. La correspondance se fait par
--  e-mail (insensible a la casse) via auth.users, donc independante du backfill.
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

-- Verification : liste les profils du bureau et leur role.
select u.email, p.display_name, p.role, p.active
from profiles p
join auth.users u on u.id = p.id
order by p.role;
