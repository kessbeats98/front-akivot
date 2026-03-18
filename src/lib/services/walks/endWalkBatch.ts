// ============================================
// END WALK BATCH SERVICE
// ============================================
// Ends a walk batch and marks all walks as COMPLETED
// Calculates duration, final price, and writes audit logs
// ============================================

import { db } from '@/db'
import { walks, walkBatches, dogWalkers } from '@/db/schema'
import { 
  getWalkerProfileByUserId 
} from '@/lib/repositories/usersRepo'
import { 
  getWalkBatchById,
  getLiveWalksByBatchId,
} from '@/lib/repositories/walksRepo'
import { createAuditLogsBatch, AuditAction, EntityType } from '@/lib/repositories/auditRepo'
import { sendWalkNotifications } from '@/lib/services/notifications/sendWalkNotifications'
import { ForbiddenError } from '@/lib/auth/session'
import { eq, and } from 'drizzle-orm'

// ============================================
// INPUT TYPES
// ============================================
interface EndWalkBatchInput {
  walkBatchId: string
  endedByUserId: string
  endTime?: Date
  note?: string
}

// ============================================
// OUTPUT TYPES
// ============================================
interface EndWalkBatchOutput {
  walkBatchId: string
  endedAt: Date
  walks: Array<{
    id: string
    dogId: string
    dogName?: string
    status: string
    durationMinutes: number
    finalPrice: string
  }>
}

// ============================================
// DOMAIN ERRORS
// ============================================
export class WalkBatchNotFoundError extends Error {
  constructor() {
    super('Walk batch not found')
    this.name = 'WalkBatchNotFoundError'
  }
}

export class WalkBatchNotLiveError extends Error {
  constructor() {
    super('Walk batch is not currently live')
    this.name = 'WalkBatchNotLiveError'
  }
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export async function endWalkBatchService(
  input: EndWalkBatchInput
): Promise<EndWalkBatchOutput> {
  const { walkBatchId, endedByUserId, endTime, note } = input
  
  // ==========================================
  // VALIDATION: Batch exists and is LIVE
  // ==========================================
  const batch = await getWalkBatchById(walkBatchId)
  if (!batch) {
    throw new WalkBatchNotFoundError()
  }
  
  if (batch.status !== 'LIVE') {
    throw new WalkBatchNotLiveError()
  }
  
  // ==========================================
  // VALIDATION: Actor belongs to walker profile
  // ==========================================
  const actorProfile = await getWalkerProfileByUserId(endedByUserId)
  if (!actorProfile || actorProfile.id !== batch.walkerProfileId) {
    throw new ForbiddenError('You do not have access to this walk batch')
  }
  
  // ==========================================
  // LOAD: All LIVE walks in this batch
  // ==========================================
  const liveWalks = await getLiveWalksByBatchId(walkBatchId)
  
  if (liveWalks.length === 0) {
    // No walks to end - just close the batch
    const actualEndTime = endTime ?? new Date()
    
    await db
      .update(walkBatches)
      .set({
        status: 'COMPLETED',
        endedAt: actualEndTime,
        endedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(walkBatches.id, walkBatchId))
    
    return {
      walkBatchId,
      endedAt: actualEndTime,
      walks: [],
    }
  }
  
  // ==========================================
  // TRANSACTION: End all walks + update batch + audit logs
  // ==========================================
  const actualEndTime = endTime ?? new Date()
  
  const result = await db.transaction(async (tx) => {
    const walkResults: Array<{
      id: string
      dogId: string
      dogName?: string
      status: string
      durationMinutes: number
      finalPrice: string
    }> = []
    
    const auditLogs: Array<{
      actorUserId: string
      entityType: EntityType
      entityId: string
      action: AuditAction
      beforeJson: Record<string, unknown>
      afterJson: Record<string, unknown>
      metadataJson?: Record<string, unknown>
    }> = []
    
    for (const walk of liveWalks) {
      // Calculate duration
      const startTime = new Date(walk.startTime)
      const durationMs = actualEndTime.getTime() - startTime.getTime()
      const durationMinutes = Math.round(durationMs / 60000)
      
      // Get price from dogWalker record
      const [dogWalker] = await tx
        .select()
        .from(dogWalkers)
        .where(eq(dogWalkers.id, walk.dogWalkerId))
        .limit(1)
      
      const finalPrice = dogWalker?.currentPrice ?? '0'
      
      // Update walk
      const [updatedWalk] = await tx
        .update(walks)
        .set({
          status: 'COMPLETED',
          endTime: actualEndTime,
          durationMinutes,
          finalPrice,
          currency: dogWalker?.currency ?? 'ILS',
          closureReason: 'MANUAL',
          note: note ?? walk.note,
          completedAt: actualEndTime,
          statusUpdatedAt: new Date(),
          updatedAt: new Date(),
          updatedByUserId: endedByUserId,
        })
        .where(eq(walks.id, walk.id))
        .returning()
      
      walkResults.push({
        id: walk.id,
        dogId: walk.dogId,
        status: 'COMPLETED',
        durationMinutes,
        finalPrice,
      })
      
      // Prepare audit log
      auditLogs.push({
        actorUserId: endedByUserId,
        entityType: 'WALK',
        entityId: walk.id,
        action: 'END_WALK',
        beforeJson: {
          status: 'LIVE',
          startTime: walk.startTime.toISOString(),
        },
        afterJson: {
          status: 'COMPLETED',
          endTime: actualEndTime.toISOString(),
          durationMinutes,
          finalPrice,
          closureReason: 'MANUAL',
        },
        metadataJson: {
          walkBatchId,
          dogWalkerId: walk.dogWalkerId,
          priceSnapshot: finalPrice,
        },
      })
    }
    
    // Update batch
    await tx
      .update(walkBatches)
      .set({
        status: 'COMPLETED',
        endedAt: actualEndTime,
        endedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(walkBatches.id, walkBatchId))
    
    // Create audit logs
    await createAuditLogsBatch(auditLogs)
    
    // Audit log for the batch itself
    await createAuditLogsBatch([{
      actorUserId: endedByUserId,
      entityType: 'WALK_BATCH',
      entityId: walkBatchId,
      action: 'UPDATE',
      beforeJson: { status: 'LIVE' },
      afterJson: { 
        status: 'COMPLETED', 
        endedAt: actualEndTime.toISOString(),
        walksCount: walkResults.length,
      },
    }])
    
    return walkResults
  })
  
  // Fire-and-forget notifications
  sendWalkNotifications({
    walkIds: result.map((w) => w.id),
    type: 'WALK_COMPLETED',
  }).catch(() => {})

  return {
    walkBatchId,
    endedAt: actualEndTime,
    walks: result,
  }
}
