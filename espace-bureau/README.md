# PRISME QUIMPER — Espace Bureau

Application interne de gestion de l'association : **comptabilité** (cotisations, dons),
**projets & budget prévisionnel**, **base documentaire** (avec édition Office via Microsoft 365),
le tout protégé par un **système de comptes et de droits d'accès**.

## État actuel : mode « local » (aucun compte requis)

L'application fonctionne **entièrement dans le navigateur** : les données sont stockées
en `localStorage` et un jeu de démonstration est pré-chargé. On peut donc tout tester
sans Supabase ni Microsoft 365.

## Lancer en développement

```bash
cd espace-bureau
npm install      # déjà fait
npm run dev      # ouvre http://localhost:5173
```

## Comptes de démonstration

Mot de passe pour tous : `prisme`

| E-mail                          | Rôle              | Accès |
|---------------------------------|-------------------|-------|
| president@prismequimper.fr      | Administrateur    | Tout + gestion des comptes |
| tresorier@prismequimper.fr      | Trésorier         | Comptabilité complète |
| communication@prismequimper.fr  | Membre du bureau  | Lecture compta, écriture projets/docs |
| romain@prismequimper.fr         | Lecture seule     | Consultation uniquement |

Sur la page de connexion, un clic sur un e-mail de démo pré-remplit le formulaire.

## Structure

```
espace-bureau/
├─ src/
│  ├─ types/            Modèle de données (TypeScript)
│  ├─ lib/
│  │  ├─ data/          Store mock (localStorage), seed, calculs (sélecteurs)
│  │  ├─ supabase.ts    Client Supabase (inactif tant que .env non rempli)
│  │  └─ format.ts      Formatage € / dates
│  ├─ auth/             Authentification + matrice de permissions
│  ├─ components/       Layout, routes protégées, UI
│  └─ pages/            Dashboard, Adhérents, Cotisations, Dons, Projets, Documents, Admin
└─ supabase/migrations/ Schéma SQL + politiques de sécurité (RLS) pour plus tard
```

## Fonctionnalités

- **Tableau de bord** : trésorerie estimée, cotisations encaissées/en attente, dons,
  budget prévisionnel consolidé, graphique recettes/dépenses par projet.
- **Adhérents** : fiche complète, statut, fonction au bureau.
- **Cotisations** : suivi par saison, statut payé/en attente, mode de paiement, reçus.
- **Dons** : ponctuel/régulier, reçu fiscal, don fléché vers un projet.
- **Projets & Budget** : création avec **modèle budgétaire pré-rempli**, lignes recettes/dépenses,
  suivi **prévu vs réalisé** avec calcul d'écart, solde prévisionnel.
- **Documents** : base documentaire filtrable, liens d'édition Office en ligne (Microsoft 365).
- **Administration** : gestion des comptes, attribution des rôles, activation/désactivation.

## Architecture

- **Front** : React + Vite + TypeScript + Tailwind (charte or/bleu nuit du site vitrine).
- **Données** : aujourd'hui mock local ; demain **Supabase** (Postgres + Auth + RLS) — il suffira
  de remplir `.env` (voir `.env.example`) et de remplacer les fonctions de `src/lib/data/store.ts`
  par des appels Supabase, **sans toucher aux pages**.
- **Office** : les documents « Microsoft 365 » sont des **liens** vers des fichiers Word/Excel/PPT
  hébergés sur SharePoint/OneDrive → édition en ligne, co-édition, version unique partagée.

## Prochaines étapes (nécessitent des comptes)

1. Créer un projet **Supabase** gratuit → remplir `.env` → exécuter les migrations SQL
   (`supabase/migrations/`).
2. Demander **Microsoft 365 Business Basic – Nonprofit** pour l'association.
3. Déployer l'app (sous-domaine `bureau.prismequimper.fr` recommandé).
