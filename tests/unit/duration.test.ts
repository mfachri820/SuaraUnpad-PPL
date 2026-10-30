import { describe, expect, it } from 'vitest';
import { formatAge, formatDuration } from '@/lib/duration';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatDuration', () => {
  it('di bawah satu menit', () => {
    expect(formatDuration(0)).toBe('< 1 menit');
    expect(formatDuration(59 * 1000)).toBe('< 1 menit');
    expect(formatDuration(-5 * MINUTE)).toBe('< 1 menit');
    expect(formatDuration(Number.NaN)).toBe('< 1 menit');
  });

  it('menit saja', () => {
    expect(formatDuration(45 * MINUTE)).toBe('45 menit');
  });

  it('jam dan menit', () => {
    expect(formatDuration(2 * HOUR)).toBe('2 jam');
    expect(formatDuration(2 * HOUR + 5 * MINUTE)).toBe('2 jam 5 menit');
  });

  it('hari dan jam, menit diabaikan', () => {
    expect(formatDuration(3 * DAY)).toBe('3 hari');
    expect(formatDuration(3 * DAY + 4 * HOUR + 30 * MINUTE)).toBe('3 hari 4 jam');
  });
});

describe('formatAge', () => {
  it('menghitung dari tanggal ke sekarang', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    expect(formatAge('2026-10-25T08:00:00Z', now)).toBe('2 hari 4 jam');
    expect(formatAge(new Date('2026-10-27T11:30:00Z'), now)).toBe('30 menit');
  });
});
