import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { countEntriesForPass, addEntry } from '@/lib/db/entries'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userLink: string }> }
) {
  const { userLink } = await params
  const db = getDb()
  const pass = getPassByUserLink(db, userLink)

  if (!pass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { visitDate, comment } = body

  if (!visitDate || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return NextResponse.json({ error: 'visitDate must be YYYY-MM-DD' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  if (visitDate > today) {
    return NextResponse.json({ error: 'visitDate cannot be in the future' }, { status: 400 })
  }

  const result = db.transaction((tx) => {
    // drizzle-orm's transaction type does not satisfy DrizzleDb directly; cast is safe
    const entryCount = countEntriesForPass(tx as unknown as typeof db, pass.id)
    if (entryCount >= pass.totalEntries) {
      return { full: true, id: null as string | null }
    }
    const id = addEntry(tx as unknown as typeof db, { passId: pass.id, visitDate, comment: comment ?? undefined })
    return { full: false, id: id as string | null }
  })

  if (result.full) {
    return NextResponse.json({ error: 'Pass is full' }, { status: 409 })
  }
  return NextResponse.json({ id: result.id }, { status: 201 })
}
