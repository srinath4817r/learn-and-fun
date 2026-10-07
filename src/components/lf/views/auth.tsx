'use client'

// ─── Learn & Fun — login / register views (MONO GLASS) ───
import * as React from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, GraduationCap, Loader2, User } from 'lucide-react'
import { api, ApiError } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { MeDTO } from '@/lib/lf/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const YEARS = ['1', '2', '3', '4', 'Postgraduate']

interface FormState {
  name: string
  email: string
  password: string
  confirm: string
  college: string
  department: string
  year: string
  bio: string
}

const EMPTY_FORM: FormState = {
  name: '', email: '', password: '', confirm: '', college: '', department: '', year: '', bio: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Password strength (length + character classes) ───
function passwordStrength(pw: string) {
  if (!pw) return null
  let pts = 0
  if (pw.length >= 8) pts++
  if (pw.length >= 12) pts++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) pts++
  if (/\d/.test(pw)) pts++
  if (/[^A-Za-z0-9]/.test(pw)) pts++
  if (pts <= 2) return { label: 'Weak', pct: 33, bar: 'bg-foreground/35', text: 'text-muted-foreground' }
  if (pts <= 4) return { label: 'Medium', pct: 66, bar: 'bg-foreground/60', text: 'text-foreground/80' }
  return { label: 'Strong', pct: 100, bar: 'bg-foreground', text: 'text-foreground' }
}

function StrengthMeter({ password }: { password: string }) {
  const s = passwordStrength(password)
  if (!s) return null
  const filled = s.pct >= 100 ? 3 : s.pct >= 66 ? 2 : 1
  return (
    <div>
      <div className="flex gap-1" role="status" aria-label={`Password strength: ${s.label}`}>
        {[1, 2, 3].map((seg) => (
          <div key={seg} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-300', seg <= filled ? s.bar : '')}
              style={{ width: seg <= filled ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>
      <p className={cn('mt-1 text-xs font-medium', s.text)}>Password strength: {s.label}</p>
    </div>
  )
}

export function AuthView({ mode }: { mode: 'login' | 'register' }) {
  const setView = useLF((s) => s.setView)
  const setUser = useLF((s) => s.setUser)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [guestLoading, setGuestLoading] = React.useState(false)
  const isLogin = mode === 'login'

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setForm((f) => ({ ...f, [key]: value }))
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address'
    if (!form.password) errs.password = 'Password is required'
    if (!isLogin) {
      if (form.name.trim().length < 2) errs.name = 'Please enter your full name'
      if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
      if (form.confirm !== form.password) errs.confirm = 'Passwords do not match'
      if (!form.college.trim()) errs.college = 'College is required'
      if (!form.department.trim()) errs.department = 'Department is required'
      if (!form.year) errs.year = 'Select your year'
    }
    return errs
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    const errs = validate()
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      if (isLogin) {
        const res = await api.post<{ user: MeDTO }>('/api/auth/login', {
          email: form.email.trim(),
          password: form.password,
        })
        setUser(res.user)
        toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`)
        setView(res.user.onboarded ? 'dashboard' : 'onboarding')
      } else {
        const res = await api.post<{ user: MeDTO }>('/api/auth/register', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirm,
          college: form.college.trim(),
          department: form.department.trim(),
          year: form.year,
          bio: form.bio.trim() || undefined,
        })
        setUser(res.user)
        toast.success('Account created — welcome to Learn & Fun!')
        setView('onboarding')
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Duplicate email — surface under the email field
        setErrors((prev) => ({ ...prev, email: err.message }))
        toast.error(err.message)
      } else {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function onGuest() {
    if (guestLoading || loading) return
    setGuestLoading(true)
    try {
      const { user } = await api.post<{ user: MeDTO }>('/api/auth/guest')
      setUser(user)
      toast.success('Welcome, Guest!', { description: 'Explore Learn & Fun with full access.' })
      setView(user.onboarded ? 'dashboard' : 'onboarding')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start a guest session. Please try again.'
      toast.error(msg)
    } finally {
      setGuestLoading(false)
    }
  }

  const inputCls = 'h-11 rounded-xl'

  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="lf-glass-strong rounded-3xl p-6 sm:p-8">
          <button
            type="button"
            onClick={() => setView('landing')}
            aria-label="Back to Learn & Fun home"
            className="lf-logo mx-auto flex size-12 items-center justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GraduationCap className="size-6 text-primary-foreground" aria-hidden />
          </button>

          <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            {isLogin
              ? 'Log in to continue your skill exchange.'
              : 'Join your campus skill exchange — it takes under a minute.'}
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-name">Full name</Label>
                <Input
                  id="auth-name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={set('name')}
                  aria-invalid={!!errors.name}
                  className={inputCls}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@college.edu"
                value={form.email}
                onChange={set('email')}
                aria-invalid={!!errors.email}
                className={inputCls}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  aria-invalid={!!errors.password}
                  className={cn(inputCls, 'pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              {!isLogin && <StrengthMeter password={form.password} />}
            </div>

            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-confirm">Confirm password</Label>
                  <Input
                    id="auth-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={set('confirm')}
                    aria-invalid={!!errors.confirm}
                    className={inputCls}
                  />
                  {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-college">College</Label>
                    <Input
                      id="auth-college"
                      autoComplete="organization"
                      placeholder="Campus College of Engineering"
                      value={form.college}
                      onChange={set('college')}
                      aria-invalid={!!errors.college}
                      className={inputCls}
                    />
                    {errors.college && <p className="text-xs text-destructive">{errors.college}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-department">Department</Label>
                    <Input
                      id="auth-department"
                      placeholder="Computer Science"
                      value={form.department}
                      onChange={set('department')}
                      aria-invalid={!!errors.department}
                      className={inputCls}
                    />
                    {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auth-year">Year</Label>
                  <Select
                    value={form.year}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, year: v }))
                      setErrors((prev) => (prev.year ? { ...prev, year: undefined } : prev))
                    }}
                  >
                    <SelectTrigger
                      id="auth-year"
                      aria-invalid={!!errors.year}
                      className={cn('w-full', inputCls)}
                    >
                      <SelectValue placeholder="Select your year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y === 'Postgraduate' ? 'Postgraduate' : `Year ${y}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.year && <p className="text-xs text-destructive">{errors.year}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auth-bio">
                    Bio <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="auth-bio"
                    rows={3}
                    maxLength={280}
                    placeholder="Tell people what you love doing…"
                    value={form.bio}
                    onChange={set('bio')}
                    className="resize-none rounded-xl"
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl font-semibold">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {isLogin ? 'Logging in…' : 'Creating account…'}
                </>
              ) : isLogin ? (
                'Log in'
              ) : (
                'Create account'
              )}
            </Button>

            {isLogin && (
              <Button
                type="button"
                variant="outline"
                disabled={guestLoading || loading}
                onClick={onGuest}
                className="h-11 w-full rounded-xl font-semibold"
              >
                {guestLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <User className="size-4" aria-hidden />
                )}
                Continue as Guest
              </Button>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isLogin ? 'New to Learn & Fun? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setView(isLogin ? 'register' : 'login')}
              className="rounded font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </button>
          </p>

          {!isLogin && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Just exploring?{' '}
              <button
                type="button"
                onClick={onGuest}
                disabled={guestLoading || loading}
                className="rounded font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                Continue as Guest
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </main>
  )
}
