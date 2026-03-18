// ============================================
// DOGS API ROUTE
// ============================================
// GET: List dogs for current user (walker or owner)
// POST: Create a new dog (walker only - on behalf of owner)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentUser, 
  getWalkerProfileByUserId,
  assertWalkerAuthenticated,
} from '@/lib/auth/session'
import { 
  getDogsByWalkerProfileId,
  getDogsByOwnerUserId,
  createDog,
  isUserDogOwner,
} from '@/lib/repositories/dogsRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================
const createDogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  ownerUserId: z.string().uuid('Owner ID must be a valid UUID'),
})

// ============================================
// GET /api/dogs
// List dogs for current user
// ============================================
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is a walker
    const walkerProfile = await getWalkerProfileByUserId(user.id)
    
    if (walkerProfile) {
      // Walker: Get dogs they walk
      const dogs = await getDogsByWalkerProfileId(walkerProfile.id)
      return NextResponse.json(dogs.map(d => ({
        id: d.id,
        name: d.name,
        breed: d.breed,
        imageUrl: d.imageUrl,
        notes: d.notes,
        isActive: d.isActive,
        owner: d.owner ? {
          id: d.owner.id,
          name: d.owner.name,
        } : null,
        currentPrice: d.currentPrice,
        currency: d.currency,
      })))
    } else {
      // Owner: Get their own dogs
      const dogs = await getDogsByOwnerUserId(user.id)
      return NextResponse.json(dogs.map(d => ({
        id: d.id,
        name: d.name,
        breed: d.breed,
        imageUrl: d.imageUrl,
        notes: d.notes,
        isActive: d.isActive,
      })))
    }
  } catch (error) {
    console.error('Error fetching dogs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST /api/dogs
// Create a new dog (walker only)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const { user, walkerProfile } = await assertWalkerAuthenticated()
    
    const body = await request.json()
    const data = createDogSchema.parse(body)
    
    // Create the dog
    const dog = await createDog({
      name: data.name,
      breed: data.breed,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      notes: data.notes,
      imageUrl: data.imageUrl,
      ownerUserId: data.ownerUserId,
    })
    
    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      entityType: 'DOG',
      entityId: dog.id,
      action: 'CREATE',
      afterJson: {
        name: dog.name,
        breed: dog.breed,
        ownerUserId: data.ownerUserId,
      },
    })
    
    return NextResponse.json(dog, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    console.error('Error creating dog:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
