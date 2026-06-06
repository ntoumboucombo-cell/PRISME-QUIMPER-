import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Paperclip,
  X,
  Upload,
  FolderTree,
  Folder,
  FileCheck2,
  Loader2,
} from 'lucide-react'
import { insert, remove, update, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatEuro, formatDate } from '@/lib/format'
import { computeProjectBudget } from '@/lib/data/selectors'
import { getStorage } from '@/lib/storage'
import { lineFolderName, projectFolderName, ROOT_FOLDER } from '@/lib/storage/paths'
import {
  DEPENSE_CATEGORIES,
  POLE_LABELS,
  PROJECT_STATUS_LABELS,
  RECETTE_CATEGORIES,
  type BudgetLine,
  type BudgetType,
  type Project,
} from '@/types'
import { Badge, Card, Field, Modal, PageHeader, StatCard } from '@/components/ui'

export function ProjetDetail() {
  const { id } = useParams<{ id: string }>()
  const projects = useTable('projects')
  const budgetLines = useTable('budget_lines')
  const members = useTable('members')
  const { can } = useAuth()
  const canWrite = can('projets.write')

  const project = projects.find((p) => p.id === id)
  if (!project) {
    return (
      <div className="card mx-auto mt-12 max-w-md text-center">
        <p className="text-prisme-base/70">Projet introuvable.</p>
        <Link to="/projets" className="btn-outline mt-4">
          Retour aux projets
        </Link>
      </div>
    )
  }

  const lines = budgetLines.filter((l) => l.project_id === project.id)
  const recettes = lines.filter((l) => l.type === 'recette')
  const depenses = lines.filter((l) => l.type === 'depense')
  const b = computeProjectBudget(lines)
  const resp = members.find((m) => m.id === project.responsable_id)

  const addLine = (type: BudgetType) => {
    const cat = type === 'recette' ? RECETTE_CATEGORIES[0] : DEPENSE_CATEGORIES[0]
    insert('budget_lines', {
      project_id: project.id,
      type,
      categorie: cat,
      libelle: '',
      montant_prevu: 0,
      montant_reel: 0,
    } as Omit<BudgetLine, 'id' | 'created_at'>)
  }

  return (
    <div>
      <Link
        to="/projets"
        className="mb-4 inline-flex items-center gap-2 text-sm text-prisme-base/60 hover:text-prisme-gold"
      >
        <ArrowLeft size={16} /> Projets
      </Link>

      <PageHeader
        title={project.nom}
        subtitle={project.description || undefined}
        action={<Badge tone="gold">{PROJECT_STATUS_LABELS[project.statut]}</Badge>}
      />

      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-prisme-base/60">
        <span>{POLE_LABELS[project.pole]}</span>
        <span>Responsable : {resp ? `${resp.prenom} ${resp.nom}` : '—'}</span>
        <span>
          {formatDate(project.date_debut)}
          {project.date_fin ? ` → ${formatDate(project.date_fin)}` : ''}
        </span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recettes prévues" value={formatEuro(b.recettesPrevu)} tone="gold" />
        <StatCard label="Dépenses prévues" value={formatEuro(b.depensesPrevu)} tone="neutral" />
        <StatCard
          label="Solde prévisionnel"
          value={formatEuro(b.soldePrevu)}
          tone={b.soldePrevu >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Solde réel"
          value={formatEuro(b.soldeReel)}
          hint={`Recettes ${formatEuro(b.recettesReel)} · Dépenses ${formatEuro(b.depensesReel)}`}
          tone={b.soldeReel >= 0 ? 'green' : 'red'}
        />
      </div>

      <BudgetTable
        title="Recettes"
        type="recette"
        project={project}
        lines={recettes}
        categories={RECETTE_CATEGORIES as readonly string[]}
        canWrite={canWrite}
        onAdd={() => addLine('recette')}
      />
      <div className="h-6" />
      <BudgetTable
        title="Dépenses"
        type="depense"
        project={project}
        lines={depenses}
        categories={DEPENSE_CATEGORIES as readonly string[]}
        canWrite={canWrite}
        onAdd={() => addLine('depense')}
      />

      <div className="h-6" />
      <ArborescenceCard project={project} lines={lines} />
    </div>
  )
}

function BudgetTable({
  title,
  project,
  lines,
  categories,
  canWrite,
  onAdd,
}: {
  title: string
  type: BudgetType
  project: Project
  lines: BudgetLine[]
  categories: readonly string[]
  canWrite: boolean
  onAdd: () => void
}) {
  const totalPrevu = lines.reduce((a, l) => a + l.montant_prevu, 0)
  const totalReel = lines.reduce((a, l) => a + l.montant_reel, 0)

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title text-xl">{title}</h2>
        {canWrite && (
          <button className="btn-outline" onClick={onAdd}>
            <Plus size={15} /> Ligne
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-48">Catégorie</th>
              <th>Libellé</th>
              <th className="text-right">Prévu</th>
              <th className="text-right">Réalisé</th>
              <th className="text-right">Écart</th>
              <th>Justificatif</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 7 : 6} className="py-6 text-center text-sm text-prisme-base/40">
                  Aucune ligne. {canWrite && 'Ajoutez-en une pour démarrer le prévisionnel.'}
                </td>
              </tr>
            ) : (
              lines.map((l) => {
                const ecart = l.montant_reel - l.montant_prevu
                return (
                  <tr key={l.id}>
                    <td>
                      {canWrite ? (
                        <select
                          className="input py-1 text-xs"
                          value={l.categorie}
                          onChange={(e) => update('budget_lines', l.id, { categorie: e.target.value })}
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-prisme-base/80">{l.categorie}</span>
                      )}
                    </td>
                    <td>
                      {canWrite ? (
                        <input
                          className="input py-1"
                          value={l.libelle}
                          placeholder="Détail…"
                          onChange={(e) => update('budget_lines', l.id, { libelle: e.target.value })}
                        />
                      ) : (
                        <span className="text-prisme-base/80">{l.libelle || '—'}</span>
                      )}
                    </td>
                    <td className="text-right">
                      {canWrite ? (
                        <input
                          type="number"
                          step="0.01"
                          className="input w-28 py-1 text-right"
                          value={l.montant_prevu || ''}
                          onChange={(e) =>
                            update('budget_lines', l.id, { montant_prevu: Number(e.target.value) || 0 })
                          }
                        />
                      ) : (
                        formatEuro(l.montant_prevu)
                      )}
                    </td>
                    <td className="text-right">
                      {canWrite ? (
                        <input
                          type="number"
                          step="0.01"
                          className="input w-28 py-1 text-right"
                          value={l.montant_reel || ''}
                          onChange={(e) =>
                            update('budget_lines', l.id, { montant_reel: Number(e.target.value) || 0 })
                          }
                        />
                      ) : (
                        formatEuro(l.montant_reel)
                      )}
                    </td>
                    <td
                      className={`text-right text-sm ${
                        ecart === 0
                          ? 'text-prisme-base/40'
                          : ecart > 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
                      }`}
                    >
                      {ecart > 0 ? '+' : ''}
                      {formatEuro(ecart)}
                    </td>
                    <td>
                      <JustificatifCell project={project} line={l} canWrite={canWrite} />
                    </td>
                    {canWrite && (
                      <td>
                        <button
                          className="btn-ghost p-2 text-red-300"
                          onClick={() => remove('budget_lines', l.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-prisme-gold-mat/30 font-medium text-prisme-base">
              <td colSpan={2} className="py-2">
                Total {title.toLowerCase()}
              </td>
              <td className="text-right">{formatEuro(totalPrevu)}</td>
              <td className="text-right">{formatEuro(totalReel)}</td>
              <td className="text-right text-sm text-prisme-base/60">
                {formatEuro(totalReel - totalPrevu)}
              </td>
              <td></td>
              {canWrite && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

// Cellule "Justificatif" : permet de televerser un fichier (range dans le dossier
// de la ligne) ou de coller un lien existant, puis de l'ouvrir.
function JustificatifCell({
  project,
  line,
  canWrite,
}: {
  project: Project
  line: BudgetLine
  canWrite: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasJustif = Boolean(line.justificatif_url)
  const storage = getStorage()

  const openFile = () => {
    if (line.justificatif_url) storage.open(line.justificatif_url)
  }

  const detach = async () => {
    if (line.justificatif_url) await storage.remove(line.justificatif_url)
    update('budget_lines', line.id, {
      justificatif_url: null,
      justificatif_nom: null,
      justificatif_path: null,
    })
  }

  return (
    <>
      {hasJustif ? (
        <span className="flex items-center gap-1">
          <button
            onClick={openFile}
            className="flex items-center gap-1 text-xs text-prisme-gold hover:underline"
            title={line.justificatif_path ?? line.justificatif_nom ?? 'Justificatif'}
          >
            <FileCheck2 size={13} />
            {line.justificatif_nom || 'Voir'}
          </button>
          {canWrite && (
            <button
              className="text-prisme-base/40 hover:text-red-300"
              title="Retirer le justificatif"
              onClick={detach}
            >
              <X size={13} />
            </button>
          )}
        </span>
      ) : canWrite ? (
        <button
          className="flex items-center gap-1 text-xs text-prisme-base/50 hover:text-prisme-gold"
          onClick={() => setOpen(true)}
        >
          <Paperclip size={13} /> Joindre
        </button>
      ) : (
        <span className="text-xs text-prisme-base/30">—</span>
      )}

      {open && (
        <JustificatifModal project={project} line={line} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function JustificatifModal({
  project,
  line,
  onClose,
}: {
  project: Project
  line: BudgetLine
  onClose: () => void
}) {
  const storage = getStorage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkNom, setLinkNom] = useState('')

  const targetFolder = `${ROOT_FOLDER}/${projectFolderName(project)}/${lineFolderName(line)}`

  const handleUpload = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const res = await storage.uploadJustificatif({ project, line, file })
      update('budget_lines', line.id, {
        justificatif_url: res.ref,
        justificatif_nom: res.name,
        justificatif_path: res.path,
      })
      onClose()
    } catch (e) {
      setError("Le téléversement a échoué. Réessayez.")
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const saveLink = () => {
    if (!linkUrl.trim()) return
    update('budget_lines', line.id, {
      justificatif_url: linkUrl.trim(),
      justificatif_nom: linkNom.trim() || 'Justificatif',
      justificatif_path: `${targetFolder}/(lien externe)`,
    })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Joindre un justificatif" wide>
      <div className="space-y-5">
        {/* Destination */}
        <div className="rounded border border-prisme-gold-mat/20 bg-white/5 p-3 text-xs text-prisme-base/70">
          <p className="mb-1 flex items-center gap-2 text-prisme-gold-mat">
            <Folder size={14} /> Dossier de destination
          </p>
          <code className="break-all text-prisme-base/90">{targetFolder}/</code>
          <p className="mt-2 text-prisme-base/50">
            Le fichier sera rangé automatiquement dans ce dossier (créé à la volée s'il n'existe pas
            encore).
          </p>
        </div>

        {/* Televersement */}
        <div>
          <p className="label">Téléverser un fichier (devis, facture…)</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
            }}
          />
          <button
            type="button"
            className="btn-outline w-full"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Téléversement…
              </>
            ) : (
              <>
                <Upload size={16} /> Choisir un fichier
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-prisme-base/40">
          <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* Lien existant */}
        <div className="space-y-3">
          <Field label="Coller le lien d'un document existant">
            <input
              className="input"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…sharepoint.com/…"
            />
          </Field>
          <Field label="Nom affiché (optionnel)">
            <input
              className="input"
              value={linkNom}
              onChange={(e) => setLinkNom(e.target.value)}
              placeholder="Ex : Devis location salle"
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn-primary" disabled={busy || !linkUrl.trim()} onClick={saveLink}>
            Enregistrer le lien
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Apercu de l'arborescence du projet : montre ou seront ranges les justificatifs.
function ArborescenceCard({ project, lines }: { project: Project; lines: BudgetLine[] }) {
  const withJustif = lines.filter((l) => l.justificatif_url)

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 section-title text-xl">
        <FolderTree size={20} /> Arborescence des justificatifs
      </h2>
      <p className="mb-4 text-sm text-prisme-base/60">
        Organisation des fichiers de ce projet dans l'espace Microsoft 365 de l'association. Un
        dossier est créé par ligne dès qu'un premier justificatif y est déposé.
      </p>

      <div className="rounded border border-prisme-gold-mat/15 bg-prisme-deepest/40 p-4 font-mono text-sm">
        <TreeLine depth={0} icon="folder" label={`${ROOT_FOLDER}/`} />
        <TreeLine depth={1} icon="folder" label={`${projectFolderName(project)}/`} accent />
        {lines.length === 0 && (
          <TreeLine depth={2} icon="muted" label="(aucune ligne pour le moment)" />
        )}
        {lines.map((l) => {
          const has = Boolean(l.justificatif_url)
          return (
            <div key={l.id}>
              <TreeLine depth={2} icon={has ? 'folder' : 'muted'} label={`${lineFolderName(l)}/`} />
              {has && <TreeLine depth={3} icon="file" label={l.justificatif_nom || 'document'} />}
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-prisme-base/40">
        {withJustif.length} justificatif(s) attaché(s) sur {lines.length} ligne(s).
      </p>
    </Card>
  )
}

function TreeLine({
  depth,
  icon,
  label,
  accent,
}: {
  depth: number
  icon: 'folder' | 'file' | 'muted'
  label: string
  accent?: boolean
}) {
  return (
    <div
      className="flex items-center gap-2 py-0.5"
      style={{ paddingLeft: `${depth * 1.25}rem` }}
    >
      {depth > 0 && <span className="text-prisme-base/30">└─</span>}
      {icon === 'folder' && <Folder size={14} className="text-prisme-gold-mat" />}
      {icon === 'file' && <FileCheck2 size={14} className="text-emerald-400" />}
      <span
        className={
          icon === 'muted'
            ? 'text-prisme-base/30'
            : accent
              ? 'text-prisme-gold'
              : 'text-prisme-base/80'
        }
      >
        {label}
      </span>
    </div>
  )
}
