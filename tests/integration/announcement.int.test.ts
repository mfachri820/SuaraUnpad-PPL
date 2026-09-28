import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, ctx, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { GET as listPosts, POST as createPost } from '@/app/api/posts/route';
import { POST as upvotePost } from '@/app/api/posts/[id]/upvote/route';
import { DELETE as unpin } from '@/app/api/admin/posts/[id]/pin/route';

const ids = (body: { data: { data: { id: string }[] } }) => body.data.data.map((p) => p.id);

describe('Pengumuman admin (DB asli)', () => {
  let admin: TestUser;
  let student: TestUser;
  let otherStudent: TestUser;
  let unverified: TestUser;
  let pinnedId: string;
  let unpinnedId: string;
  let expiredId: string;
  let aspirasiId: string;

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('ADMIN');
    student = await createUser('STUDENT');
    otherStudent = await createUser('STUDENT');
    unverified = await createUser('STUDENT', { isVerified: false });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('mahasiswa tidak bisa membuat pengumuman (403)', async () => {
    const res = await createPost(
      apiRequest('POST', '/api/posts', { user: student, body: { kind: 'ANNOUNCEMENT', title: 'Libur kuliah', content: 'isi' } })
    );
    expect(res.status).toBe(403);
  });

  it('pengumuman wajib punya judul asli dan durasi pin valid', async () => {
    const noTitle = await createPost(apiRequest('POST', '/api/posts', { user: admin, body: { kind: 'ANNOUNCEMENT', content: 'isi saja' } }));
    const badPin = await createPost(
      apiRequest('POST', '/api/posts', { user: admin, body: { kind: 'ANNOUNCEMENT', title: 'Judul valid', content: 'isi', pinDays: 5 } })
    );
    expect(noTitle.status).toBe(400);
    expect(badPin.status).toBe(400);
  });

  it('aspirasi tidak boleh di-pin, gambar harus dari Cloudinary milik aplikasi', async () => {
    const pinnedAspirasi = await createPost(apiRequest('POST', '/api/posts', { user: student, body: { content: 'aspirasi', pinDays: 3 } }));
    const foreignImage = await createPost(
      apiRequest('POST', '/api/posts', { user: student, body: { content: 'aspirasi', imageUrl: 'https://example.com/a.jpg' } })
    );
    expect(pinnedAspirasi.status).toBe(400);
    expect(foreignImage.status).toBe(400);
  });

  it('admin membuat pengumuman ter-pin + notifikasi ke semua user terverifikasi', async () => {
    const { status, body } = await readJson(
      await createPost(
        apiRequest('POST', '/api/posts', {
          user: admin,
          body: {
            kind: 'ANNOUNCEMENT',
            title: 'Pemeliharaan jaringan',
            content: 'Internet mati Sabtu pagi.',
            imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/suara_mipa/announcements/a.jpg',
            pinDays: 3
          }
        })
      )
    );
    expect(status).toBe(201);
    expect(body.data).toMatchObject({ kind: 'ANNOUNCEMENT', isPinned: true, title: 'Pemeliharaan jaringan' });
    pinnedId = body.data.id;

    const recipients = await prisma.notification.findMany({ where: { type: 'NEW_ANNOUNCEMENT', postId: pinnedId } });
    expect(recipients.map((n) => n.recipientId).sort()).toEqual([student.id, otherStudent.id].sort());
    expect(recipients.some((n) => n.recipientId === unverified.id || n.recipientId === admin.id)).toBe(false);
  });

  it('filter pinned / excludePinned tidak membuang pengumuman tanpa pin (jebakan NULL di SQL)', async () => {
    const unpinned = await readJson(
      await createPost(apiRequest('POST', '/api/posts', { user: admin, body: { kind: 'ANNOUNCEMENT', title: 'Tanpa pin sama sekali', content: 'isi' } }))
    );
    unpinnedId = unpinned.body.data.id;
    expiredId = (
      await prisma.post.create({
        data: { authorId: admin.id, kind: 'ANNOUNCEMENT', title: 'Pin kedaluwarsa', content: 'isi', pinnedUntil: new Date(Date.now() - 60_000) }
      })
    ).id;
    aspirasiId = (await readJson(await createPost(apiRequest('POST', '/api/posts', { user: student, body: { content: 'Aspirasi biasa' } })))).body.data.id;

    const pinned = await readJson(await listPosts(apiRequest('GET', '/api/posts?kind=ANNOUNCEMENT&pinned=true', { user: student })));
    expect(ids(pinned.body)).toEqual([pinnedId]);

    const feed = await readJson(await listPosts(apiRequest('GET', '/api/posts?excludePinned=true', { user: student })));
    expect(ids(feed.body).sort()).toEqual([unpinnedId, expiredId, aspirasiId].sort());

    const announcements = await readJson(await listPosts(apiRequest('GET', '/api/posts?kind=ANNOUNCEMENT', { user: student })));
    expect(ids(announcements.body).sort()).toEqual([pinnedId, unpinnedId, expiredId].sort());

    const aspirasi = await readJson(await listPosts(apiRequest('GET', '/api/posts?kind=ASPIRASI', { user: student })));
    expect(ids(aspirasi.body)).toEqual([aspirasiId]);
  });

  it('pengumuman tidak bisa di-upvote (400)', async () => {
    const res = await upvotePost(apiRequest('POST', '/x', { user: student }), ctx(pinnedId));
    expect(res.status).toBe(400);
  });

  it('admin bisa melepas pin lebih awal', async () => {
    expect((await unpin(apiRequest('DELETE', '/x', { user: student }), ctx(pinnedId))).status).toBe(403);
    expect((await unpin(apiRequest('DELETE', '/x', { user: admin }), ctx(pinnedId))).status).toBe(200);
    expect((await unpin(apiRequest('DELETE', '/x', { user: admin }), ctx(pinnedId))).status).toBe(409);
    expect((await unpin(apiRequest('DELETE', '/x', { user: admin }), ctx(aspirasiId))).status).toBe(400);

    const feed = await readJson(await listPosts(apiRequest('GET', '/api/posts?excludePinned=true', { user: student })));
    expect(ids(feed.body)).toContain(pinnedId);
  });

  it('query tidak valid ditolak 400, bukan error 500', async () => {
    const badKind = await listPosts(apiRequest('GET', '/api/posts?kind=RAHASIA', { user: student }));
    const badLimit = await listPosts(apiRequest('GET', '/api/posts?limit=100000', { user: student }));
    const badAuthor = await listPosts(apiRequest('GET', '/api/posts?authorId=bukan-uuid', { user: student }));
    expect([badKind.status, badLimit.status, badAuthor.status]).toEqual([400, 400, 400]);
  });
});
