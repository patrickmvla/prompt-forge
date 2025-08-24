import { hc } from 'hono/client'
import type { ApiRoutes } from '../../../api/src/index'

// The base path now includes `/api` to match the backend structure
const client = hc<ApiRoutes>('/api')

export const api = client
