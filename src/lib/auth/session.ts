// ============================================
// AUTH SESSION HELPERS
// ============================================
// Helper functions for authentication and authorization
// Uses Better Auth session management
// ============================================

import { headers } from 'next/headers'
import { auth } from './better-auth'
import { db } from '@/db'
import { users, walkerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface AuthUser {
  id: string
  email: string
  name: string
  phone?: string | null
  imageUrl?: string | null
  isActive: boolean
}

export interface WalkerProfile {
  id: string
  userId: string
  displayName: string
  publicSlug?: string | null
  inviteCode: string
  isAcceptingClients: boolean
}

export interface AuthenticatedContext {
  user: AuthUser
  walkerProfile?: WalkerProfile
}

// ============================================
// ERROR CLASSES
// ============================================
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class PaymentLockedError extends Error {
  constructor(message: string = 'Payment period is locked') {
    super(message)
    this.name = 'PaymentLockedError'
  }
}

// ============================================
// SESSION HELPERS
// ============================================

/**
 * Get the current authenticated user from the request context
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session?.user) {
      return null
    }
    
    // Fetch full user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    
    if (!user) {
      return null
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      imageUrl: user.imageUrl,
      isActive: user.isActive,
    }
  } catch {
    return null
  }
}

/**
 * Get the walker profile for a user
 * Returns null if user is not a walker
 */
export async function getWalkerProfileByUserId(userId: string): Promise<WalkerProfile | null> {
  try {
    const [profile] = await db
      .select()
      .from(walkerProfiles)
      .where(eq(walkerProfiles.userId, userId))
      .limit(1)
    
    if (!profile) {
      return null
    }
    
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      publicSlug: profile.publicSlug,
      inviteCode: profile.inviteCode,
      isAcceptingClients: profile.isAcceptingClients,
    }
  } catch {
    return null
  }
}

/**
 * Assert that the user is authenticated
 * Throws UnauthorizedError if not
 */
export async function assertAuthenticated(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new UnauthorizedError('Must be logged in')
  }
  if (!user.isActive) {
    throw new UnauthorizedError('User account is inactive')
  }
  return user
}

/**
 * Assert that the user is authenticated AND is a walker
 * Returns user + walker profile
 * Throws UnauthorizedError or ForbiddenError
 */
export async function assertWalkerAuthenticated(): Promise<AuthenticatedContext> {
  const user = await assertAuthenticated()
  
  const walkerProfile = await getWalkerProfileByUserId(user.id)
  if (!walkerProfile) {
    throw new ForbiddenError('User is not a walker')
  }
  
  return { user, walkerProfile }
}

/**
 * Check if a user owns a specific dog
 */
export async function userOwnsDog(userId: string, dogId: string): Promise<boolean> {
  const { dogOwners } = await import('@/db/schema')
  const [ownership] = await db
    .select()
    .from(dogOwners)
    .where(eq(dogOwners.ownerUserId, userId))
    .where(eq(dogOwners.dogId, dogId))
    .limit(1)
  
  return !!ownership
}

/**
 * Check if a walker profile has access to a dog
 */
export async function walkerHasDogAccess(walkerProfileId: string, dogId: string): Promise<boolean> {
  const { dogWalkers } = await import('@/db/schema')
  const [dogWalker] = await db
    .select()
    .from(dogWalkers)
    .where(eq(dogWalkers.walkerProfileId, walkerProfileId))
    .where(eq(dogWalkers.dogId, dogId))
    .where(eq(dogWalkers.isActive, true))
    .limit(1)
  
  return !!dogWalker
}

/**
 * Check if a payment period is locked (PAID status)
 */
export async function isPaymentPeriodLocked(paymentPeriodId: string): Promise<boolean> {
  const { paymentPeriods } = await import('@/db/schema')
  const [period] = await db
    .select({ status: paymentPeriods.status })
    .from(paymentPeriods)
    .where(eq(paymentPeriods.id, paymentPeriodId))
    .limit(1)
  
  return period?.status === 'PAID' || period?.status === 'ARCHIVED'
}
