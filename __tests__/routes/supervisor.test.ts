import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass } from '@/lib/db/passes'
import { addEntry, getEntry } from '@/lib/db/entries'

let db: TestDb

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
}))

const { PATCH, DELETE } = await import(
  '@/app/api/supervisor/[supervisorLink]/entries/[entryId]/route'
)

describe('supervisor entry routes', () => {
  let supervisorLink: string
  let entryId: string

  beforeEach(() => {
    db = createTestDb()
    const pass = createPass(db, { name: 'Test', totalEntries: 5 })
    supervisorLink = pass.supervisorLink
    entryId = addEntry(db, { passId: pass.id, visitDate: '2026-03-01', comment: 'original' })
  })

  function makeParams(sl: string, eid: string) {
    return { params: Promise.resolve({ supervisorLink: sl, entryId: eid }) }
  }

  // PATCH tests
  it('PATCH updates entry date', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2026-03-05' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams(supervisorLink, entryId))
    expect(res.status).toBe(200)
    expect(getEntry(db, entryId)?.visitDate).toBe('2026-03-05')
  })

  it('PATCH returns 404 for wrong supervisor link', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2026-03-05' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams('wrong-link', entryId))
    expect(res.status).toBe(404)
  })

  it('PATCH returns 400 for future date', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2099-12-31' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams(supervisorLink, entryId))
    expect(res.status).toBe(400)
  })

  it('PATCH returns 404 for entry not belonging to pass', async () => {
    const otherPass = createPass(db, { name: 'Other', totalEntries: 5 })
    const otherId = addEntry(db, { passId: otherPass.id, visitDate: '2026-03-01' })
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2026-03-05' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams(supervisorLink, otherId))
    expect(res.status).toBe(404)
  })

  // DELETE tests
  it('DELETE removes the entry', async () => {
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req as any, makeParams(supervisorLink, entryId))
    expect(res.status).toBe(200)
    expect(getEntry(db, entryId)).toBeUndefined()
  })

  it('DELETE returns 404 for wrong supervisor link', async () => {
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req as any, makeParams('wrong-link', entryId))
    expect(res.status).toBe(404)
  })
})
