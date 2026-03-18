// ============================================
// START WALK BATCH SERVICE
// ============================================
// Creates a walk batch with multiple LIVE walks
// Enforces business rules and writes audit logs
// ============================================

import { db } from '@/db'
import { walks, walkBatches, dogWalkers, dogs } from '@/db/schema'
import { 
  getWalkerProfileById, 
  getWalkerProfileByUserId 
} from '@/lib/repositories/usersRepo'
import { 
  getActiveDogWalker, 
  getDogById 
} from '@/lib/repositories/dogsRepo'
import { findExistingLiveWalk } from '@/lib/repositories/walksRepo'
import { createAuditLogsBatch, AuditAction, EntityType } from '@/lib/repositories/auditRepo'
import { 
  ForbiddenError, 
  UnauthorizedError,
  WalkerProfile 
} from '@/lib/auth/session'
import { sendWalkNotifications } from '@/lib/services/notifications/sendWalkNotifications'
import { and, eq } from 'drizzle-orm'
import { randomUUID, createHash } from 'crypto'

// ============================================
// INPUT TYPES
// ============================================
interface StartWalkBatchInput {
  walkerProfileId: string
  dogIds: string[]
  startedByUserId: string
  startTime?: Date
}

// ============================================
// OUTPUT TYPES
// ============================================
interface StartWalkBatchOutput {
  walkBatchId: string
  startedAt: Date
  idempotent?: boolean
  walks: Array<{
    id: string
    dogId: string
    dogName: string
    startTime: Date
    status: string
  }>
}

// ============================================
// DOMAIN ERRORS
// ============================================
export class DogNotAssignedToWalkerError extends Error {
  constructor(dogName: string) {
    super(`Dog "${dogName}" is not assigned to this walker`)
    this.name = 'DogNotAssignedToWalkerError'
  }
}

export class LiveWalkAlreadyExistsError extends Error {
  constructor(dogName: string) {
    super(`A live walk already exists for "${dogName}"`)
    this.name = 'LiveWalkAlreadyExistsError'
  }
}

export class MaxDogsPerBatchExceededError extends Error {
  constructor() {
    super('Maximum 5 dogs allowed per walk batch')
    this.name = 'MaxDogsPerBatchExceededError'
  }
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export async function startWalkBatchService(
  input: StartWalkBatchInput
): Promise<StartWalkBatchOutput> {
  const { walkerProfileId, dogIds, startedByUserId, startTime } = input
  
  // ==========================================
  // VALIDATION: Max dogs per batch
  // ==========================================
  if (dogIds.length === 0) {
    throw new Error('At least one dog must be selected')
  }
  if (dogIds.length > 5) {
    throw new MaxDogsPerBatchExceededError()
  }
  
  // ==========================================
  // VALIDATION: Actor owns walker profile
  // ==========================================
  const actorProfile = await getWalkerProfileByUserId(startedByUserId)
  if (!actorProfile || actorProfile.id !== walkerProfileId) {
    throw new ForbiddenError('You do not have access to this walker profile')
  }
  
  // ==========================================
  // VALIDATION: Each dog is assigned to this walker
  // VALIDATION: No existing LIVE walk for any dog
  // ==========================================
  const dogData: Array<{
    dog: typeof dogs.$inferSelect
    dogWalker: typeof dogWalkers.$inferSelect
  }> = []
  
  for (const dogId of dogIds) {
    // Check dog exists
    const dog = await getDogById(dogId)
    if (!dog) {
      throw new Error(`Dog not found: ${dogId}`)
    }
    
    // Check dog-walker relationship
    const dogWalker = await getActiveDogWalker(dogId, walkerProfileId)
    if (!dogWalker) {
      throw new DogNotAssignedToWalkerError(dog.name)
    }
    
    // Check no existing LIVE walk
    const existingLive = await findExistingLiveWalk(dogId, walkerProfileId)
    if (existingLive) {
      throw new LiveWalkAlreadyExistsError(dog.name)
    }
    
    dogData.push({ dog, dogWalker })
  }
  
  // ==========================================
  // IDEMPOTENCY KEY: SHA-256(walkerProfileId + sorted dogIds + minute bucket)
  // ==========================================
  const actualStartTime = startTime ?? new Date()
  const batchId = randomUUID()

  const sortedDogIds = [...dogIds].sort()
  const minuteBucket = Math.floor(Date.now() / 60000)
  const idempotencyInput = `${walkerProfileId}${sortedDogIds.join(',')}${minuteBucket}`
  const idempotencyKey = createHash('sha256').update(idempotencyInput).digest('hex')

  try {
    const result = await db.transaction(async (tx) => {
      // Create walk batch
      const [batch] = await tx
        .insert(walkBatches)
        .values({
          id: batchId,
          idempotencyKey,
          walkerProfileId,
          status: 'LIVE',
          startedAt: actualStartTime,
          startedByUserId,
        })
        .returning()

      // Create walks for each dog
      const walkRecords: Array<{
        id: string
        dogId: string
        dogName: string
        startTime: Date
        status: string
      }> = []

      const auditLogs: Array<{
        actorUserId: string
        entityType: EntityType
        entityId: string
        action: AuditAction
        afterJson: Record<string, unknown>
        metadataJson?: Record<string, unknown>
      }> = []

      for (const { dog, dogWalker } of dogData) {
        const walkId = randomUUID()

        const [walk] = await tx
          .insert(walks)
          .values({
            id: walkId,
            dogId: dog.id,
            walkerProfileId,
            dogWalkerId: dogWalker.id,
            walkBatchId: batchId,
            status: 'LIVE',
            startTime: actualStartTime,
            createdByUserId: startedByUserId,
            updatedByUserId: startedByUserId,
          })
          .returning()

        walkRecords.push({
          id: walkId,
          dogId: dog.id,
          dogName: dog.name,
          startTime: actualStartTime,
          status: 'LIVE',
        })

        auditLogs.push({
          actorUserId: startedByUserId,
          entityType: 'WALK',
          entityId: walkId,
          action: 'START_WALK',
          afterJson: {
            walkId,
            dogId: dog.id,
            dogName: dog.name,
            walkerProfileId,
            walkBatchId: batchId,
            startTime: actualStartTime.toISOString(),
          },
          metadataJson: {
            dogWalkerId: dogWalker.id,
            priceSnapshot: dogWalker.currentPrice,
          },
        })
      }

      // Create audit logs
      await createAuditLogsBatch(auditLogs)

      return { batch, walks: walkRecords }
    })

    // Fire-and-forget notifications
    sendWalkNotifications({
      walkIds: result.walks.map((w) => w.id),
      type: 'WALK_STARTED',
    }).catch(() => {})

    return {
      walkBatchId: batchId,
      startedAt: actualStartTime,
      walks: result.walks,
    }
  } catch (err) {
    // Unique constraint violation on idempotencyKey — return existing batch
    const pgErrorCode = (err as any)?.code ?? (err as any)?.cause?.code
    if (pgErrorCode === '23505') {
      const existing = await db.query.walkBatches.findFirst({
        where: eq(walkBatches.idempotencyKey, idempotencyKey),
      })
      if (!existing) throw err

      const existingWalks = await db
        .select({
          id: walks.id,
          dogId: walks.dogId,
          dogName: dogs.name,
          startTime: walks.startTime,
          status: walks.status,
        })
        .from(walks)
        .innerJoin(dogs, eq(walks.dogId, dogs.id))
        .where(eq(walks.walkBatchId, existing.id))

      return {
        walkBatchId: existing.id,
        startedAt: existing.startedAt,
        walks: existingWalks,
        idempotent: true,
      }
    }
    throw err
  }
}
