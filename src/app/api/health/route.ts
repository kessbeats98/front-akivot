import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT count(*) as count FROM users`)
    return NextResponse.json({ status: 'ok', users: result.rows[0] })
  } catch (err) {
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
