// ─── Learn & Fun — client-side helpers (pure, no server imports) ───
import { DAY_LABELS } from './matching'

export { DAY_LABELS }

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Deterministic monochrome tone per user name for avatar fallbacks (Mono Glass)
const TONES = [
  'from-neutral-600 to-neutral-800',
  'from-neutral-500 to-neutral-700',
  'from-neutral-700 to-neutral-900',
  'from-stone-500 to-stone-700',
  'from-zinc-600 to-zinc-800',
  'from-neutral-400 to-neutral-600',
]

export function gradientFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return TONES[Math.abs(hash) % TONES.length]
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function availabilityText(availability: { day: string; from: string; to: string }[]) {
  if (!availability.length) return 'No availability set'
  return availability
    .map((a) => `${DAY_LABELS[a.day] ?? a.day} ${a.from}–${a.to}`)
    .join(' · ')
}

export function xpLevel(xp: number) {
  const level = Math.floor(xp / 100) + 1
  const intoLevel = xp % 100
  return { level, intoLevel, nextAt: level * 100, pct: intoLevel }
}

export function greet(name: string) {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name.split(' ')[0]}!`
}
