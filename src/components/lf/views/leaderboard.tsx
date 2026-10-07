'use client'

// ─── Learn & Fun — Leaderboard ("Campus Skill Leaders", Mono Glass) ───
import * as React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Award, Users } from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { LfAvatar, Stars, EmptyState, ErrorState, PageHeader, cacheUserName } from '@/components/lf/shared'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { LeaderboardEntryDTO } from '@/lib/lf/types'
import { cn } from '@/lib/utils'

const GLASS_TAB_TRIGGER =
  'min-h-11 flex-1 rounded-full border-0 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 ' +
  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:flex-none'

export function LeaderboardView() {
  const user = useLF((s) => s.user)
  const setView = useLF((s) => s.setView)
  const [leaders, setLeaders] = React.useState<LeaderboardEntryDTO[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState('all')

  // "Following" tab: real data — accepted connections of the current user
  const [followIds, setFollowIds] = React.useState<Set<string> | null>(null)
  const [followError, setFollowError] = React.useState<string | null>(null)
  const [followLoading, setFollowLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setError(null)
    setLeaders(null)
    try {
      const d = await api.get<{ leaders: LeaderboardEntryDTO[] }>('/api/leaderboard')
      d.leaders.forEach((l) => cacheUserName(l.id, l.name))
      setLeaders(d.leaders)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the leaderboard')
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const loadFollowing = React.useCallback(async () => {
    setFollowLoading(true)
    setFollowError(null)
    try {
      const d = await api.get<{ accepted: { user: { id: string } }[] }>('/api/connections')
      setFollowIds(new Set(d.accepted.map((e) => e.user.id)))
    } catch (e) {
      setFollowError(e instanceof Error ? e.message : 'Failed to load your connections')
    } finally {
      setFollowLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (tab === 'following' && followIds === null && !followLoading && followError === null) {
      void loadFollowing()
    }
  }, [tab, followIds, followLoading, followError, loadFollowing])

  const meId = user?.id ?? null
  const myIdx = meId ? (leaders?.findIndex((l) => l.id === meId) ?? -1) : -1
  const myEntry = myIdx >= 0 ? leaders![myIdx] : null
  const showStickyRank = !!myEntry && myIdx >= 50 // not visible within the first 50 ranks

  const allList = leaders ?? []
  const followingList = React.useMemo(
    () => (followIds ? allList.filter((l) => followIds.has(l.id)) : []),
    [followIds, allList],
  )

  const renderRows = (list: LeaderboardEntryDTO[]) => (
    <div className="lf-glass overflow-hidden rounded-2xl">
      {list.map((l, i) => (
        <LeaderRow
          key={l.id}
          entry={l}
          isMe={l.id === meId}
          index={i}
          onOpen={() => setView('profile', { profileUserId: l.id })}
        />
      ))}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Campus Skill Leaders"
        subtitle="Top students earning XP by learning and teaching."
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="mb-4 h-auto w-full justify-start gap-1 rounded-full border border-white/[0.12] bg-white/[0.05] p-1 backdrop-blur-md sm:w-fit">
          <TabsTrigger value="all" className={GLASS_TAB_TRIGGER}>All Time</TabsTrigger>
          <TabsTrigger value="following" className={GLASS_TAB_TRIGGER}>Following</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : !leaders ? (
            <LeaderboardSkeleton />
          ) : leaders.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No leaders yet"
              description="Once students start earning XP through sessions and badges, the campus leaderboard comes alive."
            />
          ) : (
            <div className="space-y-4">
              {renderRows(leaders)}

              {/* ── Sticky "your rank" when outside the visible top 50 ── */}
              {showStickyRank && myEntry && (
                <div className="sticky bottom-4">
                  <div className="lf-glass-strong flex items-center gap-3 rounded-2xl border-white/[0.2] p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.24] bg-white/[0.12] text-sm font-bold tabular-nums">
                      {myEntry.rank}
                    </span>
                    <LfAvatar name={myEntry.name} src={myEntry.profileImage} className="size-10 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{myEntry.name}</span>
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">You</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{myEntry.department}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 md:flex">
                      <Stars rating={myEntry.rating} />
                      <span className="text-xs text-muted-foreground">{myEntry.rating > 0 ? myEntry.rating.toFixed(1) : '—'}</span>
                    </span>
                    <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums">
                      {myEntry.xp}
                      <span className="ml-1 text-[10px] font-medium text-muted-foreground">XP</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following">
          {followError ? (
            <ErrorState message={followError} onRetry={() => void loadFollowing()} />
          ) : followLoading || (followIds === null && !leaders) ? (
            <LeaderboardSkeleton />
          ) : followIds !== null && followingList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="You are not following anyone yet"
              description="Connect with students to see them ranked here — friendly competition keeps everyone learning."
              action={
                <Button className="min-h-11 gap-1.5" onClick={() => setView('connections')}>
                  <Users className="size-4" aria-hidden /> Go to connections
                </Button>
              }
            />
          ) : leaders === null ? (
            <LeaderboardSkeleton />
          ) : (
            renderRows(followingList)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── One leaderboard row — rank tile, avatar, name, badges, XP ───
function LeaderRow({
  entry, isMe, index, onOpen,
}: {
  entry: LeaderboardEntryDTO
  isMe: boolean
  index: number
  onOpen: () => void
}) {
  const top3 = entry.rank <= 3
  const RankIcon = entry.rank === 1 ? Trophy : Medal
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={`${entry.name}, rank ${entry.rank} with ${entry.xp} XP`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 border-t border-white/[0.06] p-3 text-left transition-colors duration-200 first:border-t-0',
        top3 ? 'bg-white/[0.06] hover:bg-white/[0.1]' : 'hover:bg-white/[0.04]',
        isMe && 'bg-white/[0.1] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/[0.12]',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold tabular-nums',
          top3 ? 'border-white/[0.24] bg-white/[0.12] text-foreground' : 'border-white/[0.1] bg-white/[0.04] text-muted-foreground',
        )}
      >
        {entry.rank}
      </span>
      <LfAvatar name={entry.name} src={entry.profileImage} className="size-10 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{entry.name}</span>
          {top3 && (
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border',
                entry.rank === 1 ? 'border-white/[0.3] bg-foreground text-background' : 'border-white/[0.24] bg-white/[0.12] text-foreground',
              )}
              aria-hidden
            >
              <RankIcon className="size-3.5" />
            </span>
          )}
          {isMe && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              You
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {entry.department}
          {entry.department && entry.college ? ' · ' : ''}
          {entry.college}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 md:flex">
        <Stars rating={entry.rating} />
        <span className="text-xs text-muted-foreground">{entry.rating > 0 ? entry.rating.toFixed(1) : '—'}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" aria-label={`${entry.badgeCount} badges`}>
        <Award className="size-3.5" aria-hidden />
        {entry.badgeCount}
      </span>
      <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums">
        {entry.xp}
        <span className="ml-1 text-[10px] font-medium text-muted-foreground">XP</span>
      </span>
    </motion.button>
  )
}

function LeaderboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading leaderboard">
      <div className="lf-glass overflow-hidden rounded-2xl">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-white/[0.06] p-3 first:border-t-0">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
