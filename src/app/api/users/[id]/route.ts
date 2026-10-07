import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { serializeUser, userInclude } from '@/lib/lf/serialize'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const { id } = await params
    const target = await db.user.findUnique({ where: { id }, include: userInclude })
    if (!target || target.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    const user = await serializeUser(target, me.id, { withMatch: true, withReviews: true })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
