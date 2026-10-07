// ─── Learn & Fun — default skill catalog (seeded into DB, extendable by admins) ───
export const INITIAL_CATEGORIES: { name: string; skills: string[] }[] = [
  {
    name: 'Programming',
    skills: [
      'C', 'C++', 'Java', 'Python', 'JavaScript', 'React', 'Node.js',
      'Web Development', 'SQL', 'Data Structures',
    ],
  },
  {
    name: 'Design',
    skills: ['UI/UX', 'Figma', 'Photoshop', 'Canva', 'Graphic Design'],
  },
  {
    name: 'Creative',
    skills: ['Photography', 'Video Editing', 'Drawing', 'Music', 'Animation', 'Content Creation'],
  },
  {
    name: 'Communication',
    skills: ['Public Speaking', 'English', 'Presentation', 'Interview Skills'],
  },
  {
    name: 'Lifestyle',
    skills: ['Cooking', 'Fitness', 'Chess', 'Gaming', 'Personal Finance'],
  },
]

export const LEARN_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
export const TEACH_LEVELS = ['INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
}
