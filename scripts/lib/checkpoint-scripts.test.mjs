import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const checkpoint = readFileSync(resolve(process.cwd(), 'checkpoint.sh'), 'utf8');
const sync = readFileSync(
  resolve(process.cwd(), 'sync_and_checkpoint.sh'),
  'utf8',
);

describe('scraper checkpoint safety', () => {
  it('tracks the operational dependency used by the sync wrapper', () => {
    expect(sync).toContain('./checkpoint.sh "$@"');
    expect(checkpoint).toContain('SCRAPER_DATA_BRANCH');
  });

  it('validates the staged snapshot before replacing local data', () => {
    expect(sync).toContain('STAGING_DIR=');
    expect(sync).toContain('len(artists) != expected_artists');
    expect(sync.indexOf('staged scrape snapshot is inconsistent')).toBeLessThan(
      sync.indexOf('"$STAGING_DIR/queue.json"'),
    );
  });

  it('forces a final checkpoint when the target is reached', () => {
    expect(checkpoint).toContain('if (( TOTAL >= TARGET ))');
    expect(checkpoint).toContain('FORCE=true');
  });

  it('previews Neo4j before requiring an explicit apply setting', () => {
    expect(checkpoint).toContain(
      '"$SCRAPER_NODE" "$IMPORTER" --input "$NATIONAL_ARTISTS_SNAPSHOT"',
    );
    expect(checkpoint).toContain('if [[ "$APPLY_NEO4J" == true ]]');
    expect(checkpoint).toContain(
      '"$SCRAPER_NODE" "$IMPORTER" --apply --input "$NATIONAL_ARTISTS_SNAPSHOT"',
    );
  });

  it('advances the checkpoint marker only after requested work succeeds', () => {
    expect(checkpoint.indexOf('echo "$TOTAL" > "$LAST_CHECKPOINT_FILE"')).toBeGreaterThan(
      checkpoint.indexOf('"$SCRAPER_NODE" "$IMPORTER" --apply'),
    );
  });
});
