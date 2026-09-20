import { describe, expect, it } from 'vitest'
import { formatRequestDate } from './formatRequestDate'

describe('request date formatting', () => {
  it('displays UTC date and time without mutating the timestamp', () => {
    const timestamp = '2026-09-19T14:35:00.000Z'
    expect(formatRequestDate(timestamp, true)).toBe('19 Sept 2026, 14:35 UTC')
    expect(timestamp).toBe('2026-09-19T14:35:00.000Z')
  })
  it('normalizes offsets to UTC and preserves short list dates', () => {
    expect(formatRequestDate('2026-09-20T00:35:00+02:00', true)).toBe('19 Sept 2026, 22:35 UTC')
    expect(formatRequestDate('2026-08-18T08:00:00Z')).toBe('18 Aug 2026')
  })
  it('provides a safe fallback instead of an invalid date', () => {
    expect(formatRequestDate('invalid')).toBe('Date unavailable')
  })
})
