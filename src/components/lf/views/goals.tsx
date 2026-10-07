'use client'

// ─── Learn & Fun — Goals view (learning plans + progress by skill) ───
import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Pencil, Plus, X, Trash2, MoreVertical, TrendingUp, Loader2, ListChecks,
  CheckCircle2, Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { GoalDTO, GoalTaskDTO, SkillCatalogCategory } from '@/lib/lf/types'
import {
  EmptyState, ErrorState, CardsSkeleton, PageHeader, SkillTag,
} from '@/components/lf/shared'

const NO_SKILL = 'none'

function goalPct(goal: GoalDTO) {
  if (!goal.tasks.length) return 0
  const done = goal.tasks.filter((t) => t.done).length
  return Math.round((done / goal.tasks.length) * 100)
}

export function GoalsView() {
  const [goals, setGoals] = React.useState<GoalDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [progressBySkill, setProgressBySkill] = React.useState<{ skill: string; percent: number }[] | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  // rename
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')
  // add task drafts per goal
  const [taskDrafts, setTaskDrafts] = React.useState<Record<string, string>>({})
  // delete confirm
  const [deleteTarget, setDeleteTarget] = React.useState<GoalDTO | null>(null)

  // create dialog
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newSkillId, setNewSkillId] = React.useState(NO_SKILL)
  const [newTasks, setNewTasks] = React.useState<string[]>([])
  const [newTaskInput, setNewTaskInput] = React.useState('')
  const [skills, setSkills] = React.useState<{ id: string; name: string }[]>([])
  const [skillsLoading, setSkillsLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  const loadGoals = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ goals: GoalDTO[] }>('/api/goals')
      setGoals(res.goals)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load goals')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProgress = React.useCallback(async () => {
    try {
      const res = await api.get<{ progress: { skill: string; percent: number }[] }>('/api/progress')
      setProgressBySkill(res.progress)
    } catch {
      setProgressBySkill(null)
    }
  }, [])

  React.useEffect(() => {
    loadGoals()
    loadProgress()
  }, [loadGoals, loadProgress])

  // ── Mutations ──
  async function toggleTask(goal: GoalDTO, task: GoalTaskDTO, done: boolean) {
    setGoals((prev) =>
      prev
        ? prev.map((g) =>
            g.id === goal.id ? { ...g, tasks: g.tasks.map((t) => (t.id === task.id ? { ...t, done } : t)) } : g,
          )
        : prev,
    )
    try {
      const { goal: updated } = await api.patch<{ goal: GoalDTO }>(`/api/goals/${goal.id}`, {
        taskDone: { taskId: task.id, done },
      })
      setGoals((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev))
      loadProgress()
    } catch (e) {
      setGoals((prev) =>
        prev
          ? prev.map((g) =>
              g.id === goal.id ? { ...g, tasks: g.tasks.map((t) => (t.id === task.id ? { ...t, done: !done } : t)) } : g,
            )
          : prev,
      )
      toast.error(e instanceof Error ? e.message : 'Could not update task')
    }
  }

  async function addTask(goal: GoalDTO) {
    const title = (taskDrafts[goal.id] ?? '').trim()
    if (!title) return
    setBusyId(goal.id)
    try {
      const { goal: updated } = await api.patch<{ goal: GoalDTO }>(`/api/goals/${goal.id}`, { addTask: title })
      setGoals((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev))
      setTaskDrafts((prev) => ({ ...prev, [goal.id]: '' }))
      loadProgress()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add task')
    } finally {
      setBusyId(null)
    }
  }

  async function removeTask(goal: GoalDTO, taskId: string) {
    setBusyId(goal.id)
    try {
      const { goal: updated } = await api.patch<{ goal: GoalDTO }>(`/api/goals/${goal.id}`, { removeTaskId: taskId })
      setGoals((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev))
      loadProgress()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove task')
    } finally {
      setBusyId(null)
    }
  }

  async function saveTitle(goal: GoalDTO) {
    const title = editTitle.trim()
    setEditingId(null)
    if (!title || title === goal.title) return
    setBusyId(goal.id)
    try {
      const { goal: updated } = await api.patch<{ goal: GoalDTO }>(`/api/goals/${goal.id}`, { title })
      setGoals((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev))
      toast.success('Goal renamed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not rename goal')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteGoal() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await api.del(`/api/goals/${deleteTarget.id}`)
      toast.success('Goal deleted')
      setGoals((prev) => (prev ? prev.filter((g) => g.id !== deleteTarget.id) : prev))
      setDeleteTarget(null)
      loadProgress()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete goal')
    } finally {
      setBusyId(null)
    }
  }

  // ── Create goal ──
  React.useEffect(() => {
    if (!createOpen) return
    setSkillsLoading(true)
    api.get<{ categories: SkillCatalogCategory[] }>('/api/skills')
      .then((res) => setSkills(res.categories.flatMap((c) => c.skills)))
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false))
  }, [createOpen])

  function openCreate() {
    setNewTitle(''); setNewSkillId(NO_SKILL); setNewTasks([]); setNewTaskInput('')
    setCreateOpen(true)
  }

  function addNewTaskChip() {
    const t = newTaskInput.trim()
    if (!t) return
    if (newTasks.includes(t)) {
      toast.info('That task is already in the list')
      return
    }
    setNewTasks((prev) => [...prev, t])
    setNewTaskInput('')
  }

  async function createGoal() {
    if (!newTitle.trim()) {
      toast.info('Give your goal a title first')
      return
    }
    if (newTasks.length === 0) {
      toast.info('Add at least one task', { description: 'Type a step and press Enter.' })
      return
    }
    setCreating(true)
    try {
      await api.post('/api/goals', {
        title: newTitle.trim(),
        skillId: newSkillId !== NO_SKILL ? newSkillId : undefined,
        tasks: newTasks,
      })
      toast.success('Goal created!', { description: 'Small steps every day add up fast.' })
      setCreateOpen(false)
      await loadGoals()
      loadProgress()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create goal')
    } finally {
      setCreating(false)
    }
  }

  const overall = goals && goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + goalPct(g), 0) / goals.length)
    : 0

  const goalsList = (spanned: boolean) => (
    <div className={cn(spanned && 'lg:col-span-2')}>
      {loading ? (
        <CardsSkeleton count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadGoals} />
      ) : (goals?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Turn any skill into a step-by-step plan."
          action={
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" aria-hidden /> Create your first goal
            </Button>
          }
        />
      ) : (
        <div className={cn('grid gap-4', progressBySkill && progressBySkill.length > 0 ? 'xl:grid-cols-2' : '')}>
          <AnimatePresence initial={false}>
            {goals!.map((goal) => {
              const pct = goalPct(goal)
              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  className="lf-hover-lift rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    {editingId === goal.id ? (
                      <Input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveTitle(goal)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(goal)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        aria-label="Goal title"
                        className="h-9"
                        maxLength={120}
                      />
                    ) : (
                      <h3 className="min-w-0 flex-1 break-words text-sm font-bold leading-snug">{goal.title}</h3>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      {editingId !== goal.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label={`Rename ${goal.title}`}
                          onClick={() => { setEditingId(goal.id); setEditTitle(goal.title) }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-9" aria-label={`More actions for ${goal.title}`}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(goal)}>
                            <Trash2 className="size-4" /> Delete goal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {goal.skill && (
                      <SkillTag
                        size="sm"
                        skill={{
                          id: goal.skill.id,
                          skillId: goal.skill.id,
                          name: goal.skill.name,
                          category: '',
                          type: 'LEARN',
                          level: '',
                        }}
                      />
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {goal.tasks.filter((t) => t.done).length}/{goal.tasks.length} tasks
                    </span>
                  </div>

                  <div className="mt-3">
                    <Progress value={pct} className="h-2" aria-label={`${goal.title} progress`} />
                    <p className="mt-1 text-right text-[11px] font-semibold text-muted-foreground">{pct}%</p>
                  </div>

                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto lf-scroll pr-1">
                    {goal.tasks.map((task) => (
                      <li key={task.id} className="group flex min-h-11 items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/[0.05]">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={task.done}
                          aria-label={`Mark "${task.title}" as ${task.done ? 'not done' : 'done'}`}
                          onClick={() => toggleTask(goal, task, !task.done)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {task.done ? (
                            <CheckCircle2 className="size-5 text-foreground" aria-hidden />
                          ) : (
                            <Circle className="size-5 text-muted-foreground" aria-hidden />
                          )}
                        </button>
                        <span className={cn('min-w-0 flex-1 break-words text-sm', task.done && 'text-muted-foreground line-through')}>
                          {task.title}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove task "${task.title}"`}
                          className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                          disabled={busyId === goal.id}
                          onClick={() => removeTask(goal, task.id)}
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={taskDrafts[goal.id] ?? ''}
                      onChange={(e) => setTaskDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(goal) } }}
                      placeholder="Add a task and press Enter…"
                      aria-label={`Add task to ${goal.title}`}
                      className="h-9 flex-1"
                      maxLength={140}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() => addTask(goal)}
                      disabled={busyId === goal.id || !(taskDrafts[goal.id] ?? '').trim()}
                      aria-label={`Confirm add task to ${goal.title}`}
                    >
                      {busyId === goal.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Learning Goals & Progress"
        subtitle="Turn skills into step-by-step plans and watch your progress add up."
        actions={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New goal
          </Button>
        }
      />

      {/* Overall progress strip */}
      <div className="lf-glass mb-6 rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-foreground" aria-hidden /> Overall completion
          </p>
          <span className="text-xl font-bold">{overall}%</span>
        </div>
        <Progress value={overall} className="h-2.5" aria-label="Overall goal completion" />
        <p className="mt-2 text-xs text-muted-foreground">
          {goals && goals.length > 0
            ? `Average progress across ${goals.length} goal${goals.length > 1 ? 's' : ''}.`
            : 'Create a goal to start tracking your progress.'}
        </p>
      </div>

      {progressBySkill && progressBySkill.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {goalsList(true)}
          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ListChecks className="size-4 text-foreground" aria-hidden /> Progress by skill
            </h2>
            <div className="mt-4 max-h-96 space-y-4 overflow-y-auto lf-scroll pr-1">
              {progressBySkill.map((p) => (
                <div key={p.skill}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{p.skill}</span>
                    <span className="shrink-0 font-semibold text-muted-foreground">{p.percent}%</span>
                  </div>
                  <Progress value={p.percent} className="h-2" aria-label={`${p.skill} progress`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        goalsList(false)
      )}

      {/* ── Create goal dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto lf-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a learning goal</DialogTitle>
            <DialogDescription>
              e.g. &ldquo;Learn Python in 30 Days&rdquo; — then break it into small, doable tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="g-title">Goal title *</Label>
              <Input
                id="g-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Learn Python in 30 Days"
                maxLength={120}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createGoal() } }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="g-skill">Related skill (optional)</Label>
              <Select value={newSkillId} onValueChange={setNewSkillId}>
                <SelectTrigger id="g-skill" className="w-full" aria-label="Related skill">
                  <SelectValue placeholder={skillsLoading ? 'Loading skills…' : 'No specific skill'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={NO_SKILL}>No specific skill</SelectItem>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="g-task">Tasks * ({newTasks.length} added)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="g-task"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addNewTaskChip() }
                  }}
                  placeholder="Type a step and press Enter"
                  maxLength={140}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={addNewTaskChip}
                  disabled={!newTaskInput.trim()}
                  aria-label="Add task to goal"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {newTasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {newTasks.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-2.5 pr-1 text-xs font-medium"
                    >
                      {t}
                      <button
                        type="button"
                        aria-label={`Remove task "${t}"`}
                        className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                        onClick={() => setNewTasks((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={createGoal} disabled={creating || !newTitle.trim()} className="gap-1.5">
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" aria-hidden />}
              {creating ? 'Creating…' : 'Create goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete goal confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and its {deleteTarget?.tasks.length ?? 0} task
              {(deleteTarget?.tasks.length ?? 0) === 1 ? '' : 's'} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleteTarget?.id}>Keep goal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busyId === deleteTarget?.id}
              onClick={(e) => { e.preventDefault(); deleteGoal() }}
            >
              {busyId === deleteTarget?.id ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
