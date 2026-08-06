import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { adcToken } from '../scripts/renderLanes.mjs';
import { readCast, readTextIntrusion, namesMatch } from '../scripts/castCorpus.mjs';

const dir = path.resolve(process.argv[2]);
const names = process.argv.slice(3);
const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
const token = adcToken();

for (const name of names) {
  const entry = manifest.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`No manifest entry for ${name}`);
  const bytes = await readFile(path.join(dir, name));
  const base64 = bytes.toString('base64');
  const seen = await readCast(token, base64);
  const text = await readTextIntrusion(token, base64);
  const found = entry.cast.filter((wanted) =>
    seen.characters.some((got) => namesMatch(wanted, got))
  );
  console.log(JSON.stringify({
    file: name,
    recordId: entry.recordId,
    cast: entry.cast,
    found,
    extra: seen.characters.filter((got) => !entry.cast.some((wanted) => namesMatch(wanted, got))),
    completeness: found.length / entry.cast.length,
    hasText: text.hasText,
    words: text.words,
    summary: seen.summary,
  }));
}
