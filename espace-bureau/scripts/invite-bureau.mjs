// ============================================================================
//  PRISME QUIMPER — Espace Bureau
//  Invitation des membres du bureau + attribution des roles, en une commande.
//
//  Pour chaque personne :
//    1) envoie un e-mail d'invitation Supabase (lien « definir mon mot de passe ») ;
//    2) renseigne son nom affiche et son role dans la table `profiles`.
//
//  PREREQUIS :
//    - les tables existent (script _TOUT-EN-UN.sql deja execute) ;
//    - deux variables d'environnement (NE PAS committer la cle service_role) :
//        SUPABASE_URL               = https://VOTRE-REF.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY  = (Project Settings -> API -> service_role)
//    - dans Supabase : Authentication -> URL Configuration ->
//        Site URL = https://prismequimper.fr/portail/
//        Redirect URLs contient https://prismequimper.fr/portail/**
//
//  USAGE (depuis le dossier espace-bureau/) :
//    SUPABASE_URL="https://xxxx.supabase.co" \
//    SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
//    node scripts/invite-bureau.mjs
//
//  Re-executable sans risque : une personne deja invitee voit seulement son role
//  remis a jour (pas de second e-mail).
// ============================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const REDIRECT_TO = process.env.INVITE_REDIRECT_TO || 'https://prismequimper.fr/portail/'

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    'Variables manquantes. Definir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Voir l\'en-tete de ce fichier pour un exemple.',
  )
  process.exit(1)
}

// Source de verite des comptes du bureau (e-mail -> nom affiche + role).
const MEMBERS = [
  { email: 'n.toumboucombo@gmail.com', display_name: 'Nayel (Président)', role: 'president' },
  { email: 'benardcloeetudiant@gmail.com', display_name: 'Cloé (Vice-présidente)', role: 'vice_president' },
  { email: 'romanebilien@laposte.net', display_name: 'Romane (Secrétaire générale)', role: 'secretaire' },
  { email: 'romain.broband@gmail.com', display_name: 'Romain (Secrétaire adjoint)', role: 'secretaire_adjoint' },
  { email: 'evan.struillou@outlook.fr', display_name: 'Evan (Trésorier adjoint)', role: 'tresorier_adjoint' },
  { email: 'camacb56@yahoo.fr', display_name: 'Camille (Communication)', role: 'membre' },
]

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Retrouve un utilisateur Auth par e-mail (pagination simple).
async function findUserByEmail(email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((u) => (u.email || '').toLowerCase() === target)
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

// Pose le role + le nom affiche dans `profiles` (le trigger a deja cree la ligne).
async function setProfile(userId, member) {
  const { error } = await admin
    .from('profiles')
    .update({ role: member.role, display_name: member.display_name })
    .eq('id', userId)
  if (error) throw error
}

let invited = 0
let updated = 0

for (const member of MEMBERS) {
  try {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(member.email, {
      data: { display_name: member.display_name },
      redirectTo: REDIRECT_TO,
    })

    if (error) {
      // Deja inscrit : on ne renvoie pas d'e-mail, on remet juste le role a jour.
      const already = /already.*regist|already.*exist/i.test(error.message || '')
      const user = already ? await findUserByEmail(member.email) : null
      if (user) {
        await setProfile(user.id, member)
        updated++
        console.log(`↻  ${member.email} — deja invite, role mis a jour (${member.role})`)
        continue
      }
      console.error(`✗  ${member.email} — echec : ${error.message}`)
      continue
    }

    if (data?.user) await setProfile(data.user.id, member)
    invited++
    console.log(`✓  ${member.email} — invitation envoyee, role ${member.role}`)
  } catch (e) {
    console.error(`✗  ${member.email} — erreur : ${e.message || e}`)
  }
}

console.log(`\nTermine : ${invited} invitation(s) envoyee(s), ${updated} role(s) mis a jour.`)
