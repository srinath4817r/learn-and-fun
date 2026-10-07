import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { notify } from '@/lib/lf/gamify'
import type { SessionDTO } from '@/lib/lf/types'

type SessionRow = {
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
}

function mapSession(s: SessionRow, meId: string): SessionDTO {
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

/** GET /api/sessions — my sessions (upcoming first by date asc, then rest by date desc) */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const rows = await db.learningSession.findMany({
      where: { OR: [{ teacherId: me.id }, { learnerId: me.id }] },
      include: {
        teacher: { select: { id: true, name: true, profileImage: true } },
        learner: { select: { id: true, name: true, profileImage: true } },
        reviews: { where: { reviewerId: me.id }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const sessions = rows.map((s) => mapSession(s, me.id))
    sessions.sort((a, b) => {
      const aUp = a.status === 'UPCOMING' ? 0 : 1
      const bUp = b.status === 'UPCOMING' ? 0 : 1
      if (aUp !== bUp) return aUp - bUp
      const aKey = `${a.date} ${a.time}`
      const bKey = `${b.date} ${b.time}`
      if (aUp === 0) return aKey.localeCompare(bKey)
      return bKey.localeCompare(aKey)
    })

    return NextResponse.json({ sessions })
  } catch (e) {
    console.error('[sessions GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** POST /api/sessions — schedule a session with a connected student */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const otherUserId = typeof body?.otherUserId === 'string' ? body.otherUserId : ''
    const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const date = typeof body?.date === 'string' ? body.date.trim() : ''
    const time = typeof body?.time === 'string' ? body.time.trim() : ''
    const duration = Number(body?.duration)
    const mode = typeof body?.mode === 'string' ? body.mode : ''
    const location = typeof body?.location === 'string' ? body.location.trim() : ''
    const meetingLink = typeof body?.meetingLink === 'string' ? body.meetingLink.trim() : ''
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : ''
    const myRole = body?.myRole === 'learner' ? 'learner' : 'teacher'

    if (!otherUserId) {
      return NextResponse.json({ error: 'Please choose a student to schedule with.' }, { status: 400 })
    }
    if (!topic) {
      return NextResponse.json({ error: 'Please enter a topic for the session.' }, { status: 400 })
    }
    if (!date || !time) {
      return NextResponse.json({ error: 'Please pick a date and time.' }, { status: 400 })
    }
    if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 480 minutes.' },
        { status: 400 }
      )
    }
    if (mode !== 'ONLINE' && mode !== 'IN_PERSON') {
      return NextResponse.json(
        { error: 'Mode must be ONLINE or IN_PERSON.' },
        { status: 400 }
      )
    }
    if (otherUserId === me.id) {
      return NextResponse.json({ error: 'You cannot schedule a session with yourself.' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id: otherUserId } })
    if (!target || target.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    const connection = await db.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: me.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: me.id },
        ],
      },
    })
    if (!connection) {
      return NextResponse.json(
        { error: 'You can only schedule sessions with connected students.' },
        { status: 403 }
      )
    }

    const teacherId = myRole === 'teacher' ? me.id : otherUserId
    const learnerId = myRole === 'teacher' ? otherUserId : me.id

    const session = await db.learningSession.create({
      data: {
        topic: topic.slice(0, 120),
        description: description.slice(0, 1000),
        teacherId,
        learnerId,
        date,
        time,
        duration: Math.round(duration),
        mode,
        location: location.slice(0, 200),
        meetingLink: meetingLink.slice(0, 500),
        notes: notes.slice(0, 1000),
        status: 'UPCOMING',
      },
      include: {
        teacher: { select: { id: true, name: true, profileImage: true } },
        learner: { select: { id: true, name: true, profileImage: true } },
        reviews: { where: { reviewerId: me.id }, select: { id: true } },
      },
    })

    await notify(
      otherUserId,
      'SESSION',
      `${me.name} scheduled a session: ${session.topic}`,
      `${session.date} at ${session.time}`,
      session.id
    )

    return NextResponse.json({ session: mapSession(session, me.id) })
  } catch (e) {
    console.error('[sessions POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
