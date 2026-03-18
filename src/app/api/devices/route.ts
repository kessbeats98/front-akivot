// ============================================
// DEVICES API ROUTE
// ============================================
// POST: Register a device for push notifications
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { registerDeviceService } from '@/lib/services/notifications/registerDevice'
import { registerDeviceSchema } from '@/lib/validation'
import { z } from 'zod'

// ============================================
// POST /api/devices
// Register or update a device
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerDeviceSchema.parse(body)
    
    const result = await registerDeviceService({
      platform: data.platform,
      fcmToken: data.fcmToken,
      deviceLabel: data.deviceLabel,
    })
    
    return NextResponse.json(result, { status: 201 })
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
    
    console.error('Error registering device:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
