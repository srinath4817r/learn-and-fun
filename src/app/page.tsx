'use client'

// ─── Learn & Fun — single-route application shell (Mono Glass) ───
// All navigation happens through the zustand store (SPA pattern).
import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { useLF } from '@/lib/lf/store'
import { AppSidebar, MobileNav, MobileTopbar, PublicNavbar } from '@/components/lf/navbar'
import { Footer } from '@/components/lf/footer'
import { ConnectDialog } from '@/components/lf/shared'
import { LandingView } from '@/components/lf/views/landing'
import { AuthView } from '@/components/lf/views/auth'
import { OnboardingView } from '@/components/lf/views/onboarding'
import { DashboardView } from '@/components/lf/views/dashboard'
import { DiscoverView } from '@/components/lf/views/discover'
import { MatchesView } from '@/components/lf/views/matches'
import { ProfileView } from '@/components/lf/views/profile'
import { ConnectionsView } from '@/components/lf/views/connections'
import { MessagesView } from '@/components/lf/views/messages'
import { SessionsView } from '@/components/lf/views/sessions'
import { GoalsView } from '@/components/lf/views/goals'
import { LeaderboardView } from '@/components/lf/views/leaderboard'
import { NotificationsView } from '@/components/lf/views/notifications'
import { SavedView } from '@/components/lf/views/saved'
import { AdminView } from '@/components/lf/views/admin'

const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
}

function Splash() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="lf-logo flex size-16 items-center justify-center rounded-2xl"
      >
        <GraduationCap className="size-9 text-black" aria-hidden />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm font-medium text-muted-foreground"
      >
        Learn &amp; Fun
      </motion.p>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export default function Page() {
  const { booted, user, view, boot } = useLF()

  React.useEffect(() => {
    boot()
  }, [boot])

  React.useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  if (!booted) return <Splash />

  // ─── Public (logged out) ───
  if (!user) {
    const publicView =
      view === 'login' ? (
        <AuthView mode="login" />
      ) : view === 'register' ? (
        <AuthView mode="register" />
      ) : (
        <LandingView />
      )
    return (
      <div className="flex w-full flex-col min-h-[100dvh]">
        <PublicNavbar />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={view} {...pageMotion}>
              {publicView}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    )
  }

  // ─── Onboarding gate ───
  if (!user.onboarded || view === 'onboarding') {
    return <OnboardingView />
  }

  // ─── Authenticated app shell: floating sidebar + content ───
  const appViews: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    discover: <DiscoverView />,
    matches: <MatchesView />,
    connections: <ConnectionsView />,
    messages: <MessagesView />,
    sessions: <SessionsView />,
    goals: <GoalsView />,
    leaderboard: <LeaderboardView />,
    notifications: <NotificationsView />,
    saved: <SavedView />,
    profile: <ProfileView />,
    admin: <AdminView />,
  }

  return (
    <div className="flex w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="w-full flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              {...pageMotion}
              className="min-h-[calc(100dvh-5rem)] px-4 pb-32 pt-4 md:px-8 md:pb-10 md:pt-6"
            >
              {appViews[view] ?? <DashboardView />}
            </motion.div>
          </AnimatePresence>
        </main>
        <MobileNav />
        <ConnectDialog />
      </div>
    </div>
  )
}
