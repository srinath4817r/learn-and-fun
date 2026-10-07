import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** POST /api/admin/categories — create a skill category */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
    }

    const exists = await db.skillCategory.findUnique({ where: { name } })
    if (exists) {
      return NextResponse.json(
        { error: 'A category with this name already exists.' },
        { status: 409 }
      )
    }

    const maxSort = await db.skillCategory.aggregate({ _max: { sortOrder: true } })
    const category = await db.skillCategory.create({
      data: { name, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
    })

    return NextResponse.json({ category: { id: category.id, name: category.name } })
  } catch (e) {
    console.error('[admin/categories POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
