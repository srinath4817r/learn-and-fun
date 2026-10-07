import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { AdminUserDTO } from '@/lib/lf/types'

/** GET /api/admin/users?q=&status= — manage users list */
export async function GET(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim()
    const status = (searchParams.get('status') ?? '').trim()

    const users = await db.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
        ...(status === 'ACTIVE' || status === 'SUSPENDED' ? { status } : {}),
      },
      include: { _count: { select: { userSkills: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const dto: AdminUserDTO[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      college: u.college,
      department: u.department,
      year: u.year,
      xp: u.xp,
      skillsCount: u._count.userSkills,
      createdAt: u.createdAt.toISOString(),
    }))

    return NextResponse.json({ users: dto })
  } catch (e) {
    console.error('[admin/users GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
