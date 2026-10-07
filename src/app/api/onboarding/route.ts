import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { buildMe } from '@/lib/lf/serialize'
import { awardXp, checkBadges, ensureBadgesSeeded, XP_RULES } from '@/lib/lf/gamify'
import { LEARN_LEVELS, TEACH_LEVELS } from '@/lib/lf/initial-skills'
import { DAYS } from '@/lib/lf/matching'
import type { Availability } from '@/lib/lf/types'

function parseSkillEntries(raw: unknown, allowedLevels: readonly string[]) {
  if (!Array.isArray(raw)) return []
  const entries: { skillId: string; level: string }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const skillId = String(rec.skillId ?? '').trim()
    const level = String(rec.level ?? '').trim()
    if (!skillId || !allowedLevels.includes(level)) continue
    entries.push({ skillId, level })
  }
  return entries
}

function parseAvailabilityInput(raw: unknown): Availability[] {
  if (!Array.isArray(raw)) return []
  const out: Availability[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const day = String(rec.day ?? '').trim().toUpperCase()
    const from = String(rec.from ?? '').trim()
    const to = String(rec.to ?? '').trim()
    if (!(DAYS as readonly string[]).includes(day) || !from || !to) continue
    out.push({ day, from, to })
  }
  return out
}

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

    const learnEntries = parseSkillEntries(b.learnSkills, LEARN_LEVELS)
    const teachEntries = parseSkillEntries(b.teachSkills, TEACH_LEVELS)
    const availability = parseAvailabilityInput(b.availability)

    const allIds = [...new Set([...learnEntries, ...teachEntries].map((e) => e.skillId))]
    const existingSkills = allIds.length
      ? await db.skill.findMany({ where: { id: { in: allIds } } })
      : []
    const validIds = new Set(existingSkills.map((s) => s.id))
    const skillNameById = new Map(existingSkills.map((s) => [s.id, s.name]))

    const toCreate = [
      ...learnEntries
        .filter((e) => validIds.has(e.skillId))
        .map((e) => ({ skillId: e.skillId, type: 'LEARN' as const, level: e.level })),
      ...teachEntries
        .filter((e) => validIds.has(e.skillId))
        .map((e) => ({ skillId: e.skillId, type: 'TEACH' as const, level: e.level })),
    ]

    const seen = new Set<string>()
    for (const row of toCreate) {
      const key = `${row.type}:${row.skillId}`
      if (seen.has(key)) continue
      seen.add(key)
      const created = await db.userSkill
        .create({ data: { userId: user.id, ...row } })
        .catch(() => null)
      if (created) {
        await awardXp(
          user.id,
          `SKILL_ADDED:${created.id}`,
          XP_RULES.SKILL_ADDED,
          `Added skill: ${skillNameById.get(row.skillId) ?? 'a skill'}`
        )
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: { onboarded: true, availability: JSON.stringify(availability) },
    })

    await awardXp(user.id, 'PROFILE_COMPLETED', XP_RULES.PROFILE_COMPLETED, 'Completed profile setup')
    await ensureBadgesSeeded()
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
