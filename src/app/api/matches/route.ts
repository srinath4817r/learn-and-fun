import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { serializeUsers, userInclude } from '@/lib/lf/serialize'

export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    if (!me.onboarded) {
      return NextResponse.json({ matches: [] })
    }

    const candidates = await db.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE', id: { not: me.id }, onboarded: true },
      include: userInclude,
    })

    const users = await serializeUsers(candidates, me.id, { withMatch: true })

    const matches = users
      .filter((u) => (u.matchScore ?? 0) > 0)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, 20)

    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
