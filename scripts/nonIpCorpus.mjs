/**
 * Generic multi-subject corpus for the routing bake-off.
 *
 * Cast scoring answers whether a model preserves named IP. This companion
 * corpus checks the more general failure mode: losing a person, pet, or
 * object when no character identity prompt is available to rescue it.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_ID, REGION } from './renderLanes.mjs';

const VISION_MODEL = process.env.VISION_MODEL || 'gemini-2.5-flash';
const VISION_TIMEOUT_MS = 30_000;

export const NON_IP_RECORDS = [
  {
    id: 'two-people',
    expected: ['person', 'person'],
    record: {
      placement: 'outer forearm',
      styleTags: ['neo-traditional', 'color'],
      meaning: 'a collaboration between artist and collector',
      subject: 'two distinct people: a woman tattoo artist and a man holding a sketchbook, facing each other',
      references: [],
      ambiguousAxes: [],
    },
  },
  {
    id: 'person-and-pet',
    expected: ['person', 'dog'],
    record: {
      placement: 'calf',
      styleTags: ['illustrative', 'blackwork'],
      meaning: 'the trail companion who always came home with me',
      subject: 'two distinct subjects: a seated hiker beside their dog, both fully visible',
      references: [],
      ambiguousAxes: [],
    },
  },
  {
    id: 'three-objects',
    expected: ['an antique pocket watch', 'an old key', 'a compass'],
    record: {
      placement: 'upper arm',
      styleTags: ['blackwork', 'fine-line'],
      meaning: 'time, home, and finding my way',
      subject: 'three distinct objects: an antique pocket watch, an old key, and a compass, all fully visible',
      references: [],
      ambiguousAxes: [],
    },
  },
];

function canon(value) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function matches(expected, seen) {
  if (expected === 'person') {
    return seen.some((item) => /\b(person|man|woman|hiker|figure)\b/i.test(item));
  }
  const wanted = canon(expected).replace(/ /g, '');
  return seen.some((item) => {
    const got = canon(item).replace(/ /g, '');
    return got.includes(wanted) || wanted.includes(got);
  });
}

export async function readSubjects(accessToken, base64Png) {
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${VISION_MODEL}:generateContent`;
  const res = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Png } },
          { text: 'List each distinct depicted subject in this tattoo design. Count separate people, animals, and objects; do not count decorative marks. Reply only as JSON: {"subjects":[string]}.' },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Vision ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
  return (parsed.subjects ?? []).filter((subject) => typeof subject === 'string');
}

export async function scoreNonIpDir(dir, accessToken, recordId, fileNames) {
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const files = (await readdir(dir)).filter((file) => file.endsWith('.png')).sort();
  const results = [];
  for (const file of files) {
    const entry = manifest.find((candidate) => candidate.name === file);
    if (!entry?.expected) continue;
    if (recordId && entry.recordId !== recordId) continue;
    if (fileNames && !fileNames.has(file)) continue;
    try {
      const bytes = await readFile(path.join(dir, file));
      const subjects = await readSubjects(accessToken, bytes.toString('base64'));
      const expected = NON_IP_RECORDS.find((record) => record.id === entry.recordId)?.expected ?? entry.expected;
      // Consume each detection once: two requested people cannot both be
      // satisfied by one person description.
      const remaining = [...subjects];
      const found = [];
      for (const expectedSubject of expected) {
        const index = remaining.findIndex((subject) => matches(expectedSubject, [subject]));
        if (index >= 0) {
          found.push(expectedSubject);
          remaining.splice(index, 1);
        }
      }
      results.push({ file, recordId: entry.recordId, expected, subjects, found, completeness: found.length / expected.length });
    } catch (error) {
      results.push({ file, recordId: entry.recordId, expected: entry.expected, error: error.message });
    }
  }
  return results;
}

export function summarizeNonIp(results) {
  const scored = results.filter((result) => result.completeness !== undefined);
  return {
    total: scored.length,
    complete: scored.filter((result) => result.completeness === 1).length,
    meanCompleteness: scored.length ? scored.reduce((sum, result) => sum + result.completeness, 0) / scored.length : 0,
  };
}
