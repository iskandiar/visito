import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userLink: string }> }
) {
  const { userLink } = await params
  const db = getDb()
  const pass = getPassByUserLink(db, userLink)

  if (!pass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const passEntries = getEntriesForPass(db, pass.id)
  return NextResponse.json({ pass, entries: passEntries })
}
