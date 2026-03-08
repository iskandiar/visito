// __tests__/routes/entries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass } from '@/lib/db/passes'

let db: TestDb

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
}))

const { POST } = await import('@/app/api/passes/[userLink]/entries/route')

function makeReq(userLink: string, body: object) {
  return new Request(`http://localhost/api/passes/${userLink}/entries`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/passes/[userLink]/entries', () => {
  let userLink: string

  beforeEach(() => {
    db = createTestDb()
    const pass = createPass(db, { name: 'Test Pass', totalEntries: 2 })
    userLink = pass.userLink
  })

  it('adds an entry and returns 201', async () => {
    const res = await POST(makeReq(userLink, { visitDate: '2026-03-07' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
  })

  it('returns 404 for unknown user link', async () => {
    const res = await POST(makeReq('no-such-link', { visitDate: '2026-03-07' }) as any, {
      params: Promise.resolve({ userLink: 'no-such-link' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for missing visitDate', async () => {
    const res = await POST(makeReq(userLink, {}) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for future visitDate', async () => {
    const res = await POST(makeReq(userLink, { visitDate: '2099-01-01' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 409 when pass is full', async () => {
    // Fill the pass (totalEntries: 2)
    await POST(makeReq(userLink, { visitDate: '2026-03-01' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    await POST(makeReq(userLink, { visitDate: '2026-03-02' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    const res = await POST(makeReq(userLink, { visitDate: '2026-03-03' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(409)
  })
})
