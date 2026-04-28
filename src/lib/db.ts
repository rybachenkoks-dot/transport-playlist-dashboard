import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  client: Client | undefined
  tablesInitialized: boolean
}

function createDbClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN
  const localUrl = process.env.DATABASE_URL

  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      authToken: tursoAuthToken || undefined,
    })
  }

  if (localUrl && localUrl.startsWith('file:')) {
    return createClient({ url: localUrl })
  }

  // Fallback
  return createClient({ url: 'file:db/custom.db' })
}

export const db = globalForPrisma.client ?? createDbClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.client = db

// Auto-create tables on first import
let initPromise: Promise<void> | null = null

export async function ensureTables() {
  if (globalForPrisma.tablesInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS "Playlist" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "originalIndex" INTEGER NOT NULL DEFAULT 0,
        "type" TEXT NOT NULL DEFAULT '',
        "location" TEXT NOT NULL DEFAULT '',
        "category" TEXT NOT NULL DEFAULT '',
        "client" TEXT NOT NULL DEFAULT '',
        "mediaObject" TEXT NOT NULL DEFAULT '',
        "duration" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL DEFAULT '',
        "updatedAt" TEXT NOT NULL DEFAULT ''
      )`)
      await db.execute(`CREATE TABLE IF NOT EXISTS "PlaylistSummary" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "type" TEXT NOT NULL DEFAULT '',
        "level" INTEGER NOT NULL DEFAULT 1,
        "categoryName" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "matchField" TEXT DEFAULT NULL,
        "matchMode" TEXT DEFAULT NULL,
        "matchValue" TEXT DEFAULT NULL,
        "rollers" INTEGER NOT NULL DEFAULT 0,
        "seconds" INTEGER NOT NULL DEFAULT 0,
        "percent" REAL NOT NULL DEFAULT 0,
        "manualValues" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL DEFAULT '',
        "updatedAt" TEXT NOT NULL DEFAULT ''
      )`)
      globalForPrisma.tablesInitialized = true
      console.log('[DB] Tables ensured')
    } catch (e) {
      console.error('[DB] Failed to create tables:', e)
      initPromise = null
      throw e
    }
  })()

  return initPromise
}
