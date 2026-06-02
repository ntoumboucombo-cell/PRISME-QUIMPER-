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

## `modèles docx/`

Modèles de documents de l'association (PV, attestation de bénévolat, feuille
d'émargement) — également intégrés dans l'Espace Bureau.
