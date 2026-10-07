'use client'

// ─── Learn & Fun — Connections view (accepted / received / sent) — Mono Glass ───
import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Inbox, Send, MoreHorizontal, MessageCircle, Eye, UserMinus,
  Quote, UserCheck, X, Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/lf/utils'
import type { UserCardDTO } from '@/lib/lf/types'
import {
  LfAvatar, SkillTag, MatchRing, EmptyState, ErrorState, CardsSkeleton, PageHeader, cacheUserName,
} from '@/components/lf/shared'

interface ConnEntry {
  connection: { id: string; message?: string; createdAt: string }
  user: UserCardDTO
}
interface ConnectionsPayload {
  accepted: ConnEntry[]
  sent: ConnEntry[]
  received: ConnEntry[]
}

function miniSkills(user: UserCardDTO) {
  return [...user.teachSkills, ...user.learnSkills].slice(0, 3)
}

export function ConnectionsView() {
  const { setView, refreshUser } = useLF()
  const [data, setData] = React.useState<ConnectionsPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState('all')
  const [removeTarget, setRemoveTarget] = React.useState<{ id: string; name: string } | null>(null)
  const [removing, setRemoving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ConnectionsPayload>('/api/connections')
      ;[...res.accepted, ...res.sent, ...res.received].forEach((e) => cacheUserName(e.user.id, e.user.name))
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load connections')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function accept(id: string) {
    try {
      await api.post(`/api/connections/${id}/accept`)
      toast.success('Connection accepted!', { description: 'Say hi — a quick message goes a long way.' })
      await load()
      refreshUser()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not accept request')
    }
  }

  async function reject(id: string) {
    try {
      await api.post(`/api/connections/${id}/reject`)
      toast.success('Request declined')
      await load()
      refreshUser()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not decline request')
    }
  }

  async function cancel(id: string) {
    try {
      await api.post(`/api/connections/${id}/cancel`)
      toast.success('Request cancelled')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not cancel request')
    }
  }

  async function removeConnection() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await api.del(`/api/connections/${removeTarget.id}`)
      toast.success('Connection removed')
      setRemoveTarget(null)
      await load()
      refreshUser()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove connection')
    } finally {
      setRemoving(false)
    }
  }

  const accepted = data?.accepted ?? []
  const received = data?.received ?? []
  const sent = data?.sent ?? []

  return (
    <div>
      <PageHeader
        title="Connections"
        subtitle="Your study circle — message partners, manage requests and grow your network."
        actions={
          <Button onClick={() => setView('discover')} className="min-h-11 gap-1.5">
            <Users className="size-4" aria-hidden /> Discover students
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-white/[0.1] bg-white/[0.04] p-1 backdrop-blur-md sm:w-auto">
          <TabsTrigger value="all" className="gap-1.5">
            <Users className="size-4" aria-hidden />
            All
            <Badge variant="secondary" className="ml-0.5 px-1.5">{accepted.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-1.5">
            <Inbox className="size-4" aria-hidden />
            Requests received
            {received.length > 0 && (
              <Badge className="ml-0.5 border border-white/[0.16] bg-white/[0.12] px-1.5 text-foreground">{received.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <Send className="size-4" aria-hidden />
            Sent requests
            <Badge variant="secondary" className="ml-0.5 px-1.5">{sent.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Accepted ── */}
        <TabsContent value="all">
          {loading ? (
            <CardsSkeleton count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : accepted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No connections yet"
              description="Connect with students who complement your skills — then chat, schedule sessions and grow together."
              action={
                <Button onClick={() => setView('discover')} className="min-h-11 gap-1.5">
                  <Users className="size-4" aria-hidden /> Discover students
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {accepted.map(({ connection, user }) => (
                  <motion.div
                    key={connection.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="lf-hover-lift flex flex-col rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={`View ${user.name}'s profile`}
                        className="shrink-0 rounded-full outline-none ring-primary focus-visible:ring-2"
                        onClick={() => setView('profile', { profileUserId: user.id })}
                      >
                        <LfAvatar name={user.name} src={user.profileImage} className="size-12" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="block max-w-full truncate text-left text-sm font-semibold hover:underline"
                          onClick={() => setView('profile', { profileUserId: user.id })}
                        >
                          {user.name}
                        </button>
                        <p className="truncate text-xs text-muted-foreground">
                          {[user.department, user.year].filter(Boolean).join(' · ') || user.college}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`More actions for ${user.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setView('profile', { profileUserId: user.id })}>
                            <Eye className="size-4" /> View profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoveTarget({ id: connection.id, name: user.name })}
                          >
                            <UserMinus className="size-4" /> Remove connection
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {miniSkills(user).map((s) => <SkillTag key={s.id} skill={s} size="sm" />)}
                      {miniSkills(user).length === 0 && (
                        <p className="text-xs text-muted-foreground">No skills listed yet</p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-2 pt-1">
                      <Button
                        className="min-h-11 flex-1 gap-1.5"
                        onClick={() => setView('messages', { chatPreselectUserId: user.id })}
                        aria-label={`Message ${user.name}`}
                      >
                        <MessageCircle className="size-4" aria-hidden /> Message
                      </Button>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        Connected {timeAgo(connection.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── Requests received ── */}
        <TabsContent value="received">
          {loading ? (
            <CardsSkeleton count={2} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : received.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              description="When someone sends you a connection request, it will appear here for you to accept or decline."
            />
          ) : (
            <div className="grid max-h-96 gap-4 overflow-y-auto lf-scroll pr-1 md:max-h-none md:overflow-visible md:grid-cols-2">
              <AnimatePresence initial={false}>
                {received.map(({ connection, user }) => (
                  <motion.div
                    key={connection.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={`View ${user.name}'s profile`}
                        className="shrink-0 rounded-full outline-none ring-primary focus-visible:ring-2"
                        onClick={() => setView('profile', { profileUserId: user.id })}
                      >
                        <LfAvatar name={user.name} src={user.profileImage} className="size-12" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="block max-w-full truncate text-left text-sm font-semibold hover:underline"
                          onClick={() => setView('profile', { profileUserId: user.id })}
                        >
                          {user.name}
                        </button>
                        <p className="truncate text-xs text-muted-foreground">
                          {[user.department, user.year].filter(Boolean).join(' · ') || user.college}
                        </p>
                      </div>
                      {typeof user.matchScore === 'number' && <MatchRing score={user.matchScore} size={56} />}
                    </div>
                    {connection.message && (
                      <div className="mt-3 flex gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                        <Quote className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <p className="text-sm italic text-muted-foreground">{connection.message}</p>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button className="min-h-11 flex-1 gap-1.5 sm:flex-none" onClick={() => accept(connection.id)}>
                        <UserCheck className="size-4" aria-hidden /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => reject(connection.id)}
                      >
                        <X className="size-4" aria-hidden /> Reject
                      </Button>
                      <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(connection.createdAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── Sent requests ── */}
        <TabsContent value="sent">
          {loading ? (
            <CardsSkeleton count={2} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : sent.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No sent requests"
              description="Found someone great? Send a connection request with a short intro note."
              action={
                <Button onClick={() => setView('discover')} className="min-h-11 gap-1.5">
                  <Users className="size-4" aria-hidden /> Discover students
                </Button>
              }
            />
          ) : (
            <div className="grid max-h-96 gap-4 overflow-y-auto lf-scroll pr-1 md:max-h-none md:overflow-visible md:grid-cols-2">
              <AnimatePresence initial={false}>
                {sent.map(({ connection, user }) => (
                  <motion.div
                    key={connection.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={`View ${user.name}'s profile`}
                        className="shrink-0 rounded-full outline-none ring-primary focus-visible:ring-2"
                        onClick={() => setView('profile', { profileUserId: user.id })}
                      >
                        <LfAvatar name={user.name} src={user.profileImage} className="size-12" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="block max-w-full truncate text-left text-sm font-semibold hover:underline"
                          onClick={() => setView('profile', { profileUserId: user.id })}
                        >
                          {user.name}
                        </button>
                        <p className="truncate text-xs text-muted-foreground">
                          {[user.department, user.year].filter(Boolean).join(' · ') || user.college}
                        </p>
                      </div>
                      {typeof user.matchScore === 'number' && <MatchRing score={user.matchScore} size={56} />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1 border-white/[0.16] bg-white/[0.08] text-foreground">
                        <Ban className="size-3" aria-hidden /> Pending
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">Sent {timeAgo(connection.createdAt)}</span>
                    </div>
                    {connection.message && (
                      <div className="mt-3 flex gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                        <Quote className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <p className="line-clamp-2 text-sm italic text-muted-foreground">{connection.message}</p>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        className="min-h-11 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => cancel(connection.id)}
                      >
                        <X className="size-4" aria-hidden /> Cancel request
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Remove connection confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove connection?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be connected with {removeTarget?.name ?? 'this student'}. You won&apos;t be able to message
              or schedule sessions with each other anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Keep connection</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removing}
              onClick={(e) => { e.preventDefault(); removeConnection() }}
            >
              {removing ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
