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
| **Gestion des comptes** (page Admin) | ⚠️ Partielle | Changement de rôle + activation/désactivation : OK. **Création** d'un compte : via le dashboard Supabase (clé publique insuffisante — voir plus bas). |
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

## 4. Créer le premier administrateur

L'application ne peut pas (encore) créer le premier compte. Procédez via le
tableau de bord Supabase :

1. **Authentication → Users → Add user** : saisissez l'e-mail et un mot de passe,
   cochez « Auto-confirm user ».
2. Le trigger crée automatiquement un profil `adherent`. Élevez-le en
   administrateur via l'éditeur SQL :

   ```sql
   update profiles
   set role = 'president', display_name = 'Nayel (Président)'
   where id = (select id from auth.users where email = 'president@prismequimper.fr');
   ```

3. Connectez-vous dans l'application avec cet e-mail / mot de passe. Vous avez
   désormais accès à tout.

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

Créer un utilisateur Auth nécessite la clé `service_role`, qui **ne doit jamais**
se trouver dans le navigateur. La page Admin masque donc le bouton « Nouveau
compte » en mode Supabase. Pour créer un compte, deux options :

1. **Manuellement** via le tableau de bord Supabase (cf. § 4), tant que les
   comptes sont peu nombreux — **recommandé pour démarrer**.
2. **Edge Function** Supabase : une fonction serveur appelée par la page Admin,
   utilisant la clé `service_role` côté serveur pour `auth.admin.createUser`.

Le changement de rôle et l'activation/désactivation fonctionnent, eux, depuis la
page Admin. La suppression d'un compte retire le profil mais **pas** l'utilisateur
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
