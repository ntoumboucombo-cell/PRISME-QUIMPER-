// Donnees de demonstration (mode mock).
// IDs fixes pour que les relations restent coherentes.

import type {
  AgendaEvent,
  BudgetLine,
  Convocation,
  Cotisation,
  DocumentItem,
  Don,
  Member,
  ProcesVerbal,
  Project,
  RegistreEntry,
  UserAccount,
} from '@/types'

export interface Database {
  members: Member[]
  accounts: UserAccount[]
  cotisations: Cotisation[]
  dons: Don[]
  projects: Project[]
  budget_lines: BudgetLine[]
  documents: DocumentItem[]
  agenda_events: AgendaEvent[]
  proces_verbaux: ProcesVerbal[]
  convocations: Convocation[]
  registre_entries: RegistreEntry[]
}

const now = '2026-05-30T10:00:00.000Z'

const members: Member[] = [
  { id: 'm-nayel', civilite: 'M.', nom: 'TOUMBOU COMBO', prenom: 'Nayel', email: 'president@example.fr', telephone: '', etablissement: 'UBO', statut: 'actif', fonction_bureau: 'Président', date_adhesion: '2026-03-23', created_at: now },
  { id: 'm-cloe', civilite: 'Mme', nom: 'BENARD', prenom: 'Cloe', email: 'cloe@example.fr', statut: 'actif', fonction_bureau: 'Vice-Présidente', date_adhesion: '2026-03-23', created_at: now },
  { id: 'm-romane', civilite: 'Mme', nom: 'BILIEN', prenom: 'Romane', email: 'secretariat@example.fr', statut: 'actif', fonction_bureau: 'Secrétaire Générale', date_adhesion: '2026-03-23', created_at: now },
  { id: 'm-romain', civilite: 'M.', nom: 'BROBAND', prenom: 'Romain', email: 'romain@example.fr', statut: 'actif', fonction_bureau: 'Secrétaire Adjoint', date_adhesion: '2026-03-23', created_at: now },
  { id: 'm-evan', civilite: 'M.', nom: 'STRUILLOU', prenom: 'Evan', email: 'tresorier@example.fr', statut: 'actif', fonction_bureau: 'Trésorier Adjoint', date_adhesion: '2026-03-23', created_at: now },
  { id: 'm-camille', civilite: 'Mme', nom: 'BORDIER', prenom: 'Camille', email: 'communication@example.fr', statut: 'actif', fonction_bureau: 'Chargée de Communication', date_adhesion: '2026-03-23', created_at: now },
  { id: 'm-adh1', civilite: 'M.', nom: 'LE GALL', prenom: 'Yann', email: 'yann.legall@example.fr', etablissement: 'IUT Quimper', statut: 'adherent', date_adhesion: '2026-09-15', created_at: now },
  { id: 'm-adh2', civilite: 'Mme', nom: 'MORVAN', prenom: 'Léa', email: 'lea.morvan@example.fr', etablissement: 'UBO', statut: 'adherent', date_adhesion: '2026-09-20', created_at: now },
  { id: 'm-adh3', civilite: 'M.', nom: 'KERAVEC', prenom: 'Hugo', email: 'hugo.k@example.fr', etablissement: 'Lycée Cornouaille', statut: 'adherent', date_adhesion: '2026-10-02', created_at: now },
]

// Comptes applicatifs (mock). Mot de passe en clair UNIQUEMENT pour la demo locale.
const accounts: UserAccount[] = [
  { id: 'u-president', email: 'president@example.fr', password: 'prisme', display_name: 'Nayel (Président)', role: 'president', member_id: 'm-nayel', active: true, created_at: now },
  { id: 'u-vp', email: 'cloe@example.fr', password: 'prisme', display_name: 'Cloe (Vice-Présidente)', role: 'vice_president', member_id: 'm-cloe', active: true, created_at: now },
  { id: 'u-secretaire', email: 'secretariat@example.fr', password: 'prisme', display_name: 'Romane (Secrétaire Générale)', role: 'secretaire', member_id: 'm-romane', active: true, created_at: now },
  { id: 'u-secretaire-adj', email: 'romain@example.fr', password: 'prisme', display_name: 'Romain (Secrétaire adjoint)', role: 'secretaire_adjoint', member_id: 'm-romain', active: true, created_at: now },
  { id: 'u-tresorier', email: 'tresorier@example.fr', password: 'prisme', display_name: 'Evan (Trésorier adjoint)', role: 'tresorier_adjoint', member_id: 'm-evan', active: true, created_at: now },
  { id: 'u-membre', email: 'communication@example.fr', password: 'prisme', display_name: 'Camille (Bureau)', role: 'membre', member_id: 'm-camille', active: true, created_at: now },
  { id: 'u-adherent', email: 'yann.legall@example.fr', password: 'prisme', display_name: 'Yann (Adhérent)', role: 'adherent', member_id: 'm-adh1', active: true, created_at: now },
]

const cotisations: Cotisation[] = [
  { id: 'c1', member_id: 'm-nayel', saison: '2026-2027', montant: 15, date_paiement: '2026-09-01', mode: 'virement', statut: 'paye', recu_emis: true, created_at: now },
  { id: 'c2', member_id: 'm-cloe', saison: '2026-2027', montant: 15, date_paiement: '2026-09-03', mode: 'cb', statut: 'paye', recu_emis: true, created_at: now },
  { id: 'c3', member_id: 'm-romane', saison: '2026-2027', montant: 15, date_paiement: '2026-09-05', mode: 'cheque', statut: 'paye', recu_emis: false, created_at: now },
  { id: 'c4', member_id: 'm-evan', saison: '2026-2027', montant: 15, date_paiement: '2026-09-05', mode: 'virement', statut: 'paye', recu_emis: true, created_at: now },
  { id: 'c5', member_id: 'm-camille', saison: '2026-2027', montant: 15, date_paiement: '2026-09-10', mode: 'espece', statut: 'paye', recu_emis: false, created_at: now },
  { id: 'c6', member_id: 'm-romain', saison: '2026-2027', montant: 15, statut: 'attente', recu_emis: false, created_at: now },
  { id: 'c7', member_id: 'm-adh1', saison: '2026-2027', montant: 10, date_paiement: '2026-09-15', mode: 'cb', statut: 'paye', recu_emis: false, created_at: now },
  { id: 'c8', member_id: 'm-adh2', saison: '2026-2027', montant: 10, date_paiement: '2026-09-20', mode: 'cb', statut: 'paye', recu_emis: false, created_at: now },
  { id: 'c9', member_id: 'm-adh3', saison: '2026-2027', montant: 10, statut: 'attente', recu_emis: false, created_at: now },
]

const projects: Project[] = [
  { id: 'p-gala', nom: 'Le Gala PRISME 2027', description: 'Soirée de remise des distinctions annuelles.', pole: 'evenementiel', responsable_id: 'm-cloe', statut: 'valide', date_debut: '2027-05-15', date_fin: '2027-05-15', created_at: now },
  { id: 'p-master', nom: 'Masterclass Inaugurale', description: "Séance dédiée à l'art de l'exorde — Pôle Universitaire Pierre-Jakez Hélias.", pole: 'culture', responsable_id: 'm-romane', statut: 'en_cours', date_debut: '2026-10-12', date_fin: '2026-10-12', created_at: now },
  { id: 'p-joutes', nom: "Les Joutes de l'Héritage", description: 'Concours interne de plaidoiries juridiques — Tribunal de Quimper.', pole: 'culture', responsable_id: 'm-nayel', statut: 'idee', date_debut: '2026-11-20', created_at: now },
]

const budget_lines: BudgetLine[] = [
  // Gala
  { id: 'b1', project_id: 'p-gala', type: 'recette', categorie: 'Billetterie', libelle: 'Entrées gala (120 x 25€)', montant_prevu: 3000, montant_reel: 0, created_at: now },
  { id: 'b2', project_id: 'p-gala', type: 'recette', categorie: 'Partenariats', libelle: 'Sponsor cabinet juridique', montant_prevu: 1500, montant_reel: 0, created_at: now },
  { id: 'b3', project_id: 'p-gala', type: 'depense', categorie: 'Location de salle', libelle: 'Salle de réception', montant_prevu: 1800, montant_reel: 0, justificatif_url: 'https://exemple.sharepoint.com/devis-salle-gala', justificatif_nom: 'Devis salle (PDF)', created_at: now },
  { id: 'b4', project_id: 'p-gala', type: 'depense', categorie: 'Restauration', libelle: 'Traiteur cocktail', montant_prevu: 1600, montant_reel: 0, created_at: now },
  { id: 'b5', project_id: 'p-gala', type: 'depense', categorie: 'Communication / impression', libelle: 'Invitations & affiches', montant_prevu: 300, montant_reel: 0, created_at: now },
  // Masterclass
  { id: 'b6', project_id: 'p-master', type: 'recette', categorie: 'Subventions publiques', libelle: 'Subvention Ville de Quimper', montant_prevu: 500, montant_reel: 500, created_at: now },
  { id: 'b7', project_id: 'p-master', type: 'depense', categorie: 'Intervenants', libelle: 'Défraiement intervenant', montant_prevu: 300, montant_reel: 280, created_at: now },
  { id: 'b8', project_id: 'p-master', type: 'depense', categorie: 'Communication / impression', libelle: 'Flyers', montant_prevu: 120, montant_reel: 95, created_at: now },
]

const dons: Don[] = [
  { id: 'd1', donateur_nom: 'Cabinet Le Bris & Associés', donateur_email: 'contact@lebris-avocats.fr', montant: 500, date_don: '2026-04-10', mode: 'virement', type: 'ponctuel', recu_fiscal_emis: true, project_id: null, created_at: now },
  { id: 'd2', donateur_nom: 'M. Tanguy', montant: 50, date_don: '2026-04-22', mode: 'cb', type: 'ponctuel', recu_fiscal_emis: false, project_id: 'p-gala', created_at: now },
  { id: 'd3', donateur_nom: 'Mme Le Goff', montant: 20, date_don: '2026-05-05', mode: 'espece', type: 'regulier', recu_fiscal_emis: false, project_id: null, created_at: now },
]

const documents: DocumentItem[] = [
  { id: 'doc1', titre: "Statuts de l'association", description: 'Statuts déposés le 23 mars 2026.', categorie: 'statuts', source: 'lien_externe', office_kind: 'pdf', url: '../statuts.pdf', project_id: null, uploaded_by: 'u-president', created_at: now, updated_at: now },
  { id: 'doc2', titre: 'Budget prévisionnel 2026-2027', description: 'Classeur Excel partagé (co-édition).', categorie: 'comptabilite', source: 'lien_m365', office_kind: 'excel', url: 'https://exemple.sharepoint.com/budget-2026', project_id: null, uploaded_by: 'u-tresorier', created_at: now, updated_at: now },
  { id: 'doc3', titre: "Compte rendu - AG constitutive", description: 'Procès-verbal Word.', categorie: 'compte_rendu', source: 'lien_m365', office_kind: 'word', url: 'https://exemple.sharepoint.com/cr-ag', project_id: null, uploaded_by: 'u-president', created_at: now, updated_at: now },
  { id: 'doc4', titre: 'Présentation Gala 2027', description: 'Support de présentation aux partenaires.', categorie: 'projet', source: 'lien_m365', office_kind: 'powerpoint', url: 'https://exemple.sharepoint.com/gala-pitch', project_id: 'p-gala', uploaded_by: 'u-membre', created_at: now, updated_at: now },
]

const agenda_events: AgendaEvent[] = [
  { id: 'ev1', titre: 'Réunion mensuelle du bureau', description: 'Point d’avancement des pôles.', type: 'reunion', date: '2026-06-10', heure: '18:30', lieu: 'Maison des Associations, Quimper', project_id: null, created_at: now },
  { id: 'ev2', titre: 'Masterclass Inaugurale', description: "Séance dédiée à l'art de l'exorde.", type: 'evenement', date: '2026-10-12', heure: '14:00', lieu: 'Pôle Universitaire Pierre-Jakez Hélias', project_id: 'p-master', created_at: now },
  { id: 'ev3', titre: "Les Joutes de l'Héritage", description: 'Concours interne de plaidoiries.', type: 'evenement', date: '2026-11-20', heure: '09:30', lieu: 'Tribunal de Quimper', project_id: 'p-joutes', created_at: now },
  { id: 'ev4', titre: 'Dépôt dossier subvention Ville', description: 'Échéance de dépôt du dossier de subvention.', type: 'echeance', date: '2026-09-30', heure: null, lieu: '', project_id: null, created_at: now },
  { id: 'ev5', titre: 'Le Gala PRISME', description: 'Remise des distinctions annuelles.', type: 'evenement', date: '2027-05-15', heure: '19:00', lieu: 'Lieu confidentiel', project_id: 'p-gala', created_at: now },
]

const proces_verbaux: ProcesVerbal[] = [
  {
    id: 'pv1',
    instance: 'ag',
    date: '2026-03-23',
    titre: 'AG constitutive',
    ordre_du_jour: "Constitution de l'association ; adoption des statuts ; élection du premier bureau.",
    decisions:
      "Adoption des statuts à l'unanimité. Élection du bureau : Nayel TOUMBOU COMBO (Président), Cloe BENARD (Vice-Présidente), Romane BILIEN (Secrétaire Générale).",
    presents: 'Nayel, Cloe, Romane, Romain, Evan, Camille',
    excuses: '',
    document_url: 'https://exemple.sharepoint.com/cr-ag-constitutive',
    document_nom: 'PV AG constitutive (Word)',
    redige_par: 'm-romane',
    created_at: now,
  },
  {
    id: 'pv2',
    instance: 'bureau',
    date: '2026-05-12',
    titre: 'Réunion de bureau — lancement de saison',
    ordre_du_jour: 'Calendrier 2026-2027 ; budget prévisionnel ; répartition des pôles.',
    decisions:
      'Validation du calendrier (Masterclass en octobre, Gala en mai). Budget prévisionnel confié au pôle trésorerie.',
    presents: 'Nayel, Cloe, Romane, Evan',
    excuses: 'Camille, Romain',
    document_url: null,
    document_nom: null,
    redige_par: 'm-romane',
    created_at: now,
  },
]

const convocations: Convocation[] = [
  {
    id: 'cv1',
    instance: 'bureau',
    date_reunion: '2026-06-10',
    heure: '18:30',
    lieu: 'Maison des Associations, Quimper',
    ordre_du_jour:
      "1. Validation du PV précédent\n2. Avancement des pôles\n3. Préparation de la Masterclass\n4. Questions diverses",
    date_envoi: '2026-06-01',
    statut: 'envoyee',
    event_id: 'ev1',
    created_at: now,
  },
  {
    id: 'cv2',
    instance: 'ca',
    date_reunion: '2026-09-15',
    heure: '19:00',
    lieu: 'Visioconférence',
    ordre_du_jour: "1. Bilan de rentrée\n2. Dossier de subvention Ville\n3. Budget des projets",
    date_envoi: null,
    statut: 'brouillon',
    event_id: null,
    created_at: now,
  },
]

const registre_entries: RegistreEntry[] = [
  {
    id: 'rg1',
    date: '2026-03-23',
    type: 'statuts',
    objet: "Création de l'association et dépôt des statuts",
    description: "Déclaration initiale de l'association PRISME QUIMPER.",
    date_declaration: '2026-03-25',
    reference: 'Récépissé préfecture du Finistère n° W291xxxxxx',
    document_url: '../statuts.pdf',
    created_at: now,
  },
  {
    id: 'rg2',
    date: '2026-03-23',
    type: 'dirigeants',
    objet: 'Élection du premier bureau',
    description: 'Désignation du Président, de la Vice-Présidente et de la Secrétaire Générale.',
    date_declaration: '2026-03-25',
    reference: 'Liste des dirigeants déposée en préfecture',
    document_url: null,
    created_at: now,
  },
]

export function buildSeed(): Database {
  // copie profonde pour eviter toute mutation du seed d'origine
  return JSON.parse(
    JSON.stringify({
      members,
      accounts,
      cotisations,
      dons,
      projects,
      budget_lines,
      documents,
      agenda_events,
      proces_verbaux,
      convocations,
      registre_entries,
    }),
  )
}
