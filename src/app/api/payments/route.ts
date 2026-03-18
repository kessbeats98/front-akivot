// ============================================
// PAYMENTS API ROUTE
// ============================================
// GET: List payment periods for current user
// POST: Create/close a payment period
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { 
  assertWalkerAuthenticated,
  getCurrentUser,
} from '@/lib/auth/session'
import { closePaymentPeriodService } from '@/lib/services/billing/closePaymentPeriod'
import { getOpenBalancesByWalkerProfile } from '@/lib/repositories/billingRepo'
import { closePaymentPeriodSchema } from '@/lib/validation'
import { z } from 'zod'

// ============================================
// GET /api/payments
// List open balances for walker
// ============================================
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // For walkers: show open balances grouped by owner
    // For owners: show their own payment periods
    
    // Simple check if walker
    const { walkerProfile } = await assertWalkerAuthenticated().catch(() => ({ walkerProfile: null }))
    
    if (walkerProfile) {
      const balances = await getOpenBalancesByWalkerProfile(walkerProfile.id)
      
      return NextResponse.json(balances.map(b => ({
        ownerUserId: b.ownerUserId,
        totalAmount: b.totalAmount.toFixed(2),
        currency: 'ILS',
        periodCount: b.periods.length,
        periods: b.periods.map(p => ({
          id: p.id,
          status: p.status,
          totalAmount: p.totalAmount,
          openedAt: p.openedAt?.toISOString(),
        })),
      })))
    }
    
    // Non-walkers get empty response for now
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST /api/payments
// Close a payment period (create period from unpaid walks)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { user, walkerProfile } = await assertWalkerAuthenticated()
    
    const body = await request.json()
    const data = closePaymentPeriodSchema.parse(body)
    
    const result = await closePaymentPeriodService({
      walkerProfileId: walkerProfile.id,
      ownerUserId: data.ownerUserId,
      closedByUserId: user.id,
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error) {
      if (error.name === 'UnauthorizedError') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.name === 'ForbiddenError') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.name === 'NoBillableWalksError') {
        return NextResponse.json({ error: 'No billable walks found' }, { status: 400 })
      }
      if (error.name === 'OpenPeriodAlreadyExistsError') {
        return NextResponse.json({ error: 'Open period already exists' }, { status: 400 })
      }
    }
    
    console.error('Error closing payment period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
