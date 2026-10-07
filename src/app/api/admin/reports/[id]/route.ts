import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/lf/auth'
import type { AdminReportDTO } from '@/lib/lf/types'

const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED']

/** PATCH /api/admin/reports/[id] — update status / admin notes */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getAuthUser()
    if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
    if (me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    const report = await db.report.findUnique({ where: { id } })
    if (!report) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const status = typeof body?.status === 'string' ? body.status : ''
    const adminNotes =
      typeof body?.adminNotes === 'string' ? body.adminNotes.trim().slice(0, 1000) : undefined

    if (!STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Status must be OPEN, INVESTIGATING, RESOLVED or REJECTED.' },
        { status: 400 }
      )
    }

    const updated = await db.report.update({
      where: { id },
      data: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
      include: {
        reporter: { select: { id: true, name: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
      },
    })

    const dto: AdminReportDTO = {
      id: updated.id,
      reason: updated.reason,
      description: updated.description,
      status: updated.status,
      adminNotes: updated.adminNotes,
      createdAt: updated.createdAt.toISOString(),
      reporter: { id: updated.reporter.id, name: updated.reporter.name },
      reportedUser: {
        id: updated.reportedUser.id,
        name: updated.reportedUser.name,
        email: updated.reportedUser.email,
      },
    }

    return NextResponse.json({ report: dto })
  } catch (e) {
    console.error('[admin/reports PATCH]', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
