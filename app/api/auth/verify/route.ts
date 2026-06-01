import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // URL Frontend untuk redirect
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?error=Token tidak ditemukan`);
  }

  try {
    // 1. Ekstrak dan validasi token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (payload.action !== 'verify_email') {
      throw new Error("Token tidak valid");
    }

    const userId = payload.userId as string;

    // 2. Update status user di Database jadi verified
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true }
    });

    // 3. Redirect ke halaman login Frontend dengan pesan sukses
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
    
  } catch (error) {
    // Jika token expired atau salah
    return NextResponse.redirect(`${baseUrl}/login?error=Token tidak valid atau kedaluwarsa`);
  }
}