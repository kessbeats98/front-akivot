// ============================================
// WALKS BATCH START API ROUTE
// ============================================
// POST: Start a new walk batch with selected dogs
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { assertWalkerAuthenticated } from '@/lib/auth/session'
import { startWalkBatchService } from '@/lib/services/walks/startWalkBatch'
import { startWalkBatchSchema } from '@/lib/validation'
import { z } from 'zod'

// ============================================
// POST /api/walks/batch/start
// Start a new walk batch
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { user, walkerProfile } = await assertWalkerAuthenticated()
    
    const body = await request.json()
    const data = startWalkBatchSchema.parse(body)
    
    const result = await startWalkBatchService({
      walkerProfileId: walkerProfile.id,
      dogIds: data.dogIds,
      startedByUserId: user.id,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
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
      // Handle known domain errors
      if (error.name === 'UnauthorizedError') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.name === 'ForbiddenError') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.name === 'DogNotAssignedToWalkerError' ||
          error.name === 'LiveWalkAlreadyExistsError' ||
          error.name === 'MaxDogsPerBatchExceededError') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    console.error('Error starting walk batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
