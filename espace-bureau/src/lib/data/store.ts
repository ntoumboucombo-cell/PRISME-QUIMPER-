// ============================================================================
//  Store de donnees - couche unique d'acces.
//
//  Deux backends derriere la MEME API (getTable / useTable / insert / update /
//  remove) — les pages ne changent pas selon le backend :
//
//   - MOCK (localStorage)  : tout est dans le navigateur. Jeu de demonstration
//                            pre-charge. Utilise tant que Supabase n'est pas
//                            configure.
//   - SUPABASE             : cache memoire alimente au demarrage par la base,
//                            puis ecriture « write-through » a chaque mutation
//                            (mise a jour optimiste du cache + envoi a Supabase).
//
//  Le choix se fait via `isSupabaseConfigured`. En mode Supabase, les composants
//  voient d'abord des tables vides (le temps du chargement initial), puis le
//  cache se remplit et l'interface se met a jour.
// ============================================================================

import { useSyncExternalStore } from 'react'
import { uid } from '@/lib/format'
import { buildSeed, type Database } from './seed'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// v3 : ajout du secretariat (PV, convocations, registre) + roles secretaires.
// Le changement de cle force le rechargement du jeu de demonstration.
const STORAGE_KEY = 'prisme-bureau-db-v3'

type TableName = keyof Database
type Row = { id: string }

// --- Correspondance table « mock » -> table Supabase ------------------------
//  Identique partout, SAUF `accounts` (mock) qui correspond a `profiles` cote
//  Supabase (l'e-mail y est denormalise via la migration 0003 ; le mot de passe
//  reste gere par Supabase Auth et n'apparait jamais ici).
const SUPABASE_TABLE: Record<TableName, string> = {
  members: 'members',
  accounts: 'profiles',
  cotisations: 'cotisations',
  dons: 'dons',
  projects: 'projects',
  budget_lines: 'budget_lines',
  documents: 'documents',
  agenda_events: 'agenda_events',
  proces_verbaux: 'proces_verbaux',
  convocations: 'convocations',
  registre_entries: 'registre_entries',
}

const TABLE_NAMES = Object.keys(SUPABASE_TABLE) as TableName[]

// Colonnes reellement presentes dans `profiles` (on ne pousse jamais `password`).
const PROFILE_COLUMNS = ['email', 'display_name', 'role', 'member_id', 'active'] as const

function emptyDb(): Database {
  return {
    members: [],
    accounts: [],
    cotisations: [],
    dons: [],
    projects: [],
    budget_lines: [],
    documents: [],
    agenda_events: [],
    proces_verbaux: [],
    convocations: [],
    registre_entries: [],
  }
}

let db: Database = isSupabaseConfigured ? emptyDb() : loadMock()
const listeners = new Set<() => void>()

// --- Mock (localStorage) ----------------------------------------------------

function loadMock(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Database
  } catch {
    /* ignore */
  }
  const seed = buildSeed()
  persistMock(seed)
  return seed
}

function persistMock(next: Database) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota / mode prive : on garde au moins l'etat memoire */
  }
}

// --- Etat partage -----------------------------------------------------------

function commit(next: Database) {
  db = next
  if (!isSupabaseConfigured) persistMock(db)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// --- Supabase : chargement initial + resynchronisation ----------------------

/** Convertit les chaines vides en null (les colonnes date/numeric/enum les refusent). */
function sanitize<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = v === '' ? null : v
  return out as T
}

/** Ne garde que les colonnes valides de `profiles` (jamais le mot de passe). */
function pickProfileColumns(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of PROFILE_COLUMNS) {
    if (col in patch) out[col] = patch[col]
  }
  return out
}

async function fetchTable(name: TableName): Promise<unknown[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from(SUPABASE_TABLE[name]).select('*')
  if (error) {
    console.error(`[store] chargement ${name}:`, error.message)
    return []
  }
  return data ?? []
}

/** Recharge une seule table depuis Supabase (apres une ecriture en echec). */
async function reload(name: TableName) {
  const rows = await fetchTable(name)
  commit({ ...db, [name]: rows } as Database)
}

/** Charge toutes les tables depuis Supabase au demarrage. */
async function loadAllFromSupabase() {
  const entries = await Promise.all(
    TABLE_NAMES.map(async (name) => [name, await fetchTable(name)] as const),
  )
  const next = emptyDb()
  for (const [name, rows] of entries) (next as unknown as Record<string, unknown>)[name] = rows
  commit(next)
}

if (isSupabaseConfigured) {
  void loadAllFromSupabase()
}

// --- Lecture ----------------------------------------------------------------

export function getTable<T extends TableName>(name: T): Database[T] {
  return db[name]
}

/** Hook reactif : renvoie la table et re-rend a chaque mutation. */
export function useTable<T extends TableName>(name: T): Database[T] {
  return useSyncExternalStore(
    subscribe,
    () => db[name],
    () => db[name],
  )
}

// --- Ecriture (generique, typee par table) ----------------------------------
//  En mode Supabase : mise a jour OPTIMISTE du cache (l'interface reagit tout de
//  suite) puis envoi a la base ; en cas d'echec on resynchronise la table.

export function insert<T extends TableName>(
  name: T,
  row: Omit<Database[T][number], 'id' | 'created_at'> & Partial<Row>,
): Database[T][number] {
  if (isSupabaseConfigured && name === 'accounts') {
    // Creer un utilisateur necessite la cle service_role (interdite cote
    // navigateur). Voir docs/INTEGRATION-SUPABASE.md (Edge Function ou dashboard).
    throw new Error(
      "La création de comptes depuis l'application n'est pas disponible en mode Supabase.",
    )
  }

  const created = {
    id: (row as Partial<Row>).id ?? uid(),
    created_at: new Date().toISOString(),
    ...row,
  } as unknown as Database[T][number]

  commit({ ...db, [name]: [...db[name], created] as Database[T] })

  if (isSupabaseConfigured && supabase) {
    supabase
      .from(SUPABASE_TABLE[name])
      .insert(sanitize(created as unknown as Record<string, unknown>) as never)
      .then(({ error }) => {
        if (error) {
          console.error(`[store] insert ${name}:`, error.message)
          void reload(name)
        }
      })
  }
  return created
}

export function update<T extends TableName>(
  name: T,
  id: string,
  patch: Partial<Database[T][number]>,
): void {
  const next = (db[name] as Row[]).map((r) =>
    r.id === id ? ({ ...r, ...patch } as Database[T][number]) : (r as Database[T][number]),
  ) as Database[T]
  commit({ ...db, [name]: next })

  if (isSupabaseConfigured && supabase) {
    const columns =
      name === 'accounts'
        ? pickProfileColumns(patch as Record<string, unknown>)
        : (patch as Record<string, unknown>)
    supabase
      .from(SUPABASE_TABLE[name])
      .update(sanitize(columns) as never)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error(`[store] update ${name}:`, error.message)
          void reload(name)
        }
      })
  }
}

export function remove<T extends TableName>(name: T, id: string): void {
  const next = (db[name] as Row[]).filter((r) => r.id !== id) as Database[T]
  commit({ ...db, [name]: next })

  if (isSupabaseConfigured && supabase) {
    // NB : pour `accounts`, ceci supprime le profil mais pas l'utilisateur Auth
    // sous-jacent (cela demande la cle service_role). Voir la doc d'integration.
    supabase
      .from(SUPABASE_TABLE[name])
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error(`[store] remove ${name}:`, error.message)
          void reload(name)
        }
      })
  }
}

/** Remet les donnees de demonstration (mock) ou recharge depuis Supabase. */
export function resetDatabase(): void {
  if (isSupabaseConfigured) {
    void loadAllFromSupabase()
    return
  }
  commit(buildSeed())
}

export type { Database }
