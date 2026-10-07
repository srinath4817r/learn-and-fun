import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { AdminReportDTO } from '@/lib/lf/types'

/** GET /api/admin/reports — moderation queue, newest first */
export async function GET() {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const reports = await db.report.findMany({
      include: {
        reporter: { select: { id: true, name: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const dto: AdminReportDTO[] = reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      reporter: { id: r.reporter.id, name: r.reporter.name },
      reportedUser: {
        id: r.reportedUser.id,
        name: r.reportedUser.name,
        email: r.reportedUser.email,
      },
    }))

    return NextResponse.json({ reports: dto })
  } catch (e) {
    console.error('[admin/reports GET]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
