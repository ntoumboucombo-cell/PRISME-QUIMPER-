# Intégration Supabase — Espace Bureau PRISME QUIMPER

Ce guide explique comment activer le **vrai backend** (authentification + base de
données) à la place du mode local (localStorage).

L'application bascule **automatiquement** : tant que les variables Supabase ne sont
pas renseignées, elle reste en mode local. Dès qu'elles le sont, le code utilise
Supabase — sans aucune modification de code à faire.

---

## État de l'intégration

| Brique | État | Détail |
|---|---|---|
| **Authentification** | ✅ Branchée | Connexion, déconnexion, session, changement de mot de passe via `supabase.auth`. Rôle lu dans la table `profiles`. |
| **Sécurité (RLS)** | ✅ Fournie | Migrations SQL prêtes (`supabase/migrations/`), à exécuter dans votre projet. |
| **Bypass d'auth** | ✅ Sécurisé | Impossible à activer en production ou quand Supabase est configuré. |
| **Données métier** (adhérents, cotisations, dons, projets, documents, secrétariat) | ✅ Branchée | `store.ts` charge tout depuis Supabase au démarrage puis écrit en « write-through ». À **valider contre votre base** (voir plus bas). |
| **Gestion des comptes** (page Admin) | ✅ Branchée | Création, changement de rôle, activation/désactivation. La **création** passe par l'Edge Function `create-account` (à déployer — voir § 5). |
| **Stockage des justificatifs** | ✅ Branchée | Bucket privé `justificatifs` (Supabase Storage), URL signées à l'ouverture. À valider contre votre base. |

---

## 1. Créer le projet Supabase

1. Créez un compte et un projet gratuit sur https://supabase.com.
2. Dans **Project Settings → API**, récupérez :
   - **Project URL** (ex. `https://abcd1234.supabase.co`)
   - **anon public key** (clé publique, sans danger côté navigateur)

## 2. Exécuter les migrations

Dans l'éditeur **SQL** de Supabase, exécutez dans l'ordre :

1. `supabase/migrations/0001_initial_schema.sql` — crée les tables.
2. `supabase/migrations/0002_rls_policies.sql` — active la sécurité (RLS) + le
   trigger qui crée un `profile` à chaque nouveau compte.
3. `supabase/migrations/0003_profiles_email.sql` — ajoute l'e-mail dans `profiles`
   (nécessaire à l'affichage des comptes dans la page Admin).
4. `supabase/migrations/0004_storage_justificatifs.sql` — crée le bucket privé
   `justificatifs` et ses règles d'accès (pièces jointes des lignes de budget).

> Chaque nouveau compte Auth reçoit automatiquement un profil avec le rôle
> `adherent` (aucun accès au bureau). Un administrateur élève ensuite le rôle.

## 3. Configurer l'application

Créez un fichier `espace-bureau/.env.local` (ignoré par git) :

```bash
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_CLE_ANON_PUBLIC
```

> ⚠️ Ne mettez **jamais** la clé `service_role` dans ces variables `VITE_*` :
> elles sont incluses dans le code envoyé au navigateur. Seule la clé **anon**
> doit y figurer.

Au prochain `npm run dev`, l'application utilise Supabase. Le bandeau rouge de
« bypass » disparaît, et le bypass devient impossible à réactiver.

## 4. Inviter les membres du bureau (e-mail + mot de passe choisi par chacun)

Chaque membre reçoit un **e-mail d'invitation** Supabase ; en cliquant sur le
lien, il arrive sur l'écran « Choisir mon mot de passe » (composant
`src/pages/SetPassword.tsx`, déclenché par `passwordSetupRequired` dans
`AuthContext`). Une fois le mot de passe défini, il accède directement à l'espace.

**Pré-requis** — dans **Authentication → URL Configuration** :
- **Site URL** = `https://prismequimper.fr/bureau/`
- **Redirect URLs** contient `https://prismequimper.fr/bureau/**`

(Sans ça, le lien d'invitation renvoie vers la mauvaise page.)

### Option A — script automatique (recommandé)

Invite les 6 membres **et** pose leurs rôles en une commande :

```bash
cd espace-bureau
SUPABASE_URL="https://VOTRE-REF.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="(Project Settings → API → service_role)" \
node scripts/invite-bureau.mjs
```

> La clé `service_role` est **secrète** : passez-la en variable d'environnement,
> ne la committez jamais. Le script est ré-exécutable (une personne déjà invitée
> voit seulement son rôle remis à jour, sans nouvel e-mail).

### Option B — manuel via le tableau de bord

1. **Authentication → Users → Invite user** : saisir l'e-mail (à répéter pour
   chaque personne). L'e-mail d'invitation part automatiquement.
2. Une fois tout le monde invité, exécuter dans l'éditeur SQL le fichier
   **`supabase/migrations/_ROLES-membres.sql`** : il attribue à chaque e-mail le
   bon rôle et le nom affiché. (Ré-exécutable sans risque.)

> Le tout premier administrateur peut aussi être créé via **Add user** (avec
> « Auto-confirm user ») puis élevé en `president` par le SQL ci-dessus.

> Une fois les admins (`president` / `vice_president`) en place et l'Edge Function
> déployée (§ 5), tous les **comptes suivants** se créent directement depuis la
> page **Administration**.

## 5. Déployer l'Edge Function de création de comptes

Créer un utilisateur Auth nécessite la clé `service_role`, qui **ne doit jamais**
se trouver dans le navigateur. La création de comptes passe donc par une fonction
serveur : `supabase/functions/create-account/`.

Cette fonction (1) vérifie que l'appelant est **président ou vice-président**,
(2) crée l'utilisateur avec la clé `service_role`, (3) renseigne son profil
(rôle, nom, adhérent lié). En cas d'échec à l'étape 3, le compte Auth est
nettoyé pour ne pas laisser d'utilisateur orphelin.

Déploiement avec la [CLI Supabase](https://supabase.com/docs/guides/cli) :

```bash
# une seule fois : lier le dossier au projet
supabase link --project-ref VOTRE-REF-PROJET

# deployer la fonction
supabase functions deploy create-account
```

Les variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`
sont **injectées automatiquement** par la plateforme : rien à configurer.
`verify_jwt` reste activé (par défaut) — seule une personne connectée peut
appeler la fonction, et le code revérifie en plus qu'elle est administratrice.

Tant que la fonction n'est pas déployée, la création depuis la page Admin
renverra une erreur (le reste de la gestion des comptes — rôles, activation —
fonctionne sans elle).

---

## Comment fonctionne la couche de données en mode Supabase

`src/lib/data/store.ts` garde **exactement la même API** que le mode local
(`useTable`, `getTable`, `insert`, `update`, `remove`) — les pages n'ont pas
changé. En mode Supabase :

- **au démarrage**, toutes les tables sont chargées en mémoire (`select *`) puis
  les composants sont notifiés (au tout début, les listes sont vides le temps du
  chargement) ;
- **`useTable`** sert ce cache mémoire (re-render à chaque mutation) ;
- **`insert` / `update` / `remove`** mettent à jour le cache *immédiatement* (UI
  réactive) **puis** écrivent dans Supabase. En cas d'erreur, la table est
  resynchronisée depuis la base (et l'erreur est loggée en console).
- les **UUID** sont générés côté navigateur (`crypto.randomUUID`) et envoyés
  explicitement — le cache et la base restent ainsi cohérents.

La table mock `accounts` est mappée sur `profiles` (l'e-mail y est dénormalisé
par la migration 0003 ; le mot de passe reste géré par Supabase Auth).

### ⚠️ À valider contre votre base (non testé sans vos identifiants)

Le code compile (`npm run lint`), mais le chemin Supabase n'a pas pu être exécuté
ici. À vérifier une fois connecté :

1. **Lecture** : après connexion, les listes (adhérents, cotisations, projets…)
   se remplissent. Sinon, ouvrez la console (F12) : les erreurs RLS y
   apparaissent (`[store] chargement …`).
2. **Écriture** : créer/modifier/supprimer un élément le persiste bien (recharger
   la page pour confirmer). Les erreurs éventuelles sont loggées `[store] insert/
   update/remove …`.
3. **Champs vides** : le store convertit déjà `""` → `null` avant l'envoi (les
   colonnes date/numérique/enum refusent les chaînes vides).

### Création de comptes depuis la page Admin

La page Admin crée les comptes via l'Edge Function `create-account` (§ 5).
Le bouton « Nouveau compte » est disponible ; tant que la fonction n'est pas
déployée, la création renvoie une erreur.

Le changement de rôle et l'activation/désactivation fonctionnent, eux, sans la
fonction. La suppression d'un compte retire le profil mais **pas** l'utilisateur
Auth sous-jacent (cela demande la clé `service_role`).

## Stockage des justificatifs (Supabase Storage)

Les pièces jointes des lignes de budget sont déposées dans un bucket **privé**
`justificatifs` (créé par la migration 0004), rangées par
`<projectId>/<lineId>/<fichier>`. Le bucket n'étant pas public, l'ouverture d'un
fichier génère une **URL signée temporaire** (60 s). Le choix mock/Supabase est
automatique (`src/lib/storage/index.ts`).

À valider une fois connecté :

1. **Dépôt** : joindre un fichier à une ligne de budget (page Projet) le téléverse
   dans le bucket. En cas d'échec, le message « Le téléversement a échoué »
   s'affiche et le détail est loggé en console.
2. **Ouverture** : le bouton « Voir » ouvre le fichier via une URL signée.
3. **Suppression** : retirer le justificatif supprime aussi l'objet du bucket.

> Une intégration **SharePoint** reste possible à la place (l'abstraction
> `StorageProvider` le permet) — voir `INTEGRATION-SHAREPOINT.md`.
