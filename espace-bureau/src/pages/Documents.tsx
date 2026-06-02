import { useState } from 'react'
import {
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  File as FileIcon,
} from 'lucide-react'
import { insert, remove, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatDate } from '@/lib/format'
import {
  DOC_CATEGORY_LABELS,
  type DocCategory,
  type DocSource,
  type DocumentItem,
  type OfficeKind,
} from '@/types'
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui'

const OFFICE_ICON: Record<OfficeKind, typeof FileText> = {
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
  pdf: FileIcon,
  autre: FileIcon,
}
const OFFICE_LABEL: Record<OfficeKind, string> = {
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  pdf: 'PDF',
  autre: 'Fichier',
}
const SOURCE_LABEL: Record<DocSource, string> = {
  lien_m365: 'Microsoft 365',
  lien_externe: 'Lien externe',
  fichier: 'Fichier',
}

export function Documents() {
  const documents = useTable('documents')
  const projects = useTable('projects')
  const { can } = useAuth()
  const canWrite = can('documents.write')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<DocCategory | 'all'>('all')

  const filtered = documents
    .filter((d) => filter === 'all' || d.categorie === filter)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const projName = (id?: string | null) => projects.find((p) => p.id === id)?.nom

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Base documentaire de l'association — édition en ligne via Microsoft 365"
        action={
          canWrite && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Ajouter un document
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Tous
        </FilterChip>
        {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(k as DocCategory)}>
            {v}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState message="Aucun document dans cette catégorie." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const Icon = OFFICE_ICON[d.office_kind]
            return (
              <div key={d.id} className="card flex flex-col">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2 text-prisme-gold-mat">
                    <Icon size={22} />
                    <span className="text-xs uppercase tracking-wide">
                      {OFFICE_LABEL[d.office_kind]}
                    </span>
                  </div>
                  <Badge tone={d.source === 'lien_m365' ? 'blue' : 'neutral'}>
                    {SOURCE_LABEL[d.source]}
                  </Badge>
                </div>
                <h3 className="font-serif text-lg text-prisme-base">{d.titre}</h3>
                {d.description && (
                  <p className="mt-1 text-sm text-prisme-base/60">{d.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-prisme-base/40">
                  <span>{DOC_CATEGORY_LABELS[d.categorie]}</span>
                  {projName(d.project_id) && <span>· {projName(d.project_id)}</span>}
                  <span>· maj {formatDate(d.updated_at)}</span>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline flex-1"
                  >
                    <ExternalLink size={15} /> Ouvrir / Éditer
                  </a>
                  {canWrite && (
                    <button
                      className="btn-ghost p-2 text-red-300"
                      onClick={() => {
                        if (confirm(`Retirer « ${d.titre} » de la base ?`)) remove('documents', d.id)
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-prisme-accent/30 bg-prisme-accent/5 p-4 text-sm text-prisme-base/70">
        <strong className="text-prisme-base">À propos de l'édition Office :</strong> les documents
        « Microsoft 365 » pointent vers un fichier Word/Excel/PowerPoint hébergé sur SharePoint/OneDrive.
        En cliquant, il s'ouvre dans Office en ligne avec co-édition et <em>une seule version pour
        tout le monde</em>. (Ces liens seront actifs une fois l'espace Microsoft 365 de l'association configuré.)
      </div>

      {adding && (
        <DocumentForm
          onClose={() => setAdding(false)}
          onSave={(data) => {
            insert('documents', data)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? 'bg-prisme-gold/20 text-prisme-gold'
          : 'bg-white/5 text-prisme-base/60 hover:text-prisme-base'
      }`}
    >
      {children}
    </button>
  )
}

function DocumentForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (d: Omit<DocumentItem, 'id' | 'created_at'>) => void
}) {
  const projects = useTable('projects')
  const { user } = useAuth()
  const now = new Date().toISOString()
  const [form, setForm] = useState<Omit<DocumentItem, 'id' | 'created_at'>>({
    titre: '',
    description: '',
    categorie: 'autre',
    source: 'lien_m365',
    office_kind: 'word',
    url: '',
    project_id: null,
    uploaded_by: user?.id ?? null,
    updated_at: now,
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Modal open onClose={onClose} title="Ajouter un document" wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ ...form, updated_at: new Date().toISOString() })
        }}
        className="space-y-4"
      >
        <Field label="Titre">
          <input className="input" value={form.titre} onChange={(e) => set({ titre: e.target.value })} required />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            rows={2}
            value={form.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Catégorie">
            <select
              className="input"
              value={form.categorie}
              onChange={(e) => set({ categorie: e.target.value as DocCategory })}
            >
              {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de fichier">
            <select
              className="input"
              value={form.office_kind}
              onChange={(e) => set({ office_kind: e.target.value as OfficeKind })}
            >
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="pdf">PDF</option>
              <option value="autre">Autre</option>
            </select>
          </Field>
          <Field label="Source">
            <select
              className="input"
              value={form.source}
              onChange={(e) => set({ source: e.target.value as DocSource })}
            >
              <option value="lien_m365">Microsoft 365</option>
              <option value="lien_externe">Lien externe</option>
              <option value="fichier">Fichier</option>
            </select>
          </Field>
        </div>
        <Field label="Lien (URL SharePoint / OneDrive ou lien externe)">
          <input
            className="input"
            value={form.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://…sharepoint.com/…"
            required
          />
        </Field>
        <Field label="Projet associé (optionnel)">
          <select
            className="input"
            value={form.project_id ?? ''}
            onChange={(e) => set({ project_id: e.target.value || null })}
          >
            <option value="">— Aucun —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            Ajouter
          </button>
        </div>
      </form>
    </Modal>
  )
}
