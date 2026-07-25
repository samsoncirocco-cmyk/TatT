import { describe, expect, it } from 'vitest';
import { parseArgs } from './propose-ontology-candidates.mjs';

describe('parseArgs', () => {
  it('parses each single action', () => {
    expect(parseArgs(['--list'])).toMatchObject({ list: true });
    expect(parseArgs(['--approve', 'trash polka'])).toMatchObject({ approve: 'trash polka' });
    expect(parseArgs(['--merge', 'fineline', '--into', 'fine-line'])).toMatchObject({
      merge: 'fineline',
      into: 'fine-line',
    });
    expect(parseArgs(['--reject', 'watercolour'])).toMatchObject({ reject: 'watercolour' });
  });

  it('requires exactly one action', () => {
    expect(() => parseArgs([])).toThrow(/Usage/);
    expect(() => parseArgs(['--list', '--reject', 'x'])).toThrow(/Usage/);
  });

  it('requires --into with --merge, and rejects a stray --into', () => {
    expect(() => parseArgs(['--merge', 'fineline'])).toThrow(/--into/);
    expect(() => parseArgs(['--into', 'fine-line'])).toThrow(/--merge/);
  });

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--frobnicate'])).toThrow(/Unknown argument/);
  });
});
