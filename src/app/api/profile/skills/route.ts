import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { buildMe } from '@/lib/lf/serialize'
import { awardXp, checkBadges, XP_RULES } from '@/lib/lf/gamify'
import { LEARN_LEVELS, TEACH_LEVELS } from '@/lib/lf/initial-skills'

const CONFLICT = 'You already added this skill.'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    const skillId = String(b.skillId ?? '').trim()
    const type = b.type === 'TEACH' || b.type === 'LEARN' ? b.type : null
    const level = String(b.level ?? '').trim()

    if (!skillId) {
      return NextResponse.json({ error: 'Skill is required.' }, { status: 400 })
    }
    if (!type) {
      return NextResponse.json({ error: "Type must be 'TEACH' or 'LEARN'." }, { status: 400 })
    }
    const allowedLevels: readonly string[] = type === 'TEACH' ? TEACH_LEVELS : LEARN_LEVELS
    if (!allowedLevels.includes(level)) {
      return NextResponse.json(
        { error: `Level must be one of: ${allowedLevels.join(', ')}.` },
        { status: 400 }
      )
    }

    const skill = await db.skill.findUnique({ where: { id: skillId } })
    if (!skill) {
      return NextResponse.json({ error: 'Invalid skill.' }, { status: 400 })
    }

    const existing = await db.userSkill.findUnique({
      where: { userId_skillId_type: { userId: user.id, skillId, type } },
    })
    if (existing) {
      return NextResponse.json({ error: CONFLICT }, { status: 409 })
    }

    const created = await db.userSkill
      .create({ data: { userId: user.id, skillId, type, level } })
      .catch(() => null)
    if (!created) {
      return NextResponse.json({ error: CONFLICT }, { status: 409 })
    }

    await awardXp(
      user.id,
      `SKILL_ADDED:${created.id}`,
      XP_RULES.SKILL_ADDED,
      `Added skill: ${skill.name}`
    )
    await checkBadges(user.id)

    const updated = await db.user.findUnique({ where: { id: user.id } })
    if (!updated) {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ user: await buildMe(updated) })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    }

    const skillId = request.nextUrl.searchParams.get('skillId') ?? ''
    const type = request.nextUrl.searchParams.get('type') ?? ''

    if (!skillId) {
      return NextResponse.json({ error: 'skillId is required.' }, { status: 400 })
    }
    if (type !== 'TEACH' && type !== 'LEARN') {
      return NextResponse.json({ error: "type must be 'TEACH' or 'LEARN'." }, { status: 400 })
    }

    await db.userSkill.deleteMany({ where: { userId: user.id, skillId, type } })

    const updated = await db.user.findUnique({ where: { id: user.id } })
    if (!updated) {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ user: await buildMe(updated) })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
