// app/api/passes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { createPass } from '@/lib/db/passes'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, totalEntries } = body

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (
    typeof totalEntries !== 'number' ||
    !Number.isInteger(totalEntries) ||
    totalEntries < 1 ||
    totalEntries > 1000
  ) {
    return NextResponse.json(
      { error: 'totalEntries must be an integer between 1 and 1000' },
      { status: 400 }
    )
  }

  const db = getDb()
  const result = await createPass(db, { name: name.trim(), totalEntries })
  return NextResponse.json(result, { status: 201 })
}
