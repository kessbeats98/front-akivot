// ============================================
// WALKS API ROUTE
// ============================================
// GET: List walks for current user
// POST: Redirect to batch start (deprecated - use /api/walks/batch/start)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentUser, 
  getWalkerProfileByUserId,
} from '@/lib/auth/session'
import { getDogsByWalkerProfileId } from '@/lib/repositories/dogsRepo'
import { getWalksByOwnerForCalendar } from '@/lib/repositories/walksRepo'
import { db } from '@/db'
import { walks, dogs, dogOwners } from '@/db/schema'
import { eq, and, desc, not } from 'drizzle-orm'

// ============================================
// GET /api/walks
// List walks for current user
// ============================================
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    
    // Check if user is a walker
    const walkerProfile = await getWalkerProfileByUserId(user.id)
    
    if (walkerProfile) {
      // Walker: Get their walks
      let query = db
        .select({
          id: walks.id,
          dogId: walks.dogId,
          dogName: dogs.name,
          dogImage: dogs.imageUrl,
          status: walks.status,
          startTime: walks.startTime,
          endTime: walks.endTime,
          durationMinutes: walks.durationMinutes,
          finalPrice: walks.finalPrice,
          currency: walks.currency,
          note: walks.note,
        })
        .from(walks)
        .innerJoin(dogs, eq(walks.dogId, dogs.id))
        .where(eq(walks.walkerProfileId, walkerProfile.id))
        .orderBy(desc(walks.startTime))
      
      if (status) {
        query = db
          .select({
            id: walks.id,
            dogId: walks.dogId,
            dogName: dogs.name,
            dogImage: dogs.imageUrl,
            status: walks.status,
            startTime: walks.startTime,
            endTime: walks.endTime,
            durationMinutes: walks.durationMinutes,
            finalPrice: walks.finalPrice,
            currency: walks.currency,
            note: walks.note,
          })
          .from(walks)
          .innerJoin(dogs, eq(walks.dogId, dogs.id))
          .where(and(
            eq(walks.walkerProfileId, walkerProfile.id),
            eq(walks.status, status)
          ))
          .orderBy(desc(walks.startTime))
      }
      
      const results = await query.limit(100)
      
      return NextResponse.json(results.map(w => ({
        id: w.id,
        dogId: w.dogId,
        dog: {
          id: w.dogId,
          name: w.dogName,
          image: w.dogImage,
        },
        status: w.status,
        scheduledAt: w.startTime?.toISOString(),
        startedAt: w.startTime?.toISOString(),
        endedAt: w.endTime?.toISOString(),
        durationMinutes: w.durationMinutes,
        notes: w.note,
      })))
    } else {
      // Owner: Get walks for their dogs
      const monthNum = month ? parseInt(month) : new Date().getMonth() + 1
      const yearNum = year ? parseInt(year) : new Date().getFullYear()
      
      const results = await getWalksByOwnerForCalendar(user.id, yearNum, monthNum)
      
      return NextResponse.json(results.map(r => ({
        id: r.walk.id,
        dogId: r.walk.dogId,
        dog: {
          id: r.dog.id,
          name: r.dog.name,
          image: r.dog.imageUrl,
        },
        status: r.walk.status,
        scheduledAt: r.walk.startTime?.toISOString(),
        startedAt: r.walk.startTime?.toISOString(),
        endedAt: r.walk.endTime?.toISOString(),
        durationMinutes: r.walk.durationMinutes,
        notes: r.walk.note,
      })))
    }
  } catch (error) {
    console.error('Error fetching walks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST /api/walks
// Deprecated - use /api/walks/batch/start
// ============================================
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Deprecated', 
      message: 'Use POST /api/walks/batch/start to start a walk batch',
      deprecated: true 
    },
    { status: 410 }
  )
}
