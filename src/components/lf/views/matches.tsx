'use client'

// ─── Learn & Fun — Matches: top matches with explanations (Mono Glass) ───
import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Bookmark, BookOpen, GraduationCap, HeartHandshake, MessageCircle } from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LfAvatar, MatchRing, MatchReasons, EmptyState, ErrorState, CardSkeleton, SkillTag, PageHeader, cacheUserName,
} from '@/components/lf/shared'
import type { UserCardDTO } from '@/lib/lf/types'

function scoreLabel(score: number) {
  return score >= 80 ? 'Strong match' : score >= 50 ? 'Great match' : 'Good match'
}

export function MatchesView() {
  const setView = useLF((s) => s.setView)
  const openConnect = useLF((s) => s.openConnect)
  const reduce = useReducedMotion()

  const fadeUp = (i = 0) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(i, 6) * 0.06, duration: 0.28, ease: 'easeOut' as const },
  })

  const [matches, setMatches] = React.useState<UserCardDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [retryTick, setRetryTick] = React.useState(0)
  const [savedMap, setSavedMap] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<{ matches: UserCardDTO[] }>('/api/matches')
        if (cancelled) return
        setMatches(res.matches)
        setSavedMap(Object.fromEntries(res.matches.map((m) => [m.id, !!m.saved])))
        res.matches.forEach((m) => cacheUserName(m.id, m.name))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your matches')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [retryTick])

  async function toggleSave(u: UserCardDTO) {
    const next = !savedMap[u.id]
    setSavedMap((prev) => ({ ...prev, [u.id]: next }))
    try {
      await api.post('/api/saved', { userId: u.id })
      toast.success(next ? 'Added to your saved list' : 'Removed from your saved list')
    } catch {
      setSavedMap((prev) => ({ ...prev, [u.id]: !next }))
      toast.error('Could not update your saved list')
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <PageHeader
        title="Your Matches"
        subtitle="Ranked by our reciprocal skill-matching algorithm — see exactly why you match."
      />

      {error ? (
        <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
      ) : loading ? (
        <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Loading matches">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : matches && matches.length === 0 ? (
        <div className="mx-auto max-w-3xl">
          <EmptyState
            icon={HeartHandshake}
            title="No matches yet"
            description="Add the skills you want to learn and we'll find students who can teach you."
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => setView('profile')}>Update my skills</Button>
                <Button size="sm" variant="outline" onClick={() => setView('discover')}>Discover students</Button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {matches?.map((u, i) => {
            const score = u.matchScore ?? 0
            return (
              <motion.div {...fadeUp(i)} key={u.id}>
                <article className="lf-glass lf-hover-lift rounded-2xl p-5 sm:p-6">
                  {/* Identity */}
                  <div className="flex items-start gap-4">
                    <LfAvatar name={u.name} src={u.profileImage} className="size-12" />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setView('profile', { profileUserId: u.id })}
                        aria-label={`View ${u.name}'s profile`}
                        className="truncate text-base font-semibold tracking-tight hover:underline"
                      >
                        {u.name}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">{u.department} · {u.year}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={savedMap[u.id] ? 'Remove from saved' : 'Save student'}
                      onClick={() => void toggleSave(u)}
                      className="rounded-full p-2 transition hover:bg-white/[0.08]"
                    >
                      <Bookmark
                        className={cn('size-4', savedMap[u.id] ? 'fill-foreground text-foreground' : 'text-muted-foreground')}
                        aria-hidden
                      />
                    </button>
                  </div>

                  {/* Match score */}
                  <div className="mt-5 flex items-center gap-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4">
                    <MatchRing score={score} size={96} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums">{score}%</span>
                        <span className="text-sm font-medium text-muted-foreground">Match</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{scoreLabel(score)}</p>
                    </div>
                  </div>

                  {/* Skill exchange */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <GraduationCap className="size-3" aria-hidden /> Can teach you
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {u.teachSkills.slice(0, 5).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
                        {u.teachSkills.length === 0 && <span className="text-[11px] text-muted-foreground">Nothing listed yet</span>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <BookOpen className="size-3" aria-hidden /> Wants from you
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {u.learnSkills.slice(0, 5).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
                        {u.learnSkills.length === 0 && <span className="text-[11px] text-muted-foreground">Nothing listed yet</span>}
                      </div>
                    </div>
                  </div>

                  {/* Why you matched */}
                  <div className="mt-4">
                    <MatchReasons reasons={u.matchReasons ?? []} />
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.1] pt-4">
                    {(u.connectionStatus ?? 'none') === 'accepted' ? (
                      <Button size="sm" variant="outline" onClick={() => setView('messages', { chatPreselectUserId: u.id })}>
                        <MessageCircle className="size-4" aria-hidden /> Message
                      </Button>
                    ) : (u.connectionStatus ?? 'none') === 'pending_sent' ? (
                      <Button size="sm" variant="secondary" disabled>Request sent</Button>
                    ) : (u.connectionStatus ?? 'none') === 'pending_received' ? (
                      <Button size="sm" variant="outline" onClick={() => setView('connections')}>Respond</Button>
                    ) : (
                      <Button size="sm" onClick={() => openConnect(u.id)}>Connect</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setView('profile', { profileUserId: u.id })}>
                      View Profile
                    </Button>
                  </div>
                </article>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
