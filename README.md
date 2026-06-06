# PRISME QUIMPER

Dépôt de l'association **PRISME QUIMPER** (art oratoire & rhétorique, Quimper).
Il contient **deux projets** distincts.

## 1. Site vitrine public — racine du dépôt

Site statique publié via **GitHub Pages** (Jekyll) sur le domaine
[prismequimper.fr](https://prismequimper.fr) (voir `CNAME`).

- `index.html`, `intro.html`, `about.md`, `contact.md` — pages du site
- `_config.yml` — configuration Jekyll
- photos des membres, `logo.PNG`, `statuts.pdf`

## 2. Espace Bureau — dossier [`espace-bureau/`](espace-bureau/)

Application **interne** de gestion de l'association (comptabilité, projets &
budget, adhérents, documents, secrétariat), avec comptes et droits d'accès.

Stack : React + TypeScript + Vite + Tailwind, Supabase (authentification +
base de données).

➡️ Voir [`espace-bureau/README.md`](espace-bureau/README.md) pour l'installation
et [`espace-bureau/docs/INTEGRATION-SUPABASE.md`](espace-bureau/docs/INTEGRATION-SUPABASE.md)
pour l'activation du backend.

> ℹ️ Les deux projets cohabitent volontairement dans le même dépôt. Seule la
> racine est publiée par GitHub Pages ; `espace-bureau/` est une application
> séparée qui se lance et se déploie indépendamment.

## Déploiement (GitHub Pages)

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
construit et déploie **les deux** projets en une fois :

- le **site vitrine** (Jekyll) → `prismequimper.fr/`
- l'**Espace Bureau** (Vite) → `prismequimper.fr/portail/`

### À faire une seule fois

1. **Settings → Pages → Build and deployment → Source = « GitHub Actions »**
   (au lieu de « Deploy from a branch »). Sans ça, le workflow ne prend pas effet.
2. Créer 2 *secrets* (**Settings → Secrets and variables → Actions**) — valeurs
   dans Supabase → Project Settings → API :
   - `VITE_SUPABASE_URL` — Project URL
   - `VITE_SUPABASE_ANON_KEY` — clé **anon public**

> ⚠️ Ne **jamais** mettre la clé `service_role` en secret de build : tout ce qui
> est `VITE_*` est inclus dans le JavaScript public. La `service_role` est
> injectée automatiquement dans l'Edge Function par Supabase (rien à faire).

Le déploiement se déclenche ensuite à chaque `push` sur `main` (ou manuellement
via l'onglet **Actions**).

## `modèles docx/`

Modèles de documents de l'association (PV, attestation de bénévolat, feuille
d'émargement) — également intégrés dans l'Espace Bureau.
