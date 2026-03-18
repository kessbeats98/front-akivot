// ============================================
// WALKS VALIDATION SCHEMAS
// ============================================
// Validation for walk-related API inputs
// ============================================

import { z } from 'zod'
import { uuidSchema, noteSchema, isoDateSchema } from './common'

// Dog IDs array validation (1-5 dogs per batch)
export const dogIdsSchema = z.array(uuidSchema)
  .min(1, 'At least one dog must be selected')
  .max(5, 'Maximum 5 dogs allowed per walk batch')

// Walk batch ID validation
export const walkBatchIdSchema = uuidSchema

// Walk ID validation
export const walkIdSchema = uuidSchema

// Start walk batch input validation
export const startWalkBatchSchema = z.object({
  dogIds: dogIdsSchema,
  startTime: isoDateSchema,
})

// End walk batch input validation
export const endWalkBatchSchema = z.object({
  note: noteSchema,
  endTime: isoDateSchema,
})

// Cancel walk input validation
export const cancelWalkSchema = z.object({
  reason: noteSchema,
})

// Walk status enum
export const walkStatusSchema = z.enum(['PLANNED', 'LIVE', 'COMPLETED', 'AUTO_CLOSED', 'CANCELLED'])

// Walk batch status enum
export const walkBatchStatusSchema = z.enum(['LIVE', 'COMPLETED', 'AUTO_CLOSED', 'CANCELLED'])

// Closure reason enum
export const closureReasonSchema = z.enum(['MANUAL', 'AUTO_TIMEOUT', 'CANCELLED', 'SYSTEM_FIX'])
