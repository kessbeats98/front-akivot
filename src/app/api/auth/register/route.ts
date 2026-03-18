// ============================================
// AUTH REGISTER API ROUTE
// ============================================
// POST: Register a new user
// Uses Better Auth for user creation
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/better-auth'
import { db } from '@/db'
import { users, walkerProfiles } from '@/db/schema'
import { getUserByEmail } from '@/lib/repositories/usersRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

// ============================================
// VALIDATION SCHEMA
// ============================================
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['walker', 'owner']).default('owner'),
  phone: z.string().optional(),
})

// ============================================
// POST /api/auth/register
// Register a new user
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, phone } = registerSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Create user
    const userId = randomUUID()
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name,
        phone: phone ?? null,
        isActive: true,
      })
      .returning()
    
    // Create walker profile if role is walker
    if (role === 'walker') {
      const inviteCode = generateInviteCode()
      
      await db
        .insert(walkerProfiles)
        .values({
          id: randomUUID(),
          userId: user.id,
          displayName: name,
          inviteCode,
          isAcceptingClients: true,
        })
    }
    
    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      entityType: 'USER',
      entityId: user.id,
      action: 'CREATE',
      afterJson: {
        email,
        name,
        role,
      },
    })
    
    // Use Better Auth to create the auth record
    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      })
    } catch (authError) {
      console.error('Better Auth signup error:', authError)
      // Continue even if this fails - we've already created the user
    }
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper to generate invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
