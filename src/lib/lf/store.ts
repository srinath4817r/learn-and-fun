// ─── Learn & Fun — global client store (zustand) ───
'use client'

import { create } from 'zustand'
import { api } from './api'
import type { MeDTO, ViewName } from './types'

interface LFState {
  booted: boolean
  user: MeDTO | null
  view: ViewName
  profileUserId: string | null // when viewing another student's profile
  connectUserId: string | null // prefill connect dialog target
  chatPreselectUserId: string | null // open messaging with this user
  setView: (view: ViewName, opts?: { profileUserId?: string; chatPreselectUserId?: string }) => void
  openConnect: (userId: string | null) => void
  setUser: (user: MeDTO | null) => void
  boot: () => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

export const useLF = create<LFState>((set) => ({
  booted: false,
  user: null,
  view: 'landing',
  profileUserId: null,
  connectUserId: null,
  chatPreselectUserId: null,

  setView: (view, opts) =>
    set({
      view,
      // null profileUserId = own profile; set when viewing another student
      profileUserId: opts?.profileUserId ?? null,
      chatPreselectUserId: opts?.chatPreselectUserId ?? null,
    }),

  openConnect: (userId) => set({ connectUserId: userId }),

  setUser: (user) => set({ user }),

  boot: async () => {
    try {
      const { user } = await api.get<{ user: MeDTO | null }>('/api/auth/me')
      set({
        user,
        booted: true,
        view: user ? (user.onboarded ? 'dashboard' : 'onboarding') : 'landing',
      })
    } catch {
      set({ booted: true, view: 'landing' })
    }
  },

  refreshUser: async () => {
    try {
      const { user } = await api.get<{ user: MeDTO | null }>('/api/auth/me')
      set({ user })
    } catch {
      // keep current state
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      set({ user: null, view: 'landing' })
    }
  },
}))
