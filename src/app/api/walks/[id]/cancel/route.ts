// ============================================
// WALKS CANCEL API ROUTE
// ============================================
// POST: Cancel a planned or live walk
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { assertWalkerAuthenticated } from '@/lib/auth/session'
import { cancelWalkService } from '@/lib/services/walks/cancelWalk'
import { cancelWalkSchema } from '@/lib/validation'
import { z } from 'zod'

// ============================================
// POST /api/walks/[id]/cancel
// Cancel a walk
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await assertWalkerAuthenticated()
    const { id } = await params
    
    const body = await request.json().catch(() => ({}))
    const data = cancelWalkSchema.parse(body)
    
    const result = await cancelWalkService({
      walkId: id,
      cancelledByUserId: user.id,
      reason: data.reason,
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
      if (error.name === 'WalkNotFoundError') {
        return NextResponse.json({ error: 'Walk not found' }, { status: 404 })
      }
      if (error.name === 'WalkCannotBeCancelledError') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    console.error('Error cancelling walk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
