import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, ctx, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { POST as createPost } from '@/app/api/posts/route';
import { POST as upvotePost } from '@/app/api/posts/[id]/upvote/route';
import { POST as createComment } from '@/app/api/comments/route';
import { POST as upvoteComment } from '@/app/api/comments/[id]/upvote/route';
import { POST as createFlag } from '@/app/api/flags/route';
import { POST as createReport } from '@/app/api/reports/route';
import { POST as upvoteReport } from '@/app/api/reports/[id]/upvote/route';
import { POST as votePolicy, DELETE as unvotePolicy } from '@/app/api/policies/[id]/vote/route';

// Admin hanya melihat sisi user: semua aksi partisipasi ditolak 403 sebelum menyentuh data.
const SOME_ID = '00000000-0000-4000-8000-000000000000';

describe('Pemisahan fitur admin dan user (DB asli)', () => {
  let admin: TestUser;
  let student: TestUser;

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('ADMIN');
    student = await createUser('STUDENT');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('admin tidak bisa memposting aspirasi, tapi tetap bisa membuat pengumuman', async () => {
    const aspirasi = await readJson(await createPost(apiRequest('POST', '/api/posts', { user: admin, body: { content: 'aspirasi dari admin' } })));
    expect(aspirasi.status).toBe(403);
    expect(aspirasi.body.code).toBe('ADMIN_READ_ONLY');

    const announcement = await createPost(
      apiRequest('POST', '/api/posts', { user: admin, body: { kind: 'ANNOUNCEMENT', title: 'Pengumuman resmi', content: 'isi' } })
    );
    expect(announcement.status).toBe(201);

    const studentPost = await createPost(apiRequest('POST', '/api/posts', { user: student, body: { content: 'aspirasi mahasiswa' } }));
    expect(studentPost.status).toBe(201);
  });

  it('admin boleh membalas komentar sebagai jawaban resmi', async () => {
    const postId = (await prisma.post.create({ data: { authorId: student.id, title: 'a', content: 'a' } })).id;
    const root = await readJson(await createComment(apiRequest('POST', '/api/comments', { user: student, body: { postId, content: 'pertanyaan' } })));
    const reply = await createComment(
      apiRequest('POST', '/api/comments', { user: admin, body: { postId, parentId: root.body.data.id, content: 'jawaban resmi admin' } })
    );
    expect(reply.status).toBe(201);
  });

  it('upvote dan laporan konten berbasis lib/http menolak admin dengan 403', async () => {
    const responses = await Promise.all([
      upvotePost(apiRequest('POST', '/x', { user: admin }), ctx(SOME_ID)),
      upvoteComment(apiRequest('POST', '/x', { user: admin }), ctx(SOME_ID)),
      createFlag(apiRequest('POST', '/api/flags', { user: admin, body: { postId: SOME_ID, reason: 'SPAM' } })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403]);
  });

  it('laporan fasilitas, dukungan laporan, dan voting wacana menolak admin dengan 403', async () => {
    const responses = await Promise.all([
      createReport(apiRequest('POST', '/api/reports', { user: admin, body: {} })),
      upvoteReport(apiRequest('POST', '/x', { user: admin }), ctx(SOME_ID)),
      votePolicy(apiRequest('POST', '/x', { user: admin, body: { choice: 'AGREE' } }), ctx(SOME_ID)),
      unvotePolicy(apiRequest('DELETE', '/x', { user: admin }), ctx(SOME_ID)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);
  });
});
