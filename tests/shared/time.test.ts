import { dayKey, formatClock, formatCountdown, formatDate, formatDuration } from '../../src/shared/time'

describe('formatClock', () => {
    const d = new Date(2026, 8, 16, 21, 5, 9)
    test('24h without seconds', () => expect(formatClock(d, { h24: true, seconds: false })).toBe('21:05'))
    test('24h with seconds', () => expect(formatClock(d, { h24: true, seconds: true })).toBe('21:05:09'))
    test('12h', () => expect(formatClock(d, { h24: false, seconds: false })).toBe('9:05'))
    test('12h midnight is 12', () => expect(formatClock(new Date(2026, 0, 1, 0, 7), { h24: false, seconds: false })).toBe('12:07'))
    test('24h pads hour', () => expect(formatClock(new Date(2026, 0, 1, 7, 7), { h24: true, seconds: false })).toBe('07:07'))
})

test('formatDate in Turkish', () => {
    expect(formatDate(new Date(2026, 8, 16), 'tr-TR')).toBe('16 Eylül Çarşamba')
})

describe('dayKey', () => {
    test('uses local date', () => expect(dayKey(new Date(2026, 8, 16, 23, 59))).toBe('2026-09-16'))
    test('accepts epoch ms', () => expect(dayKey(new Date(2026, 0, 2, 0, 1).getTime())).toBe('2026-01-02'))
})

describe('formatDuration', () => {
    test('zero', () => expect(formatDuration(0)).toBe('0 dk'))
    test('minutes only', () => expect(formatDuration(45)).toBe('45 dk'))
    test('exact hour', () => expect(formatDuration(60)).toBe('1 sa'))
    test('hours and minutes', () => expect(formatDuration(85)).toBe('1 sa 25 dk'))
})

describe('formatCountdown', () => {
    test('rounds up partial seconds', () => expect(formatCountdown(59_001)).toBe('01:00'))
    test('full pomodoro', () => expect(formatCountdown(25 * 60_000)).toBe('25:00'))
    test('never negative', () => expect(formatCountdown(-5000)).toBe('00:00'))
})
