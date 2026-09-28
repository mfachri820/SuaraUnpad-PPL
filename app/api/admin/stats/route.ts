import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/apiResponse';
import { requireAdmin, withErrorHandling } from '@/lib/http';
import { moderationService } from '@/services/moderationService';

export const GET = withErrorHandling(async (request: Request) => {
  requireAdmin(request);
  const [totalPosts, totalAnnouncements, totalPolicies, totalReports, pendingFlags] = await Promise.all([
    prisma.post.count({ where: { kind: 'ASPIRASI' } }),
    prisma.post.count({ where: { kind: 'ANNOUNCEMENT' } }),
    prisma.policy.count(),
    prisma.report.count(),
    moderationService.countPendingFlags()
  ]);
  return successResponse(
    { totalPosts, totalAnnouncements, totalPolicies, totalReports, pendingFlags },
    'Berhasil mengambil statistik admin',
    200
  );
});
