import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import { notify } from '@/lib/lf/gamify'

/** GET /api/conversations/[id]/messages — history + other participant, marks conversation read */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const myParticipation = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: me.id },
    })
    if (!myParticipation) {
      return NextResponse.json(
        { error: 'You are not part of this conversation.' },
        { status: 403 }
      )
    }

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, profileImage: true } } },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    await db.conversationParticipant.update({
      where: { id: myParticipation.id },
      data: { lastReadAt: new Date() },
    })

    const other =
      conversation.participants.find((p) => p.userId !== me.id)?.user ?? {
        id: '',
        name: 'Unknown student',
        profileImage: null,
      }

    return NextResponse.json({
      messages: conversation.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      other,
    })
  } catch (e) {
    console.error('[messages GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

/** POST /api/conversations/[id]/messages — send a message */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

    const { id } = await params
    const myParticipation = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: me.id },
    })
    if (!myParticipation) {
      return NextResponse.json(
        { error: 'You are not part of this conversation.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be 2000 characters or fewer.' },
        { status: 400 }
      )
    }

    const message = await db.message.create({
      data: { conversationId: id, senderId: me.id, content },
    })
    // touch conversation so it floats to the top of both inboxes
    await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })
    await db.conversationParticipant.update({
      where: { id: myParticipation.id },
      data: { lastReadAt: new Date() },
    })

    const otherParticipant = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: { not: me.id } },
    })
    if (otherParticipant) {
      await notify(
        otherParticipant.userId,
        'NEW_MESSAGE',
        `${me.name} sent you a message`,
        content.slice(0, 80),
        id
      )
    }

    return NextResponse.json({
      message: {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('[messages POST]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
