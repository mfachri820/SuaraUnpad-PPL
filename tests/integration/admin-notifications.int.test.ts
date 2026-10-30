import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { POST as createPost } from '@/app/api/posts/route';
import { POST as createComment } from '@/app/api/comments/route';
import { POST as createFlag } from '@/app/api/flags/route';
import { POST as createReport } from '@/app/api/reports/route';
import { GET as listNotifications } from '@/app/api/notifications/route';

// Admin menerima notifikasi setiap kali user mengirim laporan fasilitas atau melaporkan konten.
describe('Notifikasi laporan user ke admin (DB asli)', () => {
  let admin: TestUser;
  let admin2: TestUser;
  let author: TestUser;
  let reporter: TestUser;
  let postId: string;
  let commentId: string;

  const adminNotifications = (recipient: TestUser) =>
    prisma.notification.findMany({
      where: { recipientId: recipient.id, type: { in: ['NEW_REPORT', 'NEW_CONTENT_FLAG'] } },
      orderBy: { createdAt: 'asc' }
    });

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('ADMIN');
    admin2 = await createUser('ADMIN');
    author = await createUser('STUDENT');
    reporter = await createUser('STUDENT', { name: 'Pelapor Konten' });

    const post = await readJson(
      await createPost(apiRequest('POST', '/api/posts', { user: author, body: { content: 'Aspirasi yang nanti dilaporkan' } }))
    );
    postId = post.body.data.id;
    const comment = await readJson(
      await createComment(apiRequest('POST', '/api/comments', { user: author, body: { postId, content: 'Komentar yang nanti dilaporkan' } }))
    );
    commentId = comment.body.data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('laporan fasilitas baru mengirim NEW_REPORT ke semua admin, bukan ke user lain', async () => {
    const res = await readJson(
      await createReport(apiRequest('POST', '/api/reports', {
        user: reporter,
        body: {
          title: 'Lampu koridor mati',
          description: 'Lampu koridor Gedung D mati sejak kemarin',
          category: 'OTHER',
          location: 'Gedung D',
          imageUrl: 'https://res.cloudinary.com/x/y.jpg'
        }
      }))
    );
    expect(res.status).toBe(201);
    const reportId = res.body.data.report.id;

    for (const recipient of [admin, admin2]) {
      const notifs = await adminNotifications(recipient);
      expect(notifs).toHaveLength(1);
      expect(notifs[0]).toMatchObject({ type: 'NEW_REPORT', actorId: reporter.id, reportId, isRead: false });
    }
    expect(await adminNotifications(author)).toHaveLength(0);
  });

  it('laporan konten mengirim NEW_CONTENT_FLAG; komentar ditautkan ke postingannya', async () => {
    expect((await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, reason: 'HOAKS' } }))).status).toBe(201);
    expect((await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { commentId, reason: 'SPAM' } }))).status).toBe(201);

    const flags = (await adminNotifications(admin)).filter((n) => n.type === 'NEW_CONTENT_FLAG');
    expect(flags).toHaveLength(2);
    expect(flags[0]).toMatchObject({ actorId: reporter.id, postId, commentId: null });
    expect(flags[1]).toMatchObject({ actorId: reporter.id, postId, commentId });
    expect(await adminNotifications(author)).toHaveLength(0);
  });

  it('laporan dobel (409) tidak menambah notifikasi admin', async () => {
    const before = await prisma.notification.count({ where: { recipientId: admin.id } });
    const dup = await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, reason: 'SPAM' } }));
    expect(dup.status).toBe(409);
    expect(await prisma.notification.count({ where: { recipientId: admin.id } })).toBe(before);
  });

  it('GET /api/notifications admin memuat laporan beserta judul dan pelapornya', async () => {
    const { status, body } = await readJson(await listNotifications(apiRequest('GET', '/api/notifications', { user: admin })));
    expect(status).toBe(200);
    expect(body.data.meta.unreadCount).toBe(3);
    const report = body.data.data.find((n: { type: string }) => n.type === 'NEW_REPORT');
    expect(report.report).toMatchObject({ title: 'Lampu koridor mati', status: 'SUBMITTED' });
    expect(report.actor.studentProfile.fullName).toBe('Pelapor Konten');
  });
});
