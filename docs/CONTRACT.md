# LEARN & FUN — Agent Contract (source of truth for parallel agents)

## Environment (NON-NEGOTIABLE)
- Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui (New York), Prisma + SQLite, framer-motion, recharts, sonner, zustand, lucide-react.
- The user can ONLY see the `/` route. The app is a single-page application: all navigation happens via the zustand store (`useLF.setView`), NEVER `next/link` routes or `useRouter`.
- Backend = Next.js API routes under `src/app/api/**/route.ts`. NEVER server actions.
- `z-ai-web-dev-sdk` is BACKEND ONLY (used in `/api/orb`).
- DB access: `import { db } from '@/lib/db'`. Schema already pushed to DB. Do NOT edit `prisma/schema.prisma`.
- No TODO/FIXME/placeholder/fake buttons. Every visible feature must work.
- Colors: violet/fuchsia/amber/emerald palette. NEVER indigo/blue. Use tokens (`bg-primary`, `bg-card`, `text-muted-foreground`), utilities `lf-glass`, `lf-brand-text`, `lf-brand-gradient`, `lf-ambient`.
- Footer must stick to bottom (`mt-auto`); page shell handles this.
- ESLint: no unused imports/vars. `'use client'` on all interactive components.

## Common imports
```ts
import { api } from '@/lib/lf/api'                    // api.get/post/patch/put/del
import { useLF } from '@/lib/lf/store'                // zustand: booted,user,view,profileUserId,connectUserId,chatPreselectUserId,setView,openConnect,setUser,refreshUser,boot,logout
import type { ... } from '@/lib/lf/types'             // MeDTO, UserCardDTO, NotificationDTO, ...
import { SkillTag, LfAvatar, Stars, MatchRing, MatchReasons, EmptyState, ErrorState, CardsSkeleton, CardSkeleton, StatCard, XpBar, AvailabilityChips, BadgeTile, ConnectDialog, cacheUserName, PageHeader } from '@/components/lf/shared'
import { toast } from 'sonner'
import { DAYS, DAY_LABELS, timeAgo, formatDateTime, formatTime, formatDate, availabilityText, xpLevel, greet } from '@/lib/lf/utils'
import { LEARN_LEVELS, TEACH_LEVELS, LEVEL_LABELS } from '@/lib/lf/initial-skills'
```

## Store API
- `view: ViewName` = 'landing'|'login'|'register'|'onboarding'|'dashboard'|'discover'|'matches'|'connections'|'messages'|'sessions'|'goals'|'leaderboard'|'notifications'|'saved'|'profile'|'admin'
- `setView('profile', { profileUserId: id })` → view another student. `setView('profile')` → own profile.
- `setView('messages', { chatPreselectUserId: id })` → open chat with user.
- `openConnect(userId)` → opens shared ConnectDialog; `null` closes it.
- `refreshUser()` re-fetches `/api/auth/me` (updates unread counts, XP, badges).

## REST API CONTRACT (all endpoints; JSON; errors → status + `{ error: string }`)

### Auth (Task 2-a)
- `POST /api/auth/register` `{name,email,password,confirmPassword,college,department,year,bio?}` → `{user: MeDTO}` (sets httpOnly JWT cookie; 409 duplicate email; validates fields server-side)
- `POST /api/auth/login` `{email,password}` → `{user: MeDTO}` (401 invalid credentials)
- `POST /api/auth/logout` → `{ok:true}`
- `GET /api/auth/me` → `{user: MeDTO|null}`

### Onboarding & profile (Task 2-a)
- `POST /api/onboarding` `{learnSkills:[{skillId,level}],teachSkills:[{skillId,level}],availability:[{day,from,to}]}` → `{user: MeDTO}` (sets onboarded=true; awards PROFILE_COMPLETED +10 XP + per-skill +5 XP + FIRST_STEP badge)
- `PATCH /api/profile` `{name?,bio?,college?,department?,year?,availability?}` → `{user: MeDTO}`
- `POST /api/profile/skills` `{skillId,type:'TEACH'|'LEARN',level}` → `{user: MeDTO}` (+5 XP per new skill)
- `DELETE /api/profile/skills?skillId=&type=` → `{user: MeDTO}`

### Users (Task 2-a)
- `GET /api/users?q=&category=&skill=&department=&year=&level=&minRating=&availabilityDay=&sort=` → `{users: UserCardDTO[]}` (each includes connectionStatus, saved, matchScore+matchReasons vs current user)
- `GET /api/users/[id]` → `{user: UserCardDTO}` (full profile + reviews[] + matchScore/matchReasons + connectionStatus + saved; 404 if missing; also `cacheUserName(id,name)` client-side)

### Skills (Task 2-a)
- `GET /api/skills` → `{categories: SkillCatalogCategory[]}`

### Matches (Task 2-a)
- `GET /api/matches` → `{matches: UserCardDTO[]}` sorted by matchScore desc (only score>0)

### Leaderboard (Task 2-a)
- `GET /api/leaderboard` → `{leaders: LeaderboardEntryDTO[]}` (rank asc, all students)

### Saved (Task 2-a)
- `GET /api/saved` → `{users: UserCardDTO[]}`
- `POST /api/saved` `{userId}` → `{saved: boolean}` (toggle)

### Notifications (Task 2-a)
- `GET /api/notifications` → `{notifications: NotificationDTO[], unread: number}`
- `PATCH /api/notifications/[id]` `{read:true}` → `{ok:true}`
- `POST /api/notifications/read-all` → `{ok:true}`

### Badges (Task 2-a)
- `GET /api/badges` → `{badges: (BadgeDTO & {progress:{current,target}|null})[]}`

### Connections (Task 2-b)
- `GET /api/connections` → `{accepted:{connection:{id,createdAt},user:UserCardDTO}[], sent:[...], received:[...]}` (received/sent include matchScore when possible)
- `POST /api/connections` `{userId,message?}` → `{connection}` (409 duplicate/pending/self; creates CONNECTION_REQUEST notification)
- `POST /api/connections/[id]/accept` → `{ok:true}` (ACCEPTED; notifies sender; creates Conversation if none)
- `POST /api/connections/[id]/reject` → `{ok:true}`
- `POST /api/connections/[id]/cancel` → `{ok:true}`
- `DELETE /api/connections/[id]` → `{ok:true}` (remove accepted connection; COMMUNITY_BUILDER badge check)

### Messaging (Task 2-b) — API-based polling (NO socket.io)
- `GET /api/conversations` → `{conversations: ConversationDTO[]}` (unread count per convo; other participant)
- `POST /api/conversations` `{userId}` → `{id}` (get-or-create; only for accepted connections)
- `GET /api/conversations/[id]/messages` → `{messages: MessageDTO[], other:{id,name,profileImage}}` (marks read via lastReadAt)
- `POST /api/conversations/[id]/messages` `{content}` → `{message: MessageDTO}` (creates NEW_MESSAGE notification for other user)

### Sessions (Task 2-b)
- `GET /api/sessions` → `{sessions: SessionDTO[]}` (myRole; reviewed=true if I already reviewed a COMPLETED session)
- `POST /api/sessions` `{otherUserId,topic,description?,date,time,duration,mode:'ONLINE'|'IN_PERSON',location?,meetingLink?,notes?}` → `{session}` (requires accepted connection; notifies other)
- `PATCH /api/sessions/[id]` `{status:'COMPLETED'|'CANCELLED'}` → `{session}` (COMPLETED awards XP: learner +15, teacher +25; runs badge checks)

### Reviews (Task 2-b)
- `POST /api/reviews` `{sessionId,rating(1-5),comment?}` → `{review}` (only participants of COMPLETED sessions; one review per session per reviewer enforced via sessionId unique + role check; recalc rating; EXCELLENT_REVIEW +10 XP for 5★; SKILL_MASTER badge)

### Goals & progress (Task 2-b)
- `GET /api/goals` → `{goals: GoalDTO[]}`
- `POST /api/goals` `{title,skillId?,tasks:string[]}` → `{goal}`
- `PATCH /api/goals/[id]` `{taskDone?:{taskId,done},addTask?:string,removeTaskId?:string,title?}` → `{goal}`
- `DELETE /api/goals/[id]` → `{ok:true}`
- `GET /api/progress` → `{progress:[{skill,percent}]}` (per-skill completion from goals)

### Reports & announcements (Task 2-b)
- `POST /api/reports` `{reportedUserId,reason,description?}` → `{ok:true}`
- `GET /api/announcements` → `{announcements: AnnouncementDTO[]}` (latest first)

### Admin (Task 2-b; all require role ADMIN → 403 otherwise)
- `GET /api/admin/stats` → `AdminStatsDTO`
- `GET /api/admin/users?q=&status=` → `{users: AdminUserDTO[]}`
- `PATCH /api/admin/users/[id]` `{status:'ACTIVE'|'SUSPENDED'}` → `{user}` (cannot suspend self/admin)
- `DELETE /api/admin/users/[id]` → `{ok:true}` (cannot delete self)
- `POST /api/admin/skills` `{name,categoryId}` → `{skill}`; `PATCH /api/admin/skills/[id]` `{name?}`; `DELETE /api/admin/skills/[id]` (skills in use → 409)
- `POST /api/admin/categories` `{name}` → `{category}`
- `GET /api/admin/reports` → `{reports: AdminReportDTO[]}`; `PATCH /api/admin/reports/[id]` `{status,adminNotes?}` → `{report}`
- `GET /api/admin/announcements` → `{announcements: AnnouncementDTO[]}`; `POST /api/admin/announcements` `{title,body}` → `{announcement}` (notifies all students); `DELETE /api/admin/announcements/[id]` → `{ok:true}`

### Orb AI (Task 2-b) — real LLM
- `POST /api/orb` `{messages:[{role:'user'|'assistant',content}]} ` → `{reply: string}`
- Backend: `import ZAI from 'z-ai-web-dev-sdk'`; `const zai = await ZAI.create()`; `zai.chat.completions.create({messages:[{role:'assistant',content:SYSTEM},...history], thinking:{type:'disabled'}})`.
- SYSTEM prompt: cute futuristic companion "Lumo" of Learn & Fun platform (peer skill exchange for college students). Concise (<=80 words), friendly, uses minimal emoji, guides to actions: matches, discover, sessions, goals. Never invents features. Requires auth; 401 otherwise.

## Frontend view components (each a separate file, 'use client', NO props)
All views import `useLF` themselves; get data with `api.*`; handle loading (skeletons), error (ErrorState), empty (EmptyState); use `AnimatePresence`/`motion` for entrances; toasts via sonner.

- Task 3-a: `src/components/lf/views/landing.tsx` → `export function LandingView()`; `views/auth.tsx` → `export function AuthView({mode}:{mode:'login'|'register'})`; `views/onboarding.tsx` → `export function OnboardingView()`; `src/components/lf/navbar.tsx` → `export function Navbar()`; `src/components/lf/footer.tsx` → `export function Footer()`
- Task 3-b: `views/dashboard.tsx` → `DashboardView`; `views/discover.tsx` → `DiscoverView`; `views/matches.tsx` → `MatchesView`; `views/profile.tsx` → `ProfileView` (renders own OR other student's profile based on `profileUserId`)
- Task 4-a: `views/connections.tsx` → `ConnectionsView`; `views/messages.tsx` → `MessagesView`; `views/sessions.tsx` → `SessionsView`; `views/goals.tsx` → `GoalsView`
- Task 4-b: `views/leaderboard.tsx` → `LeaderboardView`; `views/notifications.tsx` → `NotificationsView`; `views/saved.tsx` → `SavedView`; `views/admin.tsx` → `AdminView`

## page.tsx integration (Task 5 — LEAD AGENT ONLY, do not touch)
