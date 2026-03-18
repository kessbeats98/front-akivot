// ============================================
// DOGS REPOSITORY
// ============================================
// Database access for dogs and their relationships
// No business logic - just data access
// ============================================

import { db } from '@/db'
import { dogs, dogOwners, dogWalkers, users, walkerProfiles } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// ============================================
// DOG OPERATIONS
// ============================================

export async function getDogById(id: string) {
  const [dog] = await db
    .select()
    .from(dogs)
    .where(eq(dogs.id, id))
    .limit(1)
  
  return dog ?? null
}

export async function getDogsByWalkerProfileId(walkerProfileId: string) {
  // Get all dogs that this walker walks (via dogWalkers junction)
  const results = await db
    .select({
      dog: dogs,
      dogWalker: dogWalkers,
      owner: users,
    })
    .from(dogWalkers)
    .innerJoin(dogs, eq(dogWalkers.dogId, dogs.id))
    .innerJoin(dogOwners, and(eq(dogOwners.dogId, dogs.id), eq(dogOwners.isPrimary, true)))
    .innerJoin(users, eq(dogOwners.ownerUserId, users.id))
    .where(and(
      eq(dogWalkers.walkerProfileId, walkerProfileId),
      eq(dogWalkers.isActive, true),
      eq(dogs.isActive, true)
    ))
  
  return results.map(r => ({
    ...r.dog,
    owner: r.owner,
    currentPrice: r.dogWalker.currentPrice,
    currency: r.dogWalker.currency,
    dogWalkerId: r.dogWalker.id,
  }))
}

export async function getDogsByOwnerUserId(ownerUserId: string) {
  const results = await db
    .select({
      dog: dogs,
      dogOwner: dogOwners,
    })
    .from(dogOwners)
    .innerJoin(dogs, eq(dogOwners.dogId, dogs.id))
    .where(and(
      eq(dogOwners.ownerUserId, ownerUserId),
      eq(dogs.isActive, true)
    ))
  
  return results.map(r => r.dog)
}

export async function createDog(data: {
  name: string
  breed?: string
  birthDate?: Date
  imageUrl?: string
  notes?: string
  ownerUserId: string
}) {
  const dogId = randomUUID()
  
  // Create dog and primary owner in a transaction
  const [dog] = await db.transaction(async (tx) => {
    const [newDog] = await tx
      .insert(dogs)
      .values({
        id: dogId,
        name: data.name,
        breed: data.breed ?? null,
        birthDate: data.birthDate ?? null,
        imageUrl: data.imageUrl ?? null,
        notes: data.notes ?? null,
        isActive: true,
      })
      .returning()
    
    await tx
      .insert(dogOwners)
      .values({
        id: randomUUID(),
        dogId: dogId,
        ownerUserId: data.ownerUserId,
        isPrimary: true,
      })
    
    return [newDog]
  })
  
  return dog
}

// ============================================
// DOG OWNER OPERATIONS
// ============================================

export async function getOwnersForDog(dogId: string) {
  const results = await db
    .select({
      user: users,
      dogOwner: dogOwners,
    })
    .from(dogOwners)
    .innerJoin(users, eq(dogOwners.ownerUserId, users.id))
    .where(eq(dogOwners.dogId, dogId))
  
  return results.map(r => ({
    ...r.user,
    isPrimary: r.dogOwner.isPrimary,
  }))
}

export async function isUserDogOwner(userId: string, dogId: string): Promise<boolean> {
  const [dogOwner] = await db
    .select()
    .from(dogOwners)
    .where(and(
      eq(dogOwners.dogId, dogId),
      eq(dogOwners.ownerUserId, userId)
    ))
    .limit(1)
  
  return !!dogOwner
}

// ============================================
// DOG WALKER OPERATIONS
// ============================================

export async function getActiveDogWalker(dogId: string, walkerProfileId: string) {
  const [dogWalker] = await db
    .select()
    .from(dogWalkers)
    .where(and(
      eq(dogWalkers.dogId, dogId),
      eq(dogWalkers.walkerProfileId, walkerProfileId),
      eq(dogWalkers.isActive, true),
      isNull(dogWalkers.endedAt)
    ))
    .limit(1)
  
  return dogWalker ?? null
}

export async function getDogWalkerById(id: string) {
  const [dogWalker] = await db
    .select()
    .from(dogWalkers)
    .where(eq(dogWalkers.id, id))
    .limit(1)
  
  return dogWalker ?? null
}

export async function createDogWalker(data: {
  dogId: string
  walkerProfileId: string
  currentPrice: string
  currency?: string
}) {
  const [dogWalker] = await db
    .insert(dogWalkers)
    .values({
      id: randomUUID(),
      dogId: data.dogId,
      walkerProfileId: data.walkerProfileId,
      currentPrice: data.currentPrice,
      currency: data.currency ?? 'ILS',
      isActive: true,
    })
    .returning()
  
  return dogWalker
}

export async function updateDogWalkerPrice(id: string, currentPrice: string) {
  const [dogWalker] = await db
    .update(dogWalkers)
    .set({
      currentPrice,
      updatedAt: new Date(),
    })
    .where(eq(dogWalkers.id, id))
    .returning()
  
  return dogWalker ?? null
}

export async function deactivateDogWalker(id: string) {
  const [dogWalker] = await db
    .update(dogWalkers)
    .set({
      isActive: false,
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dogWalkers.id, id))
    .returning()
  
  return dogWalker ?? null
}
