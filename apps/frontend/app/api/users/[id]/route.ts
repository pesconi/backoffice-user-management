import { authenticatedBackendRequest, proxyBackendResponse } from '../../../../lib/backend';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
    const { id } = await params;
    const response = await authenticatedBackendRequest(`/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(await request.json()),
    });
    return proxyBackendResponse(response);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    const { id } = await params;
    return proxyBackendResponse(await authenticatedBackendRequest(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}