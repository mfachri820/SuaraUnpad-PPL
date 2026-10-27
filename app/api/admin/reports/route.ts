import { reportService } from '@/services/reportService';
import { successResponse } from '@/lib/apiResponse';
import { parseQuery, requireAdmin, withErrorHandling } from '@/lib/http';
import { adminReportQuerySchema } from '@/lib/validation';

export const GET = withErrorHandling(async (request: Request) => {
  requireAdmin(request);
  const { status } = parseQuery(request, adminReportQuerySchema);
  const queue = await reportService.getAdminQueue(status);
  return successResponse(queue, 'Berhasil mengambil antrean laporan', 200);
});
