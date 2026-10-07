'use client'

// ─── Learn & Fun — Saved students (bookmarks) — Mono Glass ───
import * as React from 'react'
import { motion } from 'framer-motion'
import { Bookmark, MessageCircle, ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import {
  SkillTag, LfAvatar, Stars, MatchRing, EmptyState, ErrorState, CardsSkeleton, PageHeader, cacheUserName,
} from '@/components/lf/shared'
import { Button } from '@/components/ui/button'
import type { UserCardDTO } from '@/lib/lf/types'
import { cn } from '@/lib/utils'

export function SavedView() {
  const setView = useLF((s) => s.setView)
  const openConnect = useLF((s) => s.openConnect)
  const connectUserId = useLF((s) => s.connectUserId)
  const [users, setUsers] = React.useState<UserCardDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const d = await api.get<{ users: UserCardDTO[] }>('/api/saved')
      d.users.forEach((u) => cacheUserName(u.id, u.name))
      setUsers(d.users)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load saved students'
      if (silent) toast.error(msg)
      else setError(msg)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  // Silently refresh statuses when the shared connect dialog closes (request may have been sent)
  const prevConnect = React.useRef(connectUserId)
  React.useEffect(() => {
    if (prevConnect.current && !connectUserId) void load(true)
    prevConnect.current = connectUserId
  }, [connectUserId, load])

  async function toggleSave(u: UserCardDTO) {
    setBusyId(u.id)
    try {
      const d = await api.post<{ saved: boolean }>('/api/saved', { userId: u.id })
      if (!d.saved) {
        setUsers((prev) => (prev ? prev.filter((x) => x.id !== u.id) : prev))
        toast.success('Removed from saved students')
      } else {
        setUsers((prev) => (prev ? prev.map((x) => (x.id === u.id ? { ...x, saved: true } : x)) : prev))
        toast.success('Kept in your saved students')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update your saved list')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Saved Students"
        subtitle="Your bookmarked learning partners."
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <CardsSkeleton count={6} />
      ) : users && users.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Bookmark interesting students from Discover to compare them later."
          action={
            <Button onClick={() => setView('discover')} className="min-h-11 gap-1.5">
              Explore Discover
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users?.map((u, i) => {
            const status = u.connectionStatus ?? 'none'
            const extraSkills = Math.max(0, u.teachSkills.length - 3) + Math.max(0, u.learnSkills.length - 2)
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.25 }}
                className="lf-hover-lift flex flex-col rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setView('profile', { profileUserId: u.id })}
                    aria-label={`View ${u.name}'s profile`}
                    className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <LfAvatar name={u.name} src={u.profileImage} className="size-12" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setView('profile', { profileUserId: u.id })}
                      className="block max-w-full truncate text-left text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {u.name}
                    </button>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.department}
                      {u.year ? ` · ${u.year}` : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Stars rating={u.rating} />
                      {u.reviewCount > 0
                        ? `${u.rating.toFixed(1)} · ${u.reviewCount} review${u.reviewCount === 1 ? '' : 's'}`
                        : 'No reviews yet'}
                    </p>
                  </div>
                  {typeof u.matchScore === 'number' && u.matchScore > 0 && (
                    <MatchRing score={u.matchScore} size={48} />
                  )}
                </div>

                {/* Skills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {u.teachSkills.slice(0, 3).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
                  {u.learnSkills.slice(0, 2).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
                  {extraSkills > 0 && (
                    <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
                      +{extraSkills} more
                    </span>
                  )}
                </div>

                {/* Footer actions */}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  {status === 'accepted' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 flex-1 gap-1.5"
                      onClick={() => setView('messages', { chatPreselectUserId: u.id })}
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Message
                    </Button>
                  ) : status === 'pending_sent' ? (
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" disabled>
                      Request sent
                    </Button>
                  ) : status === 'pending_received' ? (
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => setView('connections')}>
                      Respond
                    </Button>
                  ) : (
                    <Button size="sm" className="min-h-11 flex-1" onClick={() => openConnect(u.id)}>
                      Connect
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={() => void toggleSave(u)}
                    disabled={busyId === u.id}
                    aria-label={u.saved ? `Remove ${u.name} from saved` : `Save ${u.name}`}
                  >
                    {busyId === u.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Bookmark className={cn('size-4', u.saved && 'fill-primary text-primary')} aria-hidden />
                    )}
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
