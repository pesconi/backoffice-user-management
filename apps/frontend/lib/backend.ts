import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function authenticatedBackendRequest(
  path: string,
  init: RequestInit = {},
) {
  const sessionId = (await cookies()).get("session_id")?.value;
  if (!sessionId) return null;

  return fetch(`${backendUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, authorization: `Bearer ${sessionId}` },
  });
}

export async function proxyBackendResponse(response: Response | null) {
  if (!response)
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  if (response.status === 204)
    return new NextResponse(null, { status: response.status });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: response.headers.get("content-type")
      ? { "content-type": response.headers.get("content-type")! }
      : undefined,
  });
}
