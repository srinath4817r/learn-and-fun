import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { buildMe } from '@/lib/lf/serialize'
import { DAYS } from '@/lib/lf/matching'
import type { Availability } from '@/lib/lf/types'

function parseAvailabilityInput(raw: unknown): Availability[] | null {
  if (!Array.isArray(raw)) return null
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

export async function PATCH(request: NextRequest) {
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

    const data: {
      name?: string
      bio?: string
      college?: string
      department?: string
      year?: string
      availability?: string
    } = {}

    if (b.name !== undefined) {
      const name = String(b.name ?? '').trim()
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 })
      }
      data.name = name
    }
    if (b.bio !== undefined) {
      data.bio = String(b.bio ?? '')
    }
    if (b.college !== undefined) {
      const college = String(b.college ?? '').trim()
      if (!college) {
        return NextResponse.json({ error: 'College cannot be empty.' }, { status: 400 })
      }
      data.college = college
    }
    if (b.department !== undefined) {
      const department = String(b.department ?? '').trim()
      if (!department) {
        return NextResponse.json({ error: 'Department cannot be empty.' }, { status: 400 })
      }
      data.department = department
    }
    if (b.year !== undefined) {
      const year = String(b.year ?? '').trim()
      if (!year) {
        return NextResponse.json({ error: 'Year cannot be empty.' }, { status: 400 })
      }
      data.year = year
    }
    if (b.availability !== undefined) {
      const parsed = parseAvailabilityInput(b.availability)
      if (parsed === null) {
        return NextResponse.json(
          { error: 'Availability must be a list of {day, from, to} entries.' },
          { status: 400 }
        )
      }
      data.availability = JSON.stringify(parsed)
    }

    const updated = await db.user.update({ where: { id: user.id }, data })
    return NextResponse.json({ user: await buildMe(updated) })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
