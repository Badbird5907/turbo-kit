import "server-only";

import { Redis } from "@upstash/redis";
import { env } from "./env";

declare global {
    var redis: Redis | undefined;
}

export const redis = () => {
    if (globalThis.redis) return globalThis.redis;
    globalThis.redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return globalThis.redis;
}
