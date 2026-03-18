// ============================================
// SESSION API ROUTE
// ============================================
// GET: Get current session and user info
// ============================================

import { NextResponse } from 'next/server'
import { getCurrentUser, getWalkerProfileByUserId } from '@/lib/auth/session'

// ============================================
// GET /api/session
// Get current session info
// ============================================
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ user: null })
    }
    
    // Check for walker profile
    const walkerProfile = await getWalkerProfileByUserId(user.id)
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        imageUrl: user.imageUrl,
        isActive: user.isActive,
        walkerProfile: walkerProfile ? {
          id: walkerProfile.id,
          displayName: walkerProfile.displayName,
          publicSlug: walkerProfile.publicSlug,
          inviteCode: walkerProfile.inviteCode,
          isAcceptingClients: walkerProfile.isAcceptingClients,
        } : null,
      }
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ user: null })
  }
}
