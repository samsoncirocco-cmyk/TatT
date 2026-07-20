// Curates the homepage "Featured artists" grid from the live graph.
// Writes src/data/featured-artists.json (committed) so the homepage stays
// static and never depends on Neo4j availability at request time.
//
// Selection: real artists that have style tags, a strong shop rating with
// meaningful review volume, and an Instagram handle — one per state so the
// grid reads national, ordered by review volume.
//
// Usage: node scripts/pick-featured-artists.mjs [count]
import neo4j from 'neo4j-driver';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config();

const COUNT = Number(process.argv[2]) || 4;

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME || process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const CYPHER = `
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style)
WHERE a.instagram IS NOT NULL AND a.instagram <> ''
  AND a.rating >= 4.8 AND a.reviewCount >= 200
  AND size(a.name) >= 4 AND a.name CONTAINS ' '
WITH a, collect(DISTINCT s.name) AS styles
ORDER BY a.reviewCount DESC
WITH a.state AS state, collect({
  id: a.id, name: a.name, city: a.city, state: a.state,
  instagram: a.instagram, rating: a.rating, reviewCount: a.reviewCount,
  styles: styles
})[0] AS pick
RETURN pick ORDER BY pick.reviewCount DESC LIMIT $count
`;

const session = driver.session({ database: process.env.NEO4J_DATABASE });
try {
  const res = await session.run(CYPHER, { count: neo4j.int(COUNT) });
  const featured = res.records.map((r) => {
    const p = r.get('pick');
    return {
      ...p,
      rating: typeof p.rating?.toNumber === 'function' ? p.rating.toNumber() : p.rating,
      reviewCount: typeof p.reviewCount?.toNumber === 'function' ? p.reviewCount.toNumber() : p.reviewCount,
    };
  });
  if (featured.length < COUNT) {
    console.error(`Only ${featured.length}/${COUNT} artists matched the criteria — aborting, keeping existing file.`);
    process.exit(1);
  }
  writeFileSync('src/data/featured-artists.json', JSON.stringify({ generatedFrom: 'neo4j', artists: featured }, null, 2) + '\n');
  console.log(`Wrote ${featured.length} featured artists:`);
  featured.forEach((a) => console.log(` - ${a.name} (${a.city}, ${a.state}) ${a.instagram} [${a.styles.join(', ')}] ${a.rating}★/${a.reviewCount}`));
} finally {
  await session.close();
  await driver.close();
}
