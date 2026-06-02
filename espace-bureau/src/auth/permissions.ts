// Matrice de permissions par role.
// Source de verite cote interface. Cote base, les memes regles seront appliquees
// par les policies RLS (voir supabase/migrations/0002_rls_policies.sql).
//
// « Tout le monde » = tous les membres du bureau (pas les adherents simples).
// Regles de visibilite :
//   - Tableau de bord / Agenda : tout le bureau
//   - Comptabilite / Cotisations / Dons : President, Vice-President, Tresorier, Tresorier adjoint
//   - Adherents : tout le bureau
//   - Projets & Budget : tout le bureau
//   - Documents : tout le bureau
//   - Secretariat (PV, convocations, registre) : lecture tout le bureau ;
//     ecriture Secretaires + Presidence (President, Vice-President)
//   - Administration : President, Vice-President
//   - Adherent simple : aucun acces a l'espace bureau

import type { Role } from '@/types'

export type Permission =
  | 'agenda.read'
  | 'agenda.write'
  | 'finances.read' // comptabilite, cotisations, dons
  | 'finances.write'
  | 'adherents.read'
  | 'adherents.write'
  | 'projets.read'
  | 'projets.write'
  | 'documents.read'
  | 'documents.write'
  | 'secretariat.read'
  | 'secretariat.write'
  | 'admin.manage' // gestion des comptes & roles

/** Tout ce qu'un membre du bureau peut faire, hors finances/secretariat/admin. */
const BUREAU_BASE: Permission[] = [
  'agenda.read',
  'agenda.write',
  'adherents.read',
  'adherents.write',
  'projets.read',
  'projets.write',
  'documents.read',
  'documents.write',
  'secretariat.read', // tout le bureau peut consulter le secretariat
]

const FINANCES: Permission[] = ['finances.read', 'finances.write']
const SECRETARIAT_WRITE: Permission[] = ['secretariat.write']
const ADMIN: Permission[] = ['admin.manage']

const MATRIX: Record<Role, Permission[]> = {
  president: [...BUREAU_BASE, ...FINANCES, ...SECRETARIAT_WRITE, ...ADMIN],
  vice_president: [...BUREAU_BASE, ...FINANCES, ...SECRETARIAT_WRITE, ...ADMIN],
  secretaire: [...BUREAU_BASE, ...SECRETARIAT_WRITE],
  secretaire_adjoint: [...BUREAU_BASE, ...SECRETARIAT_WRITE],
  tresorier: [...BUREAU_BASE, ...FINANCES],
  tresorier_adjoint: [...BUREAU_BASE, ...FINANCES],
  membre: [...BUREAU_BASE],
  // Adherent simple : aucun acces a l'espace bureau.
  adherent: [],
}

export function roleHas(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false
}
