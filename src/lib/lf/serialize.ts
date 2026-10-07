// ─── Learn & Fun — DB -> DTO serializers shared by all API routes ───
import { db } from '@/lib/db'
import { computeMatch, type MatchUserSide } from './matching'
import type {
  UserCardDTO, MeDTO, ConnectionStatus, Availability, ReviewDTO,
} from './types'

type DbUser = {
  id: string
  name: string
  email: string
  college: string
  department: string
  year: string
  bio: string
  profileImage: string | null
  role: string
  status: string
  xp: number
  rating: number
  reviewCount: number
  onboarded: boolean
  availability: string
  createdAt: Date
  userSkills?: {
    id: string
    skillId: string
    type: string
    level: string
    skill: { id: string; name: string; category: { id: string; name: string } }
  }[]
  userBadges?: { badge: { code: string; name: string; description: string; emoji: string }, unlockedAt: Date }[]
}

export function parseAvailability(raw: string): Availability[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function matchSide(user: DbUser): MatchUserSide {
  const skills = user.userSkills ?? []
  return {
    id: user.id,
    name: user.name,
    college: user.college,
    department: user.department,
    availability: parseAvailability(user.availability),
    teachSkills: skills
      .filter((s) => s.type === 'TEACH')
      .map((s) => ({ name: s.skill.name, level: s.level })),
    learnSkills: skills
      .filter((s) => s.type === 'LEARN')
      .map((s) => ({ name: s.skill.name })),
  }
}

export async function getConnectionStatus(
  viewerId: string,
  targetId: string
): Promise<ConnectionStatus> {
  const conn = await db.connection.findFirst({
    where: {
      OR: [
        { senderId: viewerId, receiverId: targetId },
        { senderId: targetId, receiverId: viewerId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  })
  if (!conn) return 'none'
  if (conn.status === 'ACCEPTED') return 'accepted'
  if (conn.status === 'PENDING') return conn.senderId === viewerId ? 'pending_sent' : 'pending_received'
  if (conn.status === 'REJECTED') return conn.senderId === viewerId ? 'rejected' : 'none'
  return 'none' // CANCELLED
}

async function connectionsCount(userId: string) {
  return db.connection.count({
    where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
  })
}

async function isSavedBy(viewerId: string, targetId: string) {
  const row = await db.savedUser.findUnique({
    where: { userId_savedUserId: { userId: viewerId, savedUserId: targetId } },
  })
  return !!row
}

export function baseUserParts(user: DbUser) {
  const skills = user.userSkills ?? []
  const map = (type: string) =>
    skills
      .filter((s) => s.type === type)
      .map((s) => ({
        id: s.id,
        skillId: s.skill.id,
        name: s.skill.name,
        category: s.skill.category.name,
        type: type as 'TEACH' | 'LEARN',
        level: s.level,
      }))
  return {
    id: user.id,
    name: user.name,
    college: user.college,
    department: user.department,
    year: user.year,
    bio: user.bio,
    profileImage: user.profileImage,
    xp: user.xp,
    rating: Math.round(user.rating * 10) / 10,
    reviewCount: user.reviewCount,
    availability: parseAvailability(user.availability),
    teachSkills: map('TEACH'),
    learnSkills: map('LEARN'),
  }
}

export async function serializeUser(
  user: DbUser,
  viewerId: string | null,
  opts?: { withMatch?: boolean; withReviews?: boolean }
): Promise<UserCardDTO> {
  const [connCount, status, saved, badges] = await Promise.all([
    connectionsCount(user.id),
    viewerId && viewerId !== user.id ? getConnectionStatus(viewerId, user.id) : Promise.resolve('none' as ConnectionStatus),
    viewerId ? isSavedBy(viewerId, user.id) : Promise.resolve(false),
    user.userBadges
      ? Promise.resolve(
          (user.userBadges ?? []).map((ub) => ({
            code: ub.badge.code,
            name: ub.badge.name,
            description: ub.badge.description,
            emoji: ub.badge.emoji,
            unlocked: true,
            unlockedAt: ub.unlockedAt.toISOString(),
          }))
        )
      : db.userBadge.findMany({
          where: { userId: user.id },
          include: { badge: true },
        }).then((rows) =>
          rows.map((ub) => ({
            code: ub.badge.code,
            name: ub.badge.name,
            description: ub.badge.description,
            emoji: ub.badge.emoji,
            unlocked: true,
            unlockedAt: ub.unlockedAt.toISOString(),
          }))
        ),
  ])

  const dto: UserCardDTO = {
    ...baseUserParts(user),
    badges,
    connectionsCount: connCount,
    connectionStatus: status,
    saved,
    createdAt: user.createdAt.toISOString(),
  }

  if (opts?.withMatch && viewerId && viewerId !== user.id) {
    const [me, other] = await Promise.all([
      viewerId
        ? db.user.findUnique({
            where: { id: viewerId },
            include: { userSkills: { include: { skill: { include: { category: true } } } } },
          })
        : Promise.resolve(null),
      db.user.findUnique({
        where: { id: user.id },
        include: { userSkills: { include: { skill: { include: { category: true } } } } },
      }),
    ])
    if (me && other && other.onboarded) {
      const result = computeMatch(matchSide(me), matchSide(other))
      dto.matchScore = result.score
      dto.matchReasons = result.reasons
    }
  }

  if (opts?.withReviews) {
    const reviews = await db.review.findMany({
      where: { reviewedUserId: user.id },
      include: { reviewer: { select: { id: true, name: true, profileImage: true } }, session: { select: { topic: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    dto.reviews = reviews.map((r): ReviewDTO => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reviewer: { id: r.reviewer.id, name: r.reviewer.name, profileImage: r.reviewer.profileImage },
      sessionTopic: r.session.topic,
    }))
  }

  return dto
}

export async function serializeUsers(
  users: DbUser[],
  viewerId: string | null,
  opts?: { withMatch?: boolean }
): Promise<UserCardDTO[]> {
  return Promise.all(users.map((u) => serializeUser(u, viewerId, opts)))
}

const userInclude = {
  userSkills: { include: { skill: { include: { category: true } } } },
  userBadges: { include: { badge: true } },
}

/** Builds the MeDTO for the authenticated user (unread counts included). */
export async function buildMe(user: {
  id: string
  name: string
  email: string
  role: string
  status: string
  college: string
  department: string
  year: string
  bio: string
  profileImage: string | null
  xp: number
  rating: number
  reviewCount: number
  onboarded: boolean
  availability: string
}): Promise<MeDTO> {
  const [full, unreadNotifications, connCount] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, include: userInclude }),
    db.notification.count({ where: { userId: user.id, read: false } }),
    connectionsCount(user.id),
  ])

  const badgeRows = await db.userBadge.findMany({
    where: { userId: user.id },
    include: { badge: true },
  })

  // unread messages: messages in my conversations, not sent by me, newer than my lastReadAt
  const myMemberships = await db.conversationParticipant.findMany({
    where: { userId: user.id },
    select: { conversationId: true, lastReadAt: true },
  })
  let unreadMsgs = 0
  await Promise.all(
    myMemberships.map(async (m) => {
      const count = await db.message.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: user.id },
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        },
      })
      unreadMsgs += count
    })
  )

  const allBadges = await db.badge.findMany()
  const owned = new Map(badgeRows.map((b) => [b.badge.code, b.unlockedAt.toISOString()]))

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    college: user.college,
    department: user.department,
    year: user.year,
    bio: user.bio,
    profileImage: user.profileImage,
    xp: user.xp,
    rating: Math.round(user.rating * 10) / 10,
    reviewCount: user.reviewCount,
    onboarded: user.onboarded,
    availability: parseAvailability(user.availability),
    teachSkills: (full?.userSkills ?? [])
      .filter((s) => s.type === 'TEACH')
      .map((s) => ({
        id: s.id, skillId: s.skill.id, name: s.skill.name, category: s.skill.category.name,
        type: 'TEACH' as const, level: s.level,
      })),
    learnSkills: (full?.userSkills ?? [])
      .filter((s) => s.type === 'LEARN')
      .map((s) => ({
        id: s.id, skillId: s.skill.id, name: s.skill.name, category: s.skill.category.name,
        type: 'LEARN' as const, level: s.level,
      })),
    badges: allBadges.map((b) => ({
      code: b.code,
      name: b.name,
      description: b.description,
      emoji: b.emoji,
      unlocked: owned.has(b.code),
      unlockedAt: owned.get(b.code) ?? null,
    })),
    connectionsCount: connCount,
    unreadNotifications,
    unreadMessages: unreadMsgs,
  }
}

export { userInclude }
