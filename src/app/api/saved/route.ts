import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { serializeUsers, userInclude } from '@/lib/lf/serialize'

export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const rows = await db.savedUser.findMany({
      where: { userId: me.id },
      include: { savedUser: { include: userInclude } },
      orderBy: { createdAt: 'desc' },
    })

    const savedUsers = rows.map((r) => r.savedUser).filter((u) => u.status === 'ACTIVE')
    const users = await serializeUsers(savedUsers, me.id, { withMatch: true })

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    const b = body as Record<string, unknown>
    const userId = String(b.userId ?? '').trim()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 })
    }
    if (userId === me.id) {
      return NextResponse.json(
        { error: "You can't save your own profile." },
        { status: 400 }
      )
    }

    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    const existing = await db.savedUser.findUnique({
      where: { userId_savedUserId: { userId: me.id, savedUserId: userId } },
    })

    if (existing) {
      await db.savedUser.delete({ where: { id: existing.id } })
      return NextResponse.json({ saved: false })
    }

    await db.savedUser.create({ data: { userId: me.id, savedUserId: userId } })
    return NextResponse.json({ saved: true })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
