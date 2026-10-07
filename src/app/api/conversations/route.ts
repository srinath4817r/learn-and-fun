import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'

/** GET /api/conversations — my conversations with other participant, last message, unread count */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const myParticipations = await db.conversationParticipant.findMany({
      where: { userId: me.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, profileImage: true } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    })

    const rows = myParticipations
      .map((p) => ({ participation: p, conversation: p.conversation }))
      .filter((r) => r.conversation.participants.length >= 2)

    const conversations = await Promise.all(
      rows.map(async (r) => {
        const other =
          r.conversation.participants.find((p) => p.userId !== me.id)?.user ?? {
            id: '',
            name: 'Unknown student',
            profileImage: null,
          }
        const unread = await db.message.count({
          where: {
            conversationId: r.conversation.id,
            senderId: { not: me.id },
            ...(r.participation.lastReadAt
              ? { createdAt: { gt: r.participation.lastReadAt } }
              : {}),
          },
        })
        const last = r.conversation.messages[0] ?? null
        return {
          updatedAt: r.conversation.updatedAt.getTime(),
          dto: {
            id: r.conversation.id,
            other,
            lastMessage: last
              ? {
                  content: last.content,
                  createdAt: last.createdAt.toISOString(),
                  senderId: last.senderId,
                }
              : null,
            unread,
          },
        }
      })
    )

    conversations.sort((a, b) => b.updatedAt - a.updatedAt)

    return NextResponse.json({ conversations: conversations.map((c) => c.dto) })
  } catch (e) {
    console.error('[conversations GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** POST /api/conversations — get-or-create a conversation with a connected student */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const userId = typeof body?.userId === 'string' ? body.userId : ''
    if (!userId) {
      return NextResponse.json({ error: 'Please choose a student to message.' }, { status: 400 })
    }
    if (userId === me.id) {
      return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 })
    }

    const connection = await db.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: me.id, receiverId: userId },
          { senderId: userId, receiverId: me.id },
        ],
      },
    })
    if (!connection) {
      return NextResponse.json(
        { error: 'You can only message connected students.' },
        { status: 403 }
      )
    }

    const candidates = await db.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: me.id } } },
          { participants: { some: { userId } } },
        ],
      },
      include: { participants: true },
    })
    const existing = candidates.find((c) => c.participants.length === 2)
    if (existing) return NextResponse.json({ id: existing.id })

    const conversation = await db.conversation.create({
      data: {
        participants: {
          create: [{ userId: me.id }, { userId }],
        },
      },
    })
    return NextResponse.json({ id: conversation.id })
  } catch (e) {
    console.error('[conversations POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
