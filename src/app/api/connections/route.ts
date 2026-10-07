import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { serializeUsers, userInclude } from '@/lib/lf/serialize'
import { notify } from '@/lib/lf/gamify'

/** GET /api/connections — accepted connections + my sent/received pending requests */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const [acceptedRows, sentRows, receivedRows] = await Promise.all([
      db.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ senderId: me.id }, { receiverId: me.id }],
        },
        include: { sender: { include: userInclude }, receiver: { include: userInclude } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.connection.findMany({
        where: { senderId: me.id, status: 'PENDING' },
        include: { receiver: { include: userInclude } },
        orderBy: { createdAt: 'desc' },
      }),
      db.connection.findMany({
        where: { receiverId: me.id, status: 'PENDING' },
        include: { sender: { include: userInclude } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const acceptedOthers = acceptedRows.map((c) => (c.senderId === me.id ? c.receiver : c.sender))
    const sentOthers = sentRows.map((c) => c.receiver)
    const receivedOthers = receivedRows.map((c) => c.sender)

    const [acceptedUsers, sentUsers, receivedUsers] = await Promise.all([
      serializeUsers(acceptedOthers, me.id, { withMatch: true }),
      serializeUsers(sentOthers, me.id, { withMatch: true }),
      serializeUsers(receivedOthers, me.id, { withMatch: true }),
    ])

    return NextResponse.json({
      accepted: acceptedRows.map((c, i) => ({
        connection: { id: c.id, createdAt: c.createdAt.toISOString() },
        user: acceptedUsers[i],
      })),
      sent: sentRows.map((c, i) => ({
        connection: {
          id: c.id,
          message: c.message ?? '',
          createdAt: c.createdAt.toISOString(),
        },
        user: sentUsers[i],
      })),
      received: receivedRows.map((c, i) => ({
        connection: {
          id: c.id,
          message: c.message ?? '',
          createdAt: c.createdAt.toISOString(),
        },
        user: receivedUsers[i],
      })),
    })
  } catch (e) {
    console.error('[connections GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** POST /api/connections — send (or re-send) a connection request */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const userId = typeof body?.userId === 'string' ? body.userId : ''
    if (!userId) {
      return NextResponse.json({ error: 'Please choose a student to connect with.' }, { status: 400 })
    }
    if (userId === me.id) {
      return NextResponse.json({ error: 'You cannot connect with yourself.' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target || target.status !== 'ACTIVE' || !target.onboarded) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    const message =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim().slice(0, 500)
        : null

    const existing = await db.connection.findFirst({
      where: {
        OR: [
          { senderId: me.id, receiverId: userId },
          { senderId: userId, receiverId: me.id },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (existing) {
      if (existing.status === 'PENDING') {
        return NextResponse.json(
          { error: 'A connection request already exists.' },
          { status: 409 }
        )
      }
      if (existing.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'You are already connected.' }, { status: 409 })
      }
      // REJECTED / CANCELLED -> revive the row instead of duplicating
      const revived = await db.connection.update({
        where: { id: existing.id },
        data: {
          senderId: me.id,
          receiverId: userId,
          status: 'PENDING',
          message,
          updatedAt: new Date(),
        },
      })
      await notify(
        userId,
        'CONNECTION_REQUEST',
        `${me.name} wants to connect`,
        message || 'Open their profile to learn more.',
        revived.id
      )
      return NextResponse.json({ connection: { id: revived.id, status: revived.status } })
    }

    const connection = await db.connection.create({
      data: { senderId: me.id, receiverId: userId, status: 'PENDING', message },
    })
    await notify(
      userId,
      'CONNECTION_REQUEST',
      `${me.name} wants to connect`,
      message || 'Open their profile to learn more.',
      connection.id
    )
    return NextResponse.json({ connection: { id: connection.id, status: connection.status } })
  } catch (e) {
    console.error('[connections POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
