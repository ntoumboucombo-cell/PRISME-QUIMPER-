// ============================================================================
//  Generation de documents Word a partir des modeles .docx
//
//  Les modeles (dans public/modeles/) contiennent des balises { ... } facon
//  Jinja / python-docx-template. On les remplit cote navigateur avec
//  docxtemplater (aucun serveur necessaire), puis on telecharge le .docx.
//
//  Les modeles sont derives des originaux du dossier "modeles docx" de
//  l'association (en-tete et mise en page d'origine conservees).
// ============================================================================

import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'

export type TemplateId = 'pv' | 'attestation' | 'emargement'

interface TemplateInfo {
  file: string
  label: string
  fields: string[]
}

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  pv: {
    file: 'modele-pv.docx',
    label: 'Procès-verbal de réunion',
    fields: [
      'type_reunion',
      'reference',
      'date',
      'date_redaction',
      'heure_debut',
      'heure_fin',
      'lieu',
      'presents',
      'excuses',
      'secretaire',
      'ordre_du_jour',
      'deroule',
      'resolution_1',
      'resultat_1',
      'resolution_2',
      'resultat_2',
    ],
  },
  attestation: {
    file: 'modele-attestation-benevolat.docx',
    label: 'Attestation de bénévolat',
    fields: [
      'reference',
      'president',
      'benevole',
      'date_naissance',
      'adresse_benevole',
      'fonction',
      'date',
    ],
  },
  emargement: {
    file: 'modele-emargement.docx',
    label: "Feuille d'émargement",
    fields: ['objet', 'reference', 'date'],
  },
}

/** Base href de l'app (gere le sous-chemin eventuel en production). */
function templateUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}modeles/${file}`.replace(/([^:])\/{2,}/g, '$1/')
}

/**
 * Genere un document a partir d'un modele et le telecharge.
 * Les valeurs manquantes sont remplacees par une chaine vide (pas de "undefined").
 */
export async function generateDocx(
  templateId: TemplateId,
  data: Record<string, string | null | undefined>,
  outputName?: string,
): Promise<void> {
  const info = TEMPLATES[templateId]
  const res = await fetch(templateUrl(info.file))
  if (!res.ok) {
    throw new Error(`Modèle introuvable : ${info.file}`)
  }
  const content = await res.arrayBuffer()
  const zip = new PizZip(content)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true, // les sauts de ligne dans les valeurs sont conserves
    delimiters: { start: '{', end: '}' },
    nullGetter: () => '', // balise sans valeur -> vide
  })

  doc.render(data)

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  saveAs(blob, outputName || info.file.replace('modele-', ''))
}
