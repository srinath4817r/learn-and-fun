import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/lf/auth'

export async function POST() {
  try {
    await clearAuthCookie()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
