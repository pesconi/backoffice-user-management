import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';

export async function POST() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;
    if (sessionId) {
        await fetch(`${backendUrl}/auth/sign-out`, { method: 'POST', headers: { authorization: `Bearer ${sessionId}` }, cache: 'no-store' });
    }
    cookieStore.delete('session_id');
    return NextResponse.json({ ok: true });
}