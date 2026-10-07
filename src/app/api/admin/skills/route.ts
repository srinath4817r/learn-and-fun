import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** POST /api/admin/skills — create a skill in a category */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const categoryId = typeof body?.categoryId === 'string' ? body.categoryId : ''
    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Skill name and category are required.' },
        { status: 400 }
      )
    }

    const category = await db.skillCategory.findUnique({ where: { id: categoryId } })
    if (!category) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }

    const exists = await db.skill.findUnique({
      where: { categoryId_name: { categoryId, name } },
    })
    if (exists) {
      return NextResponse.json(
        { error: 'A skill with this name already exists in this category.' },
        { status: 409 }
      )
    }

    const skill = await db.skill.create({ data: { name, categoryId } })

    return NextResponse.json({ skill: { id: skill.id, name: skill.name, categoryId: skill.categoryId } })
  } catch (e) {
    console.error('[admin/skills POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
