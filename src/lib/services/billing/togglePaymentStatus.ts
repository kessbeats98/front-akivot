// ============================================
// TOGGLE PAYMENT STATUS SERVICE
// ============================================
// Handles MARK_PAID and UNPAY actions
// Enforces status transitions and audit logging
// ============================================

import { db } from '@/db'
import { paymentPeriods } from '@/db/schema'
import { getWalkerProfileByUserId } from '@/lib/repositories/usersRepo'
import { 
  getPaymentPeriodById,
  updatePaymentPeriod,
} from '@/lib/repositories/billingRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { ForbiddenError } from '@/lib/auth/session'
import { eq } from 'drizzle-orm'

// ============================================
// INPUT TYPES
// ============================================
interface TogglePaymentStatusInput {
  paymentPeriodId: string
  actorUserId: string
  action: 'MARK_PAID' | 'UNPAY'
}

// ============================================
// OUTPUT TYPES
// ============================================
interface TogglePaymentStatusOutput {
  paymentPeriodId: string
  status: string
  paidAt?: Date
  reopenedAt?: Date
}

// ============================================
// DOMAIN ERRORS
// ============================================
export class PaymentPeriodNotFoundError extends Error {
  constructor() {
    super('Payment period not found')
    this.name = 'PaymentPeriodNotFoundError'
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} a payment period with status "${currentStatus}"`)
    this.name = 'InvalidStatusTransitionError'
  }
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export async function togglePaymentStatusService(
  input: TogglePaymentStatusInput
): Promise<TogglePaymentStatusOutput> {
  const { paymentPeriodId, actorUserId, action } = input
  
  // ==========================================
  // VALIDATION: Period exists
  // ==========================================
  const period = await getPaymentPeriodById(paymentPeriodId)
  if (!period) {
    throw new PaymentPeriodNotFoundError()
  }
  
  // ==========================================
  // VALIDATION: Actor belongs to walker profile
  // ==========================================
  const actorProfile = await getWalkerProfileByUserId(actorUserId)
  if (!actorProfile || actorProfile.id !== period.walkerProfileId) {
    throw new ForbiddenError('You do not have access to this payment period')
  }
  
  // ==========================================
  // VALIDATION: Status transitions
  // ==========================================
  const allowedTransitions: Record<string, string[]> = {
    'MARK_PAID': ['OPEN', 'REOPENED'],
    'UNPAY': ['PAID'],
  }
  
  if (!allowedTransitions[action].includes(period.status)) {
    throw new InvalidStatusTransitionError(period.status, action)
  }
  
  // ==========================================
  // EXECUTE: Update status
  // ==========================================
  const now = new Date()
  let newStatus: string
  let paidAt: Date | undefined
  let reopenedAt: Date | undefined
  
  if (action === 'MARK_PAID') {
    newStatus = 'PAID'
    paidAt = now
  } else {
    newStatus = 'REOPENED'
    reopenedAt = now
  }
  
  const updatedPeriod = await updatePaymentPeriod(paymentPeriodId, {
    status: newStatus,
    paidAt,
    reopenedAt,
  })
  
  // ==========================================
  // AUDIT LOG
  // ==========================================
  await createAuditLog({
    actorUserId,
    entityType: 'PAYMENT_PERIOD',
    entityId: paymentPeriodId,
    action: action === 'MARK_PAID' ? 'MARK_PAYMENT_PAID' : 'REOPEN_PAYMENT_PERIOD',
    beforeJson: {
      status: period.status,
    },
    afterJson: {
      status: newStatus,
      paidAt: paidAt?.toISOString(),
      reopenedAt: reopenedAt?.toISOString(),
    },
    metadataJson: {
      previousStatus: period.status,
      totalAmount: period.totalAmount,
    },
  })
  
  return {
    paymentPeriodId,
    status: newStatus,
    paidAt,
    reopenedAt,
  }
}
