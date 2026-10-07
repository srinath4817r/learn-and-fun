import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setAuthCookie, hashPassword } from '@/lib/lf/auth'
import { buildMe } from '@/lib/lf/serialize'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    const name = String(b.name ?? '').trim()
    const email = String(b.email ?? '').trim().toLowerCase()
    const password = String(b.password ?? '')
    const confirmPassword = String(b.confirmPassword ?? '')
    const college = String(b.college ?? '').trim()
    const department = String(b.department ?? '').trim()
    const year = String(b.year ?? '').trim()
    const bio = String(b.bio ?? '').trim()

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
    }
    if (!college) {
      return NextResponse.json({ error: 'College is required.' }, { status: 400 })
    }
    if (!department) {
      return NextResponse.json({ error: 'Department is required.' }, { status: 400 })
    }
    if (!year) {
      return NextResponse.json({ error: 'Year is required.' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const hashed = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, password: hashed, college, department, year, bio },
    })

    await setAuthCookie(user.id)
    const me = await buildMe(user)
    return NextResponse.json({ user: me })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
