# PRISME QUIMPER — guide du dépôt

Site de l'association **PRISME QUIMPER** (`prismequimper.fr`). Le dépôt contient
**deux projets distincts** déployés ensemble sur GitHub Pages :

| Projet | Techno | Dossier | URL en ligne |
|---|---|---|---|
| **Site vitrine** | Jekyll (HTML/CSS) | racine (`index.html`, `bureau.html`, `intro.html`, `_config.yml`) | `https://prismequimper.fr/` |
| **Espace Bureau** | Vite + React + TypeScript + Tailwind + Supabase | `espace-bureau/` | `https://prismequimper.fr/portail/` |

> ℹ️ `bureau.html` (à la racine) est une **page vitrine** « Conseil
> d'Administration » — à ne pas confondre avec l'**application** React, servie
> sous `/portail/`.

## Déploiement

- Workflow unique : `.github/workflows/deploy.yml`, déclenché **sur push vers `main`**.
  Il construit la vitrine (Jekyll) → `/`, puis l'Espace Bureau (Vite) → `/portail/`.
- La source GitHub Pages doit rester sur **« GitHub Actions »** (pas « Deploy from a branch »).
- Deux secrets GitHub alimentent le build de l'app : `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. La base Supabase n'est PAS synchronisée
  automatiquement (voir ci-dessous).
- Routage SPA : un `404.html` à la racine redirige les routes profondes
  `/portail/*` vers l'app (technique GitHub Pages), restauré par un script dans
  `espace-bureau/index.html`.

## Flux de travail Git (IMPORTANT)

- **Plusieurs intervenants travaillent en parallèle sur ce dépôt** (dont un autre
  agent IA). **Toujours `git fetch` + merger `origin/main` AVANT de committer ou
  pousser**, pour éviter rejets et conflits.
- Travailler sur la branche `Ajouts-Evan`, puis merger dans `main` (ce qui
  déclenche le déploiement). Resynchroniser `Ajouts-Evan` sur `main` après merge.
- Branche par défaut pour les PR : `main`.

## Espace Bureau (`espace-bureau/`)

- Lancer en local : `cd espace-bureau && npm install && npm run dev`.
- **Bascule auto mock ↔ Supabase** : sans les variables `VITE_SUPABASE_*`,
  l'app tourne en mode local (localStorage, données de démo dans
  `src/lib/data/seed.ts`). Avec, elle utilise le vrai backend.
- Auth : `src/auth/AuthContext.tsx` (connexion, invitation/choix de mot de passe,
  rôles lus dans la table `profiles`). Permissions par rôle :
  `src/auth/permissions.ts`. Pages : `src/pages/`.
- Rôles (enum `role_app`) : `president`, `vice_president`, `secretaire`,
  `secretaire_adjoint`, `tresorier`, `tresorier_adjoint`, `membre`, `adherent`.

### Vérifier / construire

- Type-check : `cd espace-bureau && node node_modules/typescript/bin/tsc --noEmit`
- Build : `node node_modules/vite/bin/vite.js build`
- ⚠️ `npm run lint` / `npm run build` peuvent échouer en local avec
  `tsc: Permission denied` (bin non exécutable) ou un `MODULE_NOT_FOUND` sur
  `rollup/dist/native.js` (bug npm des binaires optionnels). Contournements :
  appeler les binaires via `node …`, et au besoin
  `npm install @rollup/rollup-linux-x64-gnu --no-save`. La CI (`npm ci` propre)
  n'a pas ce souci.

## Supabase (mise en route MANUELLE)

Le schéma de la base n'est pas déployé par GitHub. Il faut l'appliquer à la main :

1. **Tables** : exécuter `SUPABASE-ETAPE-1-creer-tables.sql` dans le SQL Editor.
2. **URLs** : Authentication → URL Configuration → Site URL
   `https://prismequimper.fr/portail/` + Redirect URL `…/portail/**`.
3. **Inviter les membres** : `espace-bureau/scripts/invite-bureau.mjs`
   (avec `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) ou invitations manuelles.
4. **Rôles** : `SUPABASE-ETAPE-4-roles.sql` (après les invitations).
- Migrations source : `espace-bureau/supabase/migrations/`. Edge Function de
  création de comptes : `espace-bureau/supabase/functions/create-account/`.
- Piège connu : les fonctions RLS qui lisent `profiles` doivent être
  `security definer` (sinon récursion infinie « stack depth limit exceeded »).
- Doc détaillée : `espace-bureau/docs/INTEGRATION-SUPABASE.md`.
- Les fichiers `SUPABASE-*.sql` contiennent des e-mails de membres : ils sont
  **exclus du site public** via `_config.yml` (ne pas les en retirer).

## Skills recommandés pour ce dépôt

- `/code-review` avant de merger un changement de code dans `main`.
- `/security-review` pour les changements touchant l'auth ou Supabase.
- `/deploy` (skill projet) pour publier : sync, merge `main`, suivi du run.
- `/supabase-setup` (skill projet) pour la procédure Supabase pas à pas.
