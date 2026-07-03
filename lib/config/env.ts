import { z } from "zod";

const envSchema = z.object({
  // Database Configuration
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  DATABASE_URL_UNPOOLED: z.string().url("DATABASE_URL_UNPOOLED must be a valid connection string"),

  // Upstash Redis Configuration
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid HTTP URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN must not be empty"),

  // NVIDIA NIM API Configuration
  NVIDIA_API_KEY: z.string().min(1, "NVIDIA_API_KEY must not be empty"),
  NVIDIA_BASE_URL: z.string().url("NVIDIA_BASE_URL must be a valid URL"),
  NVIDIA_EMBEDDING_API_KEY: z.string().min(1, "NVIDIA_EMBEDDING_API_KEY must not be empty"),
  NVIDIA_RERANKING_API_KEY: z.string().min(1, "NVIDIA_RERANKING_API_KEY must not be empty"),

  // Better Auth / NextAuth Configuration
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET must not be empty"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET must not be empty"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // Sentry Observability Configuration
  SENTRY_DSN: z.string().url("SENTRY_DSN must be a valid Sentry URL"),
});

// Safely parse the environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.format();
  // Using console.error strictly here before structured JSON logger is fully loaded
  console.error("❌ Invalid environment configuration:", JSON.stringify(errors, null, 2));
  throw new Error("Application initialization failed: Invalid environment configuration.");
}

export const env = parsedEnv.data;
export type EnvType = z.infer<typeof envSchema>;
