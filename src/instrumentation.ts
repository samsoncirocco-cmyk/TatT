/**
 * Next.js boot hook (runs once when the server process starts — dev, start,
 * and Vercel functions alike; it does NOT run during `next build`).
 *
 * Validates the environment against src/config/envSchema.js:
 *  - a variable SET to a malformed value (non-numeric int, bad URL, a bool
 *    that is neither "true" nor "false") aborts boot loudly, listing every
 *    offender — a misconfigured deploy should die at startup, not 500 midway
 *    through a payment flow;
 *  - MISSING variables never abort. Unset core-infra vars log one warning
 *    line; unset optional integrations stay silent and keep the app's
 *    per-feature fail-closed behavior (Stripe routes 503, unset Google OAuth
 *    keeps artists on booking requests, budget vars use defaults).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateEnv } = await import('@/config/envSchema');
  const { errors, warnings } = validateEnv();

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[env] ${error}`);
    }
    throw new Error(
      `Environment validation failed: ${errors.length} malformed variable(s). ` +
        'See src/config/envSchema.js for the expected shapes.',
    );
  }
}
