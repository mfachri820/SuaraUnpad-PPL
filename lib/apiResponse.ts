import { NextResponse } from 'next/server';

export function successResponse<T>(data: T | null = null, message = 'Success', statusCode = 200) {
  return NextResponse.json({
    status: 'success',
    message,
    ...(data !== null && { data })
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
