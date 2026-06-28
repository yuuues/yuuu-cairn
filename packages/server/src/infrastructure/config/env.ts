import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  BASE_URL: z.string().default("http://127.0.0.1:8000"),
  SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().default(8000),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
