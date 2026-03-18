// ============================================
// BILLING REPOSITORY
// ============================================
// Database access for payment periods and entries
// No business logic - just data access
// ============================================

import { db } from '@/db'
import { paymentPeriods, paymentEntries, walks } from '@/db/schema'
import { eq, and, isNull, inArray, sum, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// ============================================
// PAYMENT PERIOD OPERATIONS
// ============================================

export async function getPaymentPeriodById(id: string) {
  const [period] = await db
    .select()
    .from(paymentPeriods)
    .where(eq(paymentPeriods.id, id))
    .limit(1)
  
  return period ?? null
}

export async function getOpenPaymentPeriod(
  walkerProfileId: string,
  ownerUserId: string
) {
  const [period] = await db
    .select()
    .from(paymentPeriods)
    .where(and(
      eq(paymentPeriods.walkerProfileId, walkerProfileId),
      eq(paymentPeriods.ownerUserId, ownerUserId),
      inArray(paymentPeriods.status, ['OPEN', 'REOPENED'])
    ))
    .limit(1)
  
  return period ?? null
}

export async function getPaymentPeriodsByWalker(walkerProfileId: string) {
  return db
    .select()
    .from(paymentPeriods)
    .where(eq(paymentPeriods.walkerProfileId, walkerProfileId))
    .orderBy(desc(paymentPeriods.createdAt))
}

export async function getPaymentPeriodsByOwner(ownerUserId: string) {
  return db
    .select()
    .from(paymentPeriods)
    .where(eq(paymentPeriods.ownerUserId, ownerUserId))
    .orderBy(desc(paymentPeriods.createdAt))
}

export async function createPaymentPeriod(data: {
  walkerProfileId: string
  ownerUserId: string
  createdByUserId: string
}) {
  const [period] = await db
    .insert(paymentPeriods)
    .values({
      id: randomUUID(),
      walkerProfileId: data.walkerProfileId,
      ownerUserId: data.ownerUserId,
      status: 'OPEN',
      totalAmount: '0',
      createdByUserId: data.createdByUserId,
    })
    .returning()
  
  return period
}

export async function updatePaymentPeriod(id: string, data: Partial<{
  status: 'OPEN' | 'PAID' | 'REOPENED' | 'ARCHIVED'
  totalAmount: string
  closedAt: Date
  paidAt: Date
  reopenedAt: Date
  archivedAt: Date
}>) {
  const [period] = await db
    .update(paymentPeriods)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(paymentPeriods.id, id))
    .returning()
  
  return period ?? null
}

// ============================================
// PAYMENT ENTRY OPERATIONS
// ============================================

export async function getPaymentEntriesByPeriod(periodId: string) {
  return db
    .select()
    .from(paymentEntries)
    .where(eq(paymentEntries.paymentPeriodId, periodId))
    .orderBy(paymentEntries.createdAt)
}

export async function createPaymentEntry(data: {
  paymentPeriodId: string
  walkId?: string
  type: 'WALK' | 'ADJUSTMENT'
  amount: string
  description?: string
  createdByUserId: string
}) {
  const [entry] = await db
    .insert(paymentEntries)
    .values({
      id: randomUUID(),
      paymentPeriodId: data.paymentPeriodId,
      walkId: data.walkId ?? null,
      type: data.type,
      amount: data.amount,
      description: data.description ?? null,
      createdByUserId: data.createdByUserId,
    })
    .returning()
  
  return entry
}

export async function deletePaymentEntry(id: string) {
  const [entry] = await db
    .delete(paymentEntries)
    .where(eq(paymentEntries.id, id))
    .returning()
  
  return entry ?? null
}

// ============================================
// AGGREGATED QUERIES
// ============================================

export async function getOpenBalancesByWalkerProfile(walkerProfileId: string) {
  // Get all open/reopened payment periods grouped by owner
  const results = await db
    .select()
    .from(paymentPeriods)
    .where(and(
      eq(paymentPeriods.walkerProfileId, walkerProfileId),
      inArray(paymentPeriods.status, ['OPEN', 'REOPENED'])
    ))
    .orderBy(desc(paymentPeriods.createdAt))
  
  // Group by owner
  const groupedByOwner = new Map<string, {
    ownerUserId: string
    periods: typeof results
    totalAmount: number
  }>()
  
  for (const period of results) {
    const existing = groupedByOwner.get(period.ownerUserId)
    if (existing) {
      existing.periods.push(period)
      existing.totalAmount += parseFloat(period.totalAmount)
    } else {
      groupedByOwner.set(period.ownerUserId, {
        ownerUserId: period.ownerUserId,
        periods: [period],
        totalAmount: parseFloat(period.totalAmount),
      })
    }
  }
  
  return Array.from(groupedByOwner.values())
}

export async function recalculatePeriodTotal(periodId: string) {
  const entries = await getPaymentEntriesByPeriod(periodId)
  
  const total = entries.reduce((sum, entry) => {
    return sum + parseFloat(entry.amount)
  }, 0)
  
  return updatePaymentPeriod(periodId, {
    totalAmount: total.toFixed(2),
  })
}

// ============================================
// WALK LINKING HELPERS
// ============================================

export async function linkWalksToPaymentPeriod(
  walkIds: string[],
  paymentPeriodId: string
) {
  // Update walks to reference the payment period
  await db
    .update(walks)
    .set({
      paymentPeriodId,
      updatedAt: new Date(),
    })
    .where(inArray(walks.id, walkIds))
}
