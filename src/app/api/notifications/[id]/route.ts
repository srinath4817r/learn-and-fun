import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const { id } = await params
    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== me.id) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
    }

    const body: unknown = await request.json().catch(() => null)
    const read =
      body && typeof body === 'object' && (body as Record<string, unknown>).read === false
        ? false
        : true

    await db.notification.update({ where: { id }, data: { read } })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
