// packages/api/src/db/index.ts

import { drizzle } from 'drizzle-orm/neon-serverless';
// Import the 'Pool' class
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = Bun.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// 1. Create a new connection pool instance
const client = new Pool({ connectionString });

// 2. Pass the client instance to Drizzle
export const db = drizzle(client, { schema });