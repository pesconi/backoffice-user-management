import { NextResponse, type NextRequest } from "next/server";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
const protectedPath = "/dashboard";

async function hasActiveSession(
  sessionId: string | undefined,
): Promise<boolean> {
  if (!sessionId) return false;

  try {
    const response = await fetch(`${backendUrl}/auth/session`, {
      headers: { authorization: `Bearer ${sessionId}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function redirectTo(request: NextRequest, path: string, clearSession = false) {
  const response = NextResponse.redirect(new URL(path, request.url));
  if (clearSession) response.cookies.delete("session_id");
  return response;
}

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;
  const { pathname } = request.nextUrl;
  const sessionIsActive = await hasActiveSession(sessionId);

  if (pathname.startsWith(protectedPath) && !sessionIsActive) {
    return redirectTo(request, "/sign-in", Boolean(sessionId));
  }

  if (
    (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up") &&
    sessionIsActive
  ) {
    return redirectTo(request, protectedPath);
  }

  const response = NextResponse.next();
  if (sessionId && !sessionIsActive) response.cookies.delete("session_id");
  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/sign-in", "/sign-up"],
};
