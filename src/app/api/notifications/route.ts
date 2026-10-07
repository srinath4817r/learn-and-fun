import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { NotificationDTO } from '@/lib/lf/types'

export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const [rows, unread] = await Promise.all([
      db.notification.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.notification.count({ where: { userId: me.id, read: false } }),
    ])

    const notifications: NotificationDTO[] = rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      refId: n.refId,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }))

    return NextResponse.json({ notifications, unread })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
