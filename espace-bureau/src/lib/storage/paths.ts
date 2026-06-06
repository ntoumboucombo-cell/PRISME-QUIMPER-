// Convention d'arborescence des justificatifs sur SharePoint.
//
//   Projets/
//    └─ <Nom du projet>/
//        └─ <Libellé de la ligne>/
//            └─ <fichier justificatif>
//
// Le dossier de ligne est cree « a la volee » au premier televersement, pour
// eviter des dizaines de dossiers vides. Le chemin calcule ici est stocke sur
// la ligne (champ justificatif_path) afin que le lien reste stable meme si la
// ligne est ensuite renommee.

import type { BudgetLine, Project } from '@/types'

/** Dossier racine, dans la bibliotheque de documents de l'association. */
export const ROOT_FOLDER = 'Projets'

/**
 * Nettoie un nom pour en faire un segment de dossier valide.
 * SharePoint interdit notamment : " * : < > ? / \ | et les noms vides.
 */
export function sanitizeSegment(name: string): string {
  const cleaned = (name || '')
    .replace(/[\"*:<>?/\\|#%]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '') // pas de point/espace en debut/fin
    .slice(0, 80)
  return cleaned || 'Sans nom'
}

export function projectFolderName(project: Pick<Project, 'nom'>): string {
  return sanitizeSegment(project.nom)
}

export function lineFolderName(line: Pick<BudgetLine, 'categorie' | 'libelle'>): string {
  const base = line.libelle && line.libelle.trim() ? line.libelle : line.categorie
  return sanitizeSegment(base)
}

export function projectFolderPath(project: Pick<Project, 'nom'>): string {
  return `${ROOT_FOLDER}/${projectFolderName(project)}`
}

export function lineFolderPath(
  project: Pick<Project, 'nom'>,
  line: Pick<BudgetLine, 'categorie' | 'libelle'>,
): string {
  return `${projectFolderPath(project)}/${lineFolderName(line)}`
}

export function justificatifPath(
  project: Pick<Project, 'nom'>,
  line: Pick<BudgetLine, 'categorie' | 'libelle'>,
  fileName: string,
): string {
  return `${lineFolderPath(project, line)}/${sanitizeSegment(fileName) || 'document'}`
}
