// api/[...path].js
import { handle } from 'hono/vercel';
import app from '../packages/api/src/index';

export const config = {
  runtime: 'nodejs20.x'
};

// Export all HTTP methods
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);