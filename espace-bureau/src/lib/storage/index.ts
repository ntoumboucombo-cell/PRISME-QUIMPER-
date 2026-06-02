// ============================================================================
//  Couche de stockage des justificatifs.
//
//  Interface unique utilisee par l'application. Aujourd'hui : implementation
//  « mock » (fichiers dans le navigateur via IndexedDB). Demain : implementation
//  « SharePoint » via Microsoft Graph — il suffira de fournir graphStorage et de
//  l'activer ici, sans toucher aux composants.
// ============================================================================

import type { BudgetLine, Project } from '@/types'
import { mockStorage } from './mockStorage'

export interface UploadArgs {
  project: Pick<Project, 'id' | 'nom'>
  line: Pick<BudgetLine, 'id' | 'categorie' | 'libelle'>
  file: File
}

export interface UploadResult {
  /** Reference pour rouvrir le fichier (mock: "idb:<id>" ; SharePoint: webUrl). */
  ref: string
  /** Nom de fichier affiche. */
  name: string
  /** Chemin logique dans l'arborescence SharePoint. */
  path: string
  /** Taille en octets. */
  size: number
}

export interface StorageProvider {
  readonly kind: 'mock' | 'sharepoint'
  /** Televerse un justificatif et le range dans le dossier de la ligne. */
  uploadJustificatif(args: UploadArgs): Promise<UploadResult>
  /** Ouvre/telecharge un justificatif a partir de sa reference. */
  open(ref: string): Promise<void>
  /** Supprime le fichier sous-jacent (best effort). */
  remove(ref: string): Promise<void>
}

// Selection du fournisseur. Quand l'integration SharePoint sera prete, on
// basculera ici selon la configuration (Microsoft 365 connecte ou non).
export function getStorage(): StorageProvider {
  return mockStorage
}
