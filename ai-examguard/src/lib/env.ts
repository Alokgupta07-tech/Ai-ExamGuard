import { z } from 'zod';

// Client-side environment variables (NEXT_PUBLIC_*)
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Server-side environment variables
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

// Merged schema for validation
const envSchema = clientSchema.merge(serverSchema);

// Validate environment variables
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors
    );
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

// Export validated env
export const env = validateEnv();

// Type-safe access to client env (for use in client components)
export const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

// Type-safe access to server env (for use in server components/API routes)
export const serverEnv = {
  SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
} as const;
