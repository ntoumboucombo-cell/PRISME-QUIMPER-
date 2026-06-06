// ============================================================================
//  Edge Function : creation d'un compte utilisateur.
//
//  Reservee aux administrateurs (president / vice-president). Utilise la cle
//  SERVICE_ROLE, disponible UNIQUEMENT cote serveur — elle n'est JAMAIS exposee
//  au navigateur.
//
//  Deploiement :  supabase functions deploy create-account
//  (les variables SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//   sont injectees automatiquement par la plateforme.)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ADMIN_ROLES = ['president', 'vice_president']
const VALID_ROLES = [
  'president',
  'vice_president',
  'secretaire',
  'secretaire_adjoint',
  'tresorier',
  'tresorier_adjoint',
  'membre',
  'adherent',
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Identifier l'appelant a partir de son jeton de session.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return json({ error: 'Non authentifié.' }, 401)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userData.user) return json({ error: 'Session invalide.' }, 401)

  // 2. Verifier que l'appelant est administrateur.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .single()
  if (
    !callerProfile ||
    callerProfile.active === false ||
    !ADMIN_ROLES.includes(callerProfile.role)
  ) {
    return json({ error: 'Accès refusé : réservé aux administrateurs.' }, 403)
  }

  // 3. Valider l'entree.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400)
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const display_name = String(body.display_name ?? '').trim()
  const role = String(body.role ?? 'adherent')
  const member_id = body.member_id ? String(body.member_id) : null

  if (!email || !password) return json({ error: 'E-mail et mot de passe requis.' }, 400)
  if (password.length < 6)
    return json({ error: 'Mot de passe trop court (min. 6 caractères).' }, 400)
  if (!VALID_ROLES.includes(role)) return json({ error: 'Rôle invalide.' }, 400)

  // 4. Creer l'utilisateur Auth (e-mail confirme d'office, pas d'e-mail envoye).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name || email },
  })
  if (createErr || !created.user) {
    return json({ error: createErr?.message ?? "Création de l'utilisateur impossible." }, 400)
  }

  // 5. Renseigner le profil (le trigger a deja cree une ligne par defaut 'adherent').
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .update({ display_name: display_name || email, role, member_id, email, active: true })
    .eq('id', created.user.id)
    .select('id, email, display_name, role, member_id, active, created_at')
    .single()
  if (profErr || !profile) {
    // Le compte Auth existe mais le profil n'a pas pu etre complete : on nettoie
    // pour ne pas laisser un utilisateur orphelin.
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: profErr?.message ?? 'Profil non créé.' }, 500)
  }

  return json({ ok: true, profile })
})
