// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================
// Reusable Zod schemas for common field types
// ============================================

import { z } from 'zod'

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID format')

// Name validation (1-255 characters, Hebrew/English/special chars allowed)
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(255, 'Name is too long')

// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email is too long')

// Phone validation (optional, flexible format)
export const phoneSchema = z.string()
  .max(50, 'Phone number is too long')
  .optional()

// Note validation (optional, long text allowed)
export const noteSchema = z.string()
  .max(5000, 'Note is too long')
  .optional()

// Price validation (positive number)
export const priceSchema = z.string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
  .refine(val => parseFloat(val) >= 0, 'Price must be positive')

// Currency validation (3-letter code)
export const currencySchema = z.string()
  .length(3, 'Currency must be 3 letters')
  .default('ILS')

// Date validation (ISO string)
export const isoDateSchema = z.string()
  .datetime({ message: 'Invalid date format' })
  .optional()

// Platform validation
export const platformSchema = z.enum(['IOS', 'ANDROID', 'WEB_DESKTOP'])

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

// Helper: Validate and throw
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ValidationError(result.error.errors)
  }
  return result.data
}

// Custom validation error
export class ValidationError extends Error {
  constructor(public errors: z.ZodIssue[]) {
    super('Validation failed')
    this.name = 'ValidationError'
  }
}
