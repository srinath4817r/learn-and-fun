'use client'

// ─── Learn & Fun — Learning sessions view (schedule / complete / review) ───
import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CalendarClock, CheckCircle2, Star, Video, MapPin, Clock, GraduationCap,
  BookOpen, CalendarPlus, Ban, Users, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/lf/utils'
import type { SessionDTO, UserCardDTO } from '@/lib/lf/types'
import {
  LfAvatar, EmptyState, ErrorState, CardsSkeleton, PageHeader, cacheUserName,
} from '@/components/lf/shared'

const DURATIONS = ['30', '45', '60', '90', '120']

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = React.useState(0)
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Session rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={cn('size-7 transition-colors', i <= (hover || value) ? 'fill-foreground text-foreground' : 'text-muted-foreground/40')}
          />
        </button>
      ))}
    </div>
  )
}

function statusPill(status: string) {
  if (status === 'COMPLETED') {
    return <Badge variant="outline" className="gap-1 border-white/[0.2] bg-white/[0.12] text-foreground"><CheckCircle2 className="size-3" aria-hidden /> Completed</Badge>
  }
  if (status === 'CANCELLED') {
    return <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive"><Ban className="size-3" aria-hidden /> Cancelled</Badge>
  }
  return <Badge variant="outline" className="gap-1 border-white/[0.14] bg-white/[0.06] text-foreground"><CalendarClock className="size-3" aria-hidden /> Upcoming</Badge>
}

function SessionCard({
  session, onReview, onComplete, onCancel,
}: {
  session: SessionDTO
  onReview: (s: SessionDTO) => void
  onComplete: (s: SessionDTO) => void
  onCancel: (s: SessionDTO) => void
}) {
  const { setView } = useLF()
  const d = new Date(session.date.length === 10 ? `${session.date}T00:00:00` : session.date)
  const otherUser = session.myRole === 'teacher' ? session.learner : session.teacher
  const upcoming = session.status !== 'COMPLETED' && session.status !== 'CANCELLED'
  cacheUserName(otherUser.id, otherUser.name)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="lf-glass lf-hover-lift rounded-2xl p-4"
    >
      <div className="flex gap-4">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.07] text-foreground">
          <span className="text-xl font-bold leading-none">{isNaN(d.getTime()) ? '–' : d.getDate()}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            {isNaN(d.getTime()) ? '?' : d.toLocaleString('en', { month: 'short' })}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-bold">{session.topic}</p>
            {statusPill(session.status)}
          </div>
          {session.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{session.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn('gap-1', session.myRole === 'teacher'
              ? 'border-white/[0.22] bg-white/[0.13] text-foreground'
              : 'border-white/[0.14] bg-white/[0.06] text-foreground')}
            >
              {session.myRole === 'teacher'
                ? <><GraduationCap className="size-3" aria-hidden /> You teach</>
                : <><BookOpen className="size-3" aria-hidden /> You&apos;re learning</>}
            </Badge>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              {session.mode === 'IN_PERSON'
                ? <><MapPin className="size-3" aria-hidden /> {session.location || 'In person'}</>
                : <><Video className="size-3" aria-hidden /> Online</>}
            </Badge>
            {session.mode === 'ONLINE' && session.meetingLink && (
              <a
                href={session.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.18] bg-white/[0.1] px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-white/[0.16]"
              >
                Join meeting <ArrowRight className="size-3" aria-hidden />
              </a>
            )}
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Clock className="size-3" aria-hidden /> {session.duration} min
            </Badge>
            <span className="text-[11px] text-muted-foreground">· {formatTime(`2000-01-01T${session.time}`)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 rounded-full outline-none ring-primary focus-visible:ring-2"
          onClick={() => setView('profile', { profileUserId: otherUser.id })}
          aria-label={`View ${otherUser.name}'s profile`}
        >
          <LfAvatar name={otherUser.name} src={otherUser.profileImage} className="size-6" />
          <span className="truncate text-xs font-medium hover:underline">{otherUser.name}</span>
        </button>
        <div className="flex items-center gap-2">
          {upcoming && (
            <>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => onComplete(session)}
              >
                <CheckCircle2 className="size-4" aria-hidden /> Mark completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onCancel(session)}
              >
                <Ban className="size-4" aria-hidden /> Cancel session
              </Button>
            </>
          )}
          {session.status === 'COMPLETED' && (
            session.reviewed ? (
              <Badge variant="outline" className="gap-1 border-white/[0.2] bg-white/[0.12] text-foreground">
                <CheckCircle2 className="size-3" aria-hidden /> Reviewed
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => onReview(session)}>
                <Star className="size-4" aria-hidden /> Review
              </Button>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function SessionsView() {
  const { setView, refreshUser } = useLF()
  const [sessions, setSessions] = React.useState<SessionDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const [partners, setPartners] = React.useState<UserCardDTO[]>([])
  const [partnersLoading, setPartnersLoading] = React.useState(false)
  const [otherUserId, setOtherUserId] = React.useState('')
  const [topic, setTopic] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [duration, setDuration] = React.useState('60')
  const [mode, setMode] = React.useState<'ONLINE' | 'IN_PERSON'>('ONLINE')
  const [location, setLocation] = React.useState('')
  const [meetingLink, setMeetingLink] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [tried, setTried] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  // Cancel + review
  const [cancelTarget, setCancelTarget] = React.useState<SessionDTO | null>(null)
  const [reviewTarget, setReviewTarget] = React.useState<SessionDTO | null>(null)
  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const [submittingReview, setSubmittingReview] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ sessions: SessionDTO[] }>('/api/sessions')
      res.sessions.forEach((s) => {
        cacheUserName(s.teacher.id, s.teacher.name)
        cacheUserName(s.learner.id, s.learner.name)
      })
      setSessions(res.sessions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Load accepted connections as scheduling partners when dialog opens
  React.useEffect(() => {
    if (!scheduleOpen) return
    setTried(false)
    setPartnersLoading(true)
    api.get<{ accepted: { connection: { id: string }; user: UserCardDTO }[] }>('/api/connections')
      .then((res) => {
        res.accepted.forEach((e) => cacheUserName(e.user.id, e.user.name))
        setPartners(res.accepted.map((e) => e.user))
      })
      .catch(() => setPartners([]))
      .finally(() => setPartnersLoading(false))
  }, [scheduleOpen])

  function resetScheduleForm() {
    setOtherUserId(''); setTopic(''); setDescription(''); setDate(''); setTime('')
    setDuration('60'); setMode('ONLINE'); setLocation(''); setMeetingLink(''); setNotes(''); setTried(false)
  }

  const missing = {
    partner: !otherUserId,
    topic: !topic.trim(),
    date: !date,
    time: !time,
  }

  async function scheduleSession() {
    setTried(true)
    if (missing.partner || missing.topic || missing.date || missing.time) {
      toast.error('Please fill in the highlighted fields')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/sessions', {
        otherUserId,
        topic: topic.trim(),
        description: description.trim() || undefined,
        date,
        time,
        duration: Number(duration),
        mode,
        location: mode === 'IN_PERSON' ? location.trim() || undefined : undefined,
        meetingLink: mode === 'ONLINE' ? meetingLink.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        myRole: 'teacher',
      })
      toast.success('Session scheduled!', { description: 'Your partner has been notified.' })
      setScheduleOpen(false)
      resetScheduleForm()
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not schedule session')
    } finally {
      setSubmitting(false)
    }
  }

  async function completeSession(s: SessionDTO) {
    try {
      await api.patch(`/api/sessions/${s.id}`, { status: 'COMPLETED' })
      toast.success(
        s.myRole === 'teacher'
          ? 'Session completed — +25 XP earned for teaching!'
          : 'Session completed — +15 XP earned for learning!',
      )
      await load()
      refreshUser()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update session')
    }
  }

  async function cancelSession() {
    if (!cancelTarget) return
    try {
      await api.patch(`/api/sessions/${cancelTarget.id}`, { status: 'CANCELLED' })
      toast.success('Session cancelled')
      setCancelTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not cancel session')
    }
  }

  async function submitReview() {
    if (!reviewTarget) return
    if (rating < 1) {
      toast.info('Pick a star rating first')
      return
    }
    setSubmittingReview(true)
    try {
      await api.post('/api/reviews', { sessionId: reviewTarget.id, rating, comment: comment.trim() || undefined })
      toast.success('Thanks for the review!', { description: 'Feedback keeps the community strong.' })
      setReviewTarget(null)
      setRating(0)
      setComment('')
      await load()
      refreshUser()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const all = sessions ?? []
  const upcoming = all.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
  const completed = all.filter((s) => s.status === 'COMPLETED')
  const cancelled = all.filter((s) => s.status === 'CANCELLED')
  const today = new Date().toISOString().slice(0, 10)

  const renderList = (list: SessionDTO[], empty: React.ReactNode) => {
    if (loading) return <CardsSkeleton count={3} />
    if (error) return <ErrorState message={error} onRetry={load} />
    if (list.length === 0) return empty
    return (
      <div className="grid max-h-96 gap-4 overflow-y-auto lf-scroll pr-1 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {list.map((s) => (
            <SessionCard key={s.id} session={s} onReview={setReviewTarget} onComplete={completeSession} onCancel={setCancelTarget} />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Learning Sessions"
        subtitle="Plan, track and review your peer teaching sessions — every session earns XP."
        actions={
          <Button onClick={() => setScheduleOpen(true)} className="gap-1.5">
            <CalendarPlus className="size-4" aria-hidden /> Schedule session
          </Button>
        }
      />

      <Tabs defaultValue="upcoming" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-white/[0.1] bg-white/[0.04] sm:w-auto">
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarClock className="size-4" aria-hidden /> Upcoming
            <Badge variant="secondary" className="ml-0.5 px-1.5">{upcoming.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="size-4" aria-hidden /> Completed
            <Badge variant="secondary" className="ml-0.5 px-1.5">{completed.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-1.5">
            <Ban className="size-4" aria-hidden /> Cancelled
            <Badge variant="secondary" className="ml-0.5 px-1.5">{cancelled.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {renderList(
            upcoming,
            <EmptyState
              icon={CalendarClock}
              title="No upcoming sessions"
              description="Schedule a session with a connection — pick a topic, time and mode."
              action={
                <Button onClick={() => setScheduleOpen(true)} className="gap-1.5">
                  <CalendarPlus className="size-4" aria-hidden /> Schedule session
                </Button>
              }
            />,
          )}
        </TabsContent>
        <TabsContent value="completed">
          {renderList(
            completed,
            <EmptyState
              icon={Award}
              title="No completed sessions yet"
              description="Complete a session to see it here — and don't forget to review your partner."
            />,
          )}
        </TabsContent>
        <TabsContent value="cancelled">
          {renderList(
            cancelled,
            <EmptyState
              icon={Ban}
              title="No cancelled sessions"
              description="Great — everything you planned is still on track."
            />,
          )}
        </TabsContent>
      </Tabs>

      {/* ── Schedule dialog ── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto lf-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a learning session</DialogTitle>
            <DialogDescription>Set up a peer session — you&apos;ll be the teacher for this one.</DialogDescription>
          </DialogHeader>

          {partnersLoading ? (
            <div className="space-y-3 py-4" aria-busy="true" aria-label="Loading partners">
              <div className="h-9 w-full animate-pulse rounded-md bg-white/[0.06]" />
              <div className="h-9 w-full animate-pulse rounded-md bg-white/[0.06]" />
              <div className="h-9 w-full animate-pulse rounded-md bg-white/[0.06]" />
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.14] py-8 text-center">
              <div className="rounded-full border border-white/[0.1] bg-white/[0.06] p-4">
                <Users className="size-6 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm font-semibold">Connect with students first</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                You need at least one accepted connection to schedule a session.
              </p>
              <Button
                variant="outline"
                onClick={() => { setScheduleOpen(false); setView('connections') }}
              >
                Go to connections
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="s-partner">Partner *</Label>
                <Select value={otherUserId} onValueChange={setOtherUserId}>
                  <SelectTrigger id="s-partner" className={cn('w-full', tried && missing.partner && 'border-destructive')} aria-label="Select partner">
                    <SelectValue placeholder="Choose a connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tried && missing.partner && <p className="text-xs text-destructive">Select a partner</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="s-topic">Topic *</Label>
                <Input
                  id="s-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Intro to React hooks"
                  className={cn(tried && missing.topic && 'border-destructive')}
                />
                {tried && missing.topic && <p className="text-xs text-destructive">Topic is required</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="s-desc">Description</Label>
                <Textarea
                  id="s-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you cover? Any prep needed?"
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="s-date">Date *</Label>
                  <Input
                    id="s-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={cn(tried && missing.date && 'border-destructive')}
                  />
                  {tried && missing.date && <p className="text-xs text-destructive">Pick a date</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-time">Time *</Label>
                  <Input
                    id="s-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={cn(tried && missing.time && 'border-destructive')}
                  />
                  {tried && missing.time && <p className="text-xs text-destructive">Pick a time</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="s-duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="s-duration" className="w-full" aria-label="Duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-mode">Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as 'ONLINE' | 'IN_PERSON')}>
                    <SelectTrigger id="s-mode" className="w-full" aria-label="Mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="IN_PERSON">In person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {mode === 'IN_PERSON' ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="s-location">Location</Label>
                  <Input
                    id="s-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Central library, 2nd floor"
                  />
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label htmlFor="s-link">Meeting link</Label>
                  <Input
                    id="s-link"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.example.com/your-room"
                    type="url"
                  />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="s-notes">Notes</Label>
                <Textarea
                  id="s-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything to remember for later…"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {partners.length > 0 && (
            <DialogFooter className="mt-2">
              <Button variant="ghost" onClick={() => setScheduleOpen(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={scheduleSession} disabled={submitting} className="gap-1.5">
                <CalendarPlus className="size-4" aria-hidden /> {submitting ? 'Scheduling…' : 'Schedule session'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel session confirm ── */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{cancelTarget?.topic}&rdquo; on {cancelTarget?.date} will be marked as cancelled and your partner will
              no longer see it as upcoming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep session</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); cancelSession() }}
            >
              Cancel session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Review dialog ── */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review this session</DialogTitle>
            <DialogDescription>
              How was learning &ldquo;{reviewTarget?.topic}&rdquo; with {reviewTarget
                ? (reviewTarget.myRole === 'teacher' ? reviewTarget.learner.name : reviewTarget.teacher.name)
                : 'your partner'}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <StarPicker value={rating} onChange={setRating} />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share what went well (optional)…"
              rows={3}
              maxLength={500}
              className="w-full resize-none"
              aria-label="Review comment"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewTarget(null)} disabled={submittingReview}>Cancel</Button>
            <Button onClick={submitReview} disabled={submittingReview || rating < 1} className="gap-1.5">
              <Star className="size-4" aria-hidden /> {submittingReview ? 'Submitting…' : 'Submit review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
