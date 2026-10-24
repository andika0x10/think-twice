import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { freshState, validate, type State } from '../core/model'

export interface Repository {
  load(): Promise<State>
  save(state: State): Promise<void>
}
export async function createRepository(): Promise<Repository> {
  if (Capacitor.isNativePlatform()) {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    const db = await sqlite.createConnection('thinktwice', false, 'no-encryption', 1, false)
    await db.open()
    await db.execute(
      'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id = 1), version INTEGER NOT NULL, data TEXT NOT NULL);',
    )
    return {
      async load() {
        const r = await db.query('SELECT data FROM app_state WHERE id = 1')
        return r.values?.length ? validate(JSON.parse(r.values[0].data)) : freshState()
      },
      async save(state) {
        validate(state)
        await db.run(
          'INSERT OR REPLACE INTO app_state (id, version, data) VALUES (1, ?, ?)',
          [state.version, JSON.stringify(state)],
          true,
        )
      },
    }
  }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('thinktwice', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('state')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  return {
    async load() {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readonly')
        const r = tx.objectStore('state').get('current')
        r.onsuccess = () => {
          try {
            resolve(r.result ? validate(r.result) : freshState())
          } catch (e) {
            reject(e)
          }
        }
        r.onerror = () => reject(r.error)
      })
    },
    async save(state) {
      validate(state)
      return new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite')
        tx.objectStore('state').put(state, 'current')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error ?? new Error('Penyimpanan dibatalkan.'))
      })
    },
  }
}
