import { pgTable, uuid, varchar, text, timestamp, numeric, integer } from 'drizzle-orm/pg-core'
import { walkStatusEnum, walkBatchStatusEnum, closureReasonEnum, walkMediaTypeEnum, mediaProviderEnum, mediaUploadStatusEnum } from './enums'
import { users, walkerProfiles } from './users'
import { dogs, dogWalkers } from './dogs'

// ============================================
// WALK BATCHES TABLE
// Groups multiple walks that happen together (batch walk)
// A walker takes multiple dogs out at once
// ============================================
export const walkBatches = pgTable('walk_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: text('idempotency_key').unique(),
  walkerProfileId: uuid('walker_profile_id').references(() => walkerProfiles.id).notNull(),
  status: walkBatchStatusEnum('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  startedByUserId: text('started_by_user_id').references(() => users.id).notNull(),
  endedByUserId: text('ended_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

// ============================================
// WALKS TABLE
// Individual walk for a single dog
// State machine: PLANNED -> LIVE -> COMPLETED | AUTO_CLOSED | CANCELLED
// ============================================
export const walks = pgTable('walks', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').references(() => dogs.id).notNull(),
  walkerProfileId: uuid('walker_profile_id').references(() => walkerProfiles.id).notNull(),
  dogWalkerId: uuid('dog_walker_id').references(() => dogWalkers.id).notNull(),
  walkBatchId: uuid('walk_batch_id').references(() => walkBatches.id),
  status: walkStatusEnum('status').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  finalPrice: numeric('final_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('ILS'),
  closureReason: closureReasonEnum('closure_reason'),
  note: text('note'),
  // Intentionally no DB FK — circular import walks.ts ↔ billing.ts
  paymentPeriodId: uuid('payment_period_id'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  autoClosedAt: timestamp('auto_closed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull(),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  updatedByUserId: text('updated_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// ============================================
// WALK MEDIA TABLE
// Photos and other media from walks
// ============================================
export const walkMedia = pgTable('walk_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkId: uuid('walk_id').references(() => walks.id).notNull(),
  mediaType: walkMediaTypeEnum('media_type').notNull(),
  storageProvider: mediaProviderEnum('storage_provider').notNull(),
  storageKey: text('storage_key'),
  publicUrl: text('public_url'),
  uploadedByUserId: text('uploaded_by_user_id').references(() => users.id).notNull(),
  uploadStatus: mediaUploadStatusEnum('upload_status').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
