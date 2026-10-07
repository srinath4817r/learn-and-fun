import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** PATCH /api/admin/skills/[id] — rename a skill */
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
    const skill = await db.skill.findUnique({ where: { id } })
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found.' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Skill name is required.' }, { status: 400 })
    }
    if (name !== skill.name) {
      const exists = await db.skill.findUnique({
        where: { categoryId_name: { categoryId: skill.categoryId, name } },
      })
      if (exists) {
        return NextResponse.json(
          { error: 'A skill with this name already exists in this category.' },
          { status: 409 }
        )
      }
    }

    const updated = await db.skill.update({ where: { id }, data: { name } })

    return NextResponse.json({
      skill: { id: updated.id, name: updated.name, categoryId: updated.categoryId },
    })
  } catch (e) {
    console.error('[admin/skills PATCH]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** DELETE /api/admin/skills/[id] — delete an unused skill */
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
    const skill = await db.skill.findUnique({
      where: { id },
      include: { _count: { select: { userSkills: true } } },
    })
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found.' }, { status: 404 })
    }
    if (skill._count.userSkills > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a skill that students are using.' },
        { status: 409 }
      )
    }

    await db.skill.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/skills DELETE]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
