# learn-and-fun

Learn Something. Share Something. Have Fun.

A skill-exchange web app where people teach what they know and learn what they love — built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui and Prisma (SQLite).

## Features

- Skill profiles (I Can Teach / I Want to Learn)
- Skill matching with match scoring
- Discovery feed & search
- Real-time messaging
- Learning sessions & progress tracking (XP, badges, streaks)
- Leaderboard, announcements & notifications
- Admin panel (users, skills, reports, categories)
- Guest login

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui (MONO GLASS theme)
- **Database:** Prisma ORM + SQLite
- **State:** Zustand + TanStack Query

## Getting Started

```bash
# install dependencies
bun install

# set up the database
bun run db:push
bunx prisma db seed

# run the dev server
bun run dev
```

Create a `.env` file in the project root:

```env
DATABASE_URL=file:/absolute/path/to/db/custom.db
AUTH_SECRET=your_secret_here
```

## Environment Variables

| Variable       | Description                                  |
| -------------- | -------------------------------------------- |
| `DATABASE_URL` | SQLite database file path                    |
| `AUTH_SECRET`  | Secret used for signing auth sessions        |

> Never commit your `.env` file — it is git-ignored by default.

## License

 and its published  link is :-https://learnfun.space-z.ai

 
