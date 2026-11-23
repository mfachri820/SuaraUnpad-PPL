import { NextResponse } from 'next/server';
import { signImageFields } from '@/lib/storage';

// Semua field imageUrl / avatarUrl di response otomatis diubah jadi temporary URL (bucket privat).
export async function successResponse<T>(data: T | null = null, message = 'Success', statusCode = 200) {
  const payload = data === null ? null : await signImageFields(data);
  return NextResponse.json({
    status: 'success',
    message,
    ...(payload !== null && { data: payload })
  }, { status: statusCode });
}

export interface ErrorDetails {
  code?: string;
  errors?: { path: string; message: string }[];
}

export function errorResponse(message = 'Internal Server Error', statusCode = 500, details: ErrorDetails = {}) {
  return NextResponse.json({
    status: 'error',
    message,
    ...(details.code && { code: details.code }),
    ...(details.errors && { errors: details.errors })
  }, { status: statusCode });
}
