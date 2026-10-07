import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** GET /api/announcements — latest 20 platform announcements */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const rows = await db.announcement.findMany({
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      announcements: rows.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        authorName: a.author.name,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('[announcements GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
