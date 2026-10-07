'use client'

// ─── Learn & Fun — Profile: own profile + other students' profiles (Mono Glass) ───
import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Award, Bookmark, BookOpen, Clock, Flag, GraduationCap,
  Loader2, MessageCircle, Pencil, Star, Users, X, Zap,
} from 'lucide-react'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  LfAvatar, Stars, MatchRing, MatchReasons, EmptyState, ErrorState, CardSkeleton,
  AvailabilityChips, BadgeTile, SkillTag, XpBar, StatCard, cacheUserName,
} from '@/components/lf/shared'
import type {
  Availability, BadgeDTO, MeDTO, ReviewDTO, SkillCatalogCategory, SkillType, UserCardDTO,
} from '@/lib/lf/types'
import { DAYS, DAY_LABELS, timeAgo, xpLevel } from '@/lib/lf/utils'
import { LEARN_LEVELS, LEVEL_LABELS, TEACH_LEVELS } from '@/lib/lf/initial-skills'

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: Math.min(i, 6) * 0.06, duration: 0.3, ease: 'easeOut' as const },
})

type BadgeWithProgress = BadgeDTO & { progress: { current: number; target: number } | null }

const YEAR_OPTIONS = [
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
  { value: 'PG', label: 'Postgraduate' },
]

const REPORT_REASONS = ['Spam', 'Fake profile', 'Inappropriate content', 'Harassment', 'Other']

// Section label used for both skill groups (uppercase, tracked, muted)
function SkillSectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" aria-hidden /> {children}
    </p>
  )
}

export function ProfileView() {
  const user = useLF((s) => s.user)
  const profileUserId = useLF((s) => s.profileUserId)
  const connectUserId = useLF((s) => s.connectUserId)
  const setView = useLF((s) => s.setView)
  const openConnect = useLF((s) => s.openConnect)
  const setUser = useLF((s) => s.setUser)
  const refreshUser = useLF((s) => s.refreshUser)

  const isOther = !!profileUserId

  // data
  const [other, setOther] = React.useState<UserCardDTO | null>(null)
  const [ownReviews, setOwnReviews] = React.useState<ReviewDTO[] | null>(null)
  const [ownBadges, setOwnBadges] = React.useState<BadgeWithProgress[] | null>(null)
  const [categories, setCategories] = React.useState<SkillCatalogCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [retryTick, setRetryTick] = React.useState(0)

  // other-student interactions
  const [savedOverride, setSavedOverride] = React.useState<boolean | null>(null)

  // edit profile dialog (own)
  const [editOpen, setEditOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', bio: '', college: '', department: '', year: '1' })
  const [avail, setAvail] = React.useState<Availability[]>([])
  const [savingProfile, setSavingProfile] = React.useState(false)

  // add skill dialog (own)
  const [addOpen, setAddOpen] = React.useState(false)
  const [skillCat, setSkillCat] = React.useState('all')
  const [addSkillId, setAddSkillId] = React.useState('')
  const [addType, setAddType] = React.useState<SkillType>('LEARN')
  const [addLevel, setAddLevel] = React.useState('')
  const [addingSkill, setAddingSkill] = React.useState(false)

  // report dialog (other)
  const [reportOpen, setReportOpen] = React.useState(false)
  const [reportReason, setReportReason] = React.useState('')
  const [reportDesc, setReportDesc] = React.useState('')
  const [reporting, setReporting] = React.useState(false)

  // load profile data
  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setSavedOverride(null)
      setOther(null)
      setOwnReviews(null)
      setOwnBadges(null)
      try {
        if (profileUserId) {
          const res = await api.get<{ user: UserCardDTO }>(`/api/users/${profileUserId}`)
          if (!cancelled) setOther(res.user)
        } else {
          if (!user) return
          const [b, p] = await Promise.all([
            api.get<{ badges: BadgeWithProgress[] }>('/api/badges'),
            api.get<{ user: UserCardDTO }>(`/api/users/${user.id}`),
          ])
          if (!cancelled) {
            setOwnBadges(b.badges)
            setOwnReviews(p.user.reviews ?? [])
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [profileUserId, user?.id, retryTick])

  // skill catalog for the add-skill dialog (own profile only)
  React.useEffect(() => {
    if (isOther || !user) return
    let cancelled = false
    api.get<{ categories: SkillCatalogCategory[] }>('/api/skills')
      .then((res) => { if (!cancelled) setCategories(res.categories) })
      .catch(() => { /* add-skill dialog shows a message if catalog is unavailable */ })
    return () => { cancelled = true }
  }, [isOther, user?.id])

  // refresh when the connect dialog closes (status may have changed)
  const prevConnect = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (prevConnect.current && !connectUserId && profileUserId) setRetryTick((t) => t + 1)
    prevConnect.current = connectUserId
  }, [connectUserId, profileUserId])

  // cache name for the shared ConnectDialog
  const cacheId = isOther ? other?.id : user?.id
  const cacheName = isOther ? other?.name : user?.name
  React.useEffect(() => {
    if (cacheId && cacheName) cacheUserName(cacheId, cacheName)
  }, [cacheId, cacheName])

  if (!user) return null

  const ownCard: UserCardDTO | null = !isOther ? {
    id: user.id,
    name: user.name,
    college: user.college,
    department: user.department,
    year: user.year,
    bio: user.bio,
    profileImage: user.profileImage,
    xp: user.xp,
    rating: user.rating,
    reviewCount: user.reviewCount,
    connectionsCount: user.connectionsCount,
    availability: user.availability,
    teachSkills: user.teachSkills,
    learnSkills: user.learnSkills,
    badges: user.badges,
    reviews: ownReviews ?? [],
  } : null

  const target = isOther ? other : ownCard
  const own = !isOther
  const saved = savedOverride ?? other?.saved ?? false

  // ── actions ──
  async function toggleSave() {
    if (!target) return
    const next = !saved
    setSavedOverride(next)
    try {
      await api.post('/api/saved', { userId: target.id })
      toast.success(next ? 'Added to your saved list' : 'Removed from your saved list')
    } catch {
      setSavedOverride(!next)
      toast.error('Could not update your saved list')
    }
  }

  async function removeSkill(skillId: string, type: SkillType) {
    try {
      const res = await api.del<{ user: MeDTO }>(`/api/profile/skills?skillId=${encodeURIComponent(skillId)}&type=${type}`)
      setUser(res.user)
      await refreshUser()
      toast.success('Skill removed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove skill')
    }
  }

  function openEdit() {
    setForm({
      name: user?.name ?? '',
      bio: user?.bio ?? '',
      college: user?.college ?? '',
      department: user?.department ?? '',
      year: user?.year || '1',
    })
    setAvail((user?.availability ?? []).map((a) => ({ ...a })))
    setEditOpen(true)
  }

  function toggleDay(day: string) {
    setAvail((prev) => prev.some((a) => a.day === day)
      ? prev.filter((a) => a.day !== day)
      : [...prev, { day, from: '18:00', to: '20:00' }])
  }

  function updateAvail(day: string, patch: Partial<Availability>) {
    setAvail((prev) => prev.map((a) => a.day === day ? { ...a, ...patch } : a))
  }

  async function saveProfile() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSavingProfile(true)
    try {
      const res = await api.patch<{ user: MeDTO }>('/api/profile', {
        name: form.name.trim(),
        bio: form.bio.trim(),
        college: form.college.trim(),
        department: form.department.trim(),
        year: form.year,
        availability: avail,
      })
      setUser(res.user)
      await refreshUser()
      toast.success('Profile updated')
      setEditOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  function openAddSkill(type: SkillType = 'LEARN') {
    setSkillCat('all')
    setAddSkillId('')
    setAddType(type)
    setAddLevel('')
    setAddOpen(true)
  }

  const addSkillOptions = skillCat === 'all'
    ? categories.flatMap((c) => c.skills)
    : (categories.find((c) => c.name === skillCat)?.skills ?? [])
  const levelOptions = addType === 'TEACH' ? TEACH_LEVELS : LEARN_LEVELS

  async function submitSkill() {
    if (!addSkillId || !addLevel) { toast.error('Pick a skill and a level'); return }
    setAddingSkill(true)
    try {
      const res = await api.post<{ user: MeDTO }>('/api/profile/skills', { skillId: addSkillId, type: addType, level: addLevel })
      setUser(res.user)
      await refreshUser()
      toast.success('Skill added to your profile')
      setAddOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add skill')
    } finally {
      setAddingSkill(false)
    }
  }

  async function submitReport() {
    if (!target) return
    if (!reportReason) { toast.error('Select a reason'); return }
    setReporting(true)
    try {
      await api.post('/api/reports', {
        reportedUserId: target.id,
        reason: reportReason,
        description: reportDesc.trim() || undefined,
      })
      toast.success('Report submitted. Our team will review it.')
      setReportOpen(false)
      setReportReason('')
      setReportDesc('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit report')
    } finally {
      setReporting(false)
    }
  }

  // ── render ──
  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {isOther && (
          <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => setView('dashboard')}>
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
        )}
        <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
      </div>
    )
  }

  if (loading || !target) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8" aria-busy="true" aria-label="Loading profile">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  const matchScore = target.matchScore ?? 0
  const badgeList: (BadgeDTO & { progress?: { current: number; target: number } | null })[] =
    own ? (ownBadges ?? target.badges) : target.badges
  const unlockedBadges = badgeList.filter((b) => b.unlocked).length
  const skillCount = target.teachSkills.length + target.learnSkills.length
  const yearLabel = YEAR_OPTIONS.find((o) => o.value === target.year)?.label ?? target.year

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {isOther && (
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => setView('dashboard')}>
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
      )}

      <div className="space-y-6">
        {/* ── Profile header — glass panel with soft radial glow ── */}
        <motion.section
          {...fadeUp(0)}
          className="lf-glass relative overflow-hidden rounded-3xl p-6 sm:p-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-white/[0.07] blur-3xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
            <LfAvatar
              name={target.name}
              src={target.profileImage}
              className="size-24 shrink-0 ring-2 ring-white/20 sm:size-28"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{target.name}</h1>
              {own && user.email && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
              )}
              <p className="mt-0.5 text-sm text-muted-foreground">
                {target.college} · {target.department} · {yearLabel}
              </p>
              {target.bio && <p className="mt-3 text-sm leading-relaxed text-foreground/80">{target.bio}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Stars rating={target.rating} />
                  <span className="font-medium">{target.rating > 0 ? target.rating.toFixed(1) : 'New'}</span>
                  <span className="text-xs text-muted-foreground">({target.reviewCount} review{target.reviewCount === 1 ? '' : 's'})</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-4" aria-hidden /> {target.connectionsCount} connection{target.connectionsCount === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.08] px-2.5 py-0.5 text-xs font-semibold">
                  <Zap className="size-3.5" aria-hidden /> {target.xp} XP
                </span>
              </div>
            </div>
            {!own && matchScore > 0 && <MatchRing score={matchScore} size={76} />}
          </div>

          {!own && matchScore > 0 && (target.matchReasons?.length ?? 0) > 0 && (
            <div className="relative mt-4">
              <MatchReasons reasons={target.matchReasons ?? []} />
            </div>
          )}

          {/* Actions */}
          <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.1] pt-4">
            {own ? (
              <Button size="sm" className="min-h-11 gap-1.5" onClick={openEdit}>
                <Pencil className="size-4" aria-hidden /> Edit profile
              </Button>
            ) : (
              <>
                {(target.connectionStatus ?? 'none') === 'accepted' ? (
                  <Button size="sm" variant="outline" className="min-h-11" onClick={() => setView('messages', { chatPreselectUserId: target.id })}>
                    <MessageCircle className="size-4" aria-hidden /> Message
                  </Button>
                ) : (target.connectionStatus ?? 'none') === 'pending_sent' ? (
                  <Button size="sm" variant="secondary" disabled className="min-h-11">Request sent</Button>
                ) : (target.connectionStatus ?? 'none') === 'pending_received' ? (
                  <Button size="sm" variant="outline" className="min-h-11" onClick={() => setView('connections')}>Respond</Button>
                ) : (target.connectionStatus ?? 'none') === 'rejected' ? (
                  <Button size="sm" variant="ghost" className="min-h-11" onClick={() => openConnect(target.id)}>Connect again</Button>
                ) : (
                  <Button size="sm" className="min-h-11" onClick={() => openConnect(target.id)}>Connect</Button>
                )}
                <button
                  type="button"
                  aria-label={saved ? 'Remove from saved' : 'Save student'}
                  onClick={() => void toggleSave()}
                  className="flex size-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-colors hover:bg-white/[0.1]"
                >
                  <Bookmark className={cn('size-4', saved ? 'fill-foreground text-foreground' : 'text-muted-foreground')} aria-hidden />
                </button>
                <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setReportOpen(true)}>
                  <Flag className="size-4" aria-hidden /> Report
                </Button>
              </>
            )}
          </div>
        </motion.section>

        {/* ── Stats row ── */}
        <motion.div {...fadeUp(1)} className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Profile stats">
          <StatCard
            icon={BookOpen}
            label="Skills"
            value={skillCount}
            hint={`${target.teachSkills.length} teach · ${target.learnSkills.length} learn`}
          />
          <StatCard
            icon={Users}
            label="Connections"
            value={target.connectionsCount}
            hint="Peers connected"
          />
          <StatCard
            icon={Star}
            label="Rating"
            value={target.rating > 0 ? target.rating.toFixed(1) : 'New'}
            hint={`${target.reviewCount} review${target.reviewCount === 1 ? '' : 's'}`}
          />
          <StatCard
            icon={Zap}
            label="XP"
            value={target.xp}
            hint={`Level ${xpLevel(target.xp).level}`}
          />
        </motion.div>

        {/* ── XP progress (own only) ── */}
        {own && (
          <motion.section {...fadeUp(2)} className="lf-glass flex items-center gap-4 rounded-2xl p-5" aria-label="Your XP progress">
            <span className="rounded-xl border border-white/[0.12] bg-white/[0.08] p-3" aria-hidden>
              <Zap className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <XpBar user={user} />
            </div>
            <span className="shrink-0 rounded-full border border-white/[0.14] bg-white/[0.08] px-3 py-1 text-xs font-bold">
              Level {xpLevel(user.xp).level}
            </span>
          </motion.section>
        )}

        {/* ── Skills ── */}
        <motion.section {...fadeUp(own ? 3 : 2)} className="lf-glass rounded-2xl p-6" aria-label="Skills">
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <SkillSectionLabel icon={GraduationCap}>I CAN TEACH</SkillSectionLabel>
                {own && (
                  <Button size="sm" variant="ghost" className="min-h-11 gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => openAddSkill('TEACH')}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {target.teachSkills.length > 0
                  ? target.teachSkills.map((s) => (
                    <SkillTag key={s.id} skill={s} onRemove={own ? () => void removeSkill(s.skillId, s.type) : undefined} />
                  ))
                  : <p className="text-xs text-muted-foreground">No teaching skills yet{own ? ' — add one to start matching!' : '.'}</p>}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <SkillSectionLabel icon={BookOpen}>I WANT TO LEARN</SkillSectionLabel>
                {own && (
                  <Button size="sm" variant="ghost" className="min-h-11 gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => openAddSkill('LEARN')}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {target.learnSkills.length > 0
                  ? target.learnSkills.map((s) => (
                    <SkillTag key={s.id} skill={s} onRemove={own ? () => void removeSkill(s.skillId, s.type) : undefined} />
                  ))
                  : <p className="text-xs text-muted-foreground">No learning skills yet{own ? ' — add one to get matched!' : '.'}</p>}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Availability ── */}
        <motion.section {...fadeUp(own ? 4 : 3)} className="lf-glass rounded-2xl p-6" aria-label="Availability">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> Availability
          </h2>
          <AvailabilityChips availability={target.availability} />
        </motion.section>

        {/* ── Badges ── */}
        <motion.section {...fadeUp(own ? 5 : 4)} className="lf-glass rounded-2xl p-6" aria-label="Badges">
          <h2 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Award className="size-3.5" aria-hidden /> Badges
            <span className="font-medium text-muted-foreground/70">({unlockedBadges}/{badgeList.length} unlocked)</span>
          </h2>
          {badgeList.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No badges yet — they unlock as you use Learn &amp; Fun.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {badgeList.map((b) => (
                <BadgeTile key={b.code} badge={b} progress={b.progress ?? undefined} />
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Reviews ── */}
        <motion.section {...fadeUp(own ? 6 : 5)} className="lf-glass rounded-2xl p-6" aria-label="Reviews">
          <h2 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="size-3.5" aria-hidden /> Reviews
          </h2>
          {(target.reviews?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Complete a session to receive your first one."
            />
          ) : (
            <div className="lf-scroll max-h-96 space-y-3 overflow-y-auto pr-1">
              {target.reviews?.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <LfAvatar name={r.reviewer.name} src={r.reviewer.profileImage} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.reviewer.name}</p>
                      <div className="flex items-center gap-2">
                        <Stars rating={r.rating} />
                        <span className="text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                    <span className="max-w-[140px] truncate rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {r.sessionTopic}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-foreground/80">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="lf-scroll max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your details and weekly availability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pf-name">Name</Label>
              <Input id="pf-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-bio">Bio</Label>
              <Textarea id="pf-bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell students what you're passionate about…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pf-college">College</Label>
                <Input id="pf-college" value={form.college} onChange={(e) => setForm((f) => ({ ...f, college: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-dept">Department</Label>
                <Input id="pf-dept" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                <SelectTrigger aria-label="Year" className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const active = avail.some((a) => a.day === d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={active}
                      aria-label={`Toggle ${DAY_LABELS[d] ?? d} availability`}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-white/[0.12] bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1]',
                      )}
                    >
                      {DAY_LABELS[d] ?? d}
                    </button>
                  )
                })}
              </div>
              {DAYS.filter((d) => avail.some((a) => a.day === d)).map((d) => {
                const a = avail.find((x) => x.day === d)
                if (!a) return null
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className="w-12 text-xs font-medium">{DAY_LABELS[d] ?? d}</span>
                    <Input type="time" value={a.from} onChange={(e) => updateAvail(d, { from: e.target.value })} aria-label={`${DAY_LABELS[d] ?? d} from`} className="h-8 w-28 text-xs" />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input type="time" value={a.to} onChange={(e) => updateAvail(d, { to: e.target.value })} aria-label={`${DAY_LABELS[d] ?? d} to`} className="h-8 w-28 text-xs" />
                    <button type="button" aria-label={`Remove ${DAY_LABELS[d] ?? d} availability`} onClick={() => toggleDay(d)} className="flex size-9 items-center justify-center rounded-full hover:bg-white/[0.08]">
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveProfile()} disabled={savingProfile}>
              {savingProfile && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add skill dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a skill</DialogTitle>
            <DialogDescription>Teaching skills earn +5 XP and improve your matches.</DialogDescription>
          </DialogHeader>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">Skill catalog is unavailable right now.</p>
              <Button variant="outline" size="sm" onClick={() => setRetryTick((t) => t + 1)}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={skillCat} onValueChange={(v) => { setSkillCat(v); setAddSkillId('') }}>
                  <SelectTrigger aria-label="Category" className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Skill</Label>
                <Select value={addSkillId} onValueChange={setAddSkillId}>
                  <SelectTrigger aria-label="Skill" className="w-full"><SelectValue placeholder="Select skill" /></SelectTrigger>
                  <SelectContent>
                    {addSkillOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={addType} onValueChange={(v) => { setAddType(v as SkillType); setAddLevel('') }}>
                    <SelectTrigger aria-label="Type" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEARN">Want to learn</SelectItem>
                      <SelectItem value="TEACH">Can teach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <Select value={addLevel} onValueChange={setAddLevel}>
                    <SelectTrigger aria-label="Level" className="w-full"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((lv) => <SelectItem key={lv} value={lv}>{LEVEL_LABELS[lv] ?? lv}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitSkill()} disabled={addingSkill || categories.length === 0}>
              {addingSkill && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Add skill
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report {target.name}</DialogTitle>
            <DialogDescription>Tell us what's wrong — reports are reviewed by our team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger aria-label="Report reason" className="w-full"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-desc">Description (optional)</Label>
              <Textarea id="rp-desc" rows={3} value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Add any details that help us understand the issue…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void submitReport()} disabled={reporting}>
              {reporting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Submit report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
