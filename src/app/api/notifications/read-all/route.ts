import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

export async function POST() {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    await db.notification.updateMany({
      where: { userId: me.id, read: false },
      data: { read: true },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
