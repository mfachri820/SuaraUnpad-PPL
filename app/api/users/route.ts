import { z } from "zod";
import { userService } from "@/services/userService";
import { successResponse } from "@/lib/apiResponse";
import { parseQuery, requireAdmin, withErrorHandling } from "@/lib/http";

const querySchema = z.object({ role: z.enum(["STUDENT", "LECTURER", "ADMIN"]).optional() });

export const GET = withErrorHandling(async (request: Request) => {
  requireAdmin(request);
  const { role } = parseQuery(request, querySchema);
  const users = await userService.getAllUsers(role);
  return successResponse(users, 'Berhasil mengambil daftar user', 200);
});
