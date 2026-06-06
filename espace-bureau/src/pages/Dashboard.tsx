import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Clock,
  FolderKanban,
  FileText,
  Wallet,
} from 'lucide-react'
import { insert, remove, update, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatDate } from '@/lib/format'
import {
  EVENT_TYPE_LABELS,
  type AgendaEvent,
  type EventType,
} from '@/types'
import { Badge, Card, EmptyState, Field, Modal, PageHeader, TimeSelect } from '@/components/ui'

const TYPE_TONE: Record<EventType, 'gold' | 'green' | 'amber' | 'neutral'> = {
  reunion: 'gold',
  evenement: 'green',
  echeance: 'amber',
  autre: 'neutral',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function Dashboard() {
  const events = useTable('agenda_events')
  const projects = useTable('projects')
  const { user, can } = useAuth()
  const canWrite = can('agenda.write')
  const [editing, setEditing] = useState<Partial<AgendaEvent> | null>(null)

  const today = todayISO()
  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort((a, b) => (a.date + (a.heure ?? '')).localeCompare(b.date + (b.heure ?? '')))
    return {
      upcoming: sorted.filter((e) => e.date >= today),
      past: sorted.filter((e) => e.date < today).reverse(),
    }
  }, [events, today])

  const projName = (id?: string | null) => projects.find((p) => p.id === id)?.nom

  const save = (draft: Partial<AgendaEvent>) => {
    if (draft.id) {
      update('agenda_events', draft.id, draft)
    } else {
      insert('agenda_events', {
        titre: draft.titre ?? '',
        description: draft.description ?? '',
        type: draft.type ?? 'reunion',
        date: draft.date ?? today,
        heure: draft.heure ?? null,
        lieu: draft.lieu ?? '',
        project_id: draft.project_id ?? null,
      } as Omit<AgendaEvent, 'id' | 'created_at'>)
    }
    setEditing(null)
  }

  const firstName = user?.display_name?.split(' ')[0] ?? ''

  return (
    <div>
      <PageHeader
        title={`Bonjour ${firstName}`}
        subtitle="Bienvenue dans l'espace bureau — voici l'agenda de l'association"
        action={
          canWrite && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus size={16} /> Nouvel événement
            </button>
          )
        }
      />

      {/* Acces rapides */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <QuickLink to="/projets" icon={<FolderKanban size={20} />} label="Projets & Budget" />
        <QuickLink to="/documents" icon={<FileText size={20} />} label="Documents" />
        {can('finances.read') && (
          <QuickLink to="/comptabilite" icon={<Wallet size={20} />} label="Comptabilité" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda a venir */}
        <div className="lg:col-span-2">
          <h2 className="section-title mb-4 flex items-center gap-2 text-xl">
            <CalendarDays size={20} /> À venir
          </h2>
          {upcoming.length === 0 ? (
            <Card>
              <EmptyState message="Aucun événement à venir." />
            </Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  projectName={projName(e.project_id)}
                  canWrite={canWrite}
                  onEdit={() => setEditing(e)}
                  onDelete={() => {
                    if (confirm(`Supprimer « ${e.titre} » ?`)) remove('agenda_events', e.id)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Historique */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2 text-xl">
            <Clock size={18} /> Passés
          </h2>
          {past.length === 0 ? (
            <Card>
              <EmptyState message="Aucun événement passé." />
            </Card>
          ) : (
            <div className="space-y-2">
              {past.slice(0, 8).map((e) => (
                <Card key={e.id} className="py-3 opacity-70">
                  <p className="text-sm text-prisme-base">{e.titre}</p>
                  <p className="text-xs text-prisme-base/50">{formatDate(e.date)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EventForm draft={editing} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  )
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="card flex items-center gap-3 py-4 transition-transform hover:-translate-y-1 hover:shadow-gold"
    >
      <span className="text-prisme-gold-mat">{icon}</span>
      <span className="text-prisme-base">{label}</span>
    </Link>
  )
}

function EventRow({
  event,
  projectName,
  canWrite,
  onEdit,
  onDelete,
}: {
  event: AgendaEvent
  projectName?: string
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="flex items-start gap-4 py-4">
      <div className="flex w-16 shrink-0 flex-col items-center rounded bg-prisme-gold/10 py-2 text-center">
        <span className="text-lg font-semibold text-prisme-gold">
          {new Date(event.date).getDate()}
        </span>
        <span className="text-[0.65rem] uppercase text-prisme-gold-mat">
          {new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
        <span className="text-[0.6rem] text-prisme-base/50">
          {new Date(event.date).getFullYear()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg text-prisme-base">{event.titre}</h3>
          <Badge tone={TYPE_TONE[event.type]}>{EVENT_TYPE_LABELS[event.type]}</Badge>
        </div>
        {event.description && (
          <p className="mt-1 text-sm text-prisme-base/60">{event.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-prisme-base/50">
          {event.heure && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {event.heure}
            </span>
          )}
          {event.lieu && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {event.lieu}
            </span>
          )}
          {projectName && <span>· {projectName}</span>}
        </div>
      </div>
      {canWrite && (
        <div className="flex shrink-0 gap-1">
          <button className="btn-ghost p-2" onClick={onEdit}>
            <Pencil size={15} />
          </button>
          <button className="btn-ghost p-2 text-red-300" onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </Card>
  )
}

function EventForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<AgendaEvent>
  onCancel: () => void
  onSave: (d: Partial<AgendaEvent>) => void
}) {
  const projects = useTable('projects')
  const [form, setForm] = useState<Partial<AgendaEvent>>(draft)
  const set = (patch: Partial<AgendaEvent>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Modal open onClose={onCancel} title={draft.id ? 'Modifier l’événement' : 'Nouvel événement'} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <Field label="Titre">
          <input
            className="input"
            value={form.titre ?? ''}
            onChange={(e) => set({ titre: e.target.value })}
            required
          />
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
          <Field label="Type">
            <select
              className="input"
              value={form.type ?? 'reunion'}
              onChange={(e) => set({ type: e.target.value as EventType })}
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="input"
              value={form.date ?? ''}
              onChange={(e) => set({ date: e.target.value })}
              required
            />
          </Field>
          <Field label="Heure (optionnel)">
            <TimeSelect value={form.heure} onChange={(v) => set({ heure: v })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lieu (optionnel)">
            <input
              className="input"
              value={form.lieu ?? ''}
              onChange={(e) => set({ lieu: e.target.value })}
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
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}
