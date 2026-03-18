// ============================================
// DRIZZLE ORM DATABASE CONNECTION
// ============================================
// Uses Neon serverless PostgreSQL with Drizzle ORM
// Lazy initialization to avoid build-time connection issues
// ============================================

import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Type alias for the database instance
export type Db = NeonDatabase<typeof schema>

let _db: Db | null = null

// Get or create database connection (lazy initialization)
function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const sql = neon(url)
    _db = drizzle(sql, { schema })
  }
  return _db
}

// Export a proxy that forwards all operations to the actual database
export const db = new Proxy({} as Db, {
  get(_, prop) {
    const actualDb = getDb()
    const value = actualDb[prop as keyof Db]
    if (typeof value === 'function') {
      return value.bind(actualDb)
    }
    return value
  }
})

// Re-export all schema for convenience
export * from './schema'
