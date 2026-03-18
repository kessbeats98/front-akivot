// ============================================
// CANCEL WALK SERVICE
// ============================================
// Cancels a planned or live walk
// Sets finalPrice to 0 and writes audit log
// ============================================

import { db } from '@/db'
import { walks } from '@/db/schema'
import { getWalkerProfileByUserId } from '@/lib/repositories/usersRepo'
import { getWalkById } from '@/lib/repositories/walksRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { ForbiddenError } from '@/lib/auth/session'
import { eq } from 'drizzle-orm'

// ============================================
// INPUT TYPES
// ============================================
interface CancelWalkInput {
  walkId: string
  cancelledByUserId: string
  reason?: string
}

// ============================================
// OUTPUT TYPES
// ============================================
interface CancelWalkOutput {
  walkId: string
  status: string
  cancelledAt: Date
}

// ============================================
// DOMAIN ERRORS
// ============================================
export class WalkNotFoundError extends Error {
  constructor() {
    super('Walk not found')
    this.name = 'WalkNotFoundError'
  }
}

export class WalkCannotBeCancelledError extends Error {
  constructor(currentStatus: string) {
    super(`Walk with status "${currentStatus}" cannot be cancelled`)
    this.name = 'WalkCannotBeCancelledError'
  }
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export async function cancelWalkService(
  input: CancelWalkInput
): Promise<CancelWalkOutput> {
  const { walkId, cancelledByUserId, reason } = input
  
  // ==========================================
  // VALIDATION: Walk exists
  // ==========================================
  const walk = await getWalkById(walkId)
  if (!walk) {
    throw new WalkNotFoundError()
  }
  
  // ==========================================
  // VALIDATION: Walk can be cancelled
  // ==========================================
  if (!['PLANNED', 'LIVE'].includes(walk.status)) {
    throw new WalkCannotBeCancelledError(walk.status)
  }
  
  // ==========================================
  // VALIDATION: Actor belongs to walker profile
  // ==========================================
  const actorProfile = await getWalkerProfileByUserId(cancelledByUserId)
  if (!actorProfile || actorProfile.id !== walk.walkerProfileId) {
    throw new ForbiddenError('You do not have access to cancel this walk')
  }
  
  // ==========================================
  // TRANSACTION: Cancel walk + audit log
  // ==========================================
  const cancelledAt = new Date()
  
  const [updatedWalk] = await db
    .update(walks)
    .set({
      status: 'CANCELLED',
      endTime: cancelledAt,
      finalPrice: '0',
      closureReason: 'CANCELLED',
      note: reason ?? walk.note,
      cancelledAt,
      statusUpdatedAt: cancelledAt,
      updatedAt: cancelledAt,
      updatedByUserId: cancelledByUserId,
    })
    .where(eq(walks.id, walkId))
    .returning()
  
  // Create audit log
  await createAuditLog({
    actorUserId: cancelledByUserId,
    entityType: 'WALK',
    entityId: walkId,
    action: 'CANCEL_WALK',
    beforeJson: {
      status: walk.status,
      startTime: walk.startTime.toISOString(),
    },
    afterJson: {
      status: 'CANCELLED',
      cancelledAt: cancelledAt.toISOString(),
      finalPrice: '0',
      closureReason: 'CANCELLED',
    },
    metadataJson: {
      reason: reason ?? null,
      previousStatus: walk.status,
    },
  })
  
  return {
    walkId,
    status: 'CANCELLED',
    cancelledAt,
  }
}
