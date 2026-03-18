// ============================================
// BILLING VALIDATION SCHEMAS
// ============================================
// Validation for billing-related API inputs
// ============================================

import { z } from 'zod'
import { uuidSchema } from './common'

// Owner user ID validation
export const ownerUserIdSchema = uuidSchema

// Payment period ID validation
export const paymentPeriodIdSchema = uuidSchema

// Toggle payment action enum
export const togglePaymentActionSchema = z.enum(['MARK_PAID', 'UNPAY'])

// Toggle payment status input validation
export const togglePaymentStatusSchema = z.object({
  action: togglePaymentActionSchema,
})

// Payment period status enum
export const paymentPeriodStatusSchema = z.enum(['OPEN', 'PAID', 'REOPENED', 'ARCHIVED'])

// Payment entry type enum
export const paymentEntryTypeSchema = z.enum(['WALK', 'ADJUSTMENT'])

// Close payment period input validation
export const closePaymentPeriodSchema = z.object({
  ownerUserId: ownerUserIdSchema,
})
