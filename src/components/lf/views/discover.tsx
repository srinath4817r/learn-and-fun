'use client'

// ─── Learn & Fun — Discover: find students, skills and matches (Mono Glass) ───
import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Bookmark, BookOpen, GraduationCap, Loader2, Search, SearchX, SlidersHorizontal, Zap,
} from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  LfAvatar, MatchRing, EmptyState, ErrorState, CardsSkeleton, SkillTag, Stars, PageHeader, cacheUserName,
} from '@/components/lf/shared'
import type { SkillCatalogCategory, UserCardDTO } from '@/lib/lf/types'
import { DAYS, DAY_LABELS } from '@/lib/lf/utils'

const YEAR_OPTIONS = [
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
  { value: 'PG', label: 'Postgraduate' },
]
const LEVEL_OPTIONS = [
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'EXPERT', label: 'Expert' },
]

function FilterSelect({ label, value, onChange, options, className }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn('h-9 w-[150px] rounded-full border-white/[0.12] bg-white/[0.05] px-4 text-xs backdrop-blur-md', className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StatusButton({ user }: { user: UserCardDTO }) {
  const openConnect = useLF((s) => s.openConnect)
  const setView = useLF((s) => s.setView)
  const status = user.connectionStatus ?? 'none'
  if (status === 'pending_sent')
    return <Button size="sm" variant="secondary" disabled>Request sent</Button>
  if (status === 'pending_received')
    return <Button size="sm" variant="outline" onClick={() => setView('connections')}>Respond</Button>
  if (status === 'accepted')
    return <Button size="sm" variant="outline" onClick={() => setView('messages', { chatPreselectUserId: user.id })}>Message</Button>
  if (status === 'rejected')
    return <Button size="sm" variant="ghost" onClick={() => openConnect(user.id)}>Connect again</Button>
  return <Button size="sm" onClick={() => openConnect(user.id)}>Connect</Button>
}

function SaveButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved' : 'Save student'}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className="rounded-full p-1.5 transition hover:bg-white/[0.08]"
    >
      <Bookmark className={cn('size-4', saved ? 'fill-foreground text-foreground' : 'text-muted-foreground')} aria-hidden />
    </button>
  )
}

function StudentCard({ u, index, onToggleSave, fadeUp }: {
  u: UserCardDTO
  index: number
  onToggleSave: (u: UserCardDTO) => void
  fadeUp: (i?: number) => object
}) {
  const setView = useLF((s) => s.setView)
  return (
    <motion.div {...fadeUp(index)}>
      <div className="lf-glass lf-hover-lift rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <LfAvatar name={u.name} src={u.profileImage} className="size-11" />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setView('profile', { profileUserId: u.id })}
              aria-label={`View ${u.name}'s profile`}
              className="truncate text-sm font-semibold tracking-tight hover:underline"
            >
              {u.name}
            </button>
            <p className="truncate text-xs text-muted-foreground">{u.department} · {u.year}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <SaveButton saved={!!u.saved} onToggle={() => onToggleSave(u)} />
            {(u.matchScore ?? 0) > 0 && (
              <span
                className="rounded-full border border-white/[0.16] bg-white/[0.08] px-2 py-0.5 text-[11px] font-bold tabular-nums"
                title={`${u.matchScore}% match`}
              >
                {u.matchScore}%
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <div>
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <GraduationCap className="size-3" aria-hidden /> Can teach
            </p>
            <div className="flex flex-wrap gap-1">
              {u.teachSkills.slice(0, 4).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
              {u.teachSkills.length === 0 && <span className="text-[11px] text-muted-foreground">No teaching skills listed</span>}
            </div>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="size-3" aria-hidden /> Wants to learn
            </p>
            <div className="flex flex-wrap gap-1">
              {u.learnSkills.slice(0, 3).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
              {u.learnSkills.length === 0 && <span className="text-[11px] text-muted-foreground">No learning skills listed</span>}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.1] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1" aria-label={`Rated ${u.rating} out of 5`}>
              <Stars rating={u.rating} />
              <span className="text-xs font-medium">{u.rating > 0 ? u.rating.toFixed(1) : 'New'}</span>
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.14] bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold">
              <Zap className="size-3" aria-hidden /> {u.xp} XP
            </span>
          </div>
          <StatusButton user={u} />
        </div>
      </div>
    </motion.div>
  )
}

function MatchMiniCard({ u, index, onToggleSave, fadeUp }: {
  u: UserCardDTO
  index: number
  onToggleSave: (u: UserCardDTO) => void
  fadeUp: (i?: number) => object
}) {
  const setView = useLF((s) => s.setView)
  return (
    <motion.div {...fadeUp(index)}>
      <div className="lf-glass lf-hover-lift flex items-center gap-3 rounded-2xl p-4">
        <MatchRing score={u.matchScore ?? 0} size={56} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setView('profile', { profileUserId: u.id })}
            aria-label={`View ${u.name}'s profile`}
            className="truncate text-sm font-semibold tracking-tight hover:underline"
          >
            {u.name}
          </button>
          <p className="truncate text-[11px] text-muted-foreground">{u.department} · {u.year}</p>
          {u.matchReasons?.[0] && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{u.matchReasons[0]}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <StatusButton user={u} />
            <SaveButton saved={!!u.saved} onToggle={() => onToggleSave(u)} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function DiscoverView() {
  const setView = useLF((s) => s.setView)
  const reduce = useReducedMotion()

  const fadeUp = (i = 0): {
    initial: { opacity: number; y: number }
    animate: { opacity: number; y: number }
    transition: { delay: number; duration: number; ease: 'easeOut' }
  } => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(i, 8) * 0.05, duration: 0.28, ease: 'easeOut' },
  })

  // search + filters
  const [q, setQ] = React.useState('')
  const [debouncedQ, setDebouncedQ] = React.useState('')
  const [category, setCategory] = React.useState('all')
  const [skill, setSkill] = React.useState('all')
  const [department, setDepartment] = React.useState('')
  const [year, setYear] = React.useState('all')
  const [level, setLevel] = React.useState('all')
  const [minRating, setMinRating] = React.useState('all')
  const [availabilityDay, setAvailabilityDay] = React.useState('all')
  const [sort, setSort] = React.useState('match')
  const [mobileFilters, setMobileFilters] = React.useState(false)
  const [tab, setTab] = React.useState('students')
  const [visible, setVisible] = React.useState(30)
  const [retryTick, setRetryTick] = React.useState(0)

  // data
  const [users, setUsers] = React.useState<UserCardDTO[] | null>(null)
  const [usersLoading, setUsersLoading] = React.useState(true)
  const [usersError, setUsersError] = React.useState<string | null>(null)
  const [categories, setCategories] = React.useState<SkillCatalogCategory[] | null>(null)
  const [categoriesError, setCategoriesError] = React.useState<string | null>(null)
  const [allUsers, setAllUsers] = React.useState<UserCardDTO[] | null>(null)
  const [matches, setMatches] = React.useState<UserCardDTO[] | null>(null)
  const [matchesError, setMatchesError] = React.useState<string | null>(null)

  // debounce the search box
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  // latest-request guard
  const fetchSeq = React.useRef(0)

  const fetchUsers = React.useCallback(async () => {
    const seq = ++fetchSeq.current
    setUsersLoading(true)
    setUsersError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim())
      if (category !== 'all') params.set('category', category)
      if (skill !== 'all') params.set('skill', skill)
      if (department.trim()) params.set('department', department.trim())
      if (year !== 'all') params.set('year', year)
      if (level !== 'all') params.set('level', level)
      if (minRating !== 'all') params.set('minRating', minRating)
      if (availabilityDay !== 'all') params.set('availabilityDay', availabilityDay)
      if (sort !== 'match') params.set('sort', sort)
      const qs = params.toString()
      const res = await api.get<{ users: UserCardDTO[] }>(`/api/users${qs ? `?${qs}` : ''}`)
      if (fetchSeq.current !== seq) return
      setUsers(res.users)
      setVisible(30)
    } catch (e) {
      if (fetchSeq.current !== seq) return
      setUsersError(e instanceof Error ? e.message : 'Could not load students')
    } finally {
      if (fetchSeq.current === seq) setUsersLoading(false)
    }
  }, [debouncedQ, category, skill, department, year, level, minRating, availabilityDay, sort])

  React.useEffect(() => {
    void fetchUsers()
  }, [fetchUsers, retryTick])

  // skill catalog (filters + skills tab)
  React.useEffect(() => {
    let cancelled = false
    api.get<{ categories: SkillCatalogCategory[] }>('/api/skills')
      .then((res) => { if (!cancelled) setCategories(res.categories) })
      .catch((e) => { if (!cancelled) setCategoriesError(e instanceof Error ? e.message : 'Could not load skills') })
    return () => { cancelled = true }
  }, [retryTick])

  // unfiltered list for skill popularity counts
  React.useEffect(() => {
    let cancelled = false
    api.get<{ users: UserCardDTO[] }>('/api/users')
      .then((res) => { if (!cancelled) setAllUsers(res.users) })
      .catch(() => { /* counts are optional — omit on failure */ })
    return () => { cancelled = true }
  }, [retryTick])

  // matches tab data
  React.useEffect(() => {
    let cancelled = false
    api.get<{ matches: UserCardDTO[] }>('/api/matches')
      .then((res) => { if (!cancelled) setMatches(res.matches) })
      .catch((e) => { if (!cancelled) setMatchesError(e instanceof Error ? e.message : 'Could not load matches') })
    return () => { cancelled = true }
  }, [retryTick])

  // cache names for the connect dialog
  React.useEffect(() => {
    users?.forEach((u) => cacheUserName(u.id, u.name))
  }, [users])
  React.useEffect(() => {
    matches?.forEach((u) => cacheUserName(u.id, u.name))
  }, [matches])

  async function toggleSave(u: UserCardDTO) {
    const next = !u.saved
    setUsers((prev) => prev ? prev.map((x) => x.id === u.id ? { ...x, saved: next } : x) : prev)
    setMatches((prev) => prev ? prev.map((x) => x.id === u.id ? { ...x, saved: next } : x) : prev)
    try {
      await api.post('/api/saved', { userId: u.id })
      toast.success(next ? 'Added to your saved list' : 'Removed from your saved list')
    } catch {
      setUsers((prev) => prev ? prev.map((x) => x.id === u.id ? { ...x, saved: !next } : x) : prev)
      setMatches((prev) => prev ? prev.map((x) => x.id === u.id ? { ...x, saved: !next } : x) : prev)
      toast.error('Could not update your saved list')
    }
  }

  function clearFilters() {
    setQ(''); setCategory('all'); setSkill('all'); setDepartment(''); setYear('all')
    setLevel('all'); setMinRating('all'); setAvailabilityDay('all'); setSort('match')
  }

  const skillOptions = React.useMemo(() => {
    if (!categories) return []
    const cat = categories.find((c) => c.name === category)
    return cat ? cat.skills : categories.flatMap((c) => c.skills)
  }, [categories, category])

  const activeFilterCount = [
    category !== 'all', skill !== 'all', !!department.trim(), year !== 'all',
    level !== 'all', minRating !== 'all', availabilityDay !== 'all', sort !== 'match',
  ].filter(Boolean).length

  const filterFields = (
    <>
      <FilterSelect
        label="Category"
        value={category}
        onChange={(v) => { setCategory(v); setSkill('all') }}
        options={[{ value: 'all', label: 'All categories' }, ...(categories ?? []).map((c) => ({ value: c.name, label: c.name }))]}
      />
      <FilterSelect
        label="Skill"
        value={skill}
        onChange={setSkill}
        options={[{ value: 'all', label: 'All skills' }, ...skillOptions.map((s) => ({ value: s.id, label: s.name }))]}
      />
      <Input
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="Department"
        aria-label="Filter by department"
        className="h-9 w-[150px] rounded-full border-white/[0.12] bg-white/[0.05] px-4 text-xs backdrop-blur-md"
      />
      <FilterSelect
        label="Year"
        value={year}
        onChange={setYear}
        options={[{ value: 'all', label: 'Any year' }, ...YEAR_OPTIONS]}
      />
      <FilterSelect
        label="Teaching level"
        value={level}
        onChange={setLevel}
        options={[{ value: 'all', label: 'Any level' }, ...LEVEL_OPTIONS]}
      />
      <FilterSelect
        label="Min rating"
        value={minRating}
        onChange={setMinRating}
        options={[{ value: 'all', label: 'Any rating' }, { value: '4', label: '4+' }, { value: '3', label: '3+' }]}
      />
      <FilterSelect
        label="Availability day"
        value={availabilityDay}
        onChange={setAvailabilityDay}
        options={[{ value: 'all', label: 'Any day' }, ...DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] ?? d }))]}
      />
      <FilterSelect
        label="Sort by"
        value={sort}
        onChange={setSort}
        options={[
          { value: 'match', label: 'Best match' },
          { value: 'xp', label: 'Most XP' },
          { value: 'rating', label: 'Top rated' },
        ]}
      />
    </>
  )

  const visibleUsers = users?.slice(0, visible) ?? null
  const teachCount = (skillId: string) =>
    allUsers ? allUsers.filter((u) => u.teachSkills.some((ts) => ts.skillId === skillId)).length : null

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <PageHeader
        title="Find Your Learning Circle"
        subtitle="Search students, skills or interests and connect with the right people."
      />

      {/* Search */}
      <div className="lf-glass mb-5 flex h-14 items-center gap-3 rounded-full px-5 transition-colors focus-within:border-white/[0.24]">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students or skills..."
          aria-label="Search students or skills"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Filters: collapsible on mobile, always visible on desktop */}
      <div className="mb-4 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileFilters((v) => !v)} aria-expanded={mobileFilters}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <AnimatePresence initial={false}>
          {mobileFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="lf-glass mt-3 flex flex-wrap gap-2 rounded-2xl p-3">{filterFields}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mb-5 hidden flex-wrap gap-2 lg:flex">{filterFields}</div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="lf-glass mb-5 grid h-11 w-full max-w-sm grid-cols-3 rounded-full p-1">
          <TabsTrigger
            value="students"
            className="rounded-full px-3 text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground dark:data-[state=active]:bg-white dark:data-[state=active]:text-black dark:data-[state=active]:border-transparent dark:data-[state=inactive]:text-muted-foreground"
          >
            Students
          </TabsTrigger>
          <TabsTrigger
            value="skills"
            className="rounded-full px-3 text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground dark:data-[state=active]:bg-white dark:data-[state=active]:text-black dark:data-[state=active]:border-transparent dark:data-[state=inactive]:text-muted-foreground"
          >
            Skills
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            className="rounded-full px-3 text-sm data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground dark:data-[state=active]:bg-white dark:data-[state=active]:text-black dark:data-[state=active]:border-transparent dark:data-[state=inactive]:text-muted-foreground"
          >
            Matches
          </TabsTrigger>
        </TabsList>

        {/* ── Students ── */}
        <TabsContent value="students">
          {usersError ? (
            <ErrorState message={usersError} onRetry={() => setRetryTick((t) => t + 1)} />
          ) : users === null && usersLoading ? (
            <CardsSkeleton count={6} />
          ) : users && users.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No students found"
              description="Try different keywords or clear your filters to see more students."
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <>
              <div className={cn('mb-4 flex items-center gap-2 text-xs text-muted-foreground', usersLoading && 'opacity-60')}>
                {usersLoading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                {users ? `${users.length} student${users.length === 1 ? '' : 's'} found` : ''}
              </div>
              <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', usersLoading && 'opacity-60')}>
                {visibleUsers?.map((u, i) => (
                  <StudentCard key={u.id} u={u} index={i} onToggleSave={toggleSave} fadeUp={fadeUp} />
                ))}
              </div>
              {users && users.length > 30 && (
                <div className="mt-6 flex justify-center gap-2">
                  {visible < users.length && (
                    <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + 30)}>
                      Show more ({users.length - visible} more)
                    </Button>
                  )}
                  {visible > 30 && (
                    <Button variant="ghost" size="sm" onClick={() => setVisible(30)}>Show less</Button>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Skills ── */}
        <TabsContent value="skills">
          {categoriesError ? (
            <ErrorState message={categoriesError} onRetry={() => setRetryTick((t) => t + 1)} />
          ) : categories === null ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4">
                  <Skeleton className="mb-3 h-4 w-1/3" />
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-7 w-20 rounded-full" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((c, i) => (
                <motion.section {...fadeUp(i)} key={c.id} aria-label={`Skills in ${c.name}`}>
                  <div className="lf-glass lf-hover-lift rounded-2xl p-4">
                    <h3 className="mb-3 text-sm font-semibold tracking-tight">{c.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {c.skills.map((s) => {
                        const n = teachCount(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setSkill(s.id); setTab('students') }}
                            aria-label={`Filter students by ${s.name}`}
                            className="rounded-full border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs font-medium transition hover:border-white/[0.24] hover:bg-white/[0.12]"
                          >
                            {s.name}
                            {n !== null && <span className="ml-1.5 text-muted-foreground">· {n}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.section>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Matches ── */}
        <TabsContent value="matches">
          {matchesError ? (
            <ErrorState message={matchesError} onRetry={() => setRetryTick((t) => t + 1)} />
          ) : matches === null ? (
            <CardsSkeleton count={4} />
          ) : matches.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matches yet"
              description="Add skills you want to learn — we'll find students who can teach them."
              action={<Button size="sm" onClick={() => setView('profile')}>Update my skills</Button>}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {matches.slice(0, 8).map((u, i) => (
                  <MatchMiniCard key={u.id} u={u} index={i} onToggleSave={toggleSave} fadeUp={fadeUp} />
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button variant="ghost" size="sm" onClick={() => setView('matches')}>
                  See detailed matches
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
