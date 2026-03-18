import { pgTable, uuid, varchar, text, timestamp, numeric } from 'drizzle-orm/pg-core'
import { paymentPeriodStatusEnum, paymentEntryTypeEnum } from './enums'

// ============================================
// PAYMENT PERIODS TABLE
// Groups billable walks for an owner-walker pair
// Acts like an invoice that can be opened, paid, or reopened
// ============================================
export const paymentPeriods = pgTable('payment_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkerProfileId: uuid('walker_profile_id').notNull(),
  ownerUserId: uuid('owner_user_id').notNull(),
  status: paymentPeriodStatusEnum('status').notNull().default('OPEN'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('ILS'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  reopenedAt: timestamp('reopened_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdByUserId: uuid('created_by_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// PAYMENT ENTRIES TABLE
// Individual entries within a payment period
// Each walk that gets billed becomes an entry
// ============================================
export const paymentEntries = pgTable('payment_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentPeriodId: uuid('payment_period_id').notNull(),
  walkId: uuid('walk_id'),
  type: paymentEntryTypeEnum('type').notNull().default('WALK'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  createdByUserId: uuid('created_by_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
