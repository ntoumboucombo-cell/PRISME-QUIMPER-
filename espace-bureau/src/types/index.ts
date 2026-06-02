// ============================================================================
//  Modele de donnees - Espace Bureau PRISME QUIMPER
//  Ces types refletent les tables de la base (voir supabase/migrations).
// ============================================================================

// --- Roles & permissions ---------------------------------------------------
// Les roles correspondent aux fonctions reelles au sein de l'association.

export type Role =
  | 'president'
  | 'vice_president'
  | 'secretaire'
  | 'secretaire_adjoint'
  | 'tresorier'
  | 'tresorier_adjoint'
  | 'membre' // autre membre du bureau (charge de com, etc.)
  | 'adherent' // adherent simple, hors bureau

export const ROLE_LABELS: Record<Role, string> = {
  president: 'Président',
  vice_president: 'Vice-Président',
  secretaire: 'Secrétaire Général',
  secretaire_adjoint: 'Secrétaire adjoint',
  tresorier: 'Trésorier',
  tresorier_adjoint: 'Trésorier adjoint',
  membre: 'Membre du bureau',
  adherent: 'Adhérent',
}

/** Ordre d'affichage / de hierarchie des roles. */
export const ROLE_ORDER: Role[] = [
  'president',
  'vice_president',
  'secretaire',
  'secretaire_adjoint',
  'tresorier',
  'tresorier_adjoint',
  'membre',
  'adherent',
]

/** Roles consideres comme « membres du bureau ». */
export const BUREAU_ROLES: Role[] = [
  'president',
  'vice_president',
  'secretaire',
  'secretaire_adjoint',
  'tresorier',
  'tresorier_adjoint',
  'membre',
]

export interface UserAccount {
  id: string
  email: string
  /** Mot de passe : uniquement pour le mock local. Jamais en base reelle (gere par Supabase Auth). */
  password?: string
  display_name: string
  role: Role
  member_id?: string | null
  active: boolean
  created_at: string
}

// --- Adherents -------------------------------------------------------------

export type MemberStatus = 'adherent' | 'actif' | 'ancien'
export type Civilite = 'Mme' | 'M.' | 'Autre'

export interface Member {
  id: string
  civilite: Civilite
  nom: string
  prenom: string
  email: string
  telephone?: string
  etablissement?: string
  date_naissance?: string
  statut: MemberStatus
  /** Role honorifique au bureau (ex: "Président"), distinct du role applicatif. */
  fonction_bureau?: string
  date_adhesion: string
  notes?: string
  created_at: string
}

// --- Cotisations -----------------------------------------------------------

export type PaymentMode = 'espece' | 'cheque' | 'virement' | 'cb' | 'autre'

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  espece: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  cb: 'Carte bancaire',
  autre: 'Autre',
}

export type CotisationStatus = 'paye' | 'attente' | 'annule'

export interface Cotisation {
  id: string
  member_id: string
  /** Saison, ex "2026-2027" */
  saison: string
  montant: number
  date_paiement?: string | null
  mode?: PaymentMode | null
  statut: CotisationStatus
  recu_emis: boolean
  notes?: string
  created_at: string
}

// --- Dons ------------------------------------------------------------------

export type DonType = 'ponctuel' | 'regulier'

export interface Don {
  id: string
  donateur_nom: string
  donateur_email?: string
  montant: number
  date_don: string
  mode: PaymentMode
  type: DonType
  recu_fiscal_emis: boolean
  /** Don flèché vers un projet (optionnel). */
  project_id?: string | null
  notes?: string
  created_at: string
}

// --- Projets & budget ------------------------------------------------------

export type ProjectStatus = 'idee' | 'valide' | 'en_cours' | 'cloture'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idee: 'Idée',
  valide: 'Validé',
  en_cours: 'En cours',
  cloture: 'Clôturé',
}

export type Pole = 'culture' | 'evenementiel' | 'communication' | 'partenariats' | 'bureau'

export const POLE_LABELS: Record<Pole, string> = {
  culture: 'Pôle Culture',
  evenementiel: 'Pôle Événementiel',
  communication: 'Pôle Communication',
  partenariats: 'Pôle Partenariats',
  bureau: 'Bureau',
}

export interface Project {
  id: string
  nom: string
  description?: string
  pole: Pole
  responsable_id?: string | null
  statut: ProjectStatus
  date_debut?: string | null
  date_fin?: string | null
  created_at: string
}

export type BudgetType = 'recette' | 'depense'

/** Categories pre-definies pour le template budgetaire. */
export const RECETTE_CATEGORIES = [
  'Subventions publiques',
  'Dons / mécénat',
  'Cotisations fléchées',
  'Billetterie',
  'Partenariats',
  'Ventes / buvette',
  'Autres recettes',
] as const

export const DEPENSE_CATEGORIES = [
  'Location de salle',
  'Communication / impression',
  'Intervenants',
  'Restauration',
  'Transport',
  'Matériel',
  'Frais divers',
] as const

export interface BudgetLine {
  id: string
  project_id: string
  type: BudgetType
  categorie: string
  libelle: string
  montant_prevu: number
  montant_reel: number
  /** Justificatif lie a la ligne (devis, facture...).
   *  justificatif_url : reference pour ouvrir (lien SharePoint/externe ou "idb:<id>" en mock).
   *  justificatif_nom : nom affiche.
   *  justificatif_path : chemin logique dans l'arborescence SharePoint (Projets/projet/ligne/fichier). */
  justificatif_url?: string | null
  justificatif_nom?: string | null
  justificatif_path?: string | null
  created_at: string
}

// --- Agenda / planning -----------------------------------------------------

export type EventType = 'reunion' | 'evenement' | 'echeance' | 'autre'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  reunion: 'Réunion',
  evenement: 'Événement',
  echeance: 'Échéance',
  autre: 'Autre',
}

export interface AgendaEvent {
  id: string
  titre: string
  description?: string
  type: EventType
  date: string // ISO date (jour)
  heure?: string | null // "HH:MM"
  lieu?: string
  project_id?: string | null
  created_at: string
}

// --- Secretariat -----------------------------------------------------------

/** Instance/organe concerne (commun aux PV et convocations). */
export type Instance = 'ag' | 'ag_extra' | 'ca' | 'bureau'

export const INSTANCE_LABELS: Record<Instance, string> = {
  ag: 'Assemblée Générale',
  ag_extra: 'AG Extraordinaire',
  ca: "Conseil d'Administration",
  bureau: 'Bureau',
}

/** Compte rendu / proces-verbal d'une reunion. */
export interface ProcesVerbal {
  id: string
  instance: Instance
  date: string // date de la reunion
  titre: string
  ordre_du_jour?: string
  decisions?: string
  presents?: string
  excuses?: string
  /** Lien vers le document Word (Microsoft 365) ou fichier. */
  document_url?: string | null
  document_nom?: string | null
  redige_par?: string | null // member_id
  created_at: string
}

export type ConvocationStatut = 'brouillon' | 'envoyee'

/** Convocation a une reunion, avec ordre du jour. */
export interface Convocation {
  id: string
  instance: Instance
  date_reunion: string
  heure?: string | null
  lieu?: string
  ordre_du_jour?: string
  date_envoi?: string | null
  statut: ConvocationStatut
  /** Evenement d'agenda lie (optionnel). */
  event_id?: string | null
  created_at: string
}

/** Type d'inscription au registre special (obligation legale loi 1901). */
export type RegistreType = 'statuts' | 'dirigeants' | 'siege' | 'autre'

export const REGISTRE_TYPE_LABELS: Record<RegistreType, string> = {
  statuts: 'Modification des statuts',
  dirigeants: 'Changement de dirigeants',
  siege: 'Changement de siège',
  autre: 'Autre',
}

/** Entree du registre special des delibrations. */
export interface RegistreEntry {
  id: string
  date: string // date de la decision/modification
  type: RegistreType
  objet: string
  description?: string
  /** Date de declaration en prefecture. */
  date_declaration?: string | null
  /** Reference (recepisse prefecture, n° JO...). */
  reference?: string
  document_url?: string | null
  created_at: string
}

// --- Documents -------------------------------------------------------------

export type DocCategory =
  | 'statuts'
  | 'comptabilite'
  | 'compte_rendu'
  | 'communication'
  | 'projet'
  | 'autre'

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  statuts: 'Statuts & juridique',
  comptabilite: 'Comptabilité',
  compte_rendu: 'Comptes rendus',
  communication: 'Communication',
  projet: 'Projet',
  autre: 'Autre',
}

/** lien_m365 = fichier edite dans Office en ligne (Word/Excel/PPT) ; fichier = upload simple. */
export type DocSource = 'lien_m365' | 'lien_externe' | 'fichier'

export type OfficeKind = 'word' | 'excel' | 'powerpoint' | 'pdf' | 'autre'

export interface DocumentItem {
  id: string
  titre: string
  description?: string
  categorie: DocCategory
  source: DocSource
  office_kind: OfficeKind
  /** URL SharePoint/OneDrive (lien_m365), URL externe, ou chemin de stockage. */
  url: string
  project_id?: string | null
  uploaded_by?: string | null
  created_at: string
  updated_at: string
}
