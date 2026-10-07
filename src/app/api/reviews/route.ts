import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { awardXp, notify, checkBadges, recalcRating } from '@/lib/lf/gamify'

/** POST /api/reviews — review the other participant of a completed session */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const comment = typeof body?.comment === 'string' ? body.comment.trim().slice(0, 500) : ''
    const rating = Number(body?.rating)

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session.' }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be a whole number from 1 to 5.' }, { status: 400 })
    }

    const session = await db.learningSession.findUnique({ where: { id: sessionId } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }
    if (session.teacherId !== me.id && session.learnerId !== me.id) {
      return NextResponse.json(
        { error: 'You can only review sessions you took part in.' },
        { status: 403 }
      )
    }
    if (session.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'You can only review completed sessions.' },
        { status: 400 }
      )
    }

    const existing = await db.review.findUnique({
      where: { sessionId_reviewerId: { sessionId, reviewerId: me.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'You already reviewed this session.' }, { status: 409 })
    }

    const reviewedUserId = session.teacherId === me.id ? session.learnerId : session.teacherId

    const review = await db.review.create({
      data: { sessionId, reviewerId: me.id, reviewedUserId, rating, comment },
    })

    await recalcRating(reviewedUserId)

    if (rating === 5) {
      await awardXp(
        reviewedUserId,
        `EXCELLENT_REVIEW:${review.id}`,
        10,
        'Received a 5-star review'
      )
      await checkBadges(reviewedUserId) // SKILL_MASTER
    }

    await notify(
      reviewedUserId,
      'REVIEW',
      `${me.name} left you a ${rating}-star review`,
      comment,
      review.id
    )

    return NextResponse.json({
      review: {
        id: review.id,
        sessionId: review.sessionId,
        reviewerId: review.reviewerId,
        reviewedUserId: review.reviewedUserId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('[reviews POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
