import { z } from "zod";

/**
 * Simplified environment configuration.
 * Variables are parsed leniently so the app can boot before all
 * integrations are configured. Modules that require a variable call
 * `requireEnv()` at usage time to fail with a clear, actionable error.
 */
const envSchema = z.object({
  // Database (Neon Postgres + pgvector)
  DATABASE_URL: z.string().optional(),

  // NVIDIA NIM API (OpenAI-compatible)
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),

  // Auth session signing secret
  AUTH_SECRET: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(parsedEnv.error.format(), null, 2)}`
  );
}

export const env = parsedEnv.data;
export type EnvType = z.infer<typeof envSchema>;

/**
 * Returns the value of a required env var or throws a clear error naming it.
 */
export function requireEnv(key: keyof EnvType): string {
  const value = env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${String(key)}. Add it in your project settings (Vars) before using this feature.`
    );
  }
  return value;
}
