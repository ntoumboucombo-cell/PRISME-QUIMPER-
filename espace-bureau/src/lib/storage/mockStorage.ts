// Implementation « mock » du stockage : les fichiers televerses sont conserves
// dans le navigateur (IndexedDB). Le chemin SharePoint cible est neanmoins
// calcule et conserve, pour preparer la bascule vers Microsoft Graph.

import { uid } from '@/lib/format'
import { idbDelete, idbGet, idbPut } from './idb'
import { justificatifPath } from './paths'
import type { StorageProvider, UploadArgs, UploadResult } from './index'

const PREFIX = 'idb:'

export const mockStorage: StorageProvider = {
  kind: 'mock',

  async uploadJustificatif({ project, line, file }: UploadArgs): Promise<UploadResult> {
    const fileId = uid()
    await idbPut(fileId, file)
    return {
      ref: `${PREFIX}${fileId}`,
      name: file.name,
      path: justificatifPath(project, line, file.name),
      size: file.size,
    }
  },

  async open(ref: string): Promise<void> {
    if (ref.startsWith(PREFIX)) {
      const blob = await idbGet(ref.slice(PREFIX.length))
      if (!blob) {
        alert("Le fichier n'a pas été trouvé (stockage local).")
        return
      }
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      // On libere l'URL apres un court delai (le temps que l'onglet l'ait lue).
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      // Lien direct (SharePoint / externe).
      window.open(ref, '_blank', 'noopener')
    }
  },

  async remove(ref: string): Promise<void> {
    if (ref.startsWith(PREFIX)) {
      await idbDelete(ref.slice(PREFIX.length))
    }
  },
}
