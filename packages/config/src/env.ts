import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: optionalUrl,
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(1),
  POSTGRES_PASSWORD: z.string().optional(),
  SEED_PASSWORD: z.string().min(8).optional(),
  CRON_SECRET: z.string().min(8).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function pick(source: Record<string, string | undefined>, key: keyof ServerEnv) {
  return source[key];
}

export function readPublicEnv(source: Record<string, string | undefined> = process.env): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: pick(source, "NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: pick(source, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_APP_URL: pick(source, "NEXT_PUBLIC_APP_URL") ?? "http://127.0.0.1:3000",
  });
}

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: pick(source, "NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: pick(source, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_APP_URL: pick(source, "NEXT_PUBLIC_APP_URL") ?? "http://127.0.0.1:3000",
    SUPABASE_SERVICE_ROLE_KEY: pick(source, "SUPABASE_SERVICE_ROLE_KEY"),
    DATABASE_URL: pick(source, "DATABASE_URL"),
    POSTGRES_PASSWORD: pick(source, "POSTGRES_PASSWORD"),
    SEED_PASSWORD: pick(source, "SEED_PASSWORD"),
    CRON_SECRET: pick(source, "CRON_SECRET"),
  });
}

/** Demo password lives in `.env.local` as SEED_PASSWORD. See `.env.example`. */
export function requireSeedPassword(
  source: Record<string, string | undefined> = process.env,
): string {
  const value = pick(source, "SEED_PASSWORD");
  if (!value || value.length < 8) {
    throw new Error("Set SEED_PASSWORD in .env.local (see .env.example).");
  }
  return value;
}
