import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** POST /api/connections/[id]/cancel — sender withdraws a pending request */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const connection = await db.connection.findUnique({ where: { id } })
    if (!connection) {
      return NextResponse.json({ error: 'Connection request not found.' }, { status: 404 })
    }
    if (connection.senderId !== me.id) {
      return NextResponse.json(
        { error: 'You can only cancel requests you sent.' },
        { status: 403 }
      )
    }
    if (connection.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been handled.' }, { status: 400 })
    }

    await db.connection.update({
      where: { id: connection.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[connections cancel]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
