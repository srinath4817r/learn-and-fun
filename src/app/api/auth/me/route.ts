import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/lf/auth'
import { buildMe } from '@/lib/lf/serialize'

export async function GET() {
  try {
    const user = await getAuthUser()
    return NextResponse.json({ user: user ? await buildMe(user) : null })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
