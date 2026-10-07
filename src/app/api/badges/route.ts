import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { ensureBadgesSeeded } from '@/lib/lf/gamify'

export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    await ensureBadgesSeeded()

    const [learnedCount, taughtCount, distinctLearners, acceptedCount, excellentCount, badgeDefs, ownedRows] =
      await Promise.all([
        db.learningSession.count({ where: { learnerId: me.id, status: 'COMPLETED' } }),
        db.learningSession.count({ where: { teacherId: me.id, status: 'COMPLETED' } }),
        db.learningSession.findMany({
          where: { teacherId: me.id, status: 'COMPLETED' },
          select: { learnerId: true },
          distinct: ['learnerId'],
        }),
        db.connection.count({
          where: { status: 'ACCEPTED', OR: [{ senderId: me.id }, { receiverId: me.id }] },
        }),
        db.review.count({ where: { reviewedUserId: me.id, rating: 5 } }),
        db.badge.findMany(),
        db.userBadge.findMany({ where: { userId: me.id }, include: { badge: true } }),
      ])

    const progress: Record<string, { current: number; target: number }> = {
      FIRST_STEP: { current: me.onboarded ? 1 : 0, target: 1 },
      FIRST_LEARNER: { current: learnedCount, target: 1 },
      FIRST_TEACHER: { current: taughtCount, target: 1 },
      SKILL_SHARER: { current: distinctLearners.length, target: 5 },
      COMMUNITY_BUILDER: { current: acceptedCount, target: 10 },
      SKILL_MASTER: { current: excellentCount, target: 1 },
    }

    const owned = new Map(ownedRows.map((o) => [o.badge.code, o.unlockedAt.toISOString()]))

    const badges = badgeDefs.map((b) => ({
      code: b.code,
      name: b.name,
      description: b.description,
      emoji: b.emoji,
      unlocked: owned.has(b.code),
      unlockedAt: owned.get(b.code) ?? null,
      progress: progress[b.code] ?? null,
    }))

    return NextResponse.json({ badges })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
