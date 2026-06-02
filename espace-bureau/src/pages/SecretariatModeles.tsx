import { useState } from 'react'
import { FileDown, FileText, HeartHandshake, ClipboardList, Loader2 } from 'lucide-react'
import { useTable } from '@/lib/data/store'
import { formatDate } from '@/lib/format'
import { generateDocx, type TemplateId } from '@/lib/docgen'
import { Card, Field } from '@/components/ui'

interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'date'
  placeholder?: string
}

const FORMS: Record<TemplateId, { icon: typeof FileText; intro: string; fields: FieldDef[] }> = {
  attestation: {
    icon: HeartHandshake,
    intro:
      "Attestation d'engagement bénévole à remettre à un membre actif (utile pour un CV, une démarche…).",
    fields: [
      { key: 'reference', label: 'Référence', placeholder: 'SEC-ATT-2026-01' },
      { key: 'president', label: 'Nom et prénom du Président', placeholder: 'Nayel TOUMBOU COMBO' },
      { key: 'benevole', label: 'Prénom NOM du bénévole', placeholder: 'Hugo KERAVEC' },
      { key: 'date_naissance', label: 'Date de naissance du bénévole', type: 'date' },
      { key: 'adresse_benevole', label: 'Adresse du bénévole', placeholder: '12 rue …, 29000 Quimper' },
      { key: 'fonction', label: 'Fonction / poste', placeholder: 'Directeur du pôle Communication' },
      { key: 'date', label: 'Date du jour', type: 'date' },
    ],
  },
  emargement: {
    icon: ClipboardList,
    intro: "Feuille d'émargement à imprimer pour faire signer les participants d'une réunion.",
    fields: [
      { key: 'objet', label: 'Réunion / événement', placeholder: 'Réunion de Bureau' },
      { key: 'reference', label: 'Référence', placeholder: 'SEC-AG-2026-01' },
      { key: 'date', label: 'Date de la réunion', type: 'date' },
    ],
  },
  pv: {
    icon: FileText,
    intro:
      'Procès-verbal vierge à compléter. Astuce : depuis l’onglet « Comptes rendus », le bouton « Générer le Word » remplit automatiquement un PV déjà saisi.',
    fields: [
      { key: 'type_reunion', label: 'Type de réunion (ex : ASSEMBLÉE GÉNÉRALE)' },
      { key: 'reference', label: 'Référence', placeholder: 'SEC-CR-2026-01' },
      { key: 'date', label: 'Date de la réunion', type: 'date' },
      { key: 'heure_debut', label: 'Heure de début', placeholder: '18h30' },
      { key: 'heure_fin', label: 'Heure de fin', placeholder: '20h00' },
      { key: 'lieu', label: 'Lieu', placeholder: 'Maison des Associations / Visioconférence' },
      { key: 'presents', label: 'Membres présents', type: 'textarea' },
      { key: 'excuses', label: 'Excusés / représentés', type: 'textarea' },
      { key: 'secretaire', label: 'Secrétaire de séance' },
      { key: 'ordre_du_jour', label: 'Ordre du jour', type: 'textarea' },
      { key: 'deroule', label: 'Résumé des discussions', type: 'textarea' },
      { key: 'resolution_1', label: 'Résolution n°1', placeholder: 'Validation du budget…' },
      { key: 'resultat_1', label: 'Résultat n°1', placeholder: "l'unanimité / la majorité" },
      { key: 'resolution_2', label: 'Résolution n°2', placeholder: 'Création du pôle…' },
      { key: 'resultat_2', label: 'Résultat n°2', placeholder: "l'unanimité / la majorité" },
      { key: 'date_redaction', label: 'Date de rédaction', type: 'date' },
    ],
  },
}

const ORDER: TemplateId[] = ['attestation', 'emargement', 'pv']
const LABELS: Record<TemplateId, string> = {
  attestation: 'Attestation de bénévolat',
  emargement: "Feuille d'émargement",
  pv: 'Procès-verbal',
}

export function ModelesTab() {
  const [selected, setSelected] = useState<TemplateId | null>(null)

  return (
    <div>
      <p className="mb-4 text-sm text-prisme-base/60">
        Générez un document Word à partir des modèles officiels de l'association. Le fichier reprend
        l'en-tête et la mise en page d'origine, est pré-rempli avec vos saisies, puis téléchargé —
        vous pouvez ensuite le finaliser dans Word.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {ORDER.map((id) => {
          const Icon = FORMS[id].icon
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`card text-left transition-transform hover:-translate-y-1 hover:shadow-gold ${
                selected === id ? 'border-prisme-gold' : ''
              }`}
            >
              <Icon className="mb-2 text-prisme-gold-mat" size={24} />
              <h3 className="font-serif text-lg text-prisme-base">{LABELS[id]}</h3>
              <p className="mt-1 text-xs text-prisme-base/50">{FORMS[id].intro}</p>
            </button>
          )
        })}
      </div>

      {selected && <ModeleForm key={selected} templateId={selected} />}
    </div>
  )
}

function ModeleForm({ templateId }: { templateId: TemplateId }) {
  const def = FORMS[templateId]
  const events = useTable('agenda_events')
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      // Les dates sont formatees en jj/mm/aaaa au moment de la generation.
      const data: Record<string, string> = {}
      for (const f of def.fields) {
        const raw = values[f.key] ?? ''
        data[f.key] = f.type === 'date' && raw ? formatDate(raw) : raw
      }
      await generateDocx(templateId, data)
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la génération.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mt-6">
      <h3 className="mb-4 font-serif text-xl text-prisme-gold-mat">{LABELS[templateId]}</h3>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {def.fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              className={f.type === 'textarea' ? 'sm:col-span-2' : ''}
            >
              {f.type === 'textarea' ? (
                <textarea
                  className="input"
                  rows={3}
                  value={values[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'date' ? (
                <input
                  type="date"
                  className="input"
                  value={values[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  className="input"
                  value={values[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))}
        </div>

        {/* Pre-remplissage rapide de la date depuis l'agenda */}
        {events.length > 0 && (
          <div className="rounded border border-prisme-gold-mat/15 bg-white/5 p-3 text-sm">
            <p className="mb-2 text-xs uppercase tracking-wide text-prisme-gold-mat">
              Pré-remplir la date depuis l'agenda
            </p>
            <div className="flex flex-wrap gap-2">
              {events.slice(0, 6).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className="rounded-full bg-prisme-gold/10 px-3 py-1 text-xs text-prisme-gold hover:bg-prisme-gold/20"
                  onClick={() =>
                    setValues((s) => ({
                      ...s,
                      date: ev.date,
                      lieu: ev.lieu ?? s.lieu ?? '',
                    }))
                  }
                >
                  {ev.titre} ({formatDate(ev.date)})
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Génération…
              </>
            ) : (
              <>
                <FileDown size={16} /> Générer et télécharger
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  )
}
