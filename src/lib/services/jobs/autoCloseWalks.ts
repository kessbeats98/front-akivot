// ============================================
// AUTO CLOSE WALKS JOB
// ============================================
// Cron job to auto-close walks that have been live too long
// Runs every 5 minutes via Vercel Cron
// ============================================

import { db } from '@/db'
import { walks, walkBatches, dogWalkers } from '@/db/schema'
import {
  getLiveWalksOlderThan,
  updateWalk,
} from '@/lib/repositories/walksRepo'
import { updateWalkBatch } from '@/lib/repositories/walksRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { sendWalkNotifications } from '@/lib/services/notifications/sendWalkNotifications'
import { eq } from 'drizzle-orm'

// ============================================
// CONFIGURATION
// ============================================
const AUTO_CLOSE_AFTER_MINUTES = 120 // 2 hours
const WARNING_AFTER_MINUTES = 90 // 1.5 hours

// ============================================
// OUTPUT TYPES
// ============================================
interface AutoCloseResult {
  autoClosed: Array<{
    walkId: string
    dogId: string
    durationMinutes: number
    finalPrice: string
  }>
  warnings: Array<{
    walkId: string
    dogId: string
  }>
}

// ============================================
// JOB IMPLEMENTATION
// ============================================

export async function autoCloseWalksJob(options?: { now?: Date }): Promise<AutoCloseResult> {
  const now = options?.now ?? new Date()
  
  const result: AutoCloseResult = {
    autoClosed: [],
    warnings: [],
  }
  
  // ==========================================
  // PHASE 1: Auto-close walks older than 120 minutes
  // ==========================================
  const walksToClose = await getLiveWalksOlderThan(AUTO_CLOSE_AFTER_MINUTES)
  
  for (const walk of walksToClose) {
    try {
      // Calculate duration and price
      const startTime = new Date(walk.startTime)
      const durationMs = now.getTime() - startTime.getTime()
      const durationMinutes = Math.round(durationMs / 60000)
      
      // Get price snapshot from dogWalker
      const [dogWalker] = await db
        .select()
        .from(dogWalkers)
        .where(eq(dogWalkers.id, walk.dogWalkerId))
        .limit(1)
      
      const finalPrice = dogWalker?.currentPrice ?? '0'
      
      // Update walk
      await updateWalk(walk.id, {
        status: 'AUTO_CLOSED',
        endTime: now,
        durationMinutes,
        finalPrice,
        closureReason: 'AUTO_TIMEOUT',
        autoClosedAt: now,
        updatedByUserId: null,
      })
      
      // Update batch if all walks are done
      if (walk.walkBatchId) {
        const batchWalks = await db
          .select()
          .from(walks)
          .where(eq(walks.walkBatchId, walk.walkBatchId))
        
        const allClosed = batchWalks.every(w => 
          w.status === 'COMPLETED' || w.status === 'AUTO_CLOSED' || w.status === 'CANCELLED'
        )
        
        if (allClosed) {
          await updateWalkBatch(walk.walkBatchId, {
            status: 'AUTO_CLOSED',
            endedAt: now,
          })
        }
      }
      
      // Audit log
      await createAuditLog({
        actorUserId: walk.createdByUserId,
        entityType: 'WALK',
        entityId: walk.id,
        action: 'AUTO_CLOSE_WALK',
        beforeJson: {
          status: 'LIVE',
          startTime: walk.startTime.toISOString(),
        },
        afterJson: {
          status: 'AUTO_CLOSED',
          endTime: now.toISOString(),
          durationMinutes,
          finalPrice,
          closureReason: 'AUTO_TIMEOUT',
        },
        metadataJson: {
          autoClosedAt: now.toISOString(),
          dogWalkerId: walk.dogWalkerId,
        },
      })
      
      result.autoClosed.push({
        walkId: walk.id,
        dogId: walk.dogId,
        durationMinutes,
        finalPrice,
      })
      
    } catch (error) {
      console.error(`Failed to auto-close walk ${walk.id}:`, error)
      // Continue with other walks even if one fails
    }
  }
  
  // Fire-and-forget: notify owners of auto-closed walks
  if (result.autoClosed.length > 0) {
    void sendWalkNotifications({
      walkIds: result.autoClosed.map((w) => w.walkId),
      type: 'AUTO_CLOSED',
    }).catch(() => {})
  }

  // ==========================================
  // PHASE 2: Send warning for walks approaching timeout
  // ==========================================
  const walksToWarn = await getLiveWalksOlderThan(WARNING_AFTER_MINUTES)
  
  for (const walk of walksToWarn) {
    // Skip if already being auto-closed
    if (result.autoClosed.some(w => w.walkId === walk.id)) {
      continue
    }
    
    // TODO: Check if warning already sent (via notificationDeliveries)
    // For now, we'll add to warnings list
    result.warnings.push({
      walkId: walk.id,
      dogId: walk.dogId,
    })
  }
  
  return result
}
