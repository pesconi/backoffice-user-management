import { NextResponse, type NextRequest } from 'next/server';

const protectedPath = '/dashboard';

export function middleware(request: NextRequest) {
    const hasSession = Boolean(request.cookies.get('session_id')?.value);
    const { pathname } = request.nextUrl;

    if (pathname.startsWith(protectedPath) && !hasSession) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    if ((pathname === '/sign-in' || pathname === '/sign-up') && hasSession) {
        return NextResponse.redirect(new URL(protectedPath, request.url));
    }

    return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'] };
