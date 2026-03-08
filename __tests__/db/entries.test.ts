// __tests__/db/entries.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass } from '@/lib/db/passes'
import {
  addEntry,
  countEntriesForPass,
  getEntriesForPass,
  getEntry,
  updateEntry,
  deleteEntry,
} from '@/lib/db/entries'

describe('entry queries', () => {
  let db: TestDb
  let passId: string

  beforeEach(() => {
    db = createTestDb()
    passId = createPass(db, { name: 'Test', totalEntries: 3 }).id
  })

  it('adds an entry and retrieves it', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-07' })
    const entry = getEntry(db, id)
    expect(entry?.visitDate).toBe('2026-03-07')
    expect(entry?.comment).toBeNull()
    expect(entry?.passId).toBe(passId)
  })

  it('adds entry with comment', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-07', comment: 'Great session' })
    expect(getEntry(db, id)?.comment).toBe('Great session')
  })

  it('counts entries correctly', () => {
    expect(countEntriesForPass(db, passId)).toBe(0)
    addEntry(db, { passId, visitDate: '2026-03-07' })
    addEntry(db, { passId, visitDate: '2026-03-07' })
    expect(countEntriesForPass(db, passId)).toBe(2)
  })

  it('allows multiple entries on the same day', () => {
    addEntry(db, { passId, visitDate: '2026-03-07' })
    addEntry(db, { passId, visitDate: '2026-03-07' })
    expect(countEntriesForPass(db, passId)).toBe(2)
  })

  it('retrieves all entries for a pass ordered by createdAt', () => {
    addEntry(db, { passId, visitDate: '2026-03-01' })
    addEntry(db, { passId, visitDate: '2026-03-05' })
    const all = getEntriesForPass(db, passId)
    expect(all).toHaveLength(2)
  })

  it('updates entry date and comment', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-01', comment: 'old' })
    updateEntry(db, id, { visitDate: '2026-03-02', comment: 'new' })
    const entry = getEntry(db, id)
    expect(entry?.visitDate).toBe('2026-03-02')
    expect(entry?.comment).toBe('new')
  })

  it('clears comment when set to null', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-01', comment: 'remove me' })
    updateEntry(db, id, { comment: null })
    expect(getEntry(db, id)?.comment).toBeNull()
  })

  it('deletes an entry', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-07' })
    deleteEntry(db, id)
    expect(getEntry(db, id)).toBeUndefined()
    expect(countEntriesForPass(db, passId)).toBe(0)
  })

  it('returns undefined for unknown entry', () => {
    expect(getEntry(db, 'no-such-id')).toBeUndefined()
  })
})
