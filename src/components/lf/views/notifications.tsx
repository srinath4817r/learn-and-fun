'use client'

// ─── Learn & Fun — Notifications (Mono Glass) ───
import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Bell, UserPlus, UserCheck, MessageCircle, CalendarCheck, Star, Award, Megaphone, CheckCheck,
} from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { EmptyState, ErrorState, PageHeader } from '@/components/lf/shared'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { NotificationDTO } from '@/lib/lf/types'
import { timeAgo } from '@/lib/lf/utils'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<string, React.ElementType> = {
  CONNECTION_REQUEST: UserPlus,
  CONNECTION_ACCEPTED: UserCheck,
  NEW_MESSAGE: MessageCircle,
  SESSION: CalendarCheck,
  REVIEW: Star,
  BADGE: Award,
  ANNOUNCEMENT: Megaphone,
  SYSTEM: Bell,
}
const FALLBACK_ICON = Bell

type Filter = 'ALL' | 'UNREAD'

export function NotificationsView() {
  const setView = useLF((s) => s.setView)
  const refreshUser = useLF((s) => s.refreshUser)
  const [list, setList] = React.useState<NotificationDTO[] | null>(null)
  const [unread, setUnread] = React.useState(0)
  const [filter, setFilter] = React.useState<Filter>('ALL')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [markingAll, setMarkingAll] = React.useState(false)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const d = await api.get<{ notifications: NotificationDTO[]; unread: number }>('/api/notifications')
      setList(d.notifications)
      setUnread(d.unread)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  async function markAllRead() {
    if (!list || markingAll) return
    const snapshot = list
    setMarkingAll(true)
    setList(list.map((n) => ({ ...n, read: true })))
    setUnread(0)
    try {
      await api.post('/api/notifications/read-all')
      await refreshUser()
      toast.success('All notifications marked as read')
    } catch (e) {
      setList(snapshot)
      setUnread(snapshot.filter((n) => !n.read).length)
      toast.error(e instanceof Error ? e.message : 'Could not mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  async function openNotification(n: NotificationDTO) {
    if (!n.read) {
      // optimistic mark-as-read
      setList((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : prev))
      setUnread((u) => Math.max(0, u - 1))
      try {
        await api.patch(`/api/notifications/${n.id}`, { read: true })
        void refreshUser()
      } catch {
        toast.error('Could not mark notification as read')
      }
    }
    switch (n.type) {
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        setView('connections')
        break
      case 'NEW_MESSAGE':
        setView('messages')
        break
      case 'SESSION':
        setView('sessions')
        break
      case 'REVIEW':
      case 'BADGE':
        setView('profile')
        break
      case 'ANNOUNCEMENT':
        setView('dashboard')
        break
      default:
        break
    }
  }

  const visible = list?.filter((n) => filter === 'ALL' || !n.read) ?? []

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={markingAll || unread === 0}
            className="min-h-11 gap-1.5"
            aria-label="Mark all notifications as read"
          >
            <CheckCheck className="size-4" aria-hidden />
            Mark all read
          </Button>
        }
      />

      {/* Filter pills */}
      <div className="mb-4 flex justify-center gap-2">
        {(['ALL', 'UNREAD'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              'min-h-11 rounded-full border px-5 text-sm font-medium transition-colors duration-200',
              filter === f
                ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                : 'border-white/[0.12] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground',
            )}
          >
            {f === 'ALL' ? 'All' : `Unread${unread > 0 ? ` · ${unread}` : ''}`}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mx-auto max-w-2xl">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : loading ? (
        <div className="mx-auto max-w-2xl space-y-2" aria-busy="true" aria-label="Loading notifications">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px] rounded-2xl" />
          ))}
        </div>
      ) : list && list.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Connection requests, messages, session invites and badge unlocks will show up here."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up!"
          description="You have no unread notifications. Enjoy your day!"
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-2">
          {visible.map((n, i) => {
            const Icon = TYPE_ICON[n.type] ?? FALLBACK_ICON
            return (
              <motion.button
                key={n.id}
                type="button"
                onClick={() => void openNotification(n)}
                aria-label={`${n.title}${n.read ? '' : ' (unread)'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.35), duration: 0.25 }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border p-4 text-left backdrop-blur-md transition-colors duration-200',
                  n.read
                    ? 'border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.06]'
                    : 'border-white/[0.16] bg-white/[0.08] hover:bg-white/[0.1]',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm',
                    n.read && 'opacity-70',
                  )}
                  aria-hidden
                >
                  <Icon className={cn('size-5', n.read ? 'text-muted-foreground' : 'text-foreground')} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-sm', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{n.body}</span>
                </span>
                {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-foreground" aria-label="Unread" />}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
