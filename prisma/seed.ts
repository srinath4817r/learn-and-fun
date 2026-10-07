// ─── Learn & Fun — demo seed (clearly separated dev/demo data) ───
// Run: bun prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { INITIAL_CATEGORIES } from '../src/lib/lf/initial-skills'

const db = new PrismaClient()

const DAYS_OFFSET = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('Seeding Learn & Fun demo data…')

  // ── Reset demo data (idempotent seed) ──
  await db.message.deleteMany()
  await db.conversationParticipant.deleteMany()
  await db.conversation.deleteMany()
  await db.review.deleteMany()
  await db.learningSession.deleteMany()
  await db.goalTask.deleteMany()
  await db.learningGoal.deleteMany()
  await db.notification.deleteMany()
  await db.userBadge.deleteMany()
  await db.xpEvent.deleteMany()
  await db.userSkill.deleteMany()
  await db.savedUser.deleteMany()
  await db.connection.deleteMany()
  await db.report.deleteMany()
  await db.announcement.deleteMany()
  await db.user.deleteMany()
  await db.skill.deleteMany()
  await db.skillCategory.deleteMany()
  await db.badge.deleteMany()

  // ── Skills catalog ──
  for (const [i, cat] of INITIAL_CATEGORIES.entries()) {
    const category = await db.skillCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, sortOrder: i },
    })
    for (const skillName of cat.skills) {
      await db.skill.upsert({
        where: { categoryId_name: { categoryId: category.id, name: skillName } },
        update: {},
        create: { name: skillName, categoryId: category.id },
      })
    }
  }
  const skills = await db.skill.findMany()
  const skillId = (name: string) => {
    const s = skills.find((s) => s.name === name)
    if (!s) throw new Error(`Missing skill: ${name}`)
    return s.id
  }

  // ── Badges ──
  const badgeDefs = [
    { code: 'FIRST_STEP', name: 'First Step', emoji: '', description: 'Completed your profile' },
    { code: 'FIRST_LEARNER', name: 'First Learner', emoji: '', description: 'Completed your first learning session' },
    { code: 'FIRST_TEACHER', name: 'First Teacher', emoji: '', description: 'Successfully taught someone' },
    { code: 'SKILL_SHARER', name: 'Skill Sharer', emoji: '', description: 'Taught 5 different students' },
    { code: 'COMMUNITY_BUILDER', name: 'Community Builder', emoji: '', description: 'Made 10 connections' },
    { code: 'SKILL_MASTER', name: 'Skill Master', emoji: '', description: 'Received an excellent 5-star review' },
  ]
  for (const def of badgeDefs) {
    await db.badge.upsert({ where: { code: def.code }, update: {}, create: def })
  }

  // ── Users ──
  const password = await bcrypt.hash('password123', 10)
  const adminPassword = password
  const COLLEGE = 'Sunrise Institute of Technology'

  type SeedUser = {
    email: string
    name: string
    department: string
    year: string
    bio: string
    xp: number
    teach: [string, string][]
    learn: [string, string][]
    availability: { day: string; from: string; to: string }[]
  }

  const AV = {
    monSat: [{ day: 'MON', from: '18:00', to: '20:00' }, { day: 'SAT', from: '10:00', to: '14:00' }],
    monSatWed: [{ day: 'MON', from: '18:00', to: '20:00' }, { day: 'WED', from: '19:00', to: '21:00' }, { day: 'SAT', from: '10:00', to: '14:00' }],
    satSun: [{ day: 'SAT', from: '16:00', to: '19:00' }, { day: 'SUN', from: '10:00', to: '13:00' }],
    sat: [{ day: 'SAT', from: '11:00', to: '15:00' }],
    monWed: [{ day: 'MON', from: '17:00', to: '19:00' }, { day: 'WED', from: '18:00', to: '21:00' }],
    fri: [{ day: 'FRI', from: '18:00', to: '21:00' }],
    tueThu: [{ day: 'TUE', from: '18:00', to: '20:00' }, { day: 'THU', from: '18:00', to: '20:00' }],
  }

  const students: SeedUser[] = [
    {
      email: 'ananya@learnfun.dev', name: 'Ananya Sharma', department: 'CSE', year: '3',
      bio: 'Design-loving developer. I live in Figma by day and explore frontend magic by night. Happy to help anyone get started with UI/UX!',
      xp: 520,
      teach: [['UI/UX', 'EXPERT'], ['Figma', 'ADVANCED'], ['Graphic Design', 'INTERMEDIATE']],
      learn: [['JavaScript', 'BEGINNER'], ['React', 'BEGINNER']],
      availability: AV.monSat,
    },
    {
      email: 'aarav@learnfun.dev', name: 'Aarav Mehta', department: 'CSE', year: '4',
      bio: 'Full-stack enthusiast. JavaScript is my mother tongue — let me help you fall in love with coding.',
      xp: 475,
      teach: [['JavaScript', 'ADVANCED'], ['React', 'ADVANCED'], ['Node.js', 'INTERMEDIATE']],
      learn: [['UI/UX', 'INTERMEDIATE'], ['Figma', 'BEGINNER']],
      availability: AV.monSatWed,
    },
    {
      email: 'sneha@learnfun.dev', name: 'Sneha Iyer', department: 'IT', year: '3',
      bio: 'Pythonista & data nerd. Teaching is the best way to learn — ask me anything about Python!',
      xp: 420,
      teach: [['Python', 'EXPERT'], ['SQL', 'ADVANCED'], ['Data Structures', 'INTERMEDIATE']],
      learn: [['Photography', 'BEGINNER'], ['Public Speaking', 'INTERMEDIATE']],
      availability: AV.satSun,
    },
    {
      email: 'rahul@learnfun.dev', name: 'Rahul Verma', department: 'ECE', year: '2',
      bio: 'The guy with the camera. Photography, video editing and now trying to survive Python.',
      xp: 390,
      teach: [['Photography', 'ADVANCED'], ['Video Editing', 'INTERMEDIATE']],
      learn: [['Python', 'BEGINNER'], ['UI/UX', 'BEGINNER']],
      availability: AV.sat,
    },
    {
      email: 'arjun@learnfun.dev', name: 'Arjun Nair', department: 'CSE', year: '4',
      bio: 'Competitive programmer. C++ and DSA are my comfort zone. Currently learning to make music!',
      xp: 350,
      teach: [['C++', 'ADVANCED'], ['Data Structures', 'EXPERT']],
      learn: [['Music', 'BEGINNER'], ['Figma', 'BEGINNER']],
      availability: AV.monWed,
    },
    {
      email: 'priya@learnfun.dev', name: 'Priya Menon', department: 'IT', year: '2',
      bio: 'Singer-songwriter and guitarist. Music brought me here, C++ haunts my dreams (help!).',
      xp: 280,
      teach: [['Music', 'ADVANCED'], ['Content Creation', 'INTERMEDIATE']],
      learn: [['C++', 'BEGINNER']],
      availability: AV.monWed,
    },
    {
      email: 'kavya@learnfun.dev', name: 'Kavya Reddy', department: 'CSE', year: '3',
      bio: 'Product design intern by summer, DSA warrior by night. Figma is my happy place.',
      xp: 240,
      teach: [['Figma', 'INTERMEDIATE'], ['UI/UX', 'INTERMEDIATE']],
      learn: [['Data Structures', 'BEGINNER']],
      availability: AV.monWed,
    },
    {
      email: 'dev@learnfun.dev', name: 'Dev Malhotra', department: 'MBA', year: '2',
      bio: 'Debater,Toastmaster and part-time standup. I can make you a confident speaker — promise!',
      xp: 220,
      teach: [['Public Speaking', 'EXPERT'], ['English', 'ADVANCED'], ['Interview Skills', 'ADVANCED']],
      learn: [['Video Editing', 'BEGINNER']],
      availability: AV.satSun,
    },
    {
      email: 'ishita@learnfun.dev', name: 'Ishita Bose', department: 'CSE', year: '2',
      bio: 'Content creator with a small but mighty YouTube channel. Learning English interview skills for internships!',
      xp: 180,
      teach: [['Content Creation', 'ADVANCED'], ['Canva', 'INTERMEDIATE']],
      learn: [['English', 'BEGINNER'], ['SQL', 'BEGINNER']],
      availability: AV.tueThu,
    },
    {
      email: 'rohan@learnfun.dev', name: 'Rohan Gupta', department: 'IT', year: '4',
      bio: 'Backend builder, API architect. Node.js wizard looking to level up my design taste.',
      xp: 150,
      teach: [['Node.js', 'ADVANCED'], ['Web Development', 'ADVANCED']],
      learn: [['Graphic Design', 'BEGINNER']],
      availability: AV.fri,
    },
    {
      email: 'meera@learnfun.dev', name: 'Meera Krishnan', department: 'CSE', year: '1',
      bio: 'First-year with a Wacom tablet and big dreams. Design now, servers later.',
      xp: 120,
      teach: [['Graphic Design', 'ADVANCED'], ['Photoshop', 'INTERMEDIATE']],
      learn: [['Node.js', 'BEGINNER']],
      availability: AV.fri,
    },
    {
      email: 'kartik@learnfun.dev', name: 'Kartik Singh', department: 'ECE', year: '3',
      bio: 'Chess club president. Java, chess openings, and good coffee — ask me about any of the three.',
      xp: 90,
      teach: [['Java', 'INTERMEDIATE'], ['Chess', 'ADVANCED']],
      learn: [['Web Development', 'BEGINNER'], ['English', 'INTERMEDIATE']],
      availability: AV.tueThu,
    },
  ]

  const users: Record<string, string> = {}

  await db.user.upsert({
    where: { email: 'admin@learnfun.dev' },
    update: {},
    create: {
      name: 'Campus Admin', email: 'admin@learnfun.dev', password: adminPassword,
      college: COLLEGE, department: 'Administration', year: 'Staff', role: 'ADMIN',
      bio: 'Keeping Learn & Fun safe, welcoming and fun for everyone.', onboarded: true,
    },
  })
  users['admin'] = (await db.user.findUniqueOrThrow({ where: { email: 'admin@learnfun.dev' } })).id

  for (const s of students) {
    const u = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name, email: s.email, password, college: COLLEGE,
        department: s.department, year: s.year, bio: s.bio, xp: s.xp,
        onboarded: true, availability: JSON.stringify(s.availability),
      },
    })
    users[s.email.split('@')[0]] = u.id
    for (const [name, level] of s.teach) {
      await db.userSkill.upsert({
        where: { userId_skillId_type: { userId: u.id, skillId: skillId(name), type: 'TEACH' } },
        update: { level },
        create: { userId: u.id, skillId: skillId(name), type: 'TEACH', level },
      })
    }
    for (const [name, level] of s.learn) {
      await db.userSkill.upsert({
        where: { userId_skillId_type: { userId: u.id, skillId: skillId(name), type: 'LEARN' } },
        update: { level },
        create: { userId: u.id, skillId: skillId(name), type: 'LEARN', level },
      })
    }
    // Baseline XP events so future awards never duplicate profile/skill XP
    await db.xpEvent.upsert({
      where: { userId_code: { userId: u.id, code: 'PROFILE_COMPLETED' } },
      update: {},
      create: { userId: u.id, code: 'PROFILE_COMPLETED', xp: 10, reason: 'Completed profile' },
    })
  }

  // ── Connections ──
  async function connect(a: string, b: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED', message: string, senderIsA = true) {
    const senderId = senderIsA ? users[a] : users[b]
    const receiverId = senderIsA ? users[b] : users[a]
    const existing = await db.connection.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } },
    })
    if (existing) return existing
    return db.connection.create({
      data: { senderId, receiverId, status, message },
    })
  }

  await connect('aarav', 'ananya', 'ACCEPTED', 'Hi Ananya! I want to learn UI/UX and I can help you with JavaScript. Win-win?')
  await connect('rahul', 'sneha', 'ACCEPTED', 'Hi Sneha! I want to learn Python and I can help you with Photography.', true)
  await connect('priya', 'arjun', 'ACCEPTED', 'Hi Arjun! I can teach you guitar basics if you can help me survive C++!')
  await connect('rohan', 'meera', 'ACCEPTED', 'Hi Meera! Node.js lessons in exchange for design tips?')
  await connect('dev', 'ishita', 'PENDING', 'Hi Ishita! I can coach you for English interviews — and I would love to learn video editing from you!', true)
  await connect('kartik', 'ananya', 'PENDING', 'Hi Ananya! Loved your portfolio. Can you teach me basics of UI design?', true)
  await connect('sneha', 'aarav', 'PENDING', 'Hi Aarav! Accept me so I can ask you React questions', true)

  // ── Conversations & messages ──
  async function converse(a: string, b: string, msgs: [sender: string, content: string, minutesAgo: number][], aReadUpTo?: number, bReadUpTo?: number) {
    const existing = await db.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: users[a] } } },
          { participants: { some: { userId: users[b] } } },
        ],
      },
      include: { participants: true },
    })
    if (existing) return existing
    const convo = await db.conversation.create({ data: {} })
    const readAt = (idx: number | undefined) => {
      if (idx === undefined) return null
      const m = msgs[idx]
      return m ? new Date(Date.now() - m[2] * 60000) : null
    }
    await db.conversationParticipant.create({
      data: { conversationId: convo.id, userId: users[a], lastReadAt: readAt(aReadUpTo) },
    })
    await db.conversationParticipant.create({
      data: { conversationId: convo.id, userId: users[b], lastReadAt: readAt(bReadUpTo) },
    })
    for (const [sender, content, minutesAgo] of msgs) {
      await db.message.create({
        data: { conversationId: convo.id, senderId: users[sender], content, createdAt: new Date(Date.now() - minutesAgo * 60000) },
      })
    }
    return db.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } })
  }

  await converse('aarav', 'ananya', [
    ['aarav', 'Hi Ananya! Saw we are a 96% match', 260],
    ['ananya', 'Haha yes! Your JavaScript for my UI/UX — deal?', 250],
    ['aarav', 'Absolutely. Want to start this Saturday 10 AM?', 240],
    ['ananya', 'Saturday 6 PM works even better for me!', 30],
  ], 0, undefined)

  await converse('rahul', 'sneha', [
    ['rahul', 'Hi Sneha! Ready for my first Python lesson?', 400],
    ['sneha', 'Born ready! Saturday 4 PM, library lab?', 380],
    ['rahul', 'Perfect. I will bring my camera too — photography lesson after!', 120],
    ['sneha', 'It is a date… I mean, a session!', 60],
  ], 3, undefined)

  await converse('priya', 'arjun', [
    ['priya', 'C++ session went great today, thanks Arjun!', 900],
    ['arjun', 'Your guitar tips were amazing too. Next week same time?', 880],
  ], 1, 1)

  // ── Sessions ──
  async function session(teacher: string, learner: string, topic: string, description: string, date: string, time: string, duration: number, status: 'UPCOMING' | 'COMPLETED', mode = 'ONLINE', location = '', meetingLink = '') {
    return db.learningSession.create({
      data: { teacherId: users[teacher], learnerId: users[learner], topic, description, date, time, duration, status, mode, location, meetingLink },
    })
  }

  const s1 = await session('ananya', 'aarav', 'Design systems crash course', 'From color tokens to component libraries — everything Aarav needs to think like a designer.', DAYS_OFFSET(-6), '18:00', 90, 'COMPLETED')
  const s2 = await session('sneha', 'rahul', 'Python fundamentals', 'Variables, loops and functions with fun mini exercises.', DAYS_OFFSET(-4), '16:00', 60, 'COMPLETED', 'IN_PERSON', 'Central Library Lab 2')
  await session('aarav', 'ananya', 'JavaScript deep dive: closures & async', 'Closures, promises and async/await explained with real examples.', DAYS_OFFSET(2), '18:00', 90, 'UPCOMING', 'ONLINE', '', 'https://meet.google.com/learnfun-demo')
  await session('arjun', 'priya', 'C++ basics: pointers demystified', 'A gentle intro to pointers and references for musicians.', DAYS_OFFSET(4), '19:00', 60, 'UPCOMING', 'IN_PERSON', 'CSE Block Room 204')

  // ── Reviews for completed sessions ──
  await db.review.createMany({
    data: [
      { sessionId: s1.id, reviewerId: users['aarav'], reviewedUserId: users['ananya'], rating: 5, comment: 'Ananya is a phenomenal teacher — patient, structured and inspiring!', createdAt: new Date(Date.now() - 5 * 86400000) },
      { sessionId: s1.id, reviewerId: users['ananya'], reviewedUserId: users['aarav'], rating: 5, comment: 'Aarav makes JavaScript feel easy. Brilliant session!', createdAt: new Date(Date.now() - 5 * 86400000) },
      { sessionId: s2.id, reviewerId: users['rahul'], reviewedUserId: users['sneha'], rating: 5, comment: 'Sneha explained Python so clearly. Best teacher on campus!', createdAt: new Date(Date.now() - 3 * 86400000) },
    ],
  })

  // Recalculate ratings
  const allUsers = await db.user.findMany({ select: { id: true } })
  for (const u of allUsers) {
    const agg = await db.review.aggregate({
      where: { reviewedUserId: u.id },
      _avg: { rating: true },
      _count: { rating: true },
    })
    await db.user.update({
      where: { id: u.id },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count.rating,
      },
    })
  }

  // ── Goals ──
  async function goal(user: string, title: string, skillName: string | null, tasks: [string, boolean][]) {
    return db.learningGoal.create({
      data: {
        userId: users[user],
        title,
        skillId: skillName ? skillId(skillName) : null,
        tasks: {
          create: tasks.map(([t, done], i) => ({ title: t, done, order: i })),
        },
      },
    })
  }

  await goal('aarav', 'Learn UI/UX in 30 days', 'UI/UX', [
    ['Wireframing basics', true], ['Color theory', true], ['Typography principles', true],
    ['Figma auto-layout practice', false], ['Design a portfolio piece', false],
  ])
  await goal('rahul', 'Learn Python in 30 days', 'Python', [
    ['Variables', true], ['Conditions', true], ['Loops', true], ['Functions', true],
    ['OOP', false], ['Mini project', false],
  ])
  await goal('sneha', 'Photography basics bootcamp', 'Photography', [
    ['Exposure triangle', true], ['Composition rules', true], ['Golden hour shoot', false], ['Edit in Lightroom', false], ['Photo essay', false],
  ])
  await goal('ananya', 'JavaScript fundamentals', 'JavaScript', [
    ['Syntax & variables', true], ['Functions', true], ['DOM manipulation', false], ['Build a to-do app', false],
  ])

  // ── Notifications ──
  const notifs: [string, string, string, string][] = [
    ['aarav', 'CONNECTION_ACCEPTED', 'Ananya Sharma accepted your connection', 'Say hi and schedule your first session!'],
    ['aarav', 'BADGE', 'Badge unlocked: First Teacher', 'Successfully taught someone'],
    ['aarav', 'BADGE', 'Badge unlocked: First Learner', 'Completed your first learning session'],
    ['ananya', 'CONNECTION_REQUEST', 'Kartik Singh wants to connect', 'Hi Ananya! Loved your portfolio. Can you teach me basics of UI design?'],
    ['ananya', 'REVIEW', 'Aarav Mehta left you a 5-star review', 'Ananya is a phenomenal teacher — patient, structured and inspiring!'],
    ['sneha', 'CONNECTION_REQUEST', 'Aarav Mehta wants to connect', 'Hi Aarav! Accept me so I can ask you React questions'],
    ['rahul', 'CONNECTION_ACCEPTED', 'Sneha Iyer accepted your connection', 'Say hi and schedule your first session!'],
    ['rahul', 'SESSION', 'Upcoming session: Python fundamentals', 'Review your session details'],
    ['priya', 'SESSION', 'Arjun Nair scheduled a session: C++ basics', 'Check your sessions page'],
    ['admin', 'SYSTEM', 'Welcome to Learn & Fun', 'Your admin dashboard is ready.'],
  ]
  let n = 0
  for (const [user, type, title, body] of notifs) {
    await db.notification.create({
      data: { userId: users[user], type, title, body, read: n > 4, createdAt: new Date(Date.now() - (n + 1) * 3600000) },
    })
    n++
  }

  // ── Badges from real events ──
  const badgeBy = (code: string) => badgeDefs.find((b) => b.code === code)!
  const grant = async (user: string, code: string) => {
    const b = await db.badge.findUniqueOrThrow({ where: { code } })
    await db.userBadge.upsert({
      where: { userId_badgeId: { userId: users[user], badgeId: b.id } },
      update: {},
      create: { userId: users[user], badgeId: b.id },
    })
  }
  const everyone = students.map((s) => s.email.split('@')[0])
  for (const u of everyone) await grant(u, 'FIRST_STEP')
  await grant('ananya', 'FIRST_TEACHER')
  await grant('sneha', 'FIRST_TEACHER')
  await grant('sneha', 'FIRST_LEARNER')
  await grant('ananya', 'SKILL_MASTER')
  await grant('sneha', 'SKILL_MASTER')
  await grant('aarav', 'FIRST_LEARNER')
  await grant('aarav', 'FIRST_TEACHER')
  await grant('rahul', 'FIRST_LEARNER')
  await grant('arjun', 'FIRST_TEACHER')

  // XP event codes for completed sessions (prevents future duplicate awards)
  await db.xpEvent.createMany({
    data: [
      { userId: users['ananya'], code: `SESSION_COMPLETED_TEACHER:${s1.id}`, xp: 25, reason: 'Taught a learning session' },
      { userId: users['aarav'], code: `SESSION_COMPLETED_LEARNER:${s1.id}`, xp: 15, reason: 'Completed a learning session' },
      { userId: users['sneha'], code: `SESSION_COMPLETED_TEACHER:${s2.id}`, xp: 25, reason: 'Taught a learning session' },
      { userId: users['rahul'], code: `SESSION_COMPLETED_LEARNER:${s2.id}`, xp: 15, reason: 'Completed a learning session' },
    ],
  })

  // ── Announcements ──
  await db.announcement.createMany({
    data: [
      { title: 'Python Peer Learning Workshop', body: 'Join us this Saturday 4 PM at Seminar Hall for a hands-on peer learning workshop. Bring your laptops and questions — beginners welcome!', authorId: users['admin'] },
      { title: 'Design Category Expanded', body: 'We just added new skills to the Design category. Update your profile and find your design mentor today.', authorId: users['admin'] },
    ],
  })

  const counts = {
    users: await db.user.count(),
    skills: await db.skill.count(),
    connections: await db.connection.count(),
    messages: await db.message.count(),
    sessions: await db.learningSession.count(),
    reviews: await db.review.count(),
    goals: await db.learningGoal.count(),
    notifications: await db.notification.count(),
  }
  console.log('Seed complete:', counts)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
