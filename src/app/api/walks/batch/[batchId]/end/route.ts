// ============================================
// WALKS BATCH END API ROUTE
// ============================================
// POST: End an active walk batch
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { assertWalkerAuthenticated } from '@/lib/auth/session'
import { endWalkBatchService } from '@/lib/services/walks/endWalkBatch'
import { endWalkBatchSchema } from '@/lib/validation'
import { z } from 'zod'

// ============================================
// POST /api/walks/batch/[batchId]/end
// End a walk batch
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { user } = await assertWalkerAuthenticated()
    const { batchId } = await params
    
    const body = await request.json().catch(() => ({}))
    const data = endWalkBatchSchema.parse(body)
    
    const result = await endWalkBatchService({
      walkBatchId: batchId,
      endedByUserId: user.id,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      note: data.note,
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
      if (error.name === 'WalkBatchNotFoundError') {
        return NextResponse.json({ error: 'Walk batch not found' }, { status: 404 })
      }
      if (error.name === 'WalkBatchNotLiveError') {
        return NextResponse.json({ error: 'Walk batch is not active' }, { status: 400 })
      }
    }
    
    console.error('Error ending walk batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
