// Implementation « Supabase Storage » du stockage des justificatifs.
//
// Les fichiers sont deposes dans un bucket prive `justificatifs`, range par
// projet puis par ligne budgetaire : <projectId>/<lineId>/<uid>-<fichier>.
// La reference stockee sur la ligne est `sb:<cle de l'objet>` ; a l'ouverture,
// on genere une URL signee temporaire (le bucket n'est pas public).

import { uid } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { justificatifPath } from './paths'
import type { StorageProvider, UploadArgs, UploadResult } from './index'

export const BUCKET = 'justificatifs'
const PREFIX = 'sb:'
const SIGNED_URL_TTL = 60 // secondes

/** Nom de fichier ASCII sur pour une cle de stockage (sans espace ni accent). */
function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const base =
    (dot > 0 ? name.slice(0, dot) : name)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques combinants)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'document'
  return ext ? `${base}.${ext}` : base
}

export const supabaseStorage: StorageProvider = {
  kind: 'supabase',

  async uploadJustificatif({ project, line, file }: UploadArgs): Promise<UploadResult> {
    if (!supabase) throw new Error('Supabase non configuré.')
    const key = `${project.id}/${line.id}/${uid()}-${safeFileName(file.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) throw new Error(`Téléversement impossible : ${error.message}`)
    return {
      ref: `${PREFIX}${key}`,
      name: file.name,
      path: justificatifPath(project, line, file.name),
      size: file.size,
    }
  },

  async open(ref: string): Promise<void> {
    if (!ref.startsWith(PREFIX)) {
      // Lien direct (SharePoint / externe).
      window.open(ref, '_blank', 'noopener')
      return
    }
    if (!supabase) return
    const key = ref.slice(PREFIX.length)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, SIGNED_URL_TTL)
    if (error || !data) {
      alert("Le fichier n'a pas pu être ouvert.")
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  },

  async remove(ref: string): Promise<void> {
    if (ref.startsWith(PREFIX) && supabase) {
      await supabase.storage.from(BUCKET).remove([ref.slice(PREFIX.length)])
    }
  },
}
