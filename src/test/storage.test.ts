import { describe, it, expect, beforeEach } from 'vitest'
import { loadData, saveData, resetData, importData } from '@/storage/storage'
import { createInitialData } from '@/constants/defaults'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns fresh defaults when nothing is stored', () => {
    const data = loadData()
    expect(data.version).toBe(3)
    expect(data.subjects).toEqual([])
    expect(data.preferences.dailyStudyHours).toBeGreaterThan(0)
  })

  it('round-trips saved data', () => {
    const seed = createInitialData({ demo: true })
    saveData(seed)
    const loaded = loadData()
    expect(loaded.subjects.length).toBe(seed.subjects.length)
    expect(loaded.exams.length).toBe(seed.exams.length)
    expect(loaded.sessions.length).toBe(seed.sessions.length)
  })

  it('recovers from malformed JSON without throwing', () => {
    localStorage.setItem('focusflow:data-v1', '{not valid json')
    const data = loadData()
    expect(data.subjects).toEqual([])
    expect(data.onboarded).toBe(false)
  })

  it('normalises a partial object missing arrays', () => {
    localStorage.setItem('focusflow:data-v1', JSON.stringify({ version: 2, profile: { name: 'Me' } }))
    const data = loadData()
    expect(data.profile.name).toBe('Me')
    expect(Array.isArray(data.topics)).toBe(true)
    expect(Array.isArray(data.sessions)).toBe(true)
    expect(data.preferences.studyWindows.length).toBeGreaterThan(0)
  })

  it('reset clears stored data', () => {
    saveData(createInitialData({ demo: true }))
    const fresh = resetData()
    expect(fresh.demo).toBe(false)
    expect(fresh.subjects).toEqual([])
  })

  it('imports a valid backup and persists it', () => {
    const backup = createInitialData({ demo: true })
    const restored = importData(JSON.stringify(backup))
    expect(restored).not.toBeNull()
    expect(restored!.subjects.length).toBe(backup.subjects.length)
    expect(loadData().subjects.length).toBe(backup.subjects.length)
  })

  it('rejects invalid JSON and unrelated JSON objects', () => {
    expect(importData('{not json')).toBeNull()
    expect(importData('"just a string"')).toBeNull()
    expect(importData(JSON.stringify({ hello: 'world' }))).toBeNull()
  })
})
