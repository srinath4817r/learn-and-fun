import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { serializeUsers, userInclude } from '@/lib/lf/serialize'

export async function GET(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const sp = request.nextUrl.searchParams
    const q = (sp.get('q') ?? '').trim().toLowerCase()
    const category = (sp.get('category') ?? '').trim().toLowerCase()
    const skill = (sp.get('skill') ?? '').trim().toLowerCase()
    const department = (sp.get('department') ?? '').trim().toLowerCase()
    const year = (sp.get('year') ?? '').trim().toLowerCase()
    const level = (sp.get('level') ?? '').trim().toUpperCase()
    const minRating = Number(sp.get('minRating') ?? '') || 0
    const availabilityDay = (sp.get('availabilityDay') ?? '').trim().toUpperCase()
    const sort = sp.get('sort') ?? 'match'

    const candidates = await db.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE', id: { not: me.id }, onboarded: true },
      include: userInclude,
    })

    let filtered = candidates
    if (q) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.bio.toLowerCase().includes(q) ||
          u.userSkills.some((us) => us.skill.name.toLowerCase().includes(q))
      )
    }
    if (category) {
      filtered = filtered.filter((u) =>
        u.userSkills.some((us) => us.skill.category.name.toLowerCase() === category)
      )
    }
    if (skill) {
      filtered = filtered.filter((u) =>
        u.userSkills.some((us) => us.skill.name.toLowerCase() === skill)
      )
    }
    if (department) {
      filtered = filtered.filter((u) => u.department.toLowerCase() === department)
    }
    if (year) {
      filtered = filtered.filter((u) => u.year.toLowerCase() === year)
    }
    if (level) {
      filtered = filtered.filter((u) =>
        u.userSkills.some((us) => us.type === 'TEACH' && us.level === level)
      )
    }

    let users = await serializeUsers(filtered, me.id, { withMatch: true })

    if (minRating > 0) {
      users = users.filter((u) => u.rating >= minRating)
    }
    if (availabilityDay) {
      users = users.filter((u) => u.availability.some((a) => a.day === availabilityDay))
    }

    if (sort === 'xp') {
      users.sort((a, b) => b.xp - a.xp)
    } else if (sort === 'rating') {
      users.sort((a, b) => b.rating - a.rating)
    } else {
      users.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    }

    return NextResponse.json({ users: users.slice(0, 60) })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
