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

/** PATCH /api/goals/[id] — rename goal, toggle a task, add or remove a task */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const goal = await db.learningGoal.findUnique({
      where: { id },
      include: { tasks: { orderBy: [{ order: 'asc' as const }, { id: 'asc' as const }] } },
    })
    if (!goal || goal.userId !== me.id) {
      return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)

    // rename goal
    if (typeof body?.title === 'string') {
      const title = body.title.trim()
      if (!title) {
        return NextResponse.json({ error: 'Goal title cannot be empty.' }, { status: 400 })
      }
      await db.learningGoal.update({ where: { id: goal.id }, data: { title: title.slice(0, 120) } })
    }

    // toggle a task's done state
    if (body?.taskDone && typeof body.taskDone === 'object') {
      const taskId = typeof body.taskDone.taskId === 'string' ? body.taskDone.taskId : ''
      const done = body.taskDone.done === true
      if (!taskId) {
        return NextResponse.json({ error: 'Missing task.' }, { status: 400 })
      }
      const task = await db.goalTask.findUnique({ where: { id: taskId } })
      if (!task || task.goalId !== goal.id) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
      }
      await db.goalTask.update({ where: { id: taskId }, data: { done } })
    }

    // add a task at the end
    if (typeof body?.addTask === 'string' && body.addTask.trim()) {
      const maxOrder = goal.tasks.reduce((m, t) => Math.max(m, t.order), -1)
      await db.goalTask.create({
        data: {
          goalId: goal.id,
          title: body.addTask.trim().slice(0, 200),
          order: maxOrder + 1,
        },
      })
    }

    // remove a task
    if (typeof body?.removeTaskId === 'string' && body.removeTaskId) {
      const task = await db.goalTask.findUnique({ where: { id: body.removeTaskId } })
      if (!task || task.goalId !== goal.id) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
      }
      await db.goalTask.delete({ where: { id: task.id } })
    }

    const updated = await db.learningGoal.findUnique({
      where: { id: goal.id },
      include: goalInclude,
    })

    return NextResponse.json({ goal: updated ? mapGoal(updated) : null })
  } catch (e) {
    console.error('[goals PATCH]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** DELETE /api/goals/[id] — delete my goal (tasks cascade) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const goal = await db.learningGoal.findUnique({ where: { id } })
    if (!goal || goal.userId !== me.id) {
      return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
    }

    await db.learningGoal.delete({ where: { id: goal.id } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[goals DELETE]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
