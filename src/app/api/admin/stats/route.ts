import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { AdminStatsDTO } from '@/lib/lf/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function lastMonths(count: number): { label: string; start: Date; end: Date }[] {
  const now = new Date()
  const buckets: { label: string; start: Date; end: Date }[] = []
  for (let back = count - 1; back >= 0; back--) {
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1)
    buckets.push({ label: MONTHS[start.getMonth()], start, end })
  }
  return buckets
}

function inBucket(d: Date, start: Date, end: Date) {
  return d >= start && d < end
}

/** GET /api/admin/stats — dashboard cards + chart datasets */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const [
      totalStudents,
      activeUsers,
      suspendedUsers,
      totalSkills,
      totalConnections,
      totalSessions,
      openReports,
      totalGoals,
      users,
      sessions,
      acceptedConnections,
      topStudents,
      skillCounts,
      departments,
    ] = await Promise.all([
      db.user.count({ where: { role: 'STUDENT' } }),
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.user.count({ where: { status: 'SUSPENDED' } }),
      db.skill.count(),
      db.connection.count({ where: { status: 'ACCEPTED' } }),
      db.learningSession.count(),
      db.report.count({ where: { status: 'OPEN' } }),
      db.learningGoal.count(),
      db.user.findMany({
        select: { createdAt: true, department: true, role: true, status: true, xp: true, name: true },
      }),
      db.learningSession.findMany({ select: { createdAt: true } }),
      db.connection.findMany({
        where: { status: 'ACCEPTED' },
        select: { updatedAt: true },
      }),
      db.user.findMany({
        where: { role: 'STUDENT' },
        orderBy: { xp: 'desc' },
        take: 5,
        select: { name: true, xp: true },
      }),
      db.userSkill.groupBy({
        by: ['skillId'],
        _count: { skillId: true },
        orderBy: { _count: { skillId: 'desc' } },
        take: 8,
      }),
      db.user.groupBy({
        by: ['department'],
        where: { role: 'STUDENT' },
        _count: { department: true },
      }),
    ])

    // userGrowth — last 8 weeks
    const now = new Date()
    const userGrowth: AdminStatsDTO['charts']['userGrowth'] = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * WEEK_MS)
      const end = new Date(now.getTime() - i * WEEK_MS)
      const count = users.filter((u) => inBucket(u.createdAt, start, end)).length
      userGrowth.push({ label: i === 0 ? 'now' : `w-${i}`, count })
    }

    // popularSkills — resolve names for top 8 skills
    const skillIds = skillCounts.map((s) => s.skillId)
    const skillRows = await db.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true, name: true },
    })
    const skillName = new Map(skillRows.map((s) => [s.id, s.name]))
    const popularSkills: AdminStatsDTO['charts']['popularSkills'] = skillCounts
      .map((s) => ({ name: skillName.get(s.skillId) ?? 'Unknown', count: s._count.skillId }))

    // sessionsOverTime — last 6 months
    const monthBuckets = lastMonths(6)
    const sessionsOverTime: AdminStatsDTO['charts']['sessionsOverTime'] = monthBuckets.map(
      (b) => ({
        label: b.label,
        count: sessions.filter((s) => inBucket(s.createdAt, b.start, b.end)).length,
      })
    )

    // connectionsOverTime — ACCEPTED by updatedAt, last 6 months
    const connectionsOverTime: AdminStatsDTO['charts']['connectionsOverTime'] = monthBuckets.map(
      (b) => ({
        label: b.label,
        count: acceptedConnections.filter((c) => inBucket(c.updatedAt, b.start, b.end)).length,
      })
    )

    // departmentDistribution
    const departmentDistribution: AdminStatsDTO['charts']['departmentDistribution'] = departments
      .map((d) => ({
        name: d.department.trim() === '' ? 'Unspecified' : d.department,
        count: d._count.department,
      }))
      .sort((a, b) => b.count - a.count)

    const stats: AdminStatsDTO = {
      cards: {
        totalStudents,
        activeUsers,
        suspendedUsers,
        totalSkills,
        totalConnections,
        totalSessions,
        openReports,
        totalGoals,
      },
      charts: {
        userGrowth,
        popularSkills,
        sessionsOverTime,
        connectionsOverTime,
        topStudents: topStudents.map((t) => ({ name: t.name, xp: t.xp })),
        departmentDistribution,
      },
    }

    return NextResponse.json(stats)
  } catch (e) {
    console.error('[admin/stats GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
