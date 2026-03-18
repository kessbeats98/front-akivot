// ============================================
// AUTO-CLOSE WALKS JOB API ROUTE
// ============================================
// GET: Run auto-close job for timed-out walks
// Called by Vercel Cron every 5 minutes
// ============================================

import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { autoCloseWalksJob } from '@/lib/services/jobs/autoCloseWalks'

// ============================================
// GET /api/jobs/auto-close
// Run auto-close job
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret) {
      const expected = Buffer.from(`Bearer ${expectedSecret}`)
      const actual = Buffer.from(authHeader ?? '')
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    // Run the job
    const result = await autoCloseWalksJob()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      autoClosedCount: result.autoClosed.length,
      warningCount: result.warnings.length,
      autoClosed: result.autoClosed.map(w => ({
        walkId: w.walkId,
        dogId: w.dogId,
        durationMinutes: w.durationMinutes,
      })),
    })
  } catch (error) {
    console.error('Error running auto-close job:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
