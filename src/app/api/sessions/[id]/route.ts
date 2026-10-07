import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { awardXp, notify, checkBadges } from '@/lib/lf/gamify'
import type { SessionDTO } from '@/lib/lf/types'

function mapSession(
  s: {
    id: string
    topic: string
    description: string
    date: string
    time: string
    duration: number
    mode: string
    location: string
    meetingLink: string
    notes: string
    status: string
    createdAt: Date
    teacherId: string
    learnerId: string
    teacher: { id: string; name: string; profileImage: string | null }
    learner: { id: string; name: string; profileImage: string | null }
    reviews: { id: string }[]
  },
  meId: string
): SessionDTO {
  return {
    id: s.id,
    topic: s.topic,
    description: s.description,
    date: s.date,
    time: s.time,
    duration: s.duration,
    mode: s.mode,
    location: s.location,
    meetingLink: s.meetingLink,
    notes: s.notes,
    status: s.status,
    myRole: s.teacherId === meId ? 'teacher' : 'learner',
    teacher: s.teacher,
    learner: s.learner,
    reviewed: s.reviews.length > 0,
    createdAt: s.createdAt.toISOString(),
  }
}

/** PATCH /api/sessions/[id] — mark a session COMPLETED or CANCELLED */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const session = await db.learningSession.findUnique({ where: { id } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }
    if (session.teacherId !== me.id && session.learnerId !== me.id) {
      return NextResponse.json({ error: 'You are not part of this session.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const status = typeof body?.status === 'string' ? body.status : ''
    if (status !== 'COMPLETED' && status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Status must be COMPLETED or CANCELLED.' },
        { status: 400 }
      )
    }
    if (session.status !== 'UPCOMING') {
      return NextResponse.json(
        { error: 'Only upcoming sessions can be updated.' },
        { status: 400 }
      )
    }

    const otherId = session.teacherId === me.id ? session.learnerId : session.teacherId

    const updated = await db.learningSession.update({
      where: { id: session.id },
      data: { status },
      include: {
        teacher: { select: { id: true, name: true, profileImage: true } },
        learner: { select: { id: true, name: true, profileImage: true } },
        reviews: { where: { reviewerId: me.id }, select: { id: true } },
      },
    })

    if (status === 'COMPLETED') {
      // XP: learner +15, teacher +25 (unique per session — no double awards)
      await awardXp(
        session.learnerId,
        `SESSION_COMPLETED_LEARNER:${session.id}`,
        15,
        'Completed a learning session'
      )
      await awardXp(
        session.teacherId,
        `SESSION_COMPLETED_TEACHER:${session.id}`,
        25,
        'Taught a learning session'
      )
      await Promise.all([checkBadges(session.learnerId), checkBadges(session.teacherId)])
      await notify(
        otherId,
        'SESSION',
        `${me.name} completed the session: ${session.topic}`,
        'Leave a review to share how it went!'
      )
    } else {
      await notify(
        otherId,
        'SESSION',
        `${me.name} cancelled the session: ${session.topic}`,
        `${session.date} at ${session.time}`
      )
    }

    return NextResponse.json({ session: mapSession(updated, me.id) })
  } catch (e) {
    console.error('[sessions PATCH]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
