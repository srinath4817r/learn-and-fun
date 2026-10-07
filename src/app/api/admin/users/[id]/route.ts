import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { AdminUserDTO } from '@/lib/lf/types'

/** PATCH /api/admin/users/[id] — suspend or reinstate a student */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => null)
    const status = typeof body?.status === 'string' ? body.status : ''
    if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
      return NextResponse.json({ error: 'Status must be ACTIVE or SUSPENDED.' }, { status: 400 })
    }
    if (id === me.id) {
      return NextResponse.json({ error: 'You cannot change your own status.' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }
    if (target.role === 'ADMIN') {
      return NextResponse.json({ error: 'You cannot suspend another admin.' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id },
      data: { status },
      include: { _count: { select: { userSkills: true } } },
    })

    const dto: AdminUserDTO = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      college: updated.college,
      department: updated.department,
      year: updated.year,
      xp: updated.xp,
      skillsCount: updated._count.userSkills,
      createdAt: updated.createdAt.toISOString(),
    }

    return NextResponse.json({ user: dto })
  } catch (e) {
    console.error('[admin/users PATCH]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** DELETE /api/admin/users/[id] — permanently remove a user */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    if (id === me.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/users DELETE]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
