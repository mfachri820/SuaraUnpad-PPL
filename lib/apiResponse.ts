import { NextResponse } from 'next/server';

export function successResponse<T>(data: T | null = null, message = 'Success', statusCode = 200) {
  return NextResponse.json({
    status: 'success',
    message,
    ...(data !== null && { data })
  }, { status: statusCode });
}

export function errorResponse(message = 'Internal Server Error', statusCode = 500) {
  return NextResponse.json({
    status: 'error',
    message
  }, { status: statusCode });
}