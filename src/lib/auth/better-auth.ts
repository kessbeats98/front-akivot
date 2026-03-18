// ============================================
// BETTER AUTH CONFIGURATION
// ============================================
// Uses Better Auth with Drizzle adapter for PostgreSQL
// ============================================

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as schema from '@/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  
  // Email/Password authentication provider
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  
  // Advanced configuration
  advanced: {
    generateId: false,
  },
  
  // App URL configuration
  baseURL: process.env.BETTER_AUTH_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET || 'akivot-dev-secret-change-in-production',
  
  // User configuration
  user: {
    modelName: 'users',
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
      },
      imageUrl: {
        type: 'string',
        required: false,
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
    },
  },
})

// Type export for use in other files
export type Auth = typeof auth
