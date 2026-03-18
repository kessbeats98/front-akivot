// ============================================
// WALKS REPOSITORY
// ============================================
// Database access for walks, walk batches, and walk media
// No business logic - just data access
// ============================================

import { db } from '@/db'
import { walks, walkBatches, walkMedia } from '@/db/schema'
import { eq, and, inArray, isNull, not, lte, gte, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// ============================================
// WALK BATCH OPERATIONS
// ============================================

export async function getWalkBatchById(id: string) {
  const [batch] = await db
    .select()
    .from(walkBatches)
    .where(eq(walkBatches.id, id))
    .limit(1)
  
  return batch ?? null
}

export async function getLiveWalkBatchByWalker(walkerProfileId: string) {
  const [batch] = await db
    .select()
    .from(walkBatches)
    .where(and(
      eq(walkBatches.walkerProfileId, walkerProfileId),
      eq(walkBatches.status, 'LIVE')
    ))
    .limit(1)
  
  return batch ?? null
}

export async function createWalkBatch(data: {
  walkerProfileId: string
  startedByUserId: string
  startedAt?: Date
}) {
  const [batch] = await db
    .insert(walkBatches)
    .values({
      id: randomUUID(),
      walkerProfileId: data.walkerProfileId,
      status: 'LIVE',
      startedAt: data.startedAt ?? new Date(),
      startedByUserId: data.startedByUserId,
    })
    .returning()
  
  return batch
}

export async function updateWalkBatch(id: string, data: Partial<{
  status: 'LIVE' | 'COMPLETED' | 'AUTO_CLOSED' | 'CANCELLED'
  endedAt: Date
  endedByUserId: string
}>) {
  const [batch] = await db
    .update(walkBatches)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(walkBatches.id, id))
    .returning()
  
  return batch ?? null
}

// ============================================
// WALK OPERATIONS
// ============================================

export async function getWalkById(id: string) {
  const [walk] = await db
    .select()
    .from(walks)
    .where(eq(walks.id, id))
    .limit(1)
  
  return walk ?? null
}

export async function getLiveWalksByBatchId(walkBatchId: string) {
  return db
    .select()
    .from(walks)
    .where(and(
      eq(walks.walkBatchId, walkBatchId),
      eq(walks.status, 'LIVE')
    ))
}

export async function findExistingLiveWalk(dogId: string, walkerProfileId: string) {
  const [walk] = await db
    .select()
    .from(walks)
    .where(and(
      eq(walks.dogId, dogId),
      eq(walks.walkerProfileId, walkerProfileId),
      eq(walks.status, 'LIVE')
    ))
    .limit(1)
  
  return walk ?? null
}

export async function createWalk(data: {
  dogId: string
  walkerProfileId: string
  dogWalkerId: string
  walkBatchId?: string
  startTime: Date
  createdByUserId: string
}) {
  const [walk] = await db
    .insert(walks)
    .values({
      id: randomUUID(),
      dogId: data.dogId,
      walkerProfileId: data.walkerProfileId,
      dogWalkerId: data.dogWalkerId,
      walkBatchId: data.walkBatchId ?? null,
      status: 'LIVE',
      startTime: data.startTime,
      createdByUserId: data.createdByUserId,
      updatedByUserId: data.createdByUserId,
    })
    .returning()
  
  return walk
}

export async function updateWalk(id: string, data: Partial<{
  status: 'PLANNED' | 'LIVE' | 'COMPLETED' | 'AUTO_CLOSED' | 'CANCELLED'
  endTime: Date
  durationMinutes: number
  finalPrice: string
  closureReason: 'MANUAL' | 'AUTO_TIMEOUT' | 'CANCELLED' | 'SYSTEM_FIX'
  note: string
  paymentPeriodId: string
  completedAt: Date
  autoClosedAt: Date
  cancelledAt: Date
  updatedByUserId: string
}>) {
  const [walk] = await db
    .update(walks)
    .set({
      ...data,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(walks.id, id))
    .returning()
  
  return walk ?? null
}

// ============================================
// WALK QUERIES FOR OWNER/WALKER VIEWS
// ============================================

export async function getWalksByOwnerForCalendar(
  ownerUserId: string,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)
  
  const { dogOwners } = await import('@/db/schema')
  
  const results = await db
    .select({
      walk: walks,
      dog: dogs,
    })
    .from(walks)
    .innerJoin(dogs, eq(walks.dogId, dogs.id))
    .innerJoin(dogOwners, eq(dogOwners.dogId, dogs.id))
    .where(and(
      eq(dogOwners.ownerUserId, ownerUserId),
      gte(walks.startTime, startDate),
      lte(walks.startTime, endDate),
      not(eq(walks.status, 'CANCELLED'))
    ))
    .orderBy(desc(walks.startTime))
  
  return results
}

export async function getUnpaidBillableWalksForOwner(
  walkerProfileId: string,
  ownerUserId: string
) {
  const { dogOwners, dogs } = await import('@/db/schema')
  
  const results = await db
    .select({
      walk: walks,
      dog: dogs,
    })
    .from(walks)
    .innerJoin(dogs, eq(walks.dogId, dogs.id))
    .innerJoin(dogOwners, eq(dogOwners.dogId, dogs.id))
    .where(and(
      eq(walks.walkerProfileId, walkerProfileId),
      eq(dogOwners.ownerUserId, ownerUserId),
      inArray(walks.status, ['COMPLETED', 'AUTO_CLOSED']),
      isNull(walks.paymentPeriodId)
    ))
    .orderBy(walks.startTime)
  
  return results
}

// ============================================
// AUTO-CLOSE JOB HELPERS
// ============================================

export async function getLiveWalksOlderThan(minutesAgo: number) {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000)
  
  return db
    .select()
    .from(walks)
    .where(and(
      eq(walks.status, 'LIVE'),
      isNull(walks.autoClosedAt),
      isNull(walks.deletedAt),
      lte(walks.startTime, cutoff)
    ))
}

export async function getLiveWalksNeedingWarning(minutesAgo: number) {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000)
  const alreadySentCutoff = new Date(Date.now() - 10 * 60 * 1000) // Don't resend within 10 min
  
  const results = await db
    .select({
      walk: walks,
    })
    .from(walks)
    .leftJoin(walkMedia, eq(walkMedia.walkId, walks.id)) // Check for existing warning notification
    .where(and(
      eq(walks.status, 'LIVE'),
      lte(walks.startTime, cutoff),
      gte(walks.startTime, alreadySentCutoff)
    ))
  
  return results
}

// ============================================
// WALK MEDIA OPERATIONS
// ============================================

export async function createWalkMedia(data: {
  walkId: string
  mediaType: 'PHOTO'
  storageProvider: 'VERCEL_BLOB'
  uploadedByUserId: string
  capturedAt: Date
}) {
  const [media] = await db
    .insert(walkMedia)
    .values({
      id: randomUUID(),
      walkId: data.walkId,
      mediaType: data.mediaType,
      storageProvider: data.storageProvider,
      uploadedByUserId: data.uploadedByUserId,
      capturedAt: data.capturedAt,
      uploadStatus: 'PENDING',
    })
    .returning()
  
  return media
}

export async function updateWalkMedia(id: string, data: Partial<{
  storageKey: string
  publicUrl: string
  uploadStatus: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED'
  uploadedAt: Date
}>) {
  const [media] = await db
    .update(walkMedia)
    .set(data)
    .where(eq(walkMedia.id, id))
    .returning()
  
  return media ?? null
}

export async function getWalkMediaByWalkId(walkId: string) {
  return db
    .select()
    .from(walkMedia)
    .where(eq(walkMedia.walkId, walkId))
    .orderBy(walkMedia.capturedAt)
}
