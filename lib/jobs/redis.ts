import { env } from "../config/env";
import type { ConnectionOptions } from "bullmq";

export function getBullMQConnection(): ConnectionOptions {
    const redisUrl = new URL(env.REDIS_URL);

    return {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        username: redisUrl.username || "default",
        password: redisUrl.password,
        tls: {},
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
    };
}