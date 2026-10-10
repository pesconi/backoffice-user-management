import { buildApp } from './http/app.js';

const port = Number(process.env.PORT ?? 4000);
const app = await buildApp();

await app.listen({ host: '0.0.0.0', port });
