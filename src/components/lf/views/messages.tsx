'use client'

// ─── Learn & Fun — Messages view (two-pane chat, API polling) — Mono Glass ───
import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageCircle, Send, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/lf/api'
import { useLF } from '@/lib/lf/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { timeAgo, formatTime, formatDate } from '@/lib/lf/utils'
import type { ConversationDTO, MessageDTO } from '@/lib/lf/types'
import {
  LfAvatar, EmptyState, ErrorState, cacheUserName,
} from '@/components/lf/shared'

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return formatDate(d.toISOString())
}

export function MessagesView() {
  const { user, setView, refreshUser, chatPreselectUserId } = useLF()
  const [convos, setConvos] = React.useState<ConversationDTO[] | null>(null)
  const [convosLoading, setConvosLoading] = React.useState(true)
  const [convosError, setConvosError] = React.useState<string | null>(null)

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [other, setOther] = React.useState<{ id: string; name: string; profileImage: string | null } | null>(null)
  const [messages, setMessages] = React.useState<MessageDTO[] | null>(null)
  const [msgsLoading, setMsgsLoading] = React.useState(false)
  const [msgsError, setMsgsError] = React.useState<string | null>(null)

  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [mobileChat, setMobileChat] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const taRef = React.useRef<HTMLTextAreaElement>(null)
  const totalUnreadRef = React.useRef<number>(-1)
  const preselectRef = React.useRef<string | null>(null)

  // ── Conversation list: initial load + 8s polling (paused when tab hidden) ──
  const loadConversations = React.useCallback(async () => {
    try {
      const res = await api.get<{ conversations: ConversationDTO[] }>('/api/conversations')
      res.conversations.forEach((c) => cacheUserName(c.other.id, c.other.name))
      setConvos(res.conversations)
      setConvosError(null)
      const total = res.conversations.reduce((n, c) => n + c.unread, 0)
      if (totalUnreadRef.current !== -1 && total !== totalUnreadRef.current) refreshUser()
      totalUnreadRef.current = total
    } catch (e) {
      if (convos === null) setConvosError(e instanceof Error ? e.message : 'Could not load conversations')
    } finally {
      setConvosLoading(false)
    }
  }, [convos, refreshUser])

  React.useEffect(() => {
    loadConversations()
    const t = setInterval(() => { if (!document.hidden) loadConversations() }, 8000)
    return () => clearInterval(t)
  }, [loadConversations])

  // ── Messages for the active conversation (fetch marks read server-side) ──
  const loadMessages = React.useCallback(async (id: string) => {
    try {
      const res = await api.get<{ messages: MessageDTO[]; other: { id: string; name: string; profileImage: string | null } }>(
        `/api/conversations/${id}/messages`,
      )
      setMessages(res.messages)
      setOther(res.other)
      setMsgsError(null)
    } catch (e) {
      // Poll failures stay silent; surface the error only when the pane is still empty
      setMsgsError((prev) => (prev === null && messages === null ? (e instanceof Error ? e.message : 'Could not load messages') : prev))
    }
  }, [messages])

  const openConversation = React.useCallback(async (id: string) => {
    setActiveId(id)
    setMobileChat(true)
    setMessages(null)
    setMsgsError(null)
    setMsgsLoading(true)
    setConvos((prev) => (prev ? prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) : prev))
    await loadMessages(id)
    setMsgsLoading(false)
    refreshUser()
  }, [loadMessages, refreshUser])

  // 4s polling for the open conversation (paused when tab hidden)
  React.useEffect(() => {
    if (!activeId) return
    const t = setInterval(() => { if (!document.hidden) loadMessages(activeId) }, 4000)
    return () => clearInterval(t)
  }, [activeId, loadMessages])

  // ── Resolve chatPreselectUserId exactly once (get-or-create conversation) ──
  React.useEffect(() => {
    if (!chatPreselectUserId || preselectRef.current === chatPreselectUserId) return
    preselectRef.current = chatPreselectUserId
    ;(async () => {
      try {
        const { id } = await api.post<{ id: string }>('/api/conversations', { userId: chatPreselectUserId })
        await openConversation(id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not open the conversation')
      } finally {
        setView('messages') // clear the preselect without re-triggering resolution
      }
    })()
  }, [chatPreselectUserId, openConversation, setView])

  // ── Auto-scroll to newest message ──
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight })
  }, [messages])

  function autoresize() {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }

  async function send() {
    const content = draft.trim()
    if (!content || !activeId || sending) return
    setSending(true)
    try {
      const { message } = await api.post<{ message: MessageDTO }>(`/api/conversations/${activeId}/messages`, { content })
      setMessages((prev) => (prev ? [...prev, message] : [message]))
      setDraft('')
      if (taRef.current) taRef.current.style.height = 'auto'
      setConvos((prev) =>
        prev
          ? prev.map((c) =>
              c.id === activeId
                ? { ...c, lastMessage: { content: message.content, createdAt: message.createdAt, senderId: message.senderId } }
                : c,
            )
          : prev,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  const listPane = (
    <aside
      className={cn(
        'flex min-h-0 flex-col border-b border-white/[0.08] md:border-b-0 md:border-r',
        mobileChat && 'hidden md:flex',
      )}
      aria-label="Conversations"
    >
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MessageCircle className="size-4 text-foreground" aria-hidden /> Messages
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto lf-scroll">
        {convosLoading ? (
          <div className="space-y-1 p-2" aria-busy="true" aria-label="Loading conversations">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : convosError ? (
          <ErrorState message={convosError} onRetry={() => loadConversations()} />
        ) : (convos?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title="No conversations yet"
            description="Your chats with connections live here. Find a study partner to get started."
            action={
              <Button onClick={() => setView('discover')} className="min-h-11 gap-1.5">
                <Users className="size-4" aria-hidden /> Find study partners
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1 p-2">
            {convos!.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openConversation(c.id)}
                  aria-current={activeId === c.id}
                  aria-label={`Conversation with ${c.other.name}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border p-3 text-left backdrop-blur-sm transition-colors duration-200',
                    activeId === c.id
                      ? 'border-white/[0.18] bg-white/[0.1]'
                      : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06]',
                  )}
                >
                  <LfAvatar name={c.other.name} src={c.other.profileImage} className="size-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{c.other.name}</span>
                      {c.lastMessage && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.lastMessage
                          ? `${c.lastMessage.senderId === user?.id ? 'You: ' : ''}${c.lastMessage.content}`
                          : 'No messages yet'}
                      </p>
                      {c.unread > 0 && (
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
                          aria-label={`${c.unread} unread`}
                        >
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )

  const chatPane = (
    <section className={cn('flex min-h-0 flex-col bg-white/[0.02]', !mobileChat && 'hidden md:flex')} aria-label="Chat">
      {!activeId || !other ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="rounded-full border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm">
            <MessageCircle className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <p className="font-semibold">Select a conversation</p>
          <p className="max-w-xs text-sm text-muted-foreground">Pick someone from the list to start chatting.</p>
        </div>
      ) : (
        <>
          <header className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.03] px-3 py-2.5 backdrop-blur-md sm:px-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:hidden"
              aria-label="Back to conversations"
              onClick={() => setMobileChat(false)}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left outline-none ring-primary focus-visible:ring-2"
              onClick={() => setView('profile', { profileUserId: other.id })}
              aria-label={`View ${other.name}'s profile`}
            >
              <LfAvatar name={other.name} src={other.profileImage} className="size-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold hover:underline">{other.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-foreground" aria-hidden /> Connected
                </p>
              </div>
            </button>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto lf-scroll p-4">
            {msgsLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading messages">
                <Skeleton className="h-10 w-1/2 rounded-2xl" />
                <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
                <Skeleton className="h-10 w-3/5 rounded-2xl" />
                <Skeleton className="ml-auto h-10 w-1/3 rounded-2xl" />
              </div>
            ) : msgsError ? (
              <ErrorState message={msgsError} onRetry={() => { setMsgsLoading(true); loadMessages(activeId).finally(() => setMsgsLoading(false)) }} />
            ) : (messages?.length ?? 0) === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="rounded-full border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm">
                  <MessageCircle className="size-6 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-semibold">Say hello to {other.name}!</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Break the ice — mention what you can teach and what you&apos;d love to learn.
                </p>
              </div>
            ) : (
              messages!.map((m, i) => {
                const mine = user ? m.senderId === user.id : m.senderId !== other.id
                const newDay = i === 0 || new Date(m.createdAt).toDateString() !== new Date(messages![i - 1].createdAt).toDateString()
                const lastOfGroup = i === messages!.length - 1
                  || messages![i + 1].senderId !== m.senderId
                  || new Date(messages![i + 1].createdAt).toDateString() !== new Date(m.createdAt).toDateString()
                return (
                  <React.Fragment key={m.id}>
                    {newDay && (
                      <div className="flex justify-center py-2">
                        <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                          {dayLabel(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] whitespace-pre-wrap break-words rounded-2xl border px-3.5 py-2 text-sm backdrop-blur-sm',
                          mine
                            ? 'rounded-br-sm border-white/[0.2] bg-white/[0.16] text-foreground'
                            : 'rounded-bl-sm border-white/[0.1] bg-white/[0.06] text-foreground',
                        )}
                      >
                        {m.content}
                      </div>
                    </motion.div>
                    {lastOfGroup && (
                      <div className={cn('text-[10px] text-muted-foreground', mine ? 'pr-1 text-right' : 'pl-1')}>
                        {formatTime(m.createdAt)}
                      </div>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </div>

          {/* Composer — floating mono glass bar (input + send only; no decorative buttons) */}
          <div className="border-t border-white/[0.08] p-3 sm:p-4">
            <div className="lf-glass-strong mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl p-2 pl-4">
              <Textarea
                ref={taRef}
                value={draft}
                rows={1}
                aria-label="Message"
                placeholder="Type a message..."
                className="max-h-24 min-h-11 flex-1 resize-none border-0 bg-transparent px-0 py-2.5 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                onChange={(e) => { setDraft(e.target.value); autoresize() }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
              />
              <Button
                size="icon"
                className="size-11 shrink-0 rounded-full"
                onClick={send}
                disabled={sending || !draft.trim()}
                aria-label="Send message"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )

  if (convos !== null && convos.length === 0 && !convosLoading) {
    return (
      <EmptyState
        icon={Users}
        title="No conversations yet"
        description="Your chats with connections live here. Find a study partner to get started."
        action={
          <Button onClick={() => setView('discover')} className="min-h-11 gap-1.5">
            <Users className="size-4" aria-hidden /> Find study partners
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid h-[calc(100dvh-10rem)] min-h-[480px] overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-md md:grid-cols-[320px_1fr]">
      {listPane}
      {chatPane}
    </div>
  )
}
