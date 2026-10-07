import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { GoalDTO } from '@/lib/lf/types'

type GoalRow = {
  id: string
  title: string
  createdAt: Date
  skill: { id: string; name: string } | null
  tasks: { id: string; title: string; done: boolean; order: number }[]
}

function mapGoal(g: GoalRow): GoalDTO {
  const total = g.tasks.length
  const done = g.tasks.filter((t) => t.done).length
  return {
    id: g.id,
    title: g.title,
    skill: g.skill,
    tasks: g.tasks.map((t) => ({ id: t.id, title: t.title, done: t.done, order: t.order })),
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
    createdAt: g.createdAt.toISOString(),
  }
}

const goalInclude = {
  tasks: { orderBy: [{ order: 'asc' as const }, { id: 'asc' as const }] },
  skill: { select: { id: true, name: true } },
}

/** GET /api/goals — my learning goals */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const goals = await db.learningGoal.findMany({
      where: { userId: me.id },
      include: goalInclude,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ goals: goals.map(mapGoal) })
  } catch (e) {
    console.error('[goals GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** POST /api/goals — create a goal with tasks */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const skillId = typeof body?.skillId === 'string' && body.skillId ? body.skillId : null
    const rawTasks = Array.isArray(body?.tasks) ? body.tasks : []

    if (!title) {
      return NextResponse.json({ error: 'Please give your goal a title.' }, { status: 400 })
    }
    const tasks = rawTasks
      .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t: string) => t.trim().slice(0, 200))
      .slice(0, 50)
    if (skillId) {
      const skill = await db.skill.findUnique({ where: { id: skillId } })
      if (!skill) {
        return NextResponse.json({ error: 'Selected skill not found.' }, { status: 400 })
      }
    }

    const goal = await db.learningGoal.create({
      data: {
        userId: me.id,
        title: title.slice(0, 120),
        skillId,
        tasks: { create: tasks.map((t: string, i: number) => ({ title: t, order: i })) },
      },
      include: goalInclude,
    })

    return NextResponse.json({ goal: mapGoal(goal) })
  } catch (e) {
    console.error('[goals POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
