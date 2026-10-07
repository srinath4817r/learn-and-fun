import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** DELETE /api/connections/[id] — remove an accepted connection entirely */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const connection = await db.connection.findUnique({ where: { id } })
    if (
      !connection ||
      connection.status !== 'ACCEPTED' ||
      (connection.senderId !== me.id && connection.receiverId !== me.id)
    ) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 })
    }

    await db.connection.delete({ where: { id: connection.id } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[connections DELETE]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
