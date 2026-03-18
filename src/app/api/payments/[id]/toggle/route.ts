// ============================================
// PAYMENTS TOGGLE API ROUTE
// ============================================
// POST: Toggle payment status (MARK_PAID or UNPAY)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { assertWalkerAuthenticated } from '@/lib/auth/session'
import { togglePaymentStatusService } from '@/lib/services/billing/togglePaymentStatus'
import { togglePaymentStatusSchema } from '@/lib/validation'
import { z } from 'zod'

// ============================================
// POST /api/payments/[id]/toggle
// Toggle payment period status
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await assertWalkerAuthenticated()
    const { id } = await params
    
    const body = await request.json()
    const data = togglePaymentStatusSchema.parse(body)
    
    const result = await togglePaymentStatusService({
      paymentPeriodId: id,
      actorUserId: user.id,
      action: data.action,
    })
    
    return NextResponse.json(result)
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
      if (error.name === 'PaymentPeriodNotFoundError') {
        return NextResponse.json({ error: 'Payment period not found' }, { status: 404 })
      }
      if (error.name === 'InvalidStatusTransitionError') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    console.error('Error toggling payment status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
