import { z } from 'zod';
import { errorResponse } from '@/lib/apiResponse';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class ValidationError extends HttpError {
  constructor(public readonly issues: { path: string; message: string }[]) {
    super(400, issues[0]?.message ?? 'Data yang dikirim tidak valid.', 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export const badRequest = (message: string, code?: string) => new HttpError(400, message, code);
export const unauthorized = (message = 'Akses ditolak. Silakan login terlebih dahulu.') =>
  new HttpError(401, message, 'UNAUTHORIZED');
export const forbidden = (message: string, code = 'FORBIDDEN') => new HttpError(403, message, code);
export const notFound = (message: string) => new HttpError(404, message, 'NOT_FOUND');
export const conflict = (message: string, code = 'CONFLICT') => new HttpError(409, message, code);

export const postClosedError = () =>
  forbidden('Akses ditolak. Postingan ini sudah ditutup oleh admin.', 'POST_CLOSED');

export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

export interface AuthContext {
  userId: string;
  role: UserRole;
}

const ROLES: readonly string[] = ['STUDENT', 'LECTURER', 'ADMIN'];

export function getAuth(request: Request): AuthContext | null {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role || !ROLES.includes(role)) return null;
  return { userId, role: role as UserRole };
}

export function requireAuth(request: Request): AuthContext {
  const auth = getAuth(request);
  if (!auth) throw unauthorized();
  return auth;
}

export function requireAdmin(request: Request): AuthContext {
  const auth = requireAuth(request);
  if (auth.role !== 'ADMIN') throw forbidden('Akses ditolak. Hanya Admin yang diizinkan.');
  return auth;
}

function toIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message
  }));
}

export function parseWith<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(toIssues(result.error));
  return result.data;
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest('Body request harus berupa JSON yang valid.', 'INVALID_JSON');
  }
  return parseWith(schema, raw);
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.infer<T> {
  const { searchParams } = new URL(request.url);
  return parseWith(schema, Object.fromEntries(searchParams.entries()));
}

export function assertUuid(id: string, notFoundMessage: string) {
  if (!z.uuid().safeParse(id).success) throw notFound(notFoundMessage);
  return id;
}

function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = (error as { code: unknown }).code;
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : null;
}

export function isUniqueViolation(error: unknown) {
  return prismaErrorCode(error) === 'P2002';
}

export function handleRouteError(error: unknown) {
  if (error instanceof ValidationError) {
    return errorResponse(error.message, error.status, { code: error.code, errors: error.issues });
  }
  if (error instanceof HttpError) {
    return errorResponse(error.message, error.status, { code: error.code });
  }

  switch (prismaErrorCode(error)) {
    case 'P2002':
      return errorResponse('Data yang sama sudah ada.', 409, { code: 'CONFLICT' });
    case 'P2025':
      return errorResponse('Data tidak ditemukan.', 404, { code: 'NOT_FOUND' });
    case 'P2003':
      return errorResponse('Data terkait tidak ditemukan.', 400, { code: 'INVALID_REFERENCE' });
  }

  console.error('[api] Unhandled error:', error);
  return errorResponse('Terjadi kesalahan pada server.', 500);
}

export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.uuid({ message: 'ID tidak valid.' }).optional());

export const booleanFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');
