import { type NextRequest } from 'next/server';
import { authenticatedBackendRequest, proxyBackendResponse } from '../../../lib/backend';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const page = query.get('page') ?? '1';
  const response = await authenticatedBackendRequest(`/users?page=${encodeURIComponent(page)}&limit=6`);
  return proxyBackendResponse(response);
}

export async function POST(request: Request) {
  const response = await authenticatedBackendRequest('/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(await request.json()),
  });
  return proxyBackendResponse(response);
}