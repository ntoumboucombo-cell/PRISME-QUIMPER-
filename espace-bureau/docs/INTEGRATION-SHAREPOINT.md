# Intégration SharePoint / Microsoft 365 (justificatifs de projets)

Ce document décrit comment brancher le **vrai** stockage SharePoint, le jour où
l'espace Microsoft 365 de l'association sera disponible. L'application est déjà
prête : il n'y aura qu'une implémentation à fournir, sans toucher aux pages.

## Principe

Les justificatifs (devis, factures…) attachés aux lignes de budget sont rangés
dans une arborescence prévisible :

```
Projets/
 └─ <Nom du projet>/
     └─ <Libellé de la ligne>/
         └─ <fichier>
```

- Le **dossier de projet** peut être créé à la création du projet.
- Le **dossier de ligne** est créé **à la volée**, au premier téléversement
  (évite les dossiers vides et les orphelins lors des renommages).
- Le **chemin** est enregistré sur la ligne (`budget_lines.justificatif_path`)
  pour garder un lien stable même après renommage.

Cette logique de chemins est centralisée dans
[`src/lib/storage/paths.ts`](../src/lib/storage/paths.ts).

## Où brancher le code

Tout passe par une interface unique : `StorageProvider`
([`src/lib/storage/index.ts`](../src/lib/storage/index.ts)).

- Aujourd'hui : `mockStorage` (fichiers dans le navigateur via IndexedDB).
- Demain : `sharepointStorage` (Microsoft Graph). Il suffira de l'implémenter
  puis de le renvoyer depuis `getStorage()` quand Microsoft 365 est configuré.

```ts
export function getStorage(): StorageProvider {
  return isM365Configured ? sharepointStorage : mockStorage
}
```

La méthode à implémenter :

```ts
uploadJustificatif({ project, line, file }): Promise<UploadResult>
```

## Implémentation Microsoft Graph (esquisse)

Prérequis :
1. **Microsoft 365** pour l'association (idéalement *Business Basic – Nonprofit*, gratuit).
2. Un **enregistrement d'application** dans Entra ID (Azure AD) avec les
   permissions déléguées `Files.ReadWrite.All` (ou `Sites.ReadWrite.All`).
3. Authentification côté navigateur via **MSAL** (`@azure/msal-browser`) pour
   obtenir un jeton d'accès.

Création de l'arborescence + upload (≤ 4 Mo : upload simple) :

```ts
// 1. Résoudre le drive de la bibliothèque de documents du site
//    GET /sites/{siteId}/drive

// 2. Créer les dossiers s'ils n'existent pas (idempotent)
//    POST /drives/{driveId}/root:/Projets/<projet>:/children
//    body: { name: "<ligne>", folder: {}, "@microsoft.graph.conflictBehavior": "replace" }

// 3. Téléverser le fichier dans le dossier de la ligne
//    PUT /drives/{driveId}/root:/Projets/<projet>/<ligne>/<fichier>:/content
//    body: <octets du fichier>
//    → la réponse contient webUrl : on le stocke dans justificatif_url
```

Pour les fichiers volumineux (> 4 Mo), utiliser une *upload session*
(`createUploadSession`) et envoyer le fichier par tranches.

`UploadResult.ref` doit contenir le `webUrl` renvoyé par Graph : la méthode
`open(ref)` ouvrira alors directement le fichier dans Office en ligne.

## Sécurité

Les permissions d'accès (qui peut téléverser) restent gérées par l'application
(rôles du bureau) et, côté base, par les politiques RLS. L'accès aux dossiers
SharePoint eux-mêmes sera restreint au groupe Microsoft 365 du bureau.
