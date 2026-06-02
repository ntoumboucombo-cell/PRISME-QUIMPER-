import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderKanban } from 'lucide-react'
import { insert, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatEuro, formatDate, uid } from '@/lib/format'
import { computeProjectBudget } from '@/lib/data/selectors'
import {
  POLE_LABELS,
  PROJECT_STATUS_LABELS,
  type BudgetLine,
  type Pole,
  type Project,
  type ProjectStatus,
} from '@/types'
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui'

const STATUS_TONE: Record<ProjectStatus, 'amber' | 'gold' | 'green' | 'neutral'> = {
  idee: 'neutral',
  valide: 'gold',
  en_cours: 'green',
  cloture: 'neutral',
}

// Template de depart : lignes pre-remplies a 0 pour demarrer un previsionnel.
const TEMPLATE_RECETTES = ['Subventions publiques', 'Partenariats', 'Billetterie']
const TEMPLATE_DEPENSES = ['Location de salle', 'Communication / impression', 'Restauration']

export function Projets() {
  const projects = useTable('projects')
  const budgetLines = useTable('budget_lines')
  const members = useTable('members')
  const { can } = useAuth()
  const canWrite = can('projets.write')
  const [adding, setAdding] = useState(false)

  const respName = (id?: string | null) => {
    const m = members.find((x) => x.id === id)
    return m ? `${m.prenom} ${m.nom}` : '—'
  }

  const create = (data: {
    project: Omit<Project, 'id' | 'created_at'>
    withTemplate: boolean
  }) => {
    const project = insert('projects', data.project)
    if (data.withTemplate) {
      const now = new Date().toISOString()
      const lines: BudgetLine[] = [
        ...TEMPLATE_RECETTES.map((categorie) => ({
          id: uid(),
          project_id: project.id,
          type: 'recette' as const,
          categorie,
          libelle: categorie,
          montant_prevu: 0,
          montant_reel: 0,
          created_at: now,
        })),
        ...TEMPLATE_DEPENSES.map((categorie) => ({
          id: uid(),
          project_id: project.id,
          type: 'depense' as const,
          categorie,
          libelle: categorie,
          montant_prevu: 0,
          montant_reel: 0,
          created_at: now,
        })),
      ]
      lines.forEach((l) => insert('budget_lines', l))
    }
    setAdding(false)
  }

  return (
    <div>
      <PageHeader
        title="Projets & Budget"
        subtitle="Prévisionnel budgétaire par projet"
        action={
          canWrite && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Nouveau projet
            </button>
          )
        }
      />

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState message="Aucun projet. Créez votre premier projet pour bâtir un prévisionnel." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const b = computeProjectBudget(budgetLines.filter((l) => l.project_id === p.id))
            return (
              <Link
                key={p.id}
                to={`/projets/${p.id}`}
                className="card transition-transform hover:-translate-y-1 hover:shadow-gold"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <FolderKanban className="text-prisme-gold-mat" size={22} />
                  <Badge tone={STATUS_TONE[p.statut]}>{PROJECT_STATUS_LABELS[p.statut]}</Badge>
                </div>
                <h3 className="font-serif text-lg text-prisme-base">{p.nom}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-prisme-gold-mat">
                  {POLE_LABELS[p.pole]}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-prisme-base/60">{p.description}</p>

                <div className="mt-4 space-y-1 border-t border-white/5 pt-3 text-sm">
                  <Row label="Recettes prév." value={formatEuro(b.recettesPrevu)} />
                  <Row label="Dépenses prév." value={formatEuro(b.depensesPrevu)} />
                  <div className="flex justify-between font-medium">
                    <span className="text-prisme-base/70">Solde prév.</span>
                    <span className={b.soldePrevu >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                      {formatEuro(b.soldePrevu)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-prisme-base/40">
                  {respName(p.responsable_id)} · {formatDate(p.date_debut)}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      {adding && <ProjectForm onClose={() => setAdding(false)} onSave={create} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-prisme-base/60">{label}</span>
      <span className="text-prisme-base/90">{value}</span>
    </div>
  )
}

function ProjectForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: { project: Omit<Project, 'id' | 'created_at'>; withTemplate: boolean }) => void
}) {
  const members = useTable('members')
  const [form, setForm] = useState<Omit<Project, 'id' | 'created_at'>>({
    nom: '',
    description: '',
    pole: 'evenementiel',
    responsable_id: null,
    statut: 'idee',
    date_debut: null,
    date_fin: null,
  })
  const [withTemplate, setWithTemplate] = useState(true)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Modal open onClose={onClose} title="Nouveau projet" wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ project: form, withTemplate })
        }}
        className="space-y-4"
      >
        <Field label="Nom du projet">
          <input className="input" value={form.nom} onChange={(e) => set({ nom: e.target.value })} required />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            rows={2}
            value={form.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pôle">
            <select className="input" value={form.pole} onChange={(e) => set({ pole: e.target.value as Pole })}>
              {Object.entries(POLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable">
            <select
              className="input"
              value={form.responsable_id ?? ''}
              onChange={(e) => set({ responsable_id: e.target.value || null })}
            >
              <option value="">— À définir —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.prenom} {m.nom}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Statut">
            <select
              className="input"
              value={form.statut}
              onChange={(e) => set({ statut: e.target.value as ProjectStatus })}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de début">
            <input
              type="date"
              className="input"
              value={form.date_debut ?? ''}
              onChange={(e) => set({ date_debut: e.target.value || null })}
            />
          </Field>
          <Field label="Date de fin">
            <input
              type="date"
              className="input"
              value={form.date_fin ?? ''}
              onChange={(e) => set({ date_fin: e.target.value || null })}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-prisme-base/80">
          <input
            type="checkbox"
            checked={withTemplate}
            onChange={(e) => setWithTemplate(e.target.checked)}
            className="accent-prisme-gold-mat"
          />
          Pré-remplir avec un modèle de budget (recettes & dépenses types)
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            Créer le projet
          </button>
        </div>
      </form>
    </Modal>
  )
}
