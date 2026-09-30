// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  // Si intentan entrar al dashboard sin token, los redirige al login
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // Verificamos el token con la clave secreta
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      // Si el token expiró (pasaron las 5 horas) o es inválido, redirige al login
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};