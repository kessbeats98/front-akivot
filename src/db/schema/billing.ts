import { pgTable, uuid, text, timestamp, numeric, integer, unique } from 'drizzle-orm/pg-core'
import { paymentPeriodStatusEnum, paymentEntryTypeEnum } from './enums'
import { users, walkerProfiles } from './users'

// ============================================
// PAYMENT PERIODS TABLE
// Groups billable walks for an owner-walker pair
// Acts like an invoice that can be opened, paid, or reopened
// ============================================
export const paymentPeriods = pgTable('payment_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkerProfileId: uuid('walker_profile_id').references(() => walkerProfiles.id).notNull(),
  ownerUserId: text('owner_user_id').references(() => users.id).notNull(),
  status: paymentPeriodStatusEnum('status').notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidByUserId: text('paid_by_user_id').references(() => users.id),
  reopenedAt: timestamp('reopened_at', { withTimezone: true }),
  reopenedByUserId: text('reopened_by_user_id').references(() => users.id),
  lockVersion: integer('lock_version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

// ============================================
// PAYMENT ENTRIES TABLE
// Individual entries within a payment period
// Each walk that gets billed becomes an entry
// ============================================
export const paymentEntries = pgTable(
  'payment_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentPeriodId: uuid('payment_period_id').references(() => paymentPeriods.id).notNull(),
    // Intentionally no DB FK — circular import billing.ts ↔ walks.ts
    walkId: uuid('walk_id'),
    ownerUserId: text('owner_user_id').references(() => users.id).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    entryType: paymentEntryTypeEnum('entry_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.paymentPeriodId, t.walkId)],
)
