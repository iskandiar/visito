import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntry, updateEntry, deleteEntry } from '@/lib/db/entries'

type Params = { params: Promise<{ supervisorLink: string; entryId: string }> }

async function resolvePassAndEntry(supervisorLink: string, entryId: string) {
  const db = getDb()
  const pass = await getPassBySupervisorLink(db, supervisorLink)
  if (!pass) return { db, pass: null, entry: null }

  const entry = await getEntry(db, entryId)
  if (!entry || entry.passId !== pass.id) return { db, pass, entry: null }

  return { db, pass, entry }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supervisorLink, entryId } = await params
  const { db, pass, entry } = await resolvePassAndEntry(supervisorLink, entryId)

  if (!pass || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { visitDate, comment } = body

  if (visitDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
      return NextResponse.json({ error: 'visitDate must be YYYY-MM-DD' }, { status: 400 })
    }
    const today = new Date().toISOString().split('T')[0]
    if (visitDate > today) {
      return NextResponse.json({ error: 'visitDate cannot be in the future' }, { status: 400 })
    }
  }

  await updateEntry(db, entryId, {
    ...(visitDate !== undefined && { visitDate }),
    ...(comment !== undefined && { comment }),
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { supervisorLink, entryId } = await params
  const { db, pass, entry } = await resolvePassAndEntry(supervisorLink, entryId)

  if (!pass || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteEntry(db, entryId)
  return NextResponse.json({ success: true })
}
