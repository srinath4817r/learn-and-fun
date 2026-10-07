import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { setAuthCookie } from '@/lib/lf/auth'
import { buildMe } from '@/lib/lf/serialize'

const GUEST_EMAIL = 'guest@learnfun.dev'
const GUEST_NAME = 'Guest'

/**
 * POST /api/auth/guest — one-tap guest access.
 * Signs the visitor into a shared, pre-onboarded "Guest" profile so they can
 * explore the full product (matches, messages, sessions…) immediately.
 * The guest account has an unguessable random password (cannot be password-logged-into).
 */
export async function POST() {
  try {
    let user = await db.user.findUnique({ where: { email: GUEST_EMAIL } })

    if (!user || user.status !== 'ACTIVE') {
      // (Re)create the shared guest profile
      if (user) {
        await db.user.delete({ where: { id: user.id } }).catch(() => null)
        user = null
      }
      const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10)
      user = await db.user.create({
        data: {
          email: GUEST_EMAIL,
          name: GUEST_NAME,
          password: randomPassword,
          role: 'STUDENT',
          status: 'ACTIVE',
          onboarded: true,
          college: 'Sunrise Institute of Technology',
          department: 'CSE',
          year: '2',
          bio: 'Exploring Learn & Fun as a guest. Here to discover skills and people.',
          availability: JSON.stringify([
            { day: 'MON', from: '18:00', to: '20:00' },
            { day: 'WED', from: '18:00', to: '20:00' },
            { day: 'SAT', from: '10:00', to: '14:00' },
          ]),
        },
      })

      // Give the guest a couple of teach/learn skills so matching works out of the box
      const catalog = await db.skill.findMany({
        where: { name: { in: ['JavaScript', 'UI/UX', 'Python'] } },
      })
      const byName = new Map(catalog.map((s) => [s.name, s.id]))
      const skillRows = [
        { type: 'TEACH', level: 'INTERMEDIATE', name: 'JavaScript' },
        { type: 'LEARN', level: 'BEGINNER', name: 'UI/UX' },
        { type: 'LEARN', level: 'BEGINNER', name: 'Python' },
      ]
        .map((r) => ({ ...r, skillId: byName.get(r.name) }))
        .filter((r): r is { type: string; level: string; name: string; skillId: string } => !!r.skillId)
      if (skillRows.length) {
        await db.userSkill.createMany({
          data: skillRows.map((r) => ({ userId: user!.id, skillId: r.skillId, type: r.type, level: r.level })),
        })
      }
    }

    await setAuthCookie(user.id)
    const me = await buildMe(user)
    return NextResponse.json({ user: me })
  } catch {
    return NextResponse.json(
      { error: 'Could not start guest session. Please try again.' },
      { status: 500 }
    )
  }
}
