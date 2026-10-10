import { NextResponse } from 'next/server';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';

export async function POST(request: Request) {
    const response = await fetch(`${backendUrl}/auth/sign-up`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(await request.json()), cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
}