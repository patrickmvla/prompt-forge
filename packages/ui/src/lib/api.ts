import { hc } from "hono/client";
import type { ApiRoutes } from "../../../api/src/index";

const client = hc<ApiRoutes>("/api");

export const api = client;
