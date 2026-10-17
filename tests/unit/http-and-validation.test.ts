import { describe, it, expect, vi } from 'vitest';
import { conflict, handleRouteError, parseWith, withErrorHandling } from '@/lib/http';
import { buildPostsWhere } from '@/services/postService';
import { closePostSchema, createFlagSchema, createPostSchema } from '@/lib/validation';

describe('handleRouteError', () => {
  it('memetakan HttpError, error Prisma, dan error tak terduga ke status yang benar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const known = handleRouteError(conflict('Sudah ada', 'DUPLICATE_FLAG'));
    expect(known.status).toBe(409);
    expect(await known.json()).toEqual({ status: 'error', message: 'Sudah ada', code: 'DUPLICATE_FLAG' });

    expect(handleRouteError(Object.assign(new Error('x'), { code: 'P2002' })).status).toBe(409);
    expect(handleRouteError(Object.assign(new Error('x'), { code: 'P2025' })).status).toBe(404);

    const leaked = handleRouteError(new Error('password=rahasia connection string bocor'));
    expect(leaked.status).toBe(500);
    expect((await leaked.json()).message).toBe('Terjadi kesalahan pada server.');
  });

  it('withErrorHandling mengubah ValidationError jadi 400 beserta detail field', async () => {
    const handler = withErrorHandling(async () => {
      parseWith(closePostSchema, { reason: 'x' });
      return new Response('tidak sampai sini');
    });
    const response = await handler();
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.errors[0]).toMatchObject({ path: 'reason' });
  });
});

describe('skema validasi', () => {
  it('aspirasi tanpa judul otomatis memakai 5 kata pertama', () => {
    const data = parseWith(createPostSchema, { content: 'satu dua tiga empat lima enam tujuh' });
    expect(data.title).toBe('satu dua tiga empat lima');
    expect(data.kind).toBe('ASPIRASI');
  });

  it('laporan konten wajib tepat satu target', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(() => parseWith(createFlagSchema, { reason: 'SPAM' })).toThrow();
    expect(() => parseWith(createFlagSchema, { reason: 'SPAM', postId: id, commentId: id })).toThrow();
    expect(parseWith(createFlagSchema, { reason: 'SPAM', postId: id })).toMatchObject({ postId: id });
  });
});

describe('buildPostsWhere', () => {
  it('excludePinned memakai OR supaya pengumuman tanpa pin (NULL) tidak ikut terbuang', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(buildPostsWhere({ excludePinned: true }, now)).toEqual({
      AND: [{ OR: [{ kind: { not: 'ANNOUNCEMENT' } }, { pinnedUntil: null }, { pinnedUntil: { lte: now } }] }]
    });
    expect(buildPostsWhere({ pinned: true }, now)).toEqual({
      AND: [{ kind: 'ANNOUNCEMENT', pinnedUntil: { gt: now } }]
    });
  });
});
