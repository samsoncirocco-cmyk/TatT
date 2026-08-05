import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  ENV_SCHEMA,
  ENV_SECTIONS,
  EnvVarError,
  envBool,
  envFloat,
  envInt,
  envString,
  readEnv,
  validateEnv,
} from './envSchema';

describe('env schema declarations', () => {
  it('declares every variable exactly once', () => {
    const all = ENV_SECTIONS.flatMap((s) => s.vars.map((v) => v.name));
    expect(new Set(all).size).toBe(all.length);
    expect(ENV_SCHEMA.size).toBe(all.length);
  });

  it('gives every variable a name, type and purpose field', () => {
    for (const spec of ENV_SCHEMA.values()) {
      expect(spec.name).toBeTruthy();
      expect(spec.type).toBeTruthy();
      expect(typeof spec.purpose).toBe('string');
    }
  });

  it('declares the vars the code reads for the migrated blocks', () => {
    for (const name of [
      'STRIPE_SECRET_KEY',
      'PLATFORM_FEE_BPS',
      'STRIPE_CURRENCY',
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'CALENDAR_TOKEN_ENCRYPTION_KEY',
      'GOOGLE_CALENDAR_WRITE_ENABLED',
      'BUDGET_MAX_SPEND_CENTS',
      'VERTEX_IMAGE_MODEL',
      'VERTEX_IMAGE_COST_USD',
    ]) {
      expect(ENV_SCHEMA.has(name), `${name} missing from schema`).toBe(true);
    }
  });
});

describe('typed accessors', () => {
  it('returns the declared default when unset or empty', () => {
    expect(envInt('PLATFORM_FEE_BPS', {})).toBe(1000);
    expect(envInt('PLATFORM_FEE_BPS', { PLATFORM_FEE_BPS: '' })).toBe(1000);
    expect(envString('STRIPE_CURRENCY', {})).toBe('usd');
    expect(envFloat('VERTEX_IMAGE_COST_USD', {})).toBeCloseTo(0.039);
  });

  it('returns undefined for unset vars without a default', () => {
    expect(envString('GOOGLE_OAUTH_CLIENT_ID', {})).toBeUndefined();
    expect(readEnv('STRIPE_PRICE_ARTIST_SUB', {})).toBeUndefined();
  });

  it('parses well-formed values, including 0', () => {
    expect(envInt('PLATFORM_FEE_BPS', { PLATFORM_FEE_BPS: '250' })).toBe(250);
    expect(envInt('PLATFORM_FEE_BPS', { PLATFORM_FEE_BPS: '0' })).toBe(0);
    expect(envString('STRIPE_CURRENCY', { STRIPE_CURRENCY: 'EUR' })).toBe('EUR');
  });

  it('throws EnvVarError on malformed int/float values', () => {
    expect(() => envInt('PLATFORM_FEE_BPS', { PLATFORM_FEE_BPS: 'ten' })).toThrow(EnvVarError);
    expect(() => envInt('PLATFORM_FEE_BPS', { PLATFORM_FEE_BPS: '10.5' })).toThrow(EnvVarError);
    expect(() => envFloat('VERTEX_IMAGE_COST_USD', { VERTEX_IMAGE_COST_USD: 'cheap' })).toThrow(
      EnvVarError,
    );
  });

  it('parses bools strictly: only "true"/"false", default otherwise', () => {
    expect(envBool('GOOGLE_CALENDAR_WRITE_ENABLED', {})).toBe(false);
    expect(envBool('GOOGLE_CALENDAR_WRITE_ENABLED', { GOOGLE_CALENDAR_WRITE_ENABLED: 'true' })).toBe(true);
    expect(envBool('SHOW_UNCLAIMED_PORTFOLIOS', {})).toBe(true); // default-on flag
    expect(() => envBool('GOOGLE_CALENDAR_WRITE_ENABLED', { GOOGLE_CALENDAR_WRITE_ENABLED: '1' })).toThrow(
      EnvVarError,
    );
  });

  it('validates URLs', () => {
    expect(envString('NEXT_PUBLIC_APP_URL', { NEXT_PUBLIC_APP_URL: 'https://tatttester.com' })).toBe(
      'https://tatttester.com',
    );
    expect(() => readEnv('NEXT_PUBLIC_APP_URL', { NEXT_PUBLIC_APP_URL: 'not a url' })).toThrow(EnvVarError);
  });

  it('validates enums', () => {
    expect(readEnv('LOG_LEVEL', { LOG_LEVEL: 'debug' })).toBe('debug');
    expect(() => readEnv('LOG_LEVEL', { LOG_LEVEL: 'loud' })).toThrow(EnvVarError);
  });

  it('throws on undeclared variable names (accessor typos)', () => {
    expect(() => envString('NOT_A_REAL_VAR', {})).toThrow(EnvVarError);
  });
});

describe('validateEnv', () => {
  it('reports malformed set values as errors, never throws itself', () => {
    const { errors } = validateEnv({ PLATFORM_FEE_BPS: 'ten', NEXT_PUBLIC_APP_URL: '::::' });
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toContain('PLATFORM_FEE_BPS');
    expect(errors.join('\n')).toContain('NEXT_PUBLIC_APP_URL');
  });

  it('treats missing required vars as warnings, not errors (fail-closed stays per-feature)', () => {
    const { errors, warnings } = validateEnv({});
    expect(errors).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.join('\n')).toContain('NEO4J_URI');
  });

  it('accepts alias names for required vars', () => {
    const base = {
      NEO4J_URI: 'bolt://localhost:7687',
      NEO4J_PASSWORD: 'x',
      GCP_PROJECT_ID: 'p',
      GCS_BUCKET_NAME: 'b',
    };
    const withCanonical = validateEnv({ ...base, NEO4J_USERNAME: 'neo4j' });
    const withAlias = validateEnv({ ...base, NEO4J_USER: 'neo4j' });
    expect(withCanonical.warnings).toHaveLength(0);
    expect(withAlias.warnings).toHaveLength(0);
  });

  it('passes a fully-valid environment cleanly', () => {
    const { errors } = validateEnv({
      PLATFORM_FEE_BPS: '1000',
      LOG_LEVEL: 'info',
      NEXT_PUBLIC_APP_URL: 'https://tatttester.com',
      GOOGLE_CALENDAR_WRITE_ENABLED: 'false',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('.env.example drift', () => {
  it('matches the schema (run `npm run env:example` if this fails)', () => {
    // The generator's --check mode is the single arbiter of sync; run it so
    // plain `npm test` catches drift the same way CI does.
    expect(() =>
      execFileSync('node', ['scripts/generate-env-example.mjs', '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
