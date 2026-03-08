import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass, getPassByUserLink, getPassBySupervisorLink } from '@/lib/db/passes'

describe('pass queries', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('creates a pass and returns unique links', () => {
    const result = createPass(db, { name: 'Yoga 10', totalEntries: 10 })
    expect(result.id).toBeDefined()
    expect(result.userLink).toBeDefined()
    expect(result.supervisorLink).toBeDefined()
    expect(result.userLink).not.toBe(result.supervisorLink)
  })

  it('retrieves pass by user link', () => {
    const { userLink } = createPass(db, { name: 'Gym 8', totalEntries: 8 })
    const pass = getPassByUserLink(db, userLink)
    expect(pass?.name).toBe('Gym 8')
    expect(pass?.totalEntries).toBe(8)
  })

  it('returns undefined for unknown user link', () => {
    expect(getPassByUserLink(db, 'no-such-link')).toBeUndefined()
  })

  it('retrieves pass by supervisor link', () => {
    const { supervisorLink } = createPass(db, { name: 'Pilates 12', totalEntries: 12 })
    const pass = getPassBySupervisorLink(db, supervisorLink)
    expect(pass?.name).toBe('Pilates 12')
  })

  it('returns undefined for unknown supervisor link', () => {
    expect(getPassBySupervisorLink(db, 'no-such-link')).toBeUndefined()
  })

  it('generates unique links across multiple passes', () => {
    const a = createPass(db, { name: 'A', totalEntries: 5 })
    const b = createPass(db, { name: 'B', totalEntries: 5 })
    expect(a.userLink).not.toBe(b.userLink)
    expect(a.supervisorLink).not.toBe(b.supervisorLink)
    expect(a.id).not.toBe(b.id)
  })
})
