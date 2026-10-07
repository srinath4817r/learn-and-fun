'use client'

// ─── Learn & Fun — Mono Glass navigation system ───
// Desktop: floating glass sidebar · Mobile: floating top bar + bottom glass nav
import * as React from 'react'
import {
  Bell, Bookmark, CalendarCheck, Compass, GraduationCap, HeartHandshake,
  Home, LogOut, MessageCircle, Moon, ShieldCheck, Sun, User,
  UserPlus, Trophy,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LfAvatar, NAV_MAIN } from '@/components/lf/shared'
import { useLF } from '@/lib/lf/store'
import { cn } from '@/lib/utils'
import type { ViewName } from '@/lib/lf/types'
import { xpLevel } from '@/lib/lf/utils'

// ─── Theme toggle (mounted guard avoids hydration mismatch) ───
function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme !== 'light'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn('size-11 rounded-full text-muted-foreground hover:text-foreground', className)}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </Button>
  )
}

// ─── White unread counter bubble ───
function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden
      className={cn(
        'absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold leading-none text-background shadow-sm',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ─── Brand logo lockup ───
export function BrandMark({ onClick, compact }: { onClick?: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Learn & Fun — home"
      className="flex min-h-11 items-center gap-2.5 rounded-2xl pr-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="lf-logo flex size-9 shrink-0 items-center justify-center rounded-xl">
        <GraduationCap className="size-5 text-black dark:text-black" aria-hidden />
      </span>
      {!compact && (
        <span className="whitespace-nowrap text-base font-bold tracking-tight max-[420px]:hidden">
          Learn <span className="lf-brand-text">&amp; Fun</span>
        </span>
      )}
    </button>
  )
}

// ─── Public navbar (landing / login / register) ───
export function PublicNavbar() {
  const { setView } = useLF()
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="lf-glass-strong mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-2xl px-3 sm:px-4">
        <BrandMark onClick={() => setView('landing')} />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="size-10" />
          <Button
            variant="ghost"
            onClick={() => setView('login')}
            className="min-h-11 rounded-full px-3 font-medium sm:px-4"
          >
            Log in
          </Button>
          <Button
            onClick={() => setView('register')}
            className="min-h-11 rounded-full px-3.5 font-semibold sm:px-5"
          >
            Get started
          </Button>
        </div>
      </div>
    </header>
  )
}

// ─── Desktop floating glass sidebar ───
const NAV_ICONS: Record<string, React.ElementType> = {
  dashboard: Home,
  discover: Compass,
  matches: HeartHandshake,
  leaderboard: Trophy,
  goals: GraduationCap,
  sessions: CalendarCheck,
  messages: MessageCircle,
  profile: User,
}

const NAV_SECONDARY: { view: ViewName; label: string; icon: React.ElementType }[] = [
  { view: 'connections', label: 'Connections', icon: UserPlus },
  { view: 'notifications', label: 'Notifications', icon: Bell },
  { view: 'saved', label: 'Saved', icon: Bookmark },
]

export function AppSidebar() {
  const { user, view, setView, logout } = useLF()
  if (!user) return null
  const { level } = xpLevel(user.xp)

  const item = (
    active: boolean,
    label: string,
    Icon: React.ElementType,
    go: () => void,
    badge?: number,
  ) => (
    <button
      key={label}
      type="button"
      onClick={go}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border border-white/[0.18] bg-white/[0.12] text-foreground'
          : 'border border-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
      )}
    >
      <Icon className={cn('size-[18px] shrink-0', active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} aria-hidden />
      <span className="truncate">{label}</span>
      {!!badge && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )

  return (
    <aside className="sticky top-0 z-40 hidden h-dvh w-[264px] shrink-0 p-4 md:block" aria-label="Primary">
      <div className="lf-glass-strong flex h-full flex-col rounded-3xl p-3">
        <div className="px-2 pb-3 pt-1">
          <BrandMark onClick={() => setView('dashboard')} />
        </div>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto lf-scroll">
          {NAV_MAIN.map((n) =>
            item(view === n.view, n.label, NAV_ICONS[n.view] ?? Home, () => setView(n.view),
              n.view === 'messages' ? user.unreadMessages : undefined),
          )}

          <div className="mx-3 my-3 border-t border-white/[0.08]" aria-hidden />

          {NAV_SECONDARY.map((n) =>
            item(view === n.view, n.label, n.icon, () => setView(n.view),
              n.view === 'notifications' ? user.unreadNotifications : undefined),
          )}
          {user.role === 'ADMIN' &&
            item(view === 'admin', 'Admin', ShieldCheck, () => setView('admin'))}
        </nav>

        <div className="mt-2 space-y-1 border-t border-white/[0.08] pt-3">
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle className="size-10" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              className="size-10 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => void logout()}
            >
              <LogOut className="size-4.5" aria-hidden />
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setView('profile')}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.05] p-2.5 text-left outline-none transition-colors hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LfAvatar name={user.name} src={user.profileImage} className="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block text-[11px] text-muted-foreground">Level {level} · {user.xp} XP</span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Mobile floating top bar ───
export function MobileTopbar() {
  const { user, setView, logout } = useLF()
  if (!user) return null
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:hidden">
      <div className="lf-glass-strong flex h-14 items-center justify-between rounded-2xl px-3">
        <BrandMark onClick={() => setView('dashboard')} compact />
        <span className="text-sm font-bold tracking-tight">Learn <span className="lf-brand-text">&amp; Fun</span></span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setView('notifications')}
            aria-label={`Notifications${user.unreadNotifications > 0 ? ` (${user.unreadNotifications} unread)` : ''}`}
            className="relative inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="size-5" aria-hidden />
            <UnreadBadge count={user.unreadNotifications} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open account menu"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LfAvatar name={user.name} src={user.profileImage} className="size-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('profile')}>
                <User className="size-4 text-muted-foreground" aria-hidden /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('goals')}>
                <GraduationCap className="size-4 text-muted-foreground" aria-hidden /> My Learning
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('sessions')}>
                <CalendarCheck className="size-4 text-muted-foreground" aria-hidden /> Sessions
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('leaderboard')}>
                <Trophy className="size-4 text-muted-foreground" aria-hidden /> Leaderboard
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('connections')}>
                <UserPlus className="size-4 text-muted-foreground" aria-hidden /> Connections
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('saved')}>
                <Bookmark className="size-4 text-muted-foreground" aria-hidden /> Saved
              </DropdownMenuItem>
              {user.role === 'ADMIN' && (
                <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setView('admin')}>
                  <ShieldCheck className="size-4 text-muted-foreground" aria-hidden /> Admin dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <ThemeMenuItem />
              <DropdownMenuItem
                className="min-h-11 gap-2.5 text-destructive focus:text-destructive"
                onClick={() => void logout()}
              >
                <LogOut className="size-4" aria-hidden /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function ThemeMenuItem() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme !== 'light'
  return (
    <DropdownMenuItem className="min-h-11 gap-2.5" onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun className="size-4 text-muted-foreground" aria-hidden /> : <Moon className="size-4 text-muted-foreground" aria-hidden />}
      {dark ? 'Light mode' : 'Dark mode'}
    </DropdownMenuItem>
  )
}

// ─── Mobile floating bottom glass navigation ───
const MOBILE_TABS = [
  { view: 'dashboard', label: 'Home', icon: Home },
  { view: 'discover', label: 'Discover', icon: Compass },
  { view: 'matches', label: 'Matches', icon: HeartHandshake },
  { view: 'messages', label: 'Messages', icon: MessageCircle },
  { view: 'profile', label: 'Profile', icon: User },
] as const

export function MobileNav() {
  const { user, view, setView } = useLF()
  if (!user) return null
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 md:hidden"
    >
      <div className="lf-glass-strong mx-auto grid max-w-md grid-cols-5 rounded-2xl">
        {MOBILE_TABS.map((tab) => {
          const active = view === tab.view
          const Icon = tab.icon
          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => setView(tab.view)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {tab.view === 'messages' && user.unreadMessages > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background"
                  >
                    {user.unreadMessages > 9 ? '9+' : user.unreadMessages}
                  </span>
                )}
              </span>
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>{tab.label}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute -top-px h-0.5 w-8 rounded-full bg-foreground"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Legacy alias
export const Navbar = PublicNavbar
