'use client'

// ─── Learn & Fun — Admin command center ───
import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert, ShieldCheck, RefreshCw, Users, UserCheck, Layers, Link2, CalendarClock, Target,
  Search, MoreVertical, Ban, RotateCcw, Trash2, Plus, Pencil, Megaphone, Loader2, Check, X,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { EmptyState, ErrorState, StatCard, PageHeader, LfAvatar } from '@/components/lf/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type {
  AdminStatsDTO, AdminUserDTO, AdminReportDTO, AnnouncementDTO, SkillCatalogCategory,
} from '@/lib/lf/types'
import { timeAgo, formatDate, formatDateTime } from '@/lib/lf/utils'
import { cn } from '@/lib/utils'

type AdminTab = 'overview' | 'users' | 'skills' | 'reports' | 'announcements'

const CHART_COLORS = ['#ffffff', '#bdbdbd', '#8a8a8a', '#565656', '#333333']
function chartColor(i: number) {
  return CHART_COLORS[i % CHART_COLORS.length] ?? '#ffffff'
}

// Monochrome tooltip / cursor config for all admin charts
const CHART_TOOLTIP = {
  contentStyle: {
    background: 'rgba(16,16,16,0.95)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12,
    color: '#fff',
  },
  labelStyle: { color: '#a6a6a6' },
  itemStyle: { color: '#fff' },
  cursor: { fill: 'rgba(255,255,255,0.06)' },
} as const

// ────────────────────────────────────────────────────────────────────
export function AdminView() {
  const user = useLF((s) => s.user)
  if (user?.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admin access required"
        description="This area is only for platform administrators."
      />
    )
  }
  return <AdminDashboard />
}

// ─── Dashboard shell ───────────────────────────────────────────────
function AdminDashboard() {
  const [tab, setTab] = React.useState<AdminTab>('overview')
  const [stats, setStats] = React.useState<AdminStatsDTO | null>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [statsError, setStatsError] = React.useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  const loadStats = React.useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const d = await api.get<AdminStatsDTO>('/api/admin/stats')
      setStats(d)
      setLastUpdated(new Date())
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to load platform stats')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  React.useEffect(() => { void loadStats() }, [loadStats])

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={lastUpdated ? `Last updated ${formatDateTime(lastUpdated.toISOString())}` : 'Loading platform metrics…'}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadStats()}
            disabled={statsLoading}
            className="gap-1.5"
            aria-label="Refresh dashboard data"
          >
            {statsLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Refresh
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>
        <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto sm:w-auto sm:flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={loadStats}
            onOpenReports={() => setTab('reports')}
          />
        </TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="skills"><SkillsTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Overview tab ──────────────────────────────────────────────────
function OverviewTab({ stats, loading, error, onRetry, onOpenReports }: {
  stats: AdminStatsDTO | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onOpenReports: () => void
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (loading || !stats) {
    return (
      <div aria-busy="true" aria-label="Loading stats">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const c = stats.charts

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total students" value={stats.cards.totalStudents} />
        <StatCard icon={UserCheck} label="Active users" value={stats.cards.activeUsers} hint={`${stats.cards.suspendedUsers} suspended`} />
        <StatCard icon={Layers} label="Total skills" value={stats.cards.totalSkills} />
        <StatCard icon={Link2} label="Connections" value={stats.cards.totalConnections} />
        <StatCard icon={CalendarClock} label="Sessions" value={stats.cards.totalSessions} />
        <button
          type="button"
          onClick={onOpenReports}
          aria-label={`Open reports tab — ${stats.cards.openReports} open reports`}
          className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard icon={ShieldAlert} label="Open reports" value={stats.cards.openReports} hint={stats.cards.openReports > 0 ? 'Tap to review' : 'All clear'} />
        </button>
        <StatCard icon={Target} label="Total goals" value={stats.cards.totalGoals} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="User growth">
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={c.userGrowth} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="lfGradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip {...CHART_TOOLTIP} />
              <Area type="monotone" dataKey="count" name="New users" stroke="#ffffff" strokeWidth={2} fill="url(#lfGradUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Popular skills">
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={c.popularSkills} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} width={110} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" name="Students" fill="#bdbdbd" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sessions over time">
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={c.sessionsOverTime} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="count" name="Sessions" fill="#8a8a8a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Connections over time">
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={c.connectionsOverTime} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="lfGradConns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#bdbdbd" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#bdbdbd" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip {...CHART_TOOLTIP} />
              <Area type="monotone" dataKey="count" name="Connections" stroke="#bdbdbd" strokeWidth={2} fill="url(#lfGradConns)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most active students">
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={c.topStudents} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#a6a6a6' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={(v: string) => v.split(' ')[0] ?? v}
              />
              <YAxis tick={{ fontSize: 11, fill: '#a6a6a6' }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="xp" name="XP" fill="#8a8a8a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Departments">
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Tooltip {...CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#a6a6a6' }} />
              <Pie data={c.departmentDistribution} dataKey="count" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {c.departmentDistribution.map((entry, i) => (
                  <Cell key={entry.name} fill={chartColor(i)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </motion.div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  )
}

// ─── Users tab ─────────────────────────────────────────────────────
function UsersTab() {
  const [q, setQ] = React.useState('')
  const [debouncedQ, setDebouncedQ] = React.useState('')
  const [status, setStatus] = React.useState('ALL')
  const [users, setUsers] = React.useState<AdminUserDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [suspendTarget, setSuspendTarget] = React.useState<AdminUserDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUserDTO | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQ) params.set('q', debouncedQ)
      if (status !== 'ALL') params.set('status', status)
      const qs = params.toString()
      const d = await api.get<{ users: AdminUserDTO[] }>(`/api/admin/users${qs ? `?${qs}` : ''}`)
      setUsers(d.users)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [debouncedQ, status])

  React.useEffect(() => { void load() }, [load])

  async function confirmSuspend() {
    if (!suspendTarget) return
    const u = suspendTarget
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    setSuspendTarget(null)
    setBusyId(u.id)
    try {
      await api.patch(`/api/admin/users/${u.id}`, { status: next })
      toast.success(next === 'SUSPENDED' ? `${u.name} has been suspended` : `${u.name} has been reactivated`)
      await load(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update user status')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const u = deleteTarget
    setDeleteTarget(null)
    setBusyId(u.id)
    try {
      await api.del(`/api/admin/users/${u.id}`)
      toast.success(`${u.name} has been deleted`)
      await load(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete user')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
            aria-label="Search users by name or email"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && !users ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading users">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : users && users.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No students found"
          description="Try a different search term or status filter."
        />
      ) : (
        <div className="lf-surface overflow-hidden rounded-2xl">
          <Table className="[&_tr]:border-white/[0.06] [&_tr:hover]:bg-white/[0.04]">
            <TableHeader className="bg-white/[0.06]">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Dept · Year</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="text-right">Skills</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full max-w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <LfAvatar name={u.name} className="size-8" />
                          <span className="whitespace-nowrap font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {u.department}{u.year ? ` · ${u.year}` : ''}
                      </TableCell>
                      <TableCell>
                        {u.role === 'ADMIN' ? (
                          <Badge variant="outline" className="border-white/[0.14] bg-white/[0.12] text-foreground">{u.role}</Badge>
                        ) : (
                          <Badge variant="secondary">{u.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{u.xp}</TableCell>
                      <TableCell className="text-right">{u.skillsCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        {u.status === 'ACTIVE' ? (
                          <Badge variant="secondary">{u.status}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                            {u.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={busyId === u.id}
                              aria-label={`Manage ${u.name}`}
                            >
                              {busyId === u.id
                                ? <Loader2 className="size-4 animate-spin" aria-hidden />
                                : <MoreVertical className="size-4" aria-hidden />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={u.role === 'ADMIN' || u.status === 'SUSPENDED'}
                              onClick={() => setSuspendTarget(u)}
                              className="gap-2"
                            >
                              <Ban className="size-4" aria-hidden /> Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={u.role === 'ADMIN' || u.status === 'ACTIVE'}
                              onClick={() => setSuspendTarget(u)}
                              className="gap-2"
                            >
                              <RotateCcw className="size-4" aria-hidden /> Reactivate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={u.role === 'ADMIN'}
                              onClick={() => setDeleteTarget(u)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4" aria-hidden /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Suspend / reactivate confirm */}
      <AlertDialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'} {suspendTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.status === 'ACTIVE'
                ? 'They will be unable to sign in or interact with the platform until reactivated.'
                : 'They will regain full access to the platform immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmSuspend()}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the student and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Skills tab ────────────────────────────────────────────────────
function SkillsTab() {
  const [categories, setCategories] = React.useState<SkillCatalogCategory[] | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [newSkill, setNewSkill] = React.useState('')
  const [addingSkill, setAddingSkill] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [deleteSkill, setDeleteSkill] = React.useState<{ id: string; name: string } | null>(null)
  const [catDialogOpen, setCatDialogOpen] = React.useState(false)
  const [newCat, setNewCat] = React.useState('')
  const [addingCat, setAddingCat] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.get<{ categories: SkillCatalogCategory[] }>('/api/skills')
      setCategories(d.categories)
      setSelectedId((prev) => (prev && d.categories.some((c) => c.id === prev) ? prev : d.categories[0]?.id ?? null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load skill catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const selected = categories?.find((c) => c.id === selectedId) ?? null

  async function addSkill() {
    const name = newSkill.trim()
    if (!name || !selectedId) return
    setAddingSkill(true)
    try {
      await api.post('/api/admin/skills', { name, categoryId: selectedId })
      toast.success(`Skill "${name}" added`)
      setNewSkill('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add skill')
    } finally {
      setAddingSkill(false)
    }
  }

  async function saveRename() {
    if (!editingId) return
    const name = editName.trim()
    if (!name) { setEditingId(null); return }
    try {
      await api.patch(`/api/admin/skills/${editingId}`, { name })
      toast.success('Skill renamed')
      setEditingId(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not rename skill')
    }
  }

  async function confirmDeleteSkill() {
    if (!deleteSkill) return
    const { id, name } = deleteSkill
    setDeleteSkill(null)
    try {
      await api.del(`/api/admin/skills/${id}`)
      toast.success(`Skill "${name}" deleted`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete skill')
    }
  }

  async function addCategory() {
    const name = newCat.trim()
    if (!name) return
    setAddingCat(true)
    try {
      const d = await api.post<{ category: { id: string } }>('/api/admin/categories', { name })
      toast.success(`Category "${name}" created`)
      setNewCat('')
      setCatDialogOpen(false)
      await load()
      setSelectedId(d.category.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add category')
    } finally {
      setAddingCat(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  if (loading || !categories) {
    return (
      <div className="grid gap-4 md:grid-cols-[240px_1fr]" aria-busy="true" aria-label="Loading skills">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Categories pane */}
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-3 backdrop-blur-md">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
          <div className="lf-scroll max-h-96 space-y-1 overflow-y-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setSelectedId(c.id); setEditingId(null) }}
                aria-pressed={c.id === selectedId}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition',
                  c.id === selectedId
                    ? 'bg-primary font-medium text-primary-foreground'
                    : 'hover:bg-white/[0.06]',
                )}
              >
                <span className="truncate">{c.name}</span>
                <span className={cn('shrink-0 text-xs', c.id === selectedId ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {c.skills.length}
                </span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5" onClick={() => setCatDialogOpen(true)}>
            <Plus className="size-4" aria-hidden /> Add category
          </Button>
        </div>

        {/* Skills pane */}
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md">
          {selected ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void addSkill() }}
                  placeholder={`New skill in ${selected.name}…`}
                  aria-label="New skill name"
                  className="flex-1"
                  maxLength={60}
                />
                <Button onClick={() => void addSkill()} disabled={addingSkill || !newSkill.trim()} className="gap-1.5">
                  {addingSkill ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                  Add skill
                </Button>
              </div>

              <div className="lf-scroll mt-3 max-h-96 space-y-1 overflow-y-auto" role="list">
                {selected.skills.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No skills in this category yet. Add the first one above.
                  </p>
                ) : (
                  selected.skills.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2" role="listitem">
                      {editingId === s.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void saveRename()
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="h-8 flex-1"
                            autoFocus
                            aria-label="Edit skill name"
                            maxLength={60}
                          />
                          <Button size="icon" className="size-8 shrink-0" onClick={() => void saveRename()} aria-label="Save skill name">
                            <Check className="size-4" aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setEditingId(null)} aria-label="Cancel renaming">
                            <X className="size-4" aria-hidden />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                            aria-label={`Rename ${s.name}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteSkill({ id: s.id, name: s.name })}
                            aria-label={`Delete ${s.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <EmptyState icon={Layers} title="No categories" description="Create a category to start organizing skills." />
          )}
        </div>
      </div>

      {/* Delete skill confirm */}
      <AlertDialog open={!!deleteSkill} onOpenChange={(o) => !o && setDeleteSkill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteSkill?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              If students have added this skill to their profiles, it cannot be deleted and the server will block the request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteSkill()} className="bg-destructive text-white hover:bg-destructive/90">
              Delete skill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>Group related skills under a new category.</DialogDescription>
          </DialogHeader>
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void addCategory() }}
            placeholder="Category name (e.g. Music)"
            aria-label="Category name"
            maxLength={60}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void addCategory()} disabled={addingCat || !newCat.trim()} className="gap-1.5">
              {addingCat ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Reports tab ───────────────────────────────────────────────────
const REPORT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'] as const

function ReportsTab() {
  const [reports, setReports] = React.useState<AdminReportDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState('ALL')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.get<{ reports: AdminReportDTO[] }>('/api/admin/reports')
      setReports(d.reports)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const filtered = reports?.filter((r) => statusFilter === 'ALL' || r.status === statusFilter) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {reports ? `${filtered.length} of ${reports.length} report${reports.length === 1 ? '' : 's'}` : 'Loading…'}
        </p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" aria-label="Filter reports by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {REPORT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading reports">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : reports && reports.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No reports — the community is healthy!"
          description="When students report issues, they will appear here for review."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing matches this filter"
          description="Try a different status to see more reports."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <ReportCard key={r.id} report={r} onUpdated={() => void load()} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report, onUpdated }: { report: AdminReportDTO; onUpdated: () => void }) {
  const [status, setStatus] = React.useState(report.status)
  const [notes, setNotes] = React.useState(report.adminNotes)
  const [saving, setSaving] = React.useState(false)

  async function persist(nextStatus: string, nextNotes: string) {
    setSaving(true)
    try {
      await api.patch(`/api/admin/reports/${report.id}`, { status: nextStatus, adminNotes: nextNotes })
      toast.success('Report updated')
      onUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update report')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-white/[0.12] bg-white/[0.08] text-foreground">
          {report.reason}
        </Badge>
        <span className="text-xs text-muted-foreground">{timeAgo(report.createdAt)}</span>
        <div className="ml-auto">
          <Select
            value={status}
            onValueChange={(v) => { setStatus(v); void persist(v, notes.trim()) }}
            disabled={saving}
          >
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="Report status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm">
        <span className="font-medium">{report.reporter.name}</span>
        <span className="text-muted-foreground"> reported </span>
        <span className="font-medium">{report.reportedUser.name}</span>
        <span className="text-xs text-muted-foreground"> · {report.reportedUser.email}</span>
      </p>

      {report.description && (
        <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm leading-snug text-foreground/80">{report.description}</p>
      )}

      <div className="space-y-2">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Admin notes (visible only to moderators)…"
          rows={2}
          className="resize-none text-sm"
          aria-label={`Admin notes for report on ${report.reportedUser.name}`}
          maxLength={500}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void persist(status, notes.trim())}
            disabled={saving || notes.trim() === report.adminNotes}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            Save notes
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Announcements tab ─────────────────────────────────────────────
function AnnouncementsTab() {
  const [items, setItems] = React.useState<AnnouncementDTO[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [publishing, setPublishing] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AnnouncementDTO | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.get<{ announcements: AnnouncementDTO[] }>('/api/admin/announcements')
      setItems(d.announcements)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  async function publish() {
    const t = title.trim()
    const b = body.trim()
    if (!t || !b) { toast.error('Title and body are required'); return }
    setPublishing(true)
    try {
      await api.post('/api/admin/announcements', { title: t, body: b })
      toast.success('Announcement published — all students notified.')
      setTitle('')
      setBody('')
      setDialogOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not publish announcement')
    } finally {
      setPublishing(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { id, title: t } = deleteTarget
    setDeleteTarget(null)
    try {
      await api.del(`/api/admin/announcements/${id}`)
      toast.success('Announcement deleted')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete announcement')
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />

  const previewTitle = title.trim() || items?.[0]?.title || 'Announcement title'
  const previewBody = body.trim() || items?.[0]?.body || 'Your announcement body will appear here for every student on the platform.'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* List */}
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New announcement
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading announcements">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : items && items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Publish your first announcement to keep every student informed."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
                <Plus className="size-4" aria-hidden /> Create announcement
              </Button>
            }
          />
        ) : (
          <div className="lf-scroll max-h-[32rem] space-y-3 overflow-y-auto pr-1">
            {items?.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(a)}
                    aria-label={`Delete announcement "${a.title}"`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {a.authorName} · {timeAgo(a.createdAt)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
        <div className="lf-glass rounded-2xl border p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.08] p-2.5 text-foreground">
              <Megaphone className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{previewTitle}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-muted-foreground">{previewBody}</p>
              <p className="mt-3 text-xs text-muted-foreground">Learn &amp; Fun Team · just now</p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This is how the announcement appears on student dashboards.
        </p>
      </div>

      {/* Publish dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
            <DialogDescription>Every student will receive a notification instantly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Mid-term skill sprint starts Monday)"
              aria-label="Announcement title"
              maxLength={120}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the announcement body…"
              rows={5}
              className="resize-none"
              aria-label="Announcement body"
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void publish()} disabled={publishing || !title.trim() || !body.trim()} className="gap-1.5">
              {publishing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Megaphone className="size-4" aria-hidden />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Students will no longer see this announcement. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
