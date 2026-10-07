import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { notify, checkBadges } from '@/lib/lf/gamify'

/** POST /api/connections/[id]/accept — receiver accepts a pending request */
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
    if (connection.receiverId !== me.id) {
      return NextResponse.json(
        { error: 'You can only respond to requests sent to you.' },
        { status: 403 }
      )
    }
    if (connection.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been handled.' }, { status: 400 })
    }

    await db.connection.update({
      where: { id: connection.id },
      data: { status: 'ACCEPTED' },
    })

    await notify(
      connection.senderId,
      'CONNECTION_ACCEPTED',
      `${me.name} accepted your connection`,
      'Say hi and schedule your first session!',
      connection.id
    )

    await Promise.all([checkBadges(me.id), checkBadges(connection.senderId)])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[connections accept]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
