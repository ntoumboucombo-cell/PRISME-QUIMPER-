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
| **Authentification** | ✅ Branchée (Phase 1) | Connexion, déconnexion, session, changement de mot de passe via `supabase.auth`. Rôle lu dans la table `profiles`. |
| **Sécurité (RLS)** | ✅ Fournie | Migrations SQL prêtes (`supabase/migrations/`), à exécuter dans votre projet. |
| **Bypass d'auth** | ✅ Sécurisé | Impossible à activer en production ou quand Supabase est configuré. |
| **Données métier** (adhérents, cotisations, dons, projets, documents, secrétariat) | 🚧 Phase 2 | Encore servies depuis localStorage. Migration de la couche `store.ts` à faire une fois l'auth validée. |
| **Création de comptes** depuis l'app (page Admin) | 🚧 Phase 2 | En Supabase, la création d'un utilisateur ne peut pas se faire avec la clé publique seule (voir plus bas). |

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

## Phase 2 — ce qu'il reste à brancher

### a) La couche de données (`src/lib/data/store.ts`)

Aujourd'hui, `store.ts` lit/écrit dans `localStorage` de façon **synchrone**.
Les pages consomment `useTable`, `insert`, `update`, `remove`. La migration
recommandée garde cette même API :

- au démarrage (si Supabase configuré), charger toutes les tables en mémoire
  (`select *`) puis notifier les composants ;
- `useTable` continue de servir le cache mémoire (re-render à chaque mutation) ;
- `insert`/`update`/`remove` mettent à jour le cache **et** écrivent dans Supabase
  (write-through). Les UUID sont générés par la base (`default uuid_generate_v4()`).

Point d'attention : la table mock `accounts` correspond, côté Supabase, à
`profiles` **+** `auth.users` (l'e-mail et le mot de passe sont dans `auth.users`,
pas dans `profiles`). La page **Admin** doit donc être adaptée séparément.

### b) La création de comptes depuis la page Admin

Créer un utilisateur Auth nécessite la clé `service_role`, qui **ne doit jamais**
se trouver dans le navigateur. Deux options :

1. **Edge Function** Supabase (recommandé) : une fonction serveur appelée par la
   page Admin, qui utilise la clé `service_role` côté serveur pour
   `auth.admin.createUser`.
2. **Manuellement** via le tableau de bord Supabase (comme pour le premier admin),
   tant que les comptes sont peu nombreux.

En attendant, la page Admin reste fonctionnelle en mode local ; en mode Supabase
elle servira surtout à **changer les rôles** et **activer/désactiver** les profils.

### c) Le stockage des justificatifs

`src/lib/storage/` est déjà abstrait (interface `StorageProvider`). On y branchera
soit **Supabase Storage**, soit **SharePoint** (voir `INTEGRATION-SHAREPOINT.md`).
