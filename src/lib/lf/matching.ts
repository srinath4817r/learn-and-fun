// ─── Learn & Fun — reciprocal peer-matching engine ───
// Deterministic recommendation algorithm (NOT AI):
//   teaching match +40 · learning match +40 · availability overlap +10
//   same college/department +5 · skill-level compatibility +5  -> max 100
import type { Availability } from './types'

export interface MatchUserSide {
  id: string
  name: string
  college: string
  department: string
  availability: Availability[]
  teachSkills: { name: string; level: string }[]
  learnSkills: { name: string }[]
}

export interface MatchResult {
  score: number
  reasons: string[]
}

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

export const DAY_LABELS: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
}

export function computeMatch(
  me: MatchUserSide,
  other: MatchUserSide
): MatchResult {
  const reasons: string[] = []
  let score = 0

  const myLearnNames = me.learnSkills.map((s) => s.name)
  const theirTeachNames = other.teachSkills.map((s) => s.name)
  const myTeachNames = me.teachSkills.map((s) => s.name)
  const theirLearnNames = other.learnSkills.map((s) => s.name)

  // Teaching match — what they can teach me (up to +40)
  const theyTeachMe = myLearnNames.filter((n) => theirTeachNames.includes(n))
  if (myLearnNames.length > 0 && theyTeachMe.length > 0) {
    score += 40 * (theyTeachMe.length / myLearnNames.length)
    reasons.push(
      `${other.name} can teach ${listNames(theyTeachMe)}, which you want to learn.`
    )
  }

  // Learning match — what I can teach them (up to +40)
  const iTeachThem = theirLearnNames.filter((n) => myTeachNames.includes(n))
  if (myTeachNames.length > 0 && iTeachThem.length > 0) {
    score += 40 * (iTeachThem.length / myTeachNames.length)
    reasons.push(
      `You can teach ${listNames(iTeachThem)}, which ${other.name} wants to learn.`
    )
  }

  // Availability overlap (up to +10)
  const myDays = new Set(me.availability.map((a) => a.day))
  const theirDays = new Set(other.availability.map((a) => a.day))
  const sharedDays = [...myDays].filter((d) => theirDays.has(d))
  if (myDays.size > 0 && sharedDays.length > 0) {
    score += 10 * (sharedDays.length / myDays.size)
    reasons.push(
      `You are both available on ${sharedDays.map((d) => DAY_LABELS[d] ?? d).join(', ')}.`
    )
  }

  // Same college / department (+5)
  const sameCollege =
    me.college.trim().toLowerCase() === other.college.trim().toLowerCase() &&
    me.college.trim() !== ''
  const sameDept =
    me.department.trim().toLowerCase() ===
      other.department.trim().toLowerCase() && me.department.trim() !== ''
  if (sameCollege) score += 2
  if (sameDept) score += 3
  if (sameCollege && sameDept) {
    reasons.push(`You are both from the ${me.department} department.`)
  } else if (sameCollege) {
    reasons.push('You are both from the same college.')
  }

  // Skill-level compatibility (+5) — matched teaching skills at intermediate or above
  if (theyTeachMe.length > 0) {
    const matchedSkills = other.teachSkills.filter((s) =>
      theyTeachMe.includes(s.name)
    )
    const qualified = matchedSkills.filter((s) => s.level !== 'BEGINNER')
    if (qualified.length > 0) {
      score += 5 * (qualified.length / matchedSkills.length)
      const top = qualified[0]
      reasons.push(
        `${other.name} teaches ${top.name} at ${top.level.toLowerCase()} level.`
      )
    }
  }

  return { score: Math.min(100, Math.round(score)), reasons }
}

function listNames(names: string[]) {
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}
