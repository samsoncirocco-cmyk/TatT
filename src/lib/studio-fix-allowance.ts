/**
 * The Studio's per-design fix allowance (ADR-0038).
 *
 * Point-and-say is designed to invite tinkering, and every fix is a real
 * generation call against the real cap — so each design carries a generous
 * but finite number of fixes. This module owns only the *counting*: the
 * spend itself still runs through the ordinary generation path (the
 * inpainting service → `/api/predictions`, which does checkBudget /
 * recordSpend against the same global pool as every other render). The
 * allowance is a second, per-design fence in front of that pool, not a
 * separate wallet.
 *
 * The ceiling is spoken in SketchBot's voice and ends in a booking prompt
 * (see `refineryVoice`), never a paywall — consumer credits stay deferred
 * (ADR-0030).
 *
 * The ledger is client-side, which is the right weight for a fence whose job
 * is to end tinkering in a conversation rather than to stop an attacker: the
 * hard stop on spend is and stays the server-side cap on `/api/predictions`.
 */

/** ADR-0038 says 5–8; 6 is the middle of the band. */
export const DEFAULT_STUDIO_FIX_ALLOWANCE = 6;

/** localStorage map of designId → fixes already spent on that design. */
export const FIX_ALLOWANCE_STORAGE_KEY = 'tatt:studio-fixes';

export interface FixAllowanceState {
  allowance: number;
  used: number;
  remaining: number;
  exhausted: boolean;
}

function readEnv(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[name];
}

/**
 * Resolve the allowance. `NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE` is the knob that
 * actually reaches the browser bundle; `STUDIO_FIX_ALLOWANCE` is honoured too
 * so server-side callers and tests can set the plain name. Garbage falls back
 * to the default rather than accidentally unbounding the surface.
 */
export function resolveFixAllowance(): number {
  const raw =
    readEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE') ?? readEnv('STUDIO_FIX_ALLOWANCE');
  if (raw === undefined || raw === '') return DEFAULT_STUDIO_FIX_ALLOWANCE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_STUDIO_FIX_ALLOWANCE;
  return Math.floor(parsed);
}

function readLedger(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FIX_ALLOWANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeLedger(ledger: Record<string, number>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(FIX_ALLOWANCE_STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    /* quota failures must never block a refinement */
  }
}

/** Fixes already spent on this design. */
export function readFixesUsed(designId: string): number {
  if (!designId) return 0;
  const value = readLedger()[designId];
  return typeof value === 'number' && value > 0 ? Math.floor(value) : 0;
}

/**
 * Count one *successful* refinement. Called after the generation returns —
 * a failed render costs the user nothing here (it still hit the global
 * budget, which is the pool that actually protects spend).
 */
export function recordFixUsed(designId: string): number {
  if (!designId) return 0;
  const ledger = readLedger();
  const next = readFixesUsed(designId) + 1;
  ledger[designId] = next;
  writeLedger(ledger);
  return next;
}

/** Forget a design's fixes — used when the Studio is entered with a new design. */
export function resetFixesUsed(designId: string): void {
  if (!designId) return;
  const ledger = readLedger();
  delete ledger[designId];
  writeLedger(ledger);
}

export function fixAllowanceState(designId: string): FixAllowanceState {
  const allowance = resolveFixAllowance();
  const used = readFixesUsed(designId);
  const remaining = Math.max(0, allowance - used);
  return { allowance, used, remaining, exhausted: remaining <= 0 };
}
