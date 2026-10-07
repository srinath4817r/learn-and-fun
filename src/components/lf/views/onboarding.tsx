'use client'

// ─── Learn & Fun — 5-step onboarding wizard ───
import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, BookOpen, Check, ChevronLeft, GraduationCap, HeartHandshake,
  Loader2, PartyPopper, Search, Sparkles, Trophy,
} from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AvailabilityChips, ErrorState, SkillTag } from '@/components/lf/shared'
import { DAYS, DAY_LABELS } from '@/lib/lf/utils'
import { LEARN_LEVELS, LEVEL_LABELS, TEACH_LEVELS } from '@/lib/lf/initial-skills'
import type { Availability, MeDTO, SkillCatalogCategory, SkillType, UserSkillDTO } from '@/lib/lf/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STEP_TITLES = ['', 'Welcome', 'Learning goals', 'Teaching skills', 'Availability', 'Review']
const YEARS = ['1', '2', '3', '4', 'Postgraduate']

interface PickedSkill {
  skillId: string
  name: string
  category: string
  level: string
}

// Light, deterministic confetti burst for the success screen
const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2
  const dist = 90 + (i % 5) * 28
  const colors = ['#ffffff', '#e2e2e2', '#c9c9c9', '#a6a6a6', '#8a8a8a']
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist - 70,
    rotate: (i % 2 ? 1 : -1) * (120 + i * 20),
    color: colors[i % colors.length],
    size: 6 + (i % 3) * 3,
    delay: i * 0.03,
  }
})

function toTag(s: PickedSkill, type: SkillType): UserSkillDTO {
  return { id: s.skillId, skillId: s.skillId, name: s.name, category: s.category, type, level: s.level }
}

export function OnboardingView() {
  const user = useLF((s) => s.user)
  const setUser = useLF((s) => s.setUser)
  const setView = useLF((s) => s.setView)

  const [step, setStep] = React.useState(1)
  const [catalog, setCatalog] = React.useState<SkillCatalogCategory[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [cat, setCat] = React.useState(0)
  const [query, setQuery] = React.useState('')
  const [pending, setPending] = React.useState<{ id: string; name: string } | null>(null)
  const [learn, setLearn] = React.useState<PickedSkill[]>([])
  const [teach, setTeach] = React.useState<PickedSkill[]>([])
  const [availability, setAvailability] = React.useState<Availability[]>([])
  const [profile, setProfile] = React.useState({ college: '', department: '', year: '' })
  const [profilePrefilled, setProfilePrefilled] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const loadSkills = React.useCallback(async () => {
    setStatus('loading')
    try {
      const res = await api.get<{ categories: SkillCatalogCategory[] }>('/api/skills')
      setCatalog(res.categories)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  React.useEffect(() => {
    void loadSkills()
  }, [loadSkills])

  // Prefill review step + availability from the freshly registered user
  React.useEffect(() => {
    if (user && !profilePrefilled) {
      setProfile({ college: user.college, department: user.department, year: user.year })
      setAvailability(user.availability.map((a) => ({ ...a })))
      setProfilePrefilled(true)
    }
  }, [user, profilePrefilled])

  const firstName = user ? user.name.split(' ')[0] : 'there'
  const q = query.trim().toLowerCase()
  const isLearnStep = step === 2
  const levels = isLearnStep ? LEARN_LEVELS : TEACH_LEVELS
  const picked = isLearnStep ? learn : teach
  const badSlot = availability.some((a) => !a.from || !a.to || a.from >= a.to)

  const visibleSkills: { id: string; name: string; category: string }[] = q
    ? catalog
        .flatMap((c) => c.skills.map((s) => ({ id: s.id, name: s.name, category: c.name })))
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 12)
    : (catalog[cat]?.skills ?? []).map((s) => ({ id: s.id, name: s.name, category: catalog[cat]?.name ?? '' }))

  function confirmLevel(level: string) {
    if (!pending) return
    const list = isLearnStep ? learn : teach
    const setter = isLearnStep ? setLearn : setTeach
    const category = catalog.find((c) => c.skills.some((s) => s.id === pending.id))?.name ?? ''
    const existing = list.find((s) => s.skillId === pending.id)
    if (existing) {
      setter(list.map((s) => (s.skillId === pending.id ? { ...s, level } : s)))
    } else {
      setter([...list, { skillId: pending.id, name: pending.name, category, level }])
    }
    setPending(null)
  }

  function removeSkill(skillId: string) {
    if (isLearnStep) setLearn((list) => list.filter((s) => s.skillId !== skillId))
    else setTeach((list) => list.filter((s) => s.skillId !== skillId))
  }

  function toggleDay(d: string) {
    setAvailability((prev) =>
      prev.some((a) => a.day === d)
        ? prev.filter((a) => a.day !== d)
        : [...prev, { day: d, from: '18:00', to: '20:00' }],
    )
  }

  function setSlot(d: string, key: 'from' | 'to', value: string) {
    setAvailability((prev) => prev.map((a) => (a.day === d ? { ...a, [key]: value } : a)))
  }

  function next() {
    if (step === 2 && learn.length === 0) {
      toast.info('Pick at least one skill you want to learn')
      return
    }
    if (step === 4 && badSlot) {
      toast.info('Fix the time ranges before continuing')
      return
    }
    setPending(null)
    setStep((s) => Math.min(5, s + 1))
  }

  function back() {
    setPending(null)
    setStep((s) => Math.max(1, s - 1))
  }

  async function finish() {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await api.post<{ user: MeDTO }>('/api/onboarding', {
        learnSkills: learn.map((s) => ({ skillId: s.skillId, level: s.level })),
        teachSkills: teach.map((s) => ({ skillId: s.skillId, level: s.level })),
        availability: availability.map(({ day, from, to }) => ({ day, from, to })),
      })
      let final = res.user
      // Persist any campus-detail edits made during review
      if (user) {
        const patch: Record<string, string> = {}
        if (profile.college.trim() && profile.college.trim() !== user.college) patch.college = profile.college.trim()
        if (profile.department.trim() && profile.department.trim() !== user.department) patch.department = profile.department.trim()
        if (profile.year && profile.year !== user.year) patch.year = profile.year
        if (Object.keys(patch).length > 0) {
          try {
            const p = await api.patch<{ user: MeDTO }>('/api/profile', patch)
            final = p.user
          } catch {
            // Non-fatal — profile details can be updated later from the profile view
          }
        }
      }
      setUser(final)
      setDone(true)
      toast.success('Profile saved!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Logged-out guard
  if (!user) {
    return (
      <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-12">
        <div className="lf-glass max-w-md rounded-3xl p-8 text-center shadow-xl">
          <p className="text-lg font-bold">Almost there!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an account to set up your learning profile.
          </p>
          <Button onClick={() => setView('login')} className="mt-5 min-h-11 rounded-full px-6 font-semibold">
            Log in
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl">
        {/* Progress header */}
        {!done && (
          <div className="mb-6" aria-hidden={false}>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span aria-current="step">Step {step} of 5</span>
              <span className="hidden sm:inline">{STEP_TITLES[step]}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-label={`Onboarding progress: step ${step} of 5`}
            >
              <motion.div
                className="h-full rounded-full bg-foreground"
                animate={{ width: `${(step / 5) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <div className="lf-glass-strong rounded-3xl p-6 shadow-xl sm:p-8">
          <AnimatePresence mode="wait">
            {done ? (
              // ── Success state with light confetti ──
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative py-8 text-center"
              >
                <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center" aria-hidden>
                  {CONFETTI.map((c, i) => (
                    <motion.span
                      key={i}
                      className="absolute rounded-[2px]"
                      style={{ backgroundColor: c.color, width: c.size, height: c.size * 0.55 }}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                      animate={{ opacity: 0, x: c.x, y: c.y, rotate: c.rotate, scale: 0.5 }}
                      transition={{ duration: 1.6, delay: c.delay, ease: 'easeOut' }}
                    />
                  ))}
                </div>
                <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.08] backdrop-blur-md">
                  <PartyPopper className="size-10 text-foreground" aria-hidden />
                </div>
                <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Your learning profile is ready!
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  You earned your first badge and +10 XP. Let&apos;s find your first match.
                </p>
                <Button
                  onClick={() => setView('dashboard')}
                  className="mt-6 min-h-11 rounded-full px-8 text-base font-semibold shadow-lg shadow-white/10"
                >
                  Go to my dashboard
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -48 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {/* ── STEP 1 · Welcome ── */}
                {step === 1 && (
                  <div className="text-center">
                    <div
                      className="lf-brand-gradient mx-auto flex size-20 items-center justify-center rounded-3xl text-black shadow-lg shadow-white/10"
                      aria-hidden
                    >
                      <GraduationCap className="size-10" />
                    </div>
                    <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                      Welcome to Learn &amp; Fun, {firstName}!
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Let&apos;s build your learning profile — it takes about a minute.
                    </p>
                    <ul className="mt-6 space-y-2.5 text-left">
                      {[
                        { icon: BookOpen, text: 'Pick the skills you want to learn — and your comfort level' },
                        { icon: GraduationCap, text: 'Share what you already know (optional, but powerful)' },
                        { icon: HeartHandshake, text: 'Get matched with students whose skills complement yours' },
                        { icon: Trophy, text: 'Earn XP and badges from real sessions and reviews' },
                      ].map((row) => {
                        const Icon = row.icon
                        return (
                          <li key={row.text} className="flex items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.08] text-foreground">
                              <Icon className="size-5" aria-hidden />
                            </span>
                            <span className="text-sm">{row.text}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* ── STEPS 2 & 3 · Skill picker ── */}
                {(step === 2 || step === 3) && (
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">
                      {isLearnStep ? 'What do you want to learn?' : 'What can you teach?'}
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {isLearnStep
                        ? 'Pick at least one skill — you can add more anytime.'
                        : 'Optional — sharing what you know doubles your matches.'}
                    </p>

                    {status === 'loading' && (
                      <div className="mt-8 flex justify-center gap-1.5" role="status" aria-label="Loading skills">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="size-2.5 animate-pulse rounded-full bg-foreground/40"
                            style={{ animationDelay: `${i * 0.18}s` }}
                          />
                        ))}
                      </div>
                    )}

                    {status === 'error' && (
                      <div className="mt-6">
                        <ErrorState message="We couldn't load the skill catalog." onRetry={() => void loadSkills()} />
                      </div>
                    )}

                    {status === 'ready' && (
                      <>
                        <div className="relative mt-5">
                          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                          <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search skills…"
                            aria-label="Search skills"
                            className="h-11 rounded-xl pl-10"
                          />
                        </div>

                        {!q && (
                          <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Skill categories">
                            {catalog.map((c, i) => (
                              <button
                                key={c.id}
                                type="button"
                                role="tab"
                                aria-selected={i === cat}
                                onClick={() => {
                                  setCat(i)
                                  setPending(null)
                                }}
                                className={cn(
                                  'min-h-9 rounded-full border px-3.5 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-sm',
                                  i === cat
                                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm shadow-white/10'
                                    : 'border-white/[0.12] bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground',
                                )}
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="lf-scroll mt-4 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                          {visibleSkills.map((s) => {
                            const added = picked.some((p) => p.skillId === s.id)
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setPending({ id: s.id, name: s.name })}
                                aria-pressed={added}
                                className={cn(
                                  'flex min-h-11 items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-left text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
                                  added
                                    ? 'border-white/[0.9] bg-primary font-medium text-primary-foreground'
                                    : 'border-white/[0.12] bg-white/[0.05] hover:border-white/[0.25] hover:bg-white/[0.1]',
                                )}
                              >
                                <span className="truncate">{s.name}</span>
                                {added && <Check className="size-4 shrink-0" aria-hidden />}
                              </button>
                            )
                          })}
                          {visibleSkills.length === 0 && (
                            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                              No skills found for “{query}”.
                            </p>
                          )}
                        </div>

                        <AnimatePresence>
                          {pending && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="mt-4 rounded-xl border border-white/[0.14] bg-white/[0.05] p-3 backdrop-blur-md"
                            >
                              <p className="text-sm font-semibold">
                                Choose your level for <span className="lf-brand-text">{pending.name}</span>
                              </p>
                              <div className="mt-2.5 flex gap-2">
                                {levels.map((lv) => (
                                  <Button
                                    key={lv}
                                    variant="outline"
                                    onClick={() => confirmLevel(lv)}
                                    className="min-h-11 flex-1 rounded-lg text-xs sm:text-sm"
                                  >
                                    {LEVEL_LABELS[lv] ?? lv}
                                  </Button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {picked.length > 0 && (
                          <div className="mt-5">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {isLearnStep ? 'You want to learn' : 'You can teach'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {picked.map((s) => (
                                <SkillTag
                                  key={s.skillId}
                                  skill={toTag(s, isLearnStep ? 'LEARN' : 'TEACH')}
                                  onRemove={() => removeSkill(s.skillId)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {step === 3 && picked.length === 0 && (
                          <p className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-center text-sm text-muted-foreground">
                            <Sparkles className="size-4 shrink-0" aria-hidden />
                            <span>No teaching skills yet — no worries, you can always add them later.</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── STEP 4 · Availability ── */}
                {step === 4 && (
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">When are you available?</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Toggle the days you can meet. We use this to find overlapping schedules.
                    </p>

                    <div className="mt-5 space-y-2.5">
                      {DAYS.map((d) => {
                        const slot = availability.find((a) => a.day === d)
                        const on = !!slot
                        return (
                          <div
                            key={d}
                            className={cn(
                              'flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors',
                              on ? 'border-white/[0.2] bg-white/[0.08]' : 'border-white/[0.1] bg-white/[0.03]',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleDay(d)}
                              aria-pressed={on}
                              aria-label={`${DAY_LABELS[d]} — ${on ? 'available' : 'not available'}`}
                              className={cn(
                                'min-h-11 min-w-[64px] rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                                on
                                  ? 'border-transparent bg-primary text-primary-foreground'
                                  : 'border-white/[0.12] bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground',
                              )}
                            >
                              {DAY_LABELS[d].slice(0, 3)}
                            </button>
                            {on && slot ? (
                              <div className="flex flex-1 items-center gap-2">
                                <Input
                                  type="time"
                                  value={slot.from}
                                  onChange={(e) => setSlot(d, 'from', e.target.value)}
                                  aria-label={`${DAY_LABELS[d]} available from`}
                                  className="h-11 rounded-lg"
                                />
                                <span className="text-xs text-muted-foreground" aria-hidden>to</span>
                                <Input
                                  type="time"
                                  value={slot.to}
                                  onChange={(e) => setSlot(d, 'to', e.target.value)}
                                  aria-label={`${DAY_LABELS[d]} available until`}
                                  className="h-11 rounded-lg"
                                />
                              </div>
                            ) : (
                              <span className="flex-1 text-sm text-muted-foreground">Unavailable</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {badSlot && (
                      <p className="mt-3 text-xs font-medium text-destructive">
                        End time must be after start time on every selected day.
                      </p>
                    )}

                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                      <AvailabilityChips availability={availability} />
                    </div>
                  </div>
                )}

                {/* ── STEP 5 · Review ── */}
                {step === 5 && (
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Finish your profile</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Review everything — you can edit these details anytime from your profile.
                    </p>

                    <div className="mt-5 space-y-4">
                      <section aria-label="Skills summary" className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You want to learn</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {learn.length > 0 ? (
                            learn.map((s) => <SkillTag key={s.skillId} skill={toTag(s, 'LEARN')} />)
                          ) : (
                            <p className="text-xs text-muted-foreground">None selected</p>
                          )}
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">You can teach</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {teach.length > 0 ? (
                            teach.map((s) => <SkillTag key={s.skillId} skill={toTag(s, 'TEACH')} />)
                          ) : (
                            <p className="text-xs text-muted-foreground">None selected</p>
                          )}
                        </div>
                      </section>

                      <section aria-label="Availability summary" className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Availability</p>
                        <div className="mt-2">
                          <AvailabilityChips availability={availability} />
                        </div>
                      </section>

                      <section aria-label="Campus details" className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campus details</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label htmlFor="ob-college">College</Label>
                            <Input
                              id="ob-college"
                              value={profile.college}
                              onChange={(e) => setProfile((p) => ({ ...p, college: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="ob-department">Department</Label>
                            <Input
                              id="ob-department"
                              value={profile.department}
                              onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label htmlFor="ob-year">Year</Label>
                            <Select
                              value={profile.year}
                              onValueChange={(v) => setProfile((p) => ({ ...p, year: v }))}
                            >
                              <SelectTrigger id="ob-year" className="h-10 w-full rounded-lg">
                                <SelectValue placeholder="Select your year" />
                              </SelectTrigger>
                              <SelectContent>
                                {YEARS.map((y) => (
                                  <SelectItem key={y} value={y}>
                                    {y === 'Postgraduate' ? 'Postgraduate' : `Year ${y}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wizard navigation */}
          {!done && (
            <div className="mt-6 flex items-center justify-between gap-3">
              {step > 1 ? (
                <Button variant="ghost" onClick={back} className="min-h-11 rounded-full px-5">
                  <ChevronLeft className="size-4" aria-hidden /> Back
                </Button>
              ) : (
                <span aria-hidden />
              )}
              {step < 5 ? (
                <Button onClick={next} className="min-h-11 rounded-full px-6 font-semibold">
                  Next <ArrowRight className="size-4" aria-hidden />
                </Button>
              ) : (
                <Button
                  onClick={() => void finish()}
                  disabled={submitting}
                  className="min-h-11 rounded-full px-6 font-semibold shadow-lg shadow-white/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
                    </>
                  ) : (
                    <>
                      <PartyPopper className="size-4" aria-hidden /> Finish
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
