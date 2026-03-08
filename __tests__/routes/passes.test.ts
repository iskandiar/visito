// __tests__/routes/passes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
}))

const { POST } = await import('@/app/api/passes/route')

describe('POST /api/passes', () => {
  beforeEach(() => {
    db = createTestDb()
  })

  it('creates a pass and returns user and supervisor links', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Yoga 10', totalEntries: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.userLink).toBeDefined()
    expect(body.supervisorLink).toBeDefined()
    expect(body.id).toBeDefined()
  })

  it('returns 400 when name is missing', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ totalEntries: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when totalEntries is zero', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', totalEntries: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when totalEntries is not a number', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', totalEntries: 'ten' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
