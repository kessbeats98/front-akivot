// ============================================
// USERS REPOSITORY
// ============================================
// Database access for users and walker profiles
// No business logic - just data access
// ============================================

import { db } from '@/db'
import { users, walkerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// ============================================
// USER OPERATIONS
// ============================================

export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  
  return user ?? null
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  
  return user ?? null
}

export async function createUser(data: {
  email: string
  name: string
  phone?: string
  imageUrl?: string
}) {
  const [user] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      imageUrl: data.imageUrl ?? null,
      isActive: true,
    })
    .returning()
  
  return user
}

export async function updateUser(id: string, data: Partial<{
  name: string
  phone: string
  imageUrl: string
  isActive: boolean
}>) {
  const [user] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()
  
  return user ?? null
}

// ============================================
// WALKER PROFILE OPERATIONS
// ============================================

export async function getWalkerProfileById(id: string) {
  const [profile] = await db
    .select()
    .from(walkerProfiles)
    .where(eq(walkerProfiles.id, id))
    .limit(1)
  
  return profile ?? null
}

export async function getWalkerProfileByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(walkerProfiles)
    .where(eq(walkerProfiles.userId, userId))
    .limit(1)
  
  return profile ?? null
}

export async function getWalkerProfileByInviteCode(inviteCode: string) {
  const [profile] = await db
    .select()
    .from(walkerProfiles)
    .where(eq(walkerProfiles.inviteCode, inviteCode))
    .limit(1)
  
  return profile ?? null
}

export async function getWalkerProfileByPublicSlug(publicSlug: string) {
  const [profile] = await db
    .select()
    .from(walkerProfiles)
    .where(eq(walkerProfiles.publicSlug, publicSlug))
    .limit(1)
  
  return profile ?? null
}

export async function createWalkerProfile(data: {
  userId: string
  displayName: string
  publicSlug?: string
  inviteCode: string
}) {
  const [profile] = await db
    .insert(walkerProfiles)
    .values({
      id: randomUUID(),
      userId: data.userId,
      displayName: data.displayName,
      publicSlug: data.publicSlug ?? null,
      inviteCode: data.inviteCode,
      isAcceptingClients: true,
    })
    .returning()
  
  return profile
}

export async function updateWalkerProfile(id: string, data: Partial<{
  displayName: string
  publicSlug: string
  isAcceptingClients: boolean
}>) {
  const [profile] = await db
    .update(walkerProfiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(walkerProfiles.id, id))
    .returning()
  
  return profile ?? null
}

// ============================================
// HELPERS
// ============================================

/**
 * Generate a unique invite code for a walker
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Generate a URL-safe public slug from display name
 */
export function generatePublicSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}
