// ─── Learn & Fun — XP, badges and notifications engine ───
// XP is generated from real application events only, and duplicate
// awards are prevented via a unique (userId, code) constraint.
import { db } from '@/lib/db'

export const XP_RULES = {
  PROFILE_COMPLETED: 10,
  SKILL_ADDED: 5,
  SESSION_COMPLETED_LEARNER: 15,
  SESSION_COMPLETED_TEACHER: 25,
  EXCELLENT_REVIEW: 10,
  HELP_5_STUDENTS: 50,
} as const

export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'NEW_MESSAGE'
  | 'SESSION'
  | 'REVIEW'
  | 'BADGE'
  | 'ANNOUNCEMENT'
  | 'SYSTEM'

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body = '',
  refId?: string
) {
  await db.notification.create({
    data: { userId, type, title, body, refId: refId ?? null },
  })
}

/** Awards XP once per unique code. Returns the awarded amount (0 if duplicate). */
export async function awardXp(
  userId: string,
  code: string,
  xp: number,
  reason: string
): Promise<number> {
  try {
    await db.xpEvent.create({ data: { userId, code, xp, reason } })
    await db.user.update({ where: { id: userId }, data: { xp: { increment: xp } } })
    return xp
  } catch {
    // unique constraint hit — XP already awarded for this event
    return 0
  }
}

export interface BadgeProgress {
  current: number
  target: number
}

const BADGE_DEFS = [
  { code: 'FIRST_STEP', name: 'First Step', emoji: '', description: 'Completed your profile' },
  { code: 'FIRST_LEARNER', name: 'First Learner', emoji: '', description: 'Completed your first learning session' },
  { code: 'FIRST_TEACHER', name: 'First Teacher', emoji: '', description: 'Successfully taught someone' },
  { code: 'SKILL_SHARER', name: 'Skill Sharer', emoji: '', description: 'Taught 5 different students' },
  { code: 'COMMUNITY_BUILDER', name: 'Community Builder', emoji: '', description: 'Made 10 connections' },
  { code: 'SKILL_MASTER', name: 'Skill Master', emoji: '', description: 'Received an excellent 5-star review' },
] as const

export async function ensureBadgesSeeded() {
  for (const def of BADGE_DEFS) {
    await db.badge.upsert({
      where: { code: def.code },
      update: {},
      create: { ...def },
    })
  }
}

async function badgeProgress(userId: string): Promise<Record<string, BadgeProgress>> {
  const [learned, taught, distinctLearners, acceptedConnections, excellentReviews, me] =
    await Promise.all([
      db.learningSession.count({ where: { learnerId: userId, status: 'COMPLETED' } }),
      db.learningSession.count({ where: { teacherId: userId, status: 'COMPLETED' } }),
      db.learningSession.findMany({
        where: { teacherId: userId, status: 'COMPLETED' },
        select: { learnerId: true },
        distinct: ['learnerId'],
      }),
      db.connection.count({ where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] } }),
      db.review.count({ where: { reviewedUserId: userId, rating: 5 } }),
      db.user.findUnique({ where: { id: userId }, select: { onboarded: true } }),
    ])
  return {
    FIRST_STEP: { current: me?.onboarded ? 1 : 0, target: 1 },
    FIRST_LEARNER: { current: learned, target: 1 },
    FIRST_TEACHER: { current: taught, target: 1 },
    SKILL_SHARER: { current: distinctLearners.length, target: 5 },
    COMMUNITY_BUILDER: { current: acceptedConnections, target: 10 },
    SKILL_MASTER: { current: excellentReviews, target: 1 },
  }
}

/** Evaluates every badge condition for a user, unlocks new ones and notifies. Returns newly unlocked badges. */
export async function checkBadges(userId: string) {
  await ensureBadgesSeeded()
  const progress = await badgeProgress(userId)
  const owned = await db.userBadge.findMany({ where: { userId }, select: { badgeId: true } })
  const ownedIds = new Set(owned.map((o) => o.badgeId))
  const allBadges = await db.badge.findMany()
  const newlyUnlocked: { name: string; emoji: string; description: string }[] = []

  for (const badge of allBadges) {
    if (ownedIds.has(badge.id)) continue
    const p = progress[badge.code]
    if (p && p.current >= p.target) {
      await db.userBadge.create({ data: { userId, badgeId: badge.id } }).catch(() => null)
      newlyUnlocked.push({ name: badge.name, emoji: badge.emoji, description: badge.description })
      await notify(userId, 'BADGE', `Badge unlocked: ${badge.name}`, badge.description, badge.id)
    }
  }
  return newlyUnlocked
}

/** Recalculates a user's average rating from all reviews they received. */
export async function recalcRating(userId: string) {
  const agg = await db.review.aggregate({
    where: { reviewedUserId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  })
  await db.user.update({
    where: { id: userId },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count.rating,
    },
  })
}
