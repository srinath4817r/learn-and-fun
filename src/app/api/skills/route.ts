import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { INITIAL_CATEGORIES } from '@/lib/lf/initial-skills'

export async function GET() {
  try {
    const count = await db.skillCategory.count()
    if (count === 0) {
      for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
        const cat = INITIAL_CATEGORIES[i]
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
    }

    const categories = await db.skillCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { skills: { orderBy: { name: 'asc' }, select: { id: true, name: true } } },
    })

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        skills: c.skills.map((s) => ({ id: s.id, name: s.name })),
      })),
    })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
