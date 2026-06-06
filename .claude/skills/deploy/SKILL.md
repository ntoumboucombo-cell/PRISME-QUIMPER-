---
name: deploy
description: Publier le site PRISME QUIMPER (vitrine + Espace Bureau) sur GitHub Pages. À utiliser quand l'utilisateur demande de déployer, publier, mettre en ligne, ou pousser les changements en production. Synchronise avec le travail des autres intervenants, fusionne dans main, suit le run de déploiement et vérifie le site.
---

# Déploiement PRISME QUIMPER

Publie la vitrine (`/`) et l'Espace Bureau (`/portail/`) via le workflow
`.github/workflows/deploy.yml` (déclenché par un push sur `main`).

## Procédure

1. **Synchroniser** (d'autres intervenants poussent sur ce dépôt) :
   ```
   git fetch origin
   ```
   S'il y a des commits sur `origin/main` absents en local, les merger dans la
   branche de travail (`Ajouts-Evan`) avant de continuer. Signaler tout fichier
   modifié des deux côtés.

2. **Committer le travail** sur `Ajouts-Evan` (jamais directement sur `main` sans
   raison). Messages de commit en français, terminer par la ligne
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

3. **Fusionner dans `main`** (ce qui déclenche le déploiement) :
   ```
   git checkout main
   git fetch origin && git merge origin/main --ff-only
   git merge --no-ff Ajouts-Evan -m "Merge Ajouts-Evan: <résumé>"
   git push origin main
   ```

4. **Resynchroniser** la branche de travail :
   ```
   git checkout Ajouts-Evan && git merge main --ff-only && git push origin Ajouts-Evan
   ```

5. **Suivre le run** jusqu'au bout :
   ```
   gh run list --branch main --limit 1
   gh run watch <run-id> --exit-status
   ```

6. **Vérifier en ligne** (statut HTTP + contenu attendu) :
   ```
   curl -s -o /dev/null -w "HTTP %{http_code}\n" https://prismequimper.fr/
   curl -s -o /dev/null -w "HTTP %{http_code}\n" https://prismequimper.fr/portail/
   ```

## Notes

- Si le push sur `main` est rejeté (« fetch first »), c'est qu'un autre
  intervenant a poussé : `git fetch` + merge `origin/main`, puis re-pousser.
- Ne jamais retirer les `SUPABASE-*.sql` de l'`exclude` de `_config.yml`
  (ils contiennent des e-mails de membres).
- L'avertissement « Node.js 20 deprecated » dans les runs est non bloquant.
