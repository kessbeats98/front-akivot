// ============================================
// CLOSE PAYMENT PERIOD SERVICE
// ============================================
// Creates a payment period for completed walks
// Groups billable walks and calculates total
// ============================================

import { db } from '@/db'
import { paymentPeriods, paymentEntries, walks } from '@/db/schema'
import { getWalkerProfileByUserId } from '@/lib/repositories/usersRepo'
import { getUnpaidBillableWalksForOwner } from '@/lib/repositories/walksRepo'
import { 
  getOpenPaymentPeriod,
  createPaymentPeriod,
  createPaymentEntry,
  linkWalksToPaymentPeriod,
  recalculatePeriodTotal,
} from '@/lib/repositories/billingRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { ForbiddenError } from '@/lib/auth/session'
import { randomUUID } from 'crypto'

// ============================================
// INPUT TYPES
// ============================================
interface ClosePaymentPeriodInput {
  walkerProfileId: string
  ownerUserId: string
  closedByUserId: string
}

// ============================================
// OUTPUT TYPES
// ============================================
interface ClosePaymentPeriodOutput {
  paymentPeriodId: string
  totalAmount: string
  currency: string
  walkCount: number
  walkIds: string[]
}

// ============================================
// DOMAIN ERRORS
// ============================================
export class NoBillableWalksError extends Error {
  constructor() {
    super('No billable walks found for this owner')
    this.name = 'NoBillableWalksError'
  }
}

export class OpenPeriodAlreadyExistsError extends Error {
  constructor() {
    super('An open payment period already exists for this owner')
    this.name = 'OpenPeriodAlreadyExistsError'
  }
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export async function closePaymentPeriodService(
  input: ClosePaymentPeriodInput
): Promise<ClosePaymentPeriodOutput> {
  const { walkerProfileId, ownerUserId, closedByUserId } = input
  
  // ==========================================
  // VALIDATION: Actor belongs to walker profile
  // ==========================================
  const actorProfile = await getWalkerProfileByUserId(closedByUserId)
  if (!actorProfile || actorProfile.id !== walkerProfileId) {
    throw new ForbiddenError('You do not have access to this walker profile')
  }
  
  // ==========================================
  // VALIDATION: No existing open period
  // ==========================================
  const existingPeriod = await getOpenPaymentPeriod(walkerProfileId, ownerUserId)
  if (existingPeriod) {
    throw new OpenPeriodAlreadyExistsError()
  }
  
  // ==========================================
  // LOAD: Unpaid billable walks
  // ==========================================
  const billableWalks = await getUnpaidBillableWalksForOwner(walkerProfileId, ownerUserId)
  
  if (billableWalks.length === 0) {
    throw new NoBillableWalksError()
  }
  
  // ==========================================
  // TRANSACTION: Create period + entries + link walks
  // ==========================================
  const result = await db.transaction(async (tx) => {
    // Create payment period
    const period = await createPaymentPeriod({
      walkerProfileId,
      ownerUserId,
      createdByUserId: closedByUserId,
    })
    
    // Create payment entries and link walks
    const walkIds: string[] = []
    let totalAmount = 0
    
    for (const { walk } of billableWalks) {
      const finalPrice = walk.finalPrice ?? '0'
      
      await createPaymentEntry({
        paymentPeriodId: period.id,
        walkId: walk.id,
        type: 'WALK',
        amount: finalPrice,
        createdByUserId: closedByUserId,
      })
      
      walkIds.push(walk.id)
      totalAmount += parseFloat(finalPrice)
    }
    
    // Link walks to period
    await linkWalksToPaymentPeriod(walkIds, period.id)
    
    // Recalculate total
    await recalculatePeriodTotal(period.id)
    
    return { period, walkIds, totalAmount }
  })
  
  // ==========================================
  // AUDIT LOG
  // ==========================================
  await createAuditLog({
    actorUserId: closedByUserId,
    entityType: 'PAYMENT_PERIOD',
    entityId: result.period.id,
    action: 'CLOSE_PAYMENT_PERIOD',
    afterJson: {
      status: 'OPEN',
      ownerUserId,
      walkerProfileId,
      totalAmount: result.totalAmount.toFixed(2),
      walkCount: result.walkIds.length,
    },
    metadataJson: {
      walkIds: result.walkIds,
    },
  })
  
  return {
    paymentPeriodId: result.period.id,
    totalAmount: result.totalAmount.toFixed(2),
    currency: result.period.currency ?? 'ILS',
    walkCount: result.walkIds.length,
    walkIds: result.walkIds,
  }
}
