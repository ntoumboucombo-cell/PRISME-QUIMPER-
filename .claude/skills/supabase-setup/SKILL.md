---
name: supabase-setup
description: Mettre en route ou diagnostiquer le backend Supabase de l'Espace Bureau (tables, sécurité RLS, invitations des membres, rôles, Edge Function). À utiliser quand l'utilisateur parle de Supabase, de la base, des comptes/connexion de l'Espace Bureau, d'invitations, de rôles, ou rapporte des erreurs 404/500 venant de l'app.
---

# Mise en route Supabase — Espace Bureau

Projet Supabase : ref `ckydbaqrepgrmgbywkpf` (`ckydbaqrepgrmgbywkpf.supabase.co`).
La base n'est PAS synchronisée depuis GitHub : tout se fait à la main dans le
dashboard Supabase. Doc complète : `espace-bureau/docs/INTEGRATION-SUPABASE.md`.

## Étapes (dans l'ordre)

1. **Créer les tables** : SQL Editor → coller `SUPABASE-ETAPE-1-creer-tables.sql`
   → Run. (Inclut tables, RLS, trigger de profil, bucket de stockage.)
2. **Régler les URLs** : Authentication → URL Configuration →
   Site URL `https://prismequimper.fr/portail/` + Redirect URL `…/portail/**`.
3. **Inviter les 6 membres** (envoie les e-mails de choix de mot de passe) :
   - Automatique : `cd espace-bureau && SUPABASE_URL="https://ckydbaqrepgrmgbywkpf.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<clé secrète>" node scripts/invite-bureau.mjs`
   - Manuel : Authentication → Users → Invite user (×6).
4. **Attribuer les rôles** (APRÈS les invitations) : SQL Editor →
   `SUPABASE-ETAPE-4-roles.sql` → Run.
5. **Plus tard** : déployer l'Edge Function `create-account` via la CLI Supabase
   (`supabase functions deploy create-account`) pour créer les comptes suivants
   depuis la page Admin.

## Diagnostic (vérifier l'état réel de la base)

La clé publique `anon` est dans le bundle déployé. Pour sonder les tables :
```
JS=$(curl -s https://prismequimper.fr/portail/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
KEY=$(curl -s "https://prismequimper.fr/portail/$JS" | grep -oE 'sb_publishable_[A-Za-z0-9_-]+' | head -1)
URL="https://ckydbaqrepgrmgbywkpf.supabase.co"
curl -s -o /dev/null -w "%{http_code}\n" "$URL/rest/v1/members?select=*&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Interprétation :
- **404** / « Could not find the table » → tables pas encore créées (étape 1).
- **500** / « stack depth limit exceeded » (code 54001) → récursion RLS :
  appliquer `SUPABASE-CORRECTIF-rls.sql` (les fonctions lisant `profiles` doivent
  être `security definer`).
- **200** avec `[]` → OK (vide, mais la base répond ; RLS bloque l'accès anonyme).

## Rôles des membres (enum role_app)

president=Nayel · vice_president=Cloé · secretaire=Romane · secretaire_adjoint=Romain
· tresorier_adjoint=Evan · membre=Camille (communication, pas de rôle dédié).

## Sécurité

- La clé `service_role` est SECRÈTE : la passer en variable d'environnement,
  jamais la committer. L'app n'utilise que la clé publique `anon`.
- Ne jamais mettre les e-mails de membres dans un fichier publié par le site
  (les `SUPABASE-*.sql` sont exclus via `_config.yml`).
