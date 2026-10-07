// ─── Learn & Fun — server-side auth helpers (JWT via jose + bcryptjs) ───
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const COOKIE_NAME = 'lf_token'
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'lf_dev_secret_fallback'
)

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function signToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function setAuthCookie(userId: string) {
  const token = await signToken(userId)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export async function clearAuthCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Returns the authenticated user id, or null. */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const store = await cookies()
    const token = store.get(COOKIE_NAME)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

/** Returns the authenticated ACTIVE user, or null. */
export async function getAuthUser() {
  const userId = await getAuthUserId()
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.status !== 'ACTIVE') return null
  return user
}
