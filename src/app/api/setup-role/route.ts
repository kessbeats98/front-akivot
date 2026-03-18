// ============================================
// SETUP ROLE API ROUTE
// ============================================
// POST: Create walker profile after Better Auth sign-up
// Called immediately after /api/auth/sign-up/email
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/db'
import { walkerProfiles } from '@/db/schema'
import { randomUUID } from 'crypto'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()

    if (role === 'walker') {
      // Check if walker profile already exists
      const existing = await db
        .select()
        .from(walkerProfiles)
        .where((await import('drizzle-orm').then(m => m.eq))(walkerProfiles.userId, user.id))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(walkerProfiles).values({
          id: randomUUID(),
          userId: user.id,
          displayName: user.name,
          inviteCode: generateInviteCode(),
          isAcceptingClients: true,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('setup-role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
