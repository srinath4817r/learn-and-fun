import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const [students, badgeGroups] = await Promise.all([
      db.user.findMany({
        where: { role: 'STUDENT', status: 'ACTIVE' },
        orderBy: [{ xp: 'desc' }, { rating: 'desc' }],
        take: 50,
        select: {
          id: true,
          name: true,
          college: true,
          department: true,
          profileImage: true,
          xp: true,
          rating: true,
        },
      }),
      db.userBadge.groupBy({ by: ['userId'], _count: { _all: true } }),
    ])

    const badgeMap = new Map(badgeGroups.map((g) => [g.userId, g._count._all]))

    const leaders = students.map((s, i) => ({
      id: s.id,
      rank: i + 1,
      name: s.name,
      college: s.college,
      department: s.department,
      profileImage: s.profileImage,
      xp: s.xp,
      badgeCount: badgeMap.get(s.id) ?? 0,
      rating: Math.round(s.rating * 10) / 10,
    }))

    return NextResponse.json({ leaders })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
