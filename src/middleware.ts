import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/unlock', '/api/unlock'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('app_pwd')?.value;
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    // Misconfigured - block everything
    return new NextResponse('APP_PASSWORD not configured', { status: 500 });
  }

  if (cookie === expected) {
    return NextResponse.next();
  }

  // API routes return 401, pages redirect to /unlock
  if (pathname.startsWith('/api/')) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/unlock';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json).*)',
  ],
};
