// ============================================================================
//  Store de donnees - mode MOCK (localStorage)
//
//  Couche unique d'acces aux donnees. Aujourd'hui : tout est stocke dans le
//  navigateur (aucun compte requis). Demain : on remplacera ces fonctions par
//  des appels Supabase sans toucher aux composants (meme signature).
// ============================================================================

import { useSyncExternalStore } from 'react'
import { uid } from '@/lib/format'
import { buildSeed, type Database } from './seed'

// v3 : ajout du secretariat (PV, convocations, registre) + roles secretaires.
// Le changement de cle force le rechargement du jeu de demonstration.
const STORAGE_KEY = 'prisme-bureau-db-v3'

type TableName = keyof Database
type Row = { id: string }

let db: Database = load()
const listeners = new Set<() => void>()

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Database
  } catch {
    /* ignore */
  }
  const seed = buildSeed()
  persist(seed)
  return seed
}

function persist(next: Database) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota / mode prive : on garde au moins l'etat memoire */
  }
}

function commit(next: Database) {
  db = next
  persist(db)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// --- Lecture ---------------------------------------------------------------

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

// --- Ecriture (generique, typee par table) ---------------------------------

export function insert<T extends TableName>(
  name: T,
  row: Omit<Database[T][number], 'id' | 'created_at'> & Partial<Row>,
): Database[T][number] {
  const created = {
    id: (row as Partial<Row>).id ?? uid(),
    created_at: new Date().toISOString(),
    ...row,
  } as unknown as Database[T][number]
  commit({ ...db, [name]: [...db[name], created] as Database[T] })
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
}

export function remove<T extends TableName>(name: T, id: string): void {
  const next = (db[name] as Row[]).filter((r) => r.id !== id) as Database[T]
  commit({ ...db, [name]: next })
}

/** Remet les donnees de demonstration (utile pour les tests / reset). */
export function resetDatabase(): void {
  commit(buildSeed())
}

export type { Database }
