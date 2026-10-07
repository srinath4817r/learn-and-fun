'use client'

// ─── Learn & Fun — site footer (sticks to bottom via mt-auto) ───
import * as React from 'react'
import { GraduationCap } from 'lucide-react'
import { useLF } from '@/lib/lf/store'

export function Footer() {
  const user = useLF((s) => s.user)
  const setView = useLF((s) => s.setView)
  const year = React.useMemo(() => new Date().getFullYear(), [])

  const links: { label: string; go: () => void }[] = [
    { label: 'Discover', go: () => setView(user ? 'discover' : 'login') },
    { label: 'Matches', go: () => setView(user ? 'matches' : 'login') },
    { label: 'Leaderboard', go: () => setView(user ? 'leaderboard' : 'login') },
    { label: 'About', go: () => setView('landing') },
  ]

  return (
    <footer className="mt-auto pb-20 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-10 md:pb-10">
        <div className="lf-glass rounded-3xl px-6 py-8 md:px-10">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand */}
            <div>
              <button
                type="button"
                onClick={() => setView(user ? 'dashboard' : 'landing')}
                aria-label={user ? 'Go to dashboard' : 'Learn & Fun — home'}
                className="flex min-h-11 items-center gap-2.5 rounded-2xl pr-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="lf-logo flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <GraduationCap className="size-5 text-black" aria-hidden />
                </span>
                <span className="whitespace-nowrap text-base font-bold tracking-tight">
                  Learn <span className="lf-brand-text">&amp; Fun</span>
                </span>
              </button>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Learn Something. Share Something. Have Fun. — the peer-to-peer skill exchange built
                for college campuses.
              </p>
            </div>

            {/* Quick links */}
            <nav aria-label="Footer">
              <p className="text-sm font-semibold">Explore</p>
              <ul className="mt-2 space-y-1">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={link.go}
                      className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Meta */}
            <div>
              <p className="text-sm font-semibold">Learn &amp; Fun</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Built for college communities. Trade skills, not money — every student has
                something worth teaching.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                © {year} Learn &amp; Fun. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
