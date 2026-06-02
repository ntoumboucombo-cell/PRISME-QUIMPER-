// Helpers de formatage (montants, dates)

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEuro(value: number): string {
  return euro.format(value || 0)
}

/** Variante compacte sans centimes pour les gros totaux du dashboard. */
export function formatEuroShort(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Saison courante au format "2026-2027" (bascule en aout). */
export function currentSaison(now = new Date()): string {
  const y = now.getFullYear()
  const start = now.getMonth() >= 7 ? y : y - 1
  return `${start}-${start + 1}`
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
