import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** GET /api/progress — goal-task completion per skill + overall */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const goals = await db.learningGoal.findMany({
      where: { userId: me.id },
      include: {
        skill: { select: { id: true, name: true } },
        tasks: { select: { done: true } },
      },
    })

    const perSkill = new Map<string, { done: number; total: number }>()
    let allDone = 0
    let allTotal = 0

    for (const goal of goals) {
      const total = goal.tasks.length
      const done = goal.tasks.filter((t) => t.done).length
      allTotal += total
      allDone += done
      if (!goal.skill) continue
      const entry = perSkill.get(goal.skill.name) ?? { done: 0, total: 0 }
      entry.done += done
      entry.total += total
      perSkill.set(goal.skill.name, entry)
    }

    const progress = [...perSkill.entries()].map(([skill, { done, total }]) => ({
      skill,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
    }))
    progress.sort((a, b) => b.percent - a.percent || a.skill.localeCompare(b.skill))

    return NextResponse.json({
      progress,
      overall: allTotal === 0 ? 0 : Math.round((allDone / allTotal) * 100),
    })
  } catch (e) {
    console.error('[progress GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
