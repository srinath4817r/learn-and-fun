'use client'

// ─── Learn & Fun — public landing page (the showpiece · MONO GLASS) ───
import * as React from 'react'
import {
  animate, motion, useInView, useMotionValue, useSpring, useTransform,
} from 'framer-motion'
import {
  ArrowLeftRight, ArrowRight, Award, BookOpen, Braces, Camera, Check, Code2, Coffee,
  GraduationCap, Handshake, HeartHandshake, Landmark, ListChecks, Mic, Palette,
  Percent, ShieldCheck, Sparkles, Sprout, Star, Trophy, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LfAvatar, MatchReasons, MatchRing, Stars } from '@/components/lf/shared'
import { useLF } from '@/lib/lf/store'
import { INITIAL_CATEGORIES } from '@/lib/lf/initial-skills'
import type { ViewName } from '@/lib/lf/types'
import { cn } from '@/lib/utils'

// Numbers computed from the seeded skill catalog literal — no data fetching
const SKILL_COUNT = INITIAL_CATEGORIES.reduce((n, c) => n + c.skills.length, 0)
const CATEGORY_COUNT = INITIAL_CATEGORIES.length

// ─── Scroll-reveal wrapper ───
function Reveal({
  children, delay = 0, className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ─── Section heading ───
function SectionHead({
  id, eyebrow, title, sub,
}: {
  id: string
  eyebrow: string
  title: React.ReactNode
  sub?: string
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <h2 id={id} className="lf-h2 mt-3">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{sub}</p>}
    </Reveal>
  )
}

// ─── Animated counter (springs up when scrolled into view) ───
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  React.useEffect(() => {
    if (!inView || !ref.current) return
    const controls = animate(0, to, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`
      },
    })
    return () => controls.stop()
  }, [inView, to, suffix])
  return <span ref={ref}>0{suffix}</span>
}

// ─── Hero visual: floating mono glass cards around the GraduationCap logo tile ───
const FLOAT_CARDS: { label: string; sub?: string; icon: React.ElementType; pos: string }[] = [
  { label: 'Teach JavaScript', sub: 'Can teach', icon: Braces, pos: 'left-0 top-[0%]' },
  { label: 'Learn UI/UX', sub: 'Wants to learn', icon: Palette, pos: 'right-0 top-[18%]' },
  { label: 'Python', icon: Code2, pos: 'left-[4%] top-[52%]' },
  { label: 'Public Speaking', icon: Mic, pos: 'right-[0%] top-[64%]' },
]

const CIRCLE_MATES = ['Aarav Patel', 'Meera Nair', 'Sara Iqbal']

function HeroVisual() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.7 })
  const sy = useSpring(my, { stiffness: 55, damping: 18, mass: 0.7 })
  const logoX = useTransform(sx, (v) => -v * 0.55)
  const logoY = useTransform(sy, (v) => -v * 0.55)
  const finePointer = React.useRef(false)
  React.useEffect(() => {
    finePointer.current = window.matchMedia('(pointer: fine)').matches
  }, [])

  return (
    <div
      aria-hidden
      className="relative mx-auto h-[380px] w-full max-w-[520px] sm:h-[440px]"
      onMouseMove={(e) => {
        if (!finePointer.current) return
        const r = e.currentTarget.getBoundingClientRect()
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 24)
        my.set(((e.clientY - r.top) / r.height - 0.5) * 18)
      }}
      onMouseLeave={() => {
        mx.set(0)
        my.set(0)
      }}
    >
      {/* soft white glow behind the logo tile */}
      <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-3xl" />

      {/* centerpiece logo tile */}
      <motion.div style={{ x: logoX, y: logoY }} className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
          className="lf-logo flex size-24 items-center justify-center rounded-[2rem] sm:size-36"
        >
          <GraduationCap className="size-11 text-primary-foreground sm:size-16" />
        </motion.div>
      </motion.div>

      {/* floating glass cards (parallax layer) */}
      <motion.div style={{ x: sx, y: sy }} className="absolute inset-0">
        {FLOAT_CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={cn('absolute z-10', card.pos)}>
              <div
                className="lf-float"
                style={{ animationDelay: `${-1.7 * i}s`, animationDuration: `${6.5 + (i % 3) * 1.4}s` }}
              >
                <div className="lf-glass flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-xs font-semibold sm:text-sm">{card.label}</span>
                    {card.sub && (
                      <span className="block text-[11px] leading-tight text-muted-foreground">{card.sub}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* learning circle card with avatar stack */}
        <div className="absolute bottom-[0%] left-1/2 z-10 -translate-x-1/2">
          <div className="lf-float" style={{ animationDelay: '-4.8s', animationDuration: '8s' }}>
            <div className="lf-glass flex items-center gap-3 rounded-2xl px-4 py-3">
              <div className="flex -space-x-2.5">
                {CIRCLE_MATES.map((mate) => (
                  <LfAvatar key={mate} name={mate} className="size-7 ring-2 ring-background" />
                ))}
              </div>
              <span>
                <span className="block whitespace-nowrap text-xs font-bold sm:text-sm">Find Your Learning Circle</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">4 students matched for you</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Section data ───
const STEPS = [
  {
    n: '01',
    icon: BookOpen,
    title: 'Tell us what you want to learn',
    body: 'Pick skills and your comfort level — from Python to public speaking. We use this to understand your goals.',
  },
  {
    n: '02',
    icon: GraduationCap,
    title: 'Share what you can teach',
    body: 'List the skills you already know. Everyone has something worth sharing — even at an intermediate level.',
  },
  {
    n: '03',
    icon: HeartHandshake,
    title: 'Match, connect and learn together',
    body: 'We pair you with students whose skills complement yours. Send a request, book a session, swap knowledge.',
  },
]

const LANDING_CATEGORIES: { name: string; icon: React.ElementType }[] = [
  { name: 'Programming', icon: Code2 },
  { name: 'Design', icon: Palette },
  { name: 'Creative', icon: Camera },
  { name: 'Communication', icon: Mic },
  { name: 'Lifestyle', icon: Coffee },
]

const EXCHANGE_POINTS = [
  'Matches rank highest when skills are reciprocal — you teach exactly what they want to learn.',
  'One connection covers two learning goals, so partnerships actually stick.',
  'Book sessions, take turns teaching, and both walk away with XP.',
]

const MATCH_POINTS = [
  {
    icon: Percent,
    text: 'A 0–100% match score built from your skills, availability, campus and levels.',
  },
  {
    icon: ListChecks,
    text: 'Plain-language "why you matched" reasons under every recommendation.',
  },
  {
    icon: ShieldCheck,
    text: 'Deterministic matching — no black boxes, ever.',
  },
]

const PREVIEW_REASONS = [
  'Ananya teaches UI/UX — your top learning goal',
  'You teach JavaScript — exactly what she wants to learn',
  'You are both free on weekday evenings',
]

const BADGE_ICONS = [Sprout, BookOpen, GraduationCap, Handshake, Landmark, Star]

const TESTIMONIALS = [
  {
    name: 'Ananya Sharma',
    dept: 'Computer Science · Year 3',
    quote:
      'I taught Python to three students in my first week and picked up UI design from two others. The match reasons are scarily accurate.',
  },
  {
    name: 'Aarav Mehta',
    dept: 'Electronics · Year 2',
    quote:
      'XP and badges make it feel like a game, except the reward is actually learning guitar. My calendar is full of skill swaps now.',
  },
  {
    name: 'Sara Iqbal',
    dept: 'Design · Year 4',
    quote:
      'Found my JavaScript study partner within a day. Way better than hoping someone in the class group chat knows Figma.',
  },
]

// ─── Two-way exchange mini profile card ───
function ExchangeCard({ name, dept, teaches, wants }: { name: string; dept: string; teaches: string; wants: string }) {
  return (
    <div className="lf-glass w-full max-w-[240px] rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <LfAvatar name={name} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{dept}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-start gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
          <GraduationCap className="size-3" aria-hidden /> Can teach {teaches}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
          <BookOpen className="size-3" aria-hidden /> Wants {wants}
        </span>
      </div>
    </div>
  )
}

// ─── Animated XP bar demo ───
function XpDemoBar() {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [value, setValue] = React.useState(0)
  React.useEffect(() => {
    if (!inView) return
    const controls = animate(0, 65, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView])
  return (
    <div ref={ref}>
      <Progress value={value} className="h-2.5" aria-label="Example XP progress: 65 out of 100" />
    </div>
  )
}

export function LandingView() {
  const setView = useLF((s) => s.setView)

  return (
    <div className="overflow-x-clip">
      {/* ── HERO ── */}
      <section aria-labelledby="hero-title" className="relative">
        <div className="lf-grid-texture pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-14 pt-10 sm:pt-16 lg:grid-cols-2 lg:pb-20 lg:pt-24">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <span className="lf-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium sm:text-sm">
                <Sparkles className="size-3.5 text-foreground/80" aria-hidden />
                The peer-to-peer skill exchange for students
              </span>
            </motion.div>

            <h1 id="hero-title" className="lf-h1 mt-6">
              {['Learn Something.', 'Share Something.', 'Have Fun.'].map((line, i) => (
                <motion.span
                  key={line}
                  className={cn('block', i === 1 && 'lf-brand-text')}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * i, ease: 'easeOut' }}
                >
                  {line}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.32, ease: 'easeOut' }}
              className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Discover students who can teach what you want to learn, share the skills you already
              know, and build meaningful connections along the way.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4, ease: 'easeOut' }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                onClick={() => setView('register')}
                className="h-12 rounded-full px-8 text-base font-semibold"
              >
                Start Learning <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('register')}
                className="h-12 rounded-full px-8 text-base font-semibold"
              >
                Share Your Skills
              </Button>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.48, ease: 'easeOut' }}
              className="mt-10 flex flex-wrap gap-x-10 gap-y-4"
            >
              <div>
                <dd className="lf-brand-text text-2xl font-extrabold">
                  <Counter to={SKILL_COUNT} suffix="+" />
                </dd>
                <dt className="text-xs text-muted-foreground">skills to learn &amp; teach</dt>
              </div>
              <div>
                <dd className="lf-brand-text text-2xl font-extrabold">
                  <Counter to={CATEGORY_COUNT} />
                </dd>
                <dt className="text-xs text-muted-foreground">skill categories</dt>
              </div>
              <div>
                <dd className="lf-brand-text text-2xl font-extrabold">
                  <Counter to={100} suffix="%" />
                </dd>
                <dt className="text-xs text-muted-foreground">free for students</dt>
              </div>
            </motion.dl>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <SectionHead
          id="how-title"
          eyebrow="How it works"
          title={<>Three steps to your <span className="lf-brand-text">learning circle</span></>}
          sub="No courses, no fees — just students helping students."
        />
        <div className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal key={step.n} delay={i * 0.1}>
                <div className="lf-glass lf-hover-lift relative h-full rounded-2xl p-6">
                  <span className="absolute right-5 top-4 text-4xl font-black text-muted-foreground/15" aria-hidden>
                    {step.n}
                  </span>
                  <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ── DISCOVER SKILLS ── */}
      <section aria-labelledby="discover-title" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <SectionHead
          id="discover-title"
          eyebrow="Discover skills"
          title={`Five categories. ${SKILL_COUNT} ways to grow.`}
          sub="From debugging code to perfecting your chai — every skill has a teacher and a learner on campus."
        />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          {LANDING_CATEGORIES.map((cat, i) => {
            const Icon = cat.icon
            const count = INITIAL_CATEGORIES.find((c) => c.name === cat.name)?.skills.length ?? 0
            return (
              <Reveal key={cat.name} delay={i * 0.08}>
                <button
                  type="button"
                  onClick={() => setView('register' as ViewName)}
                  aria-label={`Explore ${cat.name} skills — create a free account to get started`}
                  className="lf-glass lf-hover-lift flex h-full w-full flex-col items-start gap-3 rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold">{cat.name}</span>
                    <span className="block text-xs text-muted-foreground">{count} skills</span>
                  </span>
                </button>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ── SKILL EXCHANGE ── */}
      <section aria-labelledby="exchange-title" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">The skill exchange</p>
            <h2 id="exchange-title" className="lf-h2 mt-3">
              Teach what you know.
              <br />
              <span className="lf-brand-text">Learn what you don&apos;t.</span>
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
              Every connection on Learn &amp; Fun is a two-way street. Instead of paying for
              courses, you trade knowledge with someone whose strengths are exactly your gaps.
            </p>
            <ul className="mt-6 space-y-3">
              {EXCHANGE_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" aria-hidden />
                  </span>
                  <span className="text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-3">
              <ExchangeCard name="Aarav Patel" dept="Computer Science · Year 2" teaches="JavaScript" wants="UI/UX" />
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 8, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="lf-logo z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground"
                aria-hidden
              >
                <ArrowLeftRight className="size-6" />
              </motion.div>
              <ExchangeCard name="Meera Nair" dept="Design · Year 3" teaches="UI/UX" wants="JavaScript" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MATCHING ── */}
      <section aria-labelledby="matching-title" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Smart matching</p>
            <h2 id="matching-title" className="lf-h2 mt-3">
              Your perfect study partner, <span className="lf-brand-text">explained.</span>
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
              No swiping through endless profiles. Every match comes with a score and a clear
              explanation of why you two fit.
            </p>
            <ul className="mt-6 space-y-4">
              {MATCH_POINTS.map((point) => {
                const Icon = point.icon
                return (
                  <li key={point.text} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-sm leading-relaxed">{point.text}</span>
                  </li>
                )
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mx-auto w-full max-w-sm">
              <div className="lf-glass relative rounded-3xl p-6">
                <Badge
                  variant="secondary"
                  className="absolute -top-3 right-5 rounded-full text-[10px] font-semibold"
                >
                  Product preview
                </Badge>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <LfAvatar name="Ananya Sharma" className="size-12" />
                    <div>
                      <p className="font-bold">Ananya Sharma</p>
                      <p className="text-xs text-muted-foreground">Computer Science · Year 3</p>
                      <Stars rating={4.9} className="mt-0.5" />
                    </div>
                  </div>
                  <MatchRing score={94} size={64} />
                </div>
                <div className="mt-4">
                  <MatchReasons reasons={PREVIEW_REASONS} />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Deterministic matching — no black boxes.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GAMIFICATION ── */}
      <section aria-labelledby="game-title" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <SectionHead
          id="game-title"
          eyebrow="Learn & level up"
          title="Progress that feels like play"
          sub="Every real action — onboarding, teaching a session, earning a great review — earns XP and unlocks badges."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: 'XP & levels',
              body: 'Earn XP for onboarding, teaching sessions, reviews and streaks. Climb from Level 1 upward, 100 XP at a time.',
            },
            {
              icon: Award,
              title: 'Badges to collect',
              body: 'Six badges tied to real milestones — your first step, first session, first review, community building and more.',
            },
            {
              icon: Trophy,
              title: 'Campus leaderboard',
              body: 'Rankings update with every XP event. Friendly competition between departments, real growth for everyone.',
            },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <Reveal key={card.title} delay={i * 0.1}>
                <div className="lf-glass lf-hover-lift h-full rounded-2xl p-6">
                  <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-md">
          <div className="lf-glass rounded-2xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                Level 4 · 365 XP <span className="font-normal text-muted-foreground">· 65/100 to next</span>
              </p>
              <Badge variant="secondary" className="rounded-full text-[10px]">Example</Badge>
            </div>
            <XpDemoBar />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="flex gap-2.5" aria-hidden>
                {BADGE_ICONS.map((Icon, i) => (
                  <Icon key={i} className="size-5 text-foreground/75" />
                ))}
              </span>
              <p className="text-xs text-muted-foreground">
                Teach a session (+25), learn one (+15), nail a 5-star review (+10).
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── COMMUNITY ── */}
      <section aria-labelledby="community-title" className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <SectionHead
          id="community-title"
          eyebrow="Community"
          title="Students who swap, stick together"
          sub="Sample voices from the kind of campus communities Learn & Fun is built for."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <figure className="lf-glass flex h-full flex-col rounded-2xl p-6">
                <Stars rating={5} />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <LfAvatar name={t.name} className="size-10" />
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.dept}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {[
              `${SKILL_COUNT}+ skills across ${CATEGORY_COUNT} categories`,
              '6 badges to earn',
              'Free forever for students',
            ].map((chip) => (
              <span
                key={chip}
                className="lf-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium sm:text-sm"
              >
                <Sparkles className="size-3.5 text-primary" aria-hidden /> {chip}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── FINAL CTA ── */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:pb-24">
        <Reveal>
          <div className="lf-glass-strong relative overflow-hidden rounded-3xl p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-white/[0.05] blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -right-10 size-64 rounded-full bg-white/[0.05] blur-2xl" aria-hidden />
            <h2 id="cta-title" className="lf-h2 relative">
              Ready to meet your learning circle?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
              Create a free account, list your skills, and start swapping knowledge with students
              around you this week.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setView('register')}
                className="h-12 rounded-full px-8 text-base font-bold"
              >
                Create your free account
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setView('login')}
                className="h-12 rounded-full px-8 text-base font-semibold"
              >
                I already have an account
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
