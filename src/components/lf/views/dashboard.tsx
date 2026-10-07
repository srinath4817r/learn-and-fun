'use client'

// ─── Learn & Fun — Dashboard: personalized command center (Mono Glass) ───
import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Award, Bell, BookOpen, CalendarCheck, CalendarClock, CircleAlert,
  Globe, Megaphone, MessageCircle, Sparkles, Star, Target, Trophy, UserCheck,
  UserPlus, Users, Zap,
} from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LfAvatar, MatchRing, EmptyState, ErrorState, StatCard, XpBar, BADGE_ICONS, cacheUserName,
} from '@/components/lf/shared'
import type {
  AnnouncementDTO, ConnectionStatus, GoalDTO, LeaderboardEntryDTO, NotificationDTO,
  SessionDTO, UserCardDTO, ViewName,
} from '@/lib/lf/types'
import { formatTime, timeAgo, xpLevel } from '@/lib/lf/utils'

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  CONNECTION_REQUEST: UserPlus,
  CONNECTION_ACCEPTED: UserCheck,
  NEW_MESSAGE: MessageCircle,
  SESSION: CalendarCheck,
  REVIEW: Star,
  BADGE: Award,
  ANNOUNCEMENT: Megaphone,
}

function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  )
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <CircleAlert className="size-3.5" aria-hidden /> Couldn&apos;t load this section
      </p>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

function CardHeader({ icon: Icon, title, action }: {
  icon: React.ElementType
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06]" aria-hidden>
          <Icon className="size-3.5 text-foreground" />
        </span>
        {title}
      </h2>
      {action}
    </div>
  )
}

export function DashboardView() {
  const user = useLF((s) => s.user)
  const setView = useLF((s) => s.setView)
  const openConnect = useLF((s) => s.openConnect)
  const reduce = useReducedMotion()

  const fadeUp = (i = 0) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(i, 10) * 0.05, duration: 0.28, ease: 'easeOut' as const },
  })

  const [matches, setMatches] = React.useState<UserCardDTO[] | null>(null)
  const [sessions, setSessions] = React.useState<SessionDTO[] | null>(null)
  const [goals, setGoals] = React.useState<GoalDTO[] | null>(null)
  const [announcements, setAnnouncements] = React.useState<AnnouncementDTO[] | null>(null)
  const [leaders, setLeaders] = React.useState<LeaderboardEntryDTO[] | null>(null)
  const [notifications, setNotifications] = React.useState<NotificationDTO[] | null>(null)
  const [errs, setErrs] = React.useState({
    matches: false, sessions: false, goals: false, announcements: false, leaderboard: false, notifications: false,
  })
  const [retryTick, setRetryTick] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setMatches(null); setSessions(null); setGoals(null); setAnnouncements(null); setLeaders(null); setNotifications(null)
      const [m, s, g, a, l, n] = await Promise.allSettled([
        api.get<{ matches: UserCardDTO[] }>('/api/matches'),
        api.get<{ sessions: SessionDTO[] }>('/api/sessions'),
        api.get<{ goals: GoalDTO[] }>('/api/goals'),
        api.get<{ announcements: AnnouncementDTO[] }>('/api/announcements'),
        api.get<{ leaders: LeaderboardEntryDTO[] }>('/api/leaderboard'),
        api.get<{ notifications: NotificationDTO[]; unread: number }>('/api/notifications'),
      ])
      if (cancelled) return
      const next = { matches: false, sessions: false, goals: false, announcements: false, leaderboard: false, notifications: false }
      if (m.status === 'fulfilled') {
        setMatches(m.value.matches)
        m.value.matches.forEach((u) => cacheUserName(u.id, u.name))
      } else next.matches = true
      if (s.status === 'fulfilled') {
        setSessions(s.value.sessions)
        s.value.sessions.forEach((ses) => {
          const other = ses.myRole === 'teacher' ? ses.learner : ses.teacher
          cacheUserName(other.id, other.name)
        })
      } else next.sessions = true
      if (g.status === 'fulfilled') setGoals(g.value.goals)
      else next.goals = true
      if (a.status === 'fulfilled') setAnnouncements(a.value.announcements)
      else next.announcements = true
      if (l.status === 'fulfilled') {
        setLeaders(l.value.leaders)
        l.value.leaders.forEach((le) => cacheUserName(le.id, le.name))
      } else next.leaderboard = true
      if (n.status === 'fulfilled') setNotifications(n.value.notifications)
      else next.notifications = true
      setErrs(next)
    }
    void load()
    return () => { cancelled = true }
  }, [retryTick])

  // Per-skill progress aggregated from the user's goals
  const progressRows = React.useMemo(() => {
    if (!goals) return null
    const acc = new Map<string, { sum: number; count: number }>()
    for (const g of goals) {
      const label = g.skill?.name ?? g.title
      const cur = acc.get(label) ?? { sum: 0, count: 0 }
      cur.sum += g.progress
      cur.count += 1
      acc.set(label, cur)
    }
    return Array.from(acc.entries())
      .map(([label, { sum, count }]) => ({ label, percent: Math.round(sum / count) }))
      .sort((a, b) => b.percent - a.percent)
  }, [goals])

  if (!user) return null

  const allFailed = Object.values(errs).every(Boolean)
  const topMatch = matches && matches.length > 0 ? matches[0] : null
  const upcoming = (sessions ?? [])
    .filter((s) => s.status === 'UPCOMING')
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
  const unlockedBadges = user.badges.filter((b) => b.unlocked)
  const lockedBadges = user.badges.filter((b) => !b.unlocked)
  const myRank = leaders?.find((le) => le.id === user.id)?.rank

  const hour = new Date().getHours()
  const partOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name.split(' ')[0]

  const stats: { key: string; icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; view: ViewName }[] = [
    {
      key: 'matches', icon: Users, label: 'Your matches',
      value: matches ? matches.length : '—',
      hint: topMatch ? `Top ${topMatch.matchScore ?? 0}% · ${topMatch.name}` : 'No matches yet',
      view: 'matches',
    },
    {
      key: 'skills', icon: BookOpen, label: 'Learning skills',
      value: user.learnSkills.length,
      hint: user.teachSkills.length > 0 ? `${user.teachSkills.length} you can teach` : 'Add what you teach',
      view: 'profile',
    },
    {
      key: 'xp', icon: Zap, label: 'XP points',
      value: user.xp,
      hint: `Level ${xpLevel(user.xp).level}`,
      view: 'leaderboard',
    },
    {
      key: 'badges', icon: Award, label: 'Badges',
      value: unlockedBadges.length,
      hint: lockedBadges.length > 0 ? `${lockedBadges.length} to unlock` : 'All unlocked',
      view: 'profile',
    },
  ]

  const seeAll = (view: ViewName) => (
    <Button variant="ghost" size="sm" onClick={() => setView(view)}>
      See all <ArrowRight className="size-4" aria-hidden />
    </Button>
  )

  const connectControl = (u: UserCardDTO) => {
    const status: ConnectionStatus = u.connectionStatus ?? 'none'
    if (status === 'accepted')
      return (
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setView('messages', { chatPreselectUserId: u.id })}>
          <MessageCircle className="size-3.5" aria-hidden /> Message
        </Button>
      )
    if (status === 'pending_sent')
      return <Button size="sm" variant="secondary" disabled className="shrink-0">Request sent</Button>
    if (status === 'pending_received')
      return <Button size="sm" variant="outline" className="shrink-0" onClick={() => setView('connections')}>Respond</Button>
    return <Button size="sm" className="shrink-0" onClick={() => openConnect(u.id)}>Connect</Button>
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {allFailed ? (
        <ErrorState message="We couldn't load your dashboard. Check your connection and try again." onRetry={() => setRetryTick((t) => t + 1)} />
      ) : (
        <div className="space-y-8">
          {/* Greeting header */}
          <motion.header {...fadeUp(0)} className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="lf-brand-text text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {partOfDay}, {firstName}.
              </motion.h1>
              <p className="mt-1 text-sm text-muted-foreground">Keep learning, keep growing.</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {myRank !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Trophy className="size-3.5" aria-hidden /> Rank #{myRank}
                </span>
              )}
              <div className="w-48">
                <XpBar user={user} />
              </div>
            </div>
          </motion.header>

          {/* Stat row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((st, i) => (
              <motion.button
                key={st.key}
                type="button"
                aria-label={`${st.label}: go to ${st.view}`}
                onClick={() => setView(st.view)}
                whileHover={{ y: -2 }}
                className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <motion.div {...fadeUp(i + 1)}>
                  <StatCard icon={st.icon} label={st.label} value={st.value} hint={st.hint} />
                </motion.div>
              </motion.button>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Learning progress */}
              <motion.section {...fadeUp(5)} className="lf-glass rounded-2xl p-5 sm:p-6" aria-label="Learning progress">
                <CardHeader
                  icon={Target}
                  title="Learning progress"
                  action={goals && goals.length > 0 ? seeAll('goals') : undefined}
                />
                {errs.goals ? (
                  <SectionError onRetry={() => setRetryTick((t) => t + 1)} />
                ) : progressRows === null ? (
                  <RowsSkeleton />
                ) : progressRows.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="No goals yet"
                    description="Set a learning goal, break it into tasks and watch your progress grow."
                    action={<Button size="sm" onClick={() => setView('goals')}>Create a goal</Button>}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {progressRows.slice(0, 5).map((row) => (
                      <div key={row.label} className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{row.label}</p>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{row.percent}%</span>
                        </div>
                        <Progress value={row.percent} className="mt-2 h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* Recommended matches */}
              <motion.section {...fadeUp(6)} className="lf-glass rounded-2xl p-5 sm:p-6" aria-label="Recommended matches">
                <CardHeader
                  icon={Sparkles}
                  title="Recommended matches"
                  action={matches && matches.length > 0 ? seeAll('matches') : undefined}
                />
                {errs.matches ? (
                  <SectionError onRetry={() => setRetryTick((t) => t + 1)} />
                ) : matches === null ? (
                  <RowsSkeleton />
                ) : matches.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No matches yet"
                    description="Add the skills you want to learn and we'll find students who can teach you."
                    action={<Button size="sm" onClick={() => setView('discover')}>Find students</Button>}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {matches.slice(0, 3).map((u) => (
                      <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                        <LfAvatar name={u.name} src={u.profileImage} className="size-10" />
                        <button
                          type="button"
                          onClick={() => setView('profile', { profileUserId: u.id })}
                          aria-label={`View ${u.name}'s profile`}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-medium hover:underline">{u.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{u.department} · {u.year}</p>
                          {u.matchReasons?.[0] && (
                            <p className="truncate text-[11px] text-muted-foreground/80">{u.matchReasons[0]}</p>
                          )}
                        </button>
                        <MatchRing score={u.matchScore ?? 0} size={44} />
                        {connectControl(u)}
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Upcoming sessions */}
              <motion.section {...fadeUp(7)} className="lf-glass rounded-2xl p-5 sm:p-6" aria-label="Upcoming sessions">
                <CardHeader
                  icon={CalendarClock}
                  title="Upcoming sessions"
                  action={upcoming.length > 0 ? seeAll('sessions') : undefined}
                />
                {errs.sessions ? (
                  <SectionError onRetry={() => setRetryTick((t) => t + 1)} />
                ) : sessions === null ? (
                  <RowsSkeleton rows={2} />
                ) : upcoming.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <p className="text-xs text-muted-foreground">No upcoming sessions — plan one with a connection.</p>
                    <Button size="sm" variant="outline" onClick={() => setView('sessions')}>Go to sessions</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {upcoming.slice(0, 3).map((s) => {
                        const other = s.myRole === 'teacher' ? s.learner : s.teacher
                        const d = new Date(`${s.date}T00:00:00`)
                        const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()
                        const day = d.getDate()
                        return (
                          <div key={s.id} className="flex items-start gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                            <div className="lf-surface flex size-11 shrink-0 flex-col items-center justify-center rounded-lg">
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{month}</span>
                              <span className="text-sm font-bold leading-tight">{day}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="min-w-0 flex-1 truncate text-sm font-medium">{s.topic}</p>
                                {s.mode === 'ONLINE' && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    <Globe className="size-3" aria-hidden /> Online
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {s.myRole === 'teacher' ? 'Teaching' : 'Learning from'} {other.name} · {formatTime(`${s.date}T${s.time}`)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setView('sessions')}>
                      View all sessions <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </>
                )}
              </motion.section>

              {/* Recent activity */}
              <motion.section {...fadeUp(8)} className="lf-glass rounded-2xl p-5 sm:p-6" aria-label="Recent activity">
                <CardHeader
                  icon={Bell}
                  title="Recent activity"
                  action={notifications && notifications.length > 0 ? seeAll('notifications') : undefined}
                />
                {errs.notifications ? (
                  <SectionError onRetry={() => setRetryTick((t) => t + 1)} />
                ) : notifications === null ? (
                  <RowsSkeleton rows={3} />
                ) : notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">No activity yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.slice(0, 4).map((n) => {
                      const Icon = NOTIFICATION_ICONS[n.type] ?? Bell
                      return (
                        <div key={n.id} className="flex items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06]" aria-hidden>
                            <Icon className="size-3.5 text-foreground" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{n.title}</p>
                            {n.body && <p className="truncate text-[11px] text-muted-foreground">{n.body}</p>}
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground/80">{timeAgo(n.createdAt)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.section>

              {/* Announcements */}
              <motion.section {...fadeUp(9)} className="lf-glass rounded-2xl p-5 sm:p-6" aria-label="Announcements">
                <CardHeader icon={Megaphone} title="Announcements" />
                {errs.announcements ? (
                  <SectionError onRetry={() => setRetryTick((t) => t + 1)} />
                ) : announcements === null ? (
                  <RowsSkeleton rows={2} />
                ) : announcements.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">No announcements yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {announcements.slice(0, 3).map((an) => (
                      <div key={an.id} className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06]" aria-hidden>
                            <Megaphone className="size-3.5 text-foreground" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{an.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{an.body}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground/80">
                              {an.authorName} · {timeAgo(an.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* Recent badges */}
              <motion.section {...fadeUp(10)} className="lf-glass rounded-2xl p-5 sm:p-6" aria-label="Recent badges">
                <CardHeader
                  icon={Award}
                  title="Recent badges"
                  action={user.badges.length > 0 ? seeAll('profile') : undefined}
                />
                {unlockedBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {unlockedBadges.slice(0, 8).map((b) => {
                      const Icon = BADGE_ICONS[b.code] ?? Award
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => setView('profile')}
                          aria-label={`Badge ${b.name}`}
                          title={b.description}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.16] bg-white/[0.08] px-2.5 py-1 text-xs font-medium transition hover:bg-white/[0.14]"
                        >
                          <Icon className="size-3.5 shrink-0 text-foreground" aria-hidden />
                          <span className="truncate">{b.name}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : lockedBadges.length > 0 ? (
                  <div>
                    <div className="flex flex-wrap gap-2 opacity-60 grayscale">
                      {lockedBadges.slice(0, 8).map((b) => {
                        const Icon = BADGE_ICONS[b.code] ?? Award
                        return (
                          <span key={b.code} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Icon className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{b.name}</span>
                          </span>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Unlock badges by completing sessions, goals and more.</p>
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">No badges available</p>
                )}
              </motion.section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
