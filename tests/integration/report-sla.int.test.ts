import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, ctx, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { PATCH as patchReport } from '@/app/api/reports/[id]/route';
import { GET as getAdminReports } from '@/app/api/admin/reports/route';
import { GET as getStats } from '@/app/api/admin/stats/route';
import { slaService } from '@/services/slaService';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('SLA laporan fasilitas & moderasi (DB asli)', () => {
  let admin: TestUser;
  let student: TestUser;
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);

  async function createReport(title: string, data: Record<string, unknown> = {}) {
    const report = await prisma.report.create({
      data: {
        authorId: student.id,
        title,
        description: 'Deskripsi laporan',
        category: 'POTHOLE',
        location: 'Gedung D',
        imageUrl: 'https://example.com/report.jpg',
        ...data
      }
    });
    return report.id;
  }

  const patch = (id: string, status: unknown, user = admin) =>
    patchReport(apiRequest('PATCH', `/api/reports/${id}`, { user, body: { status } }), ctx(id));

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('ADMIN');
    student = await createUser('STUDENT', { name: 'Pelapor Fasilitas' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('transisi status mengisi timestamp tahap', () => {
    it('SUBMITTED → VERIFIED mengisi verifiedAt dan mengirim notifikasi', async () => {
      const id = await createReport('Verifikasi biasa');
      const { status } = await readJson(await patch(id, 'VERIFIED'));
      expect(status).toBe(200);

      const report = await prisma.report.findUniqueOrThrow({ where: { id } });
      expect(report.verifiedAt).toBeInstanceOf(Date);
      expect(report.inProgressAt).toBeNull();
      expect(report.resolvedAt).toBeNull();
      expect(await prisma.notification.count({ where: { reportId: id, type: 'REPORT_STATUS_CHANGED' } })).toBe(1);
    });

    it('lompat langsung ke RESOLVED mengisi semua tahap yang terlewati', async () => {
      const id = await createReport('Lompat selesai');
      await patch(id, 'RESOLVED');
      const report = await prisma.report.findUniqueOrThrow({ where: { id } });
      expect(report.verifiedAt).toBeInstanceOf(Date);
      expect(report.inProgressAt).toBeInstanceOf(Date);
      expect(report.resolvedAt).toBeInstanceOf(Date);
    });

    it('timestamp tahap yang sudah ada tidak ditimpa', async () => {
      const verifiedAt = ago(2 * DAY);
      const id = await createReport('Sudah terverifikasi', { status: 'VERIFIED', verifiedAt });
      await patch(id, 'IN_PROGRESS');
      const report = await prisma.report.findUniqueOrThrow({ where: { id } });
      expect(report.verifiedAt).toEqual(verifiedAt);
      expect(report.inProgressAt).toBeInstanceOf(Date);
    });

    it('memundurkan status mengosongkan tahap setelahnya', async () => {
      const id = await createReport('Dimundurkan', {
        status: 'RESOLVED', verifiedAt: ago(3 * DAY), inProgressAt: ago(2 * DAY), resolvedAt: ago(DAY)
      });
      await patch(id, 'VERIFIED');
      const report = await prisma.report.findUniqueOrThrow({ where: { id } });
      expect(report.status).toBe('VERIFIED');
      expect(report.verifiedAt).toEqual(ago(3 * DAY));
      expect(report.inProgressAt).toBeNull();
      expect(report.resolvedAt).toBeNull();
    });

    it('menolak status yang tidak valid', async () => {
      const id = await createReport('Status ngawur');
      expect((await patch(id, 'DONE')).status).toBe(400);
      expect((await patch(id, undefined)).status).toBe(400);
      const report = await prisma.report.findUniqueOrThrow({ where: { id } });
      expect(report.status).toBe('SUBMITTED');
    });

    it('menolak non-admin', async () => {
      const id = await createReport('Bukan admin');
      expect((await patch(id, 'VERIFIED', student)).status).toBe(403);
    });
  });

  describe('antrean admin & ringkasan SLA', () => {
    beforeAll(async () => {
      await prisma.notification.deleteMany();
      await prisma.report.deleteMany();
      await createReport('Baru masuk', { createdAt: ago(HOUR) });
      await createReport('Paling lama', { createdAt: ago(5 * DAY) });
      await createReport('Menengah', { createdAt: ago(2 * DAY) });
      // Selesai: verifikasi 2 jam & 6 jam, selesai 1 hari & 3 hari setelah dibuat (rata-rata 2 hari).
      await createReport('Selesai cepat', {
        status: 'RESOLVED', createdAt: ago(4 * DAY),
        verifiedAt: ago(4 * DAY - 2 * HOUR), inProgressAt: ago(4 * DAY - 3 * HOUR), resolvedAt: ago(3 * DAY)
      });
      await createReport('Selesai lambat', {
        status: 'RESOLVED', createdAt: ago(11 * DAY),
        verifiedAt: ago(11 * DAY - 6 * HOUR), inProgressAt: ago(10 * DAY), resolvedAt: ago(8 * DAY)
      });
      // Di luar jendela 30 hari, tidak ikut rata-rata.
      await createReport('Selesai lama sekali', {
        status: 'RESOLVED', createdAt: ago(60 * DAY),
        verifiedAt: ago(59 * DAY), inProgressAt: ago(58 * DAY), resolvedAt: ago(40 * DAY)
      });

      const post = await prisma.post.create({ data: { authorId: student.id, title: 'Post', content: 'Isi' } });
      const reporter = await createUser('STUDENT');
      const reporter2 = await createUser('LECTURER');
      await prisma.contentFlag.create({ data: { reporterId: reporter.id, postId: post.id, reason: 'SPAM', createdAt: ago(3 * HOUR) } });
      await prisma.contentFlag.create({
        data: {
          reporterId: reporter2.id, postId: post.id, reason: 'HOAKS', createdAt: ago(DAY),
          status: 'DISMISSED', reviewedById: admin.id, reviewedAt: ago(DAY - 4 * HOUR)
        }
      });
    });

    it('antrean status terbuka diurutkan dari yang paling lama menunggu', async () => {
      const { status, body } = await readJson(
        await getAdminReports(apiRequest('GET', '/api/admin/reports?status=SUBMITTED', { user: admin }))
      );
      expect(status).toBe(200);
      expect(body.data.map((r: { title: string }) => r.title)).toEqual(['Paling lama', 'Menengah', 'Baru masuk']);
      expect(body.data[0].author).toMatchObject({ displayName: 'Pelapor Fasilitas' });
    });

    it('antrean selesai diurutkan dari yang terakhir selesai', async () => {
      const { body } = await readJson(
        await getAdminReports(apiRequest('GET', '/api/admin/reports?status=RESOLVED', { user: admin }))
      );
      expect(body.data.map((r: { title: string }) => r.title)).toEqual(['Selesai cepat', 'Selesai lambat', 'Selesai lama sekali']);
    });

    it('antrean menolak non-admin dan status tidak valid', async () => {
      expect((await getAdminReports(apiRequest('GET', '/api/admin/reports', { user: student }))).status).toBe(403);
      expect((await getAdminReports(apiRequest('GET', '/api/admin/reports?status=DONE', { user: admin }))).status).toBe(400);
    });

    it('getSlaSummary menghitung jumlah, yang tertua, dan rata-rata', async () => {
      const sla = await slaService.getSlaSummary(new Date(now));
      expect(sla.reports.byStatus).toEqual({ SUBMITTED: 3, VERIFIED: 0, IN_PROGRESS: 0, RESOLVED: 3 });
      expect(sla.reports.open).toBe(3);
      expect(sla.reports.oldestOpenAt).toEqual(ago(5 * DAY));
      expect(sla.reports.resolvedLast7Days).toBe(1);
      expect(sla.reports.avgVerifyMs).toBe(4 * HOUR);
      expect(sla.reports.avgResolveMs).toBe(2 * DAY);
      expect(sla.reports.resolvedSample).toBe(2);

      // 14 hari kalender; laporan 40-60 hari lalu tidak ikut.
      const sum = (key: 'created' | 'resolved') => sla.reports.daily.reduce((total, day) => total + day[key], 0);
      expect(sla.reports.daily).toHaveLength(14);
      expect(sum('created')).toBe(5);
      expect(sum('resolved')).toBe(2);
      expect(sla.reports.byCategory).toEqual({ POTHOLE: 6 });
      expect(sla.reports.openAge).toEqual({ under1d: 1, d1to3: 1, d3to7: 1, over7d: 0 });

      expect(sla.flags.pending).toBe(1);
      expect(sla.flags.oldestPendingAt).toEqual(ago(3 * HOUR));
      expect(sla.flags.avgReviewMs).toBe(4 * HOUR);
      expect(sla.flags.reviewedSample).toBe(1);
    });

    it('statistik admin menyertakan ringkasan SLA', async () => {
      const { status, body } = await readJson(await getStats(apiRequest('GET', '/api/admin/stats', { user: admin })));
      expect(status).toBe(200);
      expect(body.data.sla.reports.open).toBe(3);
      expect(body.data.sla.flags.pending).toBe(1);
    });
  });
});
