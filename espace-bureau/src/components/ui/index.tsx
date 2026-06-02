// Petite bibliotheque de composants UI dans la charte PRISME.
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

// --- Carte -----------------------------------------------------------------
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

// --- Indicateur chiffre (dashboard) ----------------------------------------
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'gold',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'gold' | 'green' | 'red' | 'amber' | 'neutral'
}) {
  const toneMap = {
    gold: 'text-prisme-gold',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-300',
    neutral: 'text-prisme-base',
  }
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-prisme-base/60">{label}</p>
        <p className={`mt-2 font-serif text-3xl ${toneMap[tone]}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-prisme-base/50">{hint}</p>}
      </div>
      {icon && <div className="text-prisme-gold-mat/70">{icon}</div>}
    </Card>
  )
}

// --- Badge -----------------------------------------------------------------
type BadgeTone = 'gold' | 'green' | 'red' | 'amber' | 'blue' | 'neutral'
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const map: Record<BadgeTone, string> = {
    gold: 'bg-prisme-gold/15 text-prisme-gold',
    green: 'bg-emerald-500/15 text-emerald-300',
    red: 'bg-red-500/15 text-red-300',
    amber: 'bg-amber-500/15 text-amber-300',
    blue: 'bg-sky-500/15 text-sky-300',
    neutral: 'bg-white/10 text-prisme-base/80',
  }
  return <span className={`badge ${map[tone]}`}>{children}</span>
}

// --- Modale ----------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-prisme-deepest/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg border border-prisme-gold-mat/40 bg-prisme-inner p-6 shadow-card`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-xl text-prisme-gold-mat">{title}</h3>
          <button className="text-prisme-base/60 hover:text-prisme-gold" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// --- Etat vide -------------------------------------------------------------
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-sm text-prisme-base/50">{message}</div>
  )
}

// --- En-tete de page -------------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl text-prisme-base">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-prisme-base/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// --- Champ de formulaire ---------------------------------------------------
export function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

// --- Selecteur d'heure (creneaux de 15 min) --------------------------------
// Plus pratique que <input type="time"> : liste deroulante de 00:00 a 23:45.
// Si la valeur courante n'est pas sur la grille, on l'ajoute pour ne pas la perdre.
function buildSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}
const TIME_SLOTS = buildSlots()

export function TimeSelect({
  value,
  onChange,
  className = '',
}: {
  value: string | null | undefined
  onChange: (value: string | null) => void
  className?: string
}) {
  const current = value ?? ''
  const options = current && !TIME_SLOTS.includes(current) ? [current, ...TIME_SLOTS] : TIME_SLOTS
  return (
    <select
      className={`input ${className}`}
      value={current}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">— Heure —</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  )
}
