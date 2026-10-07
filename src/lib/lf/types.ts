// ─── Learn & Fun — shared types used by API routes and client views ───

export type ViewName =
  | 'landing'
  | 'login'
  | 'register'
  | 'onboarding'
  | 'dashboard'
  | 'discover'
  | 'matches'
  | 'connections'
  | 'messages'
  | 'sessions'
  | 'goals'
  | 'leaderboard'
  | 'notifications'
  | 'saved'
  | 'profile'
  | 'admin'

export interface Availability {
  day: string // MON | TUE | WED | THU | FRI | SAT | SUN
  from: string // HH:mm
  to: string // HH:mm
}

export type SkillType = 'TEACH' | 'LEARN'

export interface UserSkillDTO {
  id: string
  skillId: string
  name: string
  category: string
  type: SkillType
  level: string // learn: BEGINNER | INTERMEDIATE | ADVANCED ; teach: INTERMEDIATE | ADVANCED | EXPERT
}

export interface BadgeDTO {
  code: string
  name: string
  description: string
  emoji: string
  unlocked: boolean
  unlockedAt: string | null
}

export interface MeDTO {
  id: string
  name: string
  email: string
  role: string
  status: string
  college: string
  department: string
  year: string
  bio: string
  profileImage: string | null
  xp: number
  rating: number
  reviewCount: number
  onboarded: boolean
  availability: Availability[]
  teachSkills: UserSkillDTO[]
  learnSkills: UserSkillDTO[]
  badges: BadgeDTO[]
  connectionsCount: number
  unreadNotifications: number
  unreadMessages: number
}

export type ConnectionStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'rejected'

export interface ReviewDTO {
  id: string
  rating: number
  comment: string
  createdAt: string
  reviewer: { id: string; name: string; profileImage: string | null }
  sessionTopic: string
}

export interface UserCardDTO {
  id: string
  name: string
  college: string
  department: string
  year: string
  bio: string
  profileImage: string | null
  xp: number
  rating: number
  reviewCount: number
  connectionsCount: number
  availability: Availability[]
  teachSkills: UserSkillDTO[]
  learnSkills: UserSkillDTO[]
  badges: BadgeDTO[]
  reviews?: ReviewDTO[]
  matchScore?: number
  matchReasons?: string[]
  connectionStatus?: ConnectionStatus
  saved?: boolean
  createdAt?: string
}

export interface NotificationDTO {
  id: string
  type: string
  title: string
  body: string
  refId: string | null
  read: boolean
  createdAt: string
}

export interface ConversationDTO {
  id: string
  other: { id: string; name: string; profileImage: string | null }
  lastMessage: { content: string; createdAt: string; senderId: string } | null
  unread: number
}

export interface MessageDTO {
  id: string
  senderId: string
  content: string
  createdAt: string
}

export interface SessionDTO {
  id: string
  topic: string
  description: string
  date: string
  time: string
  duration: number
  mode: string
  location: string
  meetingLink: string
  notes: string
  status: string
  myRole: 'teacher' | 'learner'
  teacher: { id: string; name: string; profileImage: string | null }
  learner: { id: string; name: string; profileImage: string | null }
  reviewed: boolean
  createdAt: string
}

export interface GoalTaskDTO {
  id: string
  title: string
  done: boolean
  order: number
}

export interface GoalDTO {
  id: string
  title: string
  skill: { id: string; name: string } | null
  tasks: GoalTaskDTO[]
  progress: number
  createdAt: string
}

export interface AnnouncementDTO {
  id: string
  title: string
  body: string
  authorName: string
  createdAt: string
}

export interface LeaderboardEntryDTO {
  id: string
  rank: number
  name: string
  college: string
  department: string
  profileImage: string | null
  xp: number
  badgeCount: number
  rating: number
}

export interface SkillCatalogCategory {
  id: string
  name: string
  skills: { id: string; name: string }[]
}

export interface AdminStatsDTO {
  cards: {
    totalStudents: number
    activeUsers: number
    suspendedUsers: number
    totalSkills: number
    totalConnections: number
    totalSessions: number
    openReports: number
    totalGoals: number
  }
  charts: {
    userGrowth: { label: string; count: number }[]
    popularSkills: { name: string; count: number }[]
    sessionsOverTime: { label: string; count: number }[]
    connectionsOverTime: { label: string; count: number }[]
    topStudents: { name: string; xp: number }[]
    departmentDistribution: { name: string; count: number }[]
  }
}

export interface AdminUserDTO {
  id: string
  name: string
  email: string
  role: string
  status: string
  college: string
  department: string
  year: string
  xp: number
  skillsCount: number
  createdAt: string
}

export interface AdminReportDTO {
  id: string
  reason: string
  description: string
  status: string
  adminNotes: string
  createdAt: string
  reporter: { id: string; name: string }
  reportedUser: { id: string; name: string; email: string }
}
