'use client'

// ─── Learn & Fun — shared UI primitives (Mono Glass design system) ───
import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Star, BookOpen, GraduationCap, X, Send, Loader2,
  CircleAlert, Inbox, Check, Sprout, Handshake, Landmark, Award,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { LEVEL_LABELS, TEACH_LEVELS, LEARN_LEVELS } from '@/lib/lf/initial-skills'
import type { UserSkillDTO, BadgeDTO, MeDTO, ViewName } from '@/lib/lf/types'
import { initials, xpLevel } from '@/lib/lf/utils'
import { toast } from 'sonner'

// ─── Skill tags — monochrome glass pills ───────────────────────────
export function SkillTag({
  skill,
  onClick,
  onRemove,
  size = 'md',
}: {
  skill: UserSkillDTO
  onClick?: () => void
  onRemove?: () => void
  size?: 'sm' | 'md'
}) {
  const teach = skill.type === 'TEACH'
  const levelIdx = teach
    ? TEACH_LEVELS.indexOf(skill.level as (typeof TEACH_LEVELS)[number])
    : LEARN_LEVELS.indexOf(skill.level as (typeof LEARN_LEVELS)[number])
  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() }
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200',
        'bg-white/[0.06] border-white/[0.14] text-foreground backdrop-blur-sm',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        onClick && 'cursor-pointer hover:bg-white/[0.12] hover:border-white/[0.24]',
      )}
    >
      {teach ? (
        <GraduationCap className="size-3 shrink-0 text-foreground/75" aria-hidden />
      ) : (
        <BookOpen className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      )}
      {skill.name}
      {skill.level && (
        <span className="inline-flex items-center gap-0.5" aria-label={`${LEVEL_LABELS[skill.level] ?? skill.level} level`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn('size-1 rounded-full', i <= levelIdx ? 'bg-foreground' : 'bg-foreground/20')}
              aria-hidden
            />
          ))}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${skill.name}`}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/10"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

// ─── Avatar — glass monochrome fallback ────────────────────────────
export function LfAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <Avatar className={cn('border border-white/[0.14] bg-white/[0.06]', className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="bg-white/[0.08] text-foreground font-semibold backdrop-blur-sm">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

// ─── Stars — monochrome ────────────────────────────────────────────
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('size-3.5', i <= Math.round(rating) ? 'fill-foreground text-foreground' : 'text-foreground/25')}
          aria-hidden
        />
      ))}
    </span>
  )
}

// ─── Match ring — thin monochrome progress ring ────────────────────
export function MatchRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-foreground/15" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round"
          className="text-foreground" stroke="currentColor"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * score) / 100 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{score}%</span>
      </div>
    </div>
  )
}

// ─── Match explanation — glass info rows with check icons ──────────
export function MatchReasons({ reasons }: { reasons: string[] }) {
  if (!reasons?.length) return null
  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-3 backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Why you matched
      </p>
      <ul className="space-y-1.5">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/85">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="size-2.5" strokeWidth={3} aria-hidden />
            </span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── States ────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.03] py-14 text-center backdrop-blur-sm">
      <div className="rounded-full border border-white/[0.12] bg-white/[0.06] p-4">
        <Icon className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-14 text-center backdrop-blur-sm">
      <CircleAlert className="size-8 text-destructive" aria-hidden />
      <div>
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    </div>
  )
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

// ─── Stat card — monochrome glass ──────────────────────────────────
export function StatCard({ icon: Icon, label, value, hint }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  hint?: string
  /** @deprecated kept for API compatibility — Mono Glass is monochrome */
  tone?: string
}) {
  return (
    <div className="lf-hover-lift rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/[0.12] bg-white/[0.08] p-2.5">
          <Icon className="size-5 text-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── XP / level ────────────────────────────────────────────────────
export function XpBar({ user }: { user: Pick<MeDTO, 'xp' | 'name'> }) {
  const { level, pct } = xpLevel(user.xp)
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold">Level {level}</span>
        <span className="text-muted-foreground">{user.xp} XP · {pct}/100 to next</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}

// ─── Availability chips ────────────────────────────────────────────
export function AvailabilityChips({ availability }: { availability: { day: string; from: string; to: string }[] }) {
  if (!availability?.length) return <p className="text-xs text-muted-foreground">No availability set</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {availability.map((a, i) => (
        <span key={i} className="rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {a.day === 'MON' ? 'Mon' : a.day === 'TUE' ? 'Tue' : a.day === 'WED' ? 'Wed' : a.day === 'THU' ? 'Thu' : a.day === 'FRI' ? 'Fri' : a.day === 'SAT' ? 'Sat' : 'Sun'} {a.from}–{a.to}
        </span>
      ))}
    </div>
  )
}

// ─── Badge tiles — glass containers, lucide icons ──────────────────
export const BADGE_ICONS: Record<string, React.ElementType> = {
  FIRST_STEP: Sprout,
  FIRST_LEARNER: BookOpen,
  FIRST_TEACHER: GraduationCap,
  SKILL_SHARER: Handshake,
  COMMUNITY_BUILDER: Landmark,
  SKILL_MASTER: Star,
}

export function BadgeTile({ badge, progress }: { badge: BadgeDTO; progress?: { current: number; target: number } | null }) {
  const Icon = BADGE_ICONS[badge.code] ?? Award
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition-all',
        badge.unlocked
          ? 'lf-glass lf-radial-glow border-white/[0.2]'
          : 'border-white/[0.08] bg-white/[0.02] opacity-45 grayscale',
      )}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full border',
          badge.unlocked
            ? 'border-white/[0.24] bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.18)]'
            : 'border-white/[0.1] bg-white/[0.05] text-muted-foreground',
        )}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold">{badge.name}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{badge.description}</p>
      {!badge.unlocked && progress && progress.target > 1 && (
        <div className="w-full">
          <Progress value={(progress.current / progress.target) * 100} className="h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">{progress.current}/{progress.target}</p>
        </div>
      )}
      {badge.unlocked ? (
        <Badge className="border-white/[0.2] bg-white/[0.12] text-foreground" variant="secondary">Unlocked</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">Locked</Badge>
      )}
    </motion.div>
  )
}

// ─── Connect dialog (shared by discover / matches / profile) ───────
export function ConnectDialog({ onSent }: { onSent?: () => void }) {
  const { connectUserId, openConnect, refreshUser } = useLF()
  const [message, setMessage] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const targetName = connectUserId ? connectUserIdNameCache.get(connectUserId) : null

  React.useEffect(() => { if (connectUserId) setMessage('') }, [connectUserId])

  async function send() {
    if (!connectUserId) return
    setSending(true)
    try {
      await api.post('/api/connections', { userId: connectUserId, message: message.trim() || undefined })
      toast.success('Connection request sent!', { description: 'You will be notified when they accept.' })
      openConnect(null)
      refreshUser()
      onSent?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={!!connectUserId} onOpenChange={(o) => !o && openConnect(null)}>
      <DialogContent className="lf-glass-strong border-white/[0.16] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send connection request</DialogTitle>
          <DialogDescription>
            {targetName ? `Introduce yourself to ${targetName}.` : 'Introduce yourself — a short note doubles your chance of acceptance.'}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi! I want to learn Python and I can help you with JavaScript…"
          rows={4}
          maxLength={400}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => openConnect(null)}>Cancel</Button>
          <Button onClick={send} disabled={sending} className="gap-1.5">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Simple name cache so the connect dialog can show the target's name
const connectUserIdNameCache = new Map<string, string>()
export function cacheUserName(id: string, name: string) {
  connectUserIdNameCache.set(id, name)
}

// ─── Page header ───────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {title}
        </motion.h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Primary navigation model (Mono Glass) ─────────────────────────
export const NAV_MAIN: { view: ViewName; label: string }[] = [
  { view: 'dashboard', label: 'Home' },
  { view: 'discover', label: 'Discover' },
  { view: 'matches', label: 'Matches' },
  { view: 'leaderboard', label: 'Leaderboard' },
  { view: 'goals', label: 'My Learning' },
  { view: 'sessions', label: 'Sessions' },
  { view: 'messages', label: 'Messages' },
  { view: 'profile', label: 'Profile' },
]
