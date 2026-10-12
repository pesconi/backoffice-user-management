import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const response = await fetch(`${backendUrl}/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok)
    return NextResponse.json(payload, { status: response.status });

  const cookieStore = await cookies();
  cookieStore.set("session_id", payload.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return NextResponse.json({ ok: true }, { status: response.status });
}
