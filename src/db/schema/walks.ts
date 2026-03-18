import { pgTable, uuid, varchar, text, timestamp, numeric, integer } from 'drizzle-orm/pg-core'
import { walkStatusEnum, walkBatchStatusEnum, closureReasonEnum, walkMediaTypeEnum, mediaProviderEnum, mediaUploadStatusEnum } from './enums'

// ============================================
// WALK BATCHES TABLE
// Groups multiple walks that happen together (batch walk)
// A walker takes multiple dogs out at once
// ============================================
export const walkBatches = pgTable('walk_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkerProfileId: uuid('walker_profile_id').notNull(),
  status: walkBatchStatusEnum('status').notNull().default('LIVE'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  startedByUserId: uuid('started_by_user_id').notNull(),
  endedByUserId: uuid('ended_by_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// WALKS TABLE
// Individual walk for a single dog
// State machine: PLANNED -> LIVE -> COMPLETED | AUTO_CLOSED | CANCELLED
// ============================================
export const walks = pgTable('walks', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull(),
  walkerProfileId: uuid('walker_profile_id').notNull(),
  dogWalkerId: uuid('dog_walker_id').notNull(),
  walkBatchId: uuid('walk_batch_id'),
  status: walkStatusEnum('status').notNull().default('PLANNED'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  finalPrice: numeric('final_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('ILS'),
  closureReason: closureReasonEnum('closure_reason'),
  note: text('note'),
  paymentPeriodId: uuid('payment_period_id'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  autoClosedAt: timestamp('auto_closed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdByUserId: uuid('created_by_user_id').notNull(),
  updatedByUserId: uuid('updated_by_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// ============================================
// WALK MEDIA TABLE
// Photos and other media from walks
// ============================================
export const walkMedia = pgTable('walk_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkId: uuid('walk_id').notNull(),
  mediaType: walkMediaTypeEnum('media_type').notNull().default('PHOTO'),
  storageProvider: mediaProviderEnum('storage_provider').notNull().default('VERCEL_BLOB'),
  storageKey: text('storage_key'),
  publicUrl: text('public_url'),
  uploadedByUserId: uuid('uploaded_by_user_id').notNull(),
  uploadStatus: mediaUploadStatusEnum('upload_status').notNull().default('PENDING'),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
