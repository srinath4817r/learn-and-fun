import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

const REASONS = ['Spam', 'Fake profile', 'Inappropriate content', 'Harassment', 'Other']

/** POST /api/reports — report a user to moderation */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const reportedUserId = typeof body?.reportedUserId === 'string' ? body.reportedUserId : ''
    const reason = typeof body?.reason === 'string' ? body.reason : ''
    const description =
      typeof body?.description === 'string' ? body.description.trim().slice(0, 1000) : ''

    if (!reportedUserId) {
      return NextResponse.json({ error: 'Missing reported student.' }, { status: 400 })
    }
    if (reportedUserId === me.id) {
      return NextResponse.json({ error: 'You cannot report yourself.' }, { status: 400 })
    }
    if (!REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Please select a valid reason.' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id: reportedUserId } })
    if (!target) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    await db.report.create({
      data: {
        reporterId: me.id,
        reportedUserId,
        reason,
        description,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reports POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
