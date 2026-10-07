import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { AnnouncementDTO } from '@/lib/lf/types'

/** GET /api/admin/announcements — latest first */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const rows = await db.announcement.findMany({
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const dto: AnnouncementDTO[] = rows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      authorName: a.author.name,
      createdAt: a.createdAt.toISOString(),
    }))

    return NextResponse.json({ announcements: dto })
  } catch (e) {
    console.error('[admin/announcements GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** POST /api/admin/announcements — broadcast to all active students */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const text = typeof body?.body === 'string' ? body.body.trim() : ''
    if (!title || !text) {
      return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 })
    }

    const announcement = await db.announcement.create({
      data: {
        title: title.slice(0, 150),
        body: text.slice(0, 2000),
        authorId: me.id,
      },
    })

    // notify every ACTIVE student (batch)
    const students = await db.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE' },
      select: { id: true },
    })
    if (students.length > 0) {
      await db.notification.createMany({
        data: students.map((s) => ({
          userId: s.id,
          type: 'ANNOUNCEMENT',
          title: announcement.title,
          body: announcement.body.slice(0, 100),
          refId: announcement.id,
        })),
      })
    }

    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        authorName: me.name,
        createdAt: announcement.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('[admin/announcements POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
