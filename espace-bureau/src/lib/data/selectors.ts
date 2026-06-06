// Calculs derives (totaux, previsionnel budgetaire, tresorerie).
// Fonctions pures : on leur passe les tables, elles renvoient des agregats.

import type { BudgetLine, Cotisation, Don, Project } from '@/types'

export interface ProjectBudget {
  recettesPrevu: number
  recettesReel: number
  depensesPrevu: number
  depensesReel: number
  soldePrevu: number
  soldeReel: number
}

export function computeProjectBudget(lines: BudgetLine[]): ProjectBudget {
  const recettes = lines.filter((l) => l.type === 'recette')
  const depenses = lines.filter((l) => l.type === 'depense')
  const recettesPrevu = sum(recettes.map((l) => l.montant_prevu))
  const recettesReel = sum(recettes.map((l) => l.montant_reel))
  const depensesPrevu = sum(depenses.map((l) => l.montant_prevu))
  const depensesReel = sum(depenses.map((l) => l.montant_reel))
  return {
    recettesPrevu,
    recettesReel,
    depensesPrevu,
    depensesReel,
    soldePrevu: recettesPrevu - depensesPrevu,
    soldeReel: recettesReel - depensesReel,
  }
}

export interface TreasurySummary {
  cotisationsEncaissees: number
  cotisationsEnAttente: number
  donsTotal: number
  /** Tresorerie « hors projet » : cotisations encaissees + dons non fleches. */
  tresorerie: number
  /** Solde previsionnel consolide de tous les projets. */
  soldeProjetsPrevu: number
  /** Budget previsionnel global = tresorerie + soldes previsionnels projets. */
  previsionnelGlobal: number
}

export function computeTreasury(
  cotisations: Cotisation[],
  dons: Don[],
  budgetLines: BudgetLine[],
  projects: Project[],
): TreasurySummary {
  const cotisationsEncaissees = sum(
    cotisations.filter((c) => c.statut === 'paye').map((c) => c.montant),
  )
  const cotisationsEnAttente = sum(
    cotisations.filter((c) => c.statut === 'attente').map((c) => c.montant),
  )
  const donsTotal = sum(dons.map((d) => d.montant))
  const donsHorsProjet = sum(dons.filter((d) => !d.project_id).map((d) => d.montant))

  const soldeProjetsPrevu = projects.reduce((acc, p) => {
    const b = computeProjectBudget(budgetLines.filter((l) => l.project_id === p.id))
    return acc + b.soldePrevu
  }, 0)

  const tresorerie = cotisationsEncaissees + donsHorsProjet
  return {
    cotisationsEncaissees,
    cotisationsEnAttente,
    donsTotal,
    tresorerie,
    soldeProjetsPrevu,
    previsionnelGlobal: tresorerie + soldeProjetsPrevu,
  }
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + (Number(b) || 0), 0)
}
