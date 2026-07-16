/**
 * Generate Neo4j Cypher Import Script
 *
 * Converts the generated tattoo artist data into Neo4j Cypher statements using
 * the canonical graph model:
 *   (State)-[:HAS_CITY]->(City)-[:HAS_SHOP]->(Shop)-[:HAS_ARTIST]->(Artist)
 *   (Artist)-[:SPECIALIZES_IN]->(Style), (Shop)-[:FEATURES_STYLE]->(Style)
 *   (Artist)-[:HAS_WEBSITE]->(Website)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Escape strings for Cypher
 */
function escapeCypher(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generate Cypher statements for Neo4j import
 */
function generateCypherScript(neo4jData) {
  const lines = [
    '// Neo4j Import Script for Tattoo Artists',
    '// Generated from Supabase-compatible dataset (canonical graph model)',
    '',
    '// Clear existing data (optional - remove if you want to merge)',
    'MATCH (n) DETACH DELETE n;',
    '',
    '// Create indexes',
    'CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);',
    'CREATE INDEX artist_name_index IF NOT EXISTS FOR (a:Artist) ON (a.name);',
    'CREATE INDEX state_name_index IF NOT EXISTS FOR (st:State) ON (st.name);',
    'CREATE INDEX city_name_index IF NOT EXISTS FOR (c:City) ON (c.name);',
    'CREATE INDEX shop_name_index IF NOT EXISTS FOR (sh:Shop) ON (sh.name);',
    'CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);',
    'CREATE INDEX website_url_index IF NOT EXISTS FOR (w:Website) ON (w.url);',
    '',
    '// Create State nodes',
    ...neo4jData.nodes.states.map(state =>
      `MERGE (st:State {name: '${escapeCypher(state.name)}'});`
    ),
    '',
    '// Create City nodes',
    ...neo4jData.nodes.cities.map(city =>
      `MERGE (c:City {name: '${escapeCypher(city.name)}', state: '${escapeCypher(city.state)}'});`
    ),
    '',
    '// Create Shop nodes',
    ...neo4jData.nodes.shops.map(shop =>
      `MERGE (sh:Shop {name: '${escapeCypher(shop.name)}', city: '${escapeCypher(shop.city)}', state: '${escapeCypher(shop.state)}'});`
    ),
    '',
    '// Create Style nodes',
    ...neo4jData.nodes.styles.map(style =>
      `MERGE (s:Style {name: '${escapeCypher(style.name)}'});`
    ),
    '',
    '// Create Website nodes',
    ...neo4jData.nodes.websites.map(website =>
      `MERGE (w:Website {url: '${escapeCypher(website.url)}'});`
    ),
    '',
    '// Create Artist nodes with properties',
  ];

  // Create Artist nodes (batched for performance)
  const batchSize = 50;
  for (let i = 0; i < neo4jData.nodes.artists.length; i += batchSize) {
    const batch = neo4jData.nodes.artists.slice(i, i + batchSize);
    lines.push('');
    lines.push(`// Batch ${Math.floor(i / batchSize) + 1}`);
    lines.push('UNWIND [');

    const artistProps = batch.map(artist => {
      const props = [
        `id: '${artist.id}'`,
        `name: '${escapeCypher(artist.name)}'`,
        `has_multiple_locations: ${artist.has_multiple_locations}`,
        `profile_url: '${escapeCypher(artist.profile_url)}'`,
        `is_curated: ${artist.is_curated}`,
        `created_at: datetime('${artist.created_at}')`
      ].join(', ');
      return `  {${props}}`;
    }).join(',\n');

    lines.push(artistProps);
    lines.push('] AS artist');
    lines.push('MERGE (a:Artist {id: artist.id})');
    lines.push('SET a.name = artist.name,');
    lines.push('    a.has_multiple_locations = artist.has_multiple_locations,');
    lines.push('    a.profile_url = artist.profile_url,');
    lines.push('    a.is_curated = artist.is_curated,');
    lines.push('    a.created_at = artist.created_at;');
  }

  lines.push('');
  lines.push('// Create HAS_CITY relationships (State -> City)');
  for (const rel of neo4jData.relationships.HAS_CITY) {
    lines.push(
      `MATCH (st:State {name: '${escapeCypher(rel.state)}'}), (c:City {name: '${escapeCypher(rel.city)}', state: '${escapeCypher(rel.cityState)}'}) ` +
      `MERGE (st)-[:HAS_CITY]->(c);`
    );
  }

  lines.push('');
  lines.push('// Create HAS_SHOP relationships (City -> Shop)');
  for (const rel of neo4jData.relationships.HAS_SHOP) {
    lines.push(
      `MATCH (c:City {name: '${escapeCypher(rel.city)}', state: '${escapeCypher(rel.cityState)}'}), (sh:Shop {name: '${escapeCypher(rel.shop)}', city: '${escapeCypher(rel.shopCity)}', state: '${escapeCypher(rel.shopState)}'}) ` +
      `MERGE (c)-[:HAS_SHOP]->(sh);`
    );
  }

  lines.push('');
  lines.push('// Create HAS_ARTIST relationships (Shop -> Artist)');
  for (const rel of neo4jData.relationships.HAS_ARTIST) {
    lines.push(
      `MATCH (sh:Shop {name: '${escapeCypher(rel.shop)}', city: '${escapeCypher(rel.shopCity)}', state: '${escapeCypher(rel.shopState)}'}), (a:Artist {id: '${rel.artistId}'}) ` +
      `MERGE (sh)-[:HAS_ARTIST]->(a);`
    );
  }

  lines.push('');
  lines.push('// Create SPECIALIZES_IN relationships (Artist -> Style)');
  for (const rel of neo4jData.relationships.SPECIALIZES_IN) {
    lines.push(
      `MATCH (a:Artist {id: '${rel.from}'}), (s:Style {name: '${escapeCypher(rel.to)}'}) ` +
      `MERGE (a)-[:SPECIALIZES_IN]->(s);`
    );
  }

  lines.push('');
  lines.push('// Create FEATURES_STYLE relationships (Shop -> Style)');
  for (const rel of neo4jData.relationships.FEATURES_STYLE) {
    lines.push(
      `MATCH (sh:Shop {name: '${escapeCypher(rel.shop)}', city: '${escapeCypher(rel.shopCity)}', state: '${escapeCypher(rel.shopState)}'}), (s:Style {name: '${escapeCypher(rel.style)}'}) ` +
      `MERGE (sh)-[:FEATURES_STYLE]->(s);`
    );
  }

  lines.push('');
  lines.push('// Create HAS_WEBSITE relationships (Artist -> Website)');
  for (const rel of neo4jData.relationships.HAS_WEBSITE) {
    lines.push(
      `MATCH (a:Artist {id: '${rel.from}'}), (w:Website {url: '${escapeCypher(rel.to)}'}) ` +
      `MERGE (a)-[:HAS_WEBSITE]->(w);`
    );
  }

  lines.push('');
  lines.push('// Verification queries');
  lines.push('MATCH (a:Artist) RETURN count(a) as artistCount;');
  lines.push('MATCH (st:State) RETURN count(st) as stateCount;');
  lines.push('MATCH (c:City) RETURN count(c) as cityCount;');
  lines.push('MATCH (sh:Shop) RETURN count(sh) as shopCount;');
  lines.push('MATCH (s:Style) RETURN count(s) as styleCount;');
  lines.push('MATCH (w:Website) RETURN count(w) as websiteCount;');
  lines.push('MATCH (st:State)-[r:HAS_CITY]->(:City) RETURN count(r) as hasCityCount;');
  lines.push('MATCH (:City)-[r:HAS_SHOP]->(:Shop) RETURN count(r) as hasShopCount;');
  lines.push('MATCH (:Shop)-[r:HAS_ARTIST]->(:Artist) RETURN count(r) as hasArtistCount;');
  lines.push('MATCH (:Artist)-[r:SPECIALIZES_IN]->(:Style) RETURN count(r) as specializesInCount;');
  lines.push('MATCH (:Shop)-[r:FEATURES_STYLE]->(:Style) RETURN count(r) as featuresStyleCount;');
  lines.push('MATCH (:Artist)-[r:HAS_WEBSITE]->(:Website) RETURN count(r) as hasWebsiteCount;');

  return lines.join('\n');
}

/**
 * Generate optimized batch Cypher (more efficient for large datasets)
 */
function generateBatchCypher(neo4jData) {
  const lines = [
    '// Neo4j Batch Import Script (Optimized, canonical graph model)',
    '// Use this for better performance with large datasets',
    '',
    '// Clear existing data',
    'MATCH (n) DETACH DELETE n;',
    '',
    '// Create indexes',
    'CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);',
    'CREATE INDEX state_name_index IF NOT EXISTS FOR (st:State) ON (st.name);',
    'CREATE INDEX city_name_index IF NOT EXISTS FOR (c:City) ON (c.name);',
    'CREATE INDEX shop_name_index IF NOT EXISTS FOR (sh:Shop) ON (sh.name);',
    'CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);',
    '',
    '// Create all State nodes',
    'UNWIND $states AS state',
    'MERGE (st:State {name: state.name});',
    '',
    '// Create all City nodes',
    'UNWIND $cities AS city',
    'MERGE (c:City {name: city.name, state: city.state});',
    '',
    '// Create all Shop nodes',
    'UNWIND $shops AS shop',
    'MERGE (sh:Shop {name: shop.name, city: shop.city, state: shop.state});',
    '',
    '// Create all Style nodes',
    'UNWIND $styles AS style',
    'MERGE (s:Style {name: style.name});',
    '',
    '// Create all Website nodes',
    'UNWIND $websites AS website',
    'MERGE (w:Website {url: website.url});',
    '',
    '// Create Artist nodes and relationships in batches',
    'UNWIND $artists AS artist',
    'MERGE (a:Artist {id: artist.id})',
    'SET a.name = artist.name,',
    '    a.has_multiple_locations = artist.has_multiple_locations,',
    '    a.profile_url = artist.profile_url,',
    '    a.is_curated = artist.is_curated,',
    '    a.created_at = datetime(artist.created_at)',
    'WITH a, artist',
    '// State -> City -> Shop -> Artist',
    'MATCH (st:State {name: artist.location_region})',
    'MATCH (c:City {name: artist.location_city, state: artist.location_region})',
    'MATCH (sh:Shop {name: artist.shop_name, city: artist.location_city, state: artist.location_region})',
    'MERGE (st)-[:HAS_CITY]->(c)',
    'MERGE (c)-[:HAS_SHOP]->(sh)',
    'MERGE (sh)-[:HAS_ARTIST]->(a)',
    'WITH a, sh, artist',
    'UNWIND artist.styles AS styleName',
    'MATCH (s:Style {name: styleName})',
    'MERGE (a)-[:SPECIALIZES_IN]->(s)',
    'MERGE (sh)-[:FEATURES_STYLE]->(s)',
    'WITH a, artist',
    'MATCH (w:Website {url: artist.profile_url})',
    'MERGE (a)-[:HAS_WEBSITE]->(w);',
    '',
    '// Note: This script requires parameterized queries. Use with Neo4j driver or client.',
    '// Parameters should be:',
    '// $states: [{name: "New York"}, ...]',
    '// $cities: [{name: "Manhattan", state: "New York"}, ...]',
    '// $shops: [{name: "Ink & Iron Studio", city: "Manhattan", state: "New York"}, ...]',
    '// $styles: [{name: "Fine Line"}, ...]',
    '// $websites: [{url: "https://..."}, ...]',
    '// $artists: [{id: "...", name: "...", shop_name: "...", location_city: "...", location_region: "...", styles: ["Fine Line"], profile_url: "https://...", ...}, ...]'
  ];

  return lines.join('\n');
}

function main() {
  console.log('🔄 Generating Neo4j Cypher scripts...\n');

  // Load Neo4j format data
  const neo4jPath = join(__dirname, '../generated/tattoo-artists-neo4j.json');
  const neo4jData = JSON.parse(readFileSync(neo4jPath, 'utf-8'));

  // Generate standard Cypher script
  const cypherScript = generateCypherScript(neo4jData);
  const cypherPath = join(__dirname, '../generated/tattoo-artists-neo4j.cypher');
  writeFileSync(cypherPath, cypherScript, 'utf-8');
  console.log(`✅ Generated Cypher script: ${cypherPath}`);
  console.log(`   Lines: ${cypherScript.split('\n').length}`);

  // Generate batch Cypher script (for programmatic use)
  const batchCypher = generateBatchCypher(neo4jData);
  const batchPath = join(__dirname, '../generated/tattoo-artists-neo4j-batch.cypher');
  writeFileSync(batchPath, batchCypher, 'utf-8');
  console.log(`✅ Generated batch Cypher script: ${batchPath}`);

  // Also save the parameter data for batch script
  const paramsData = {
    states: neo4jData.nodes.states,
    cities: neo4jData.nodes.cities,
    shops: neo4jData.nodes.shops,
    styles: neo4jData.nodes.styles,
    websites: neo4jData.nodes.websites,
    artists: neo4jData.nodes.artists.map(artist => {
      // Reconstruct per-artist geography + styles from the relationships
      const styles = neo4jData.relationships.SPECIALIZES_IN
        .filter(r => r.from === artist.id)
        .map(r => r.to);
      const hasArtist = neo4jData.relationships.HAS_ARTIST
        .find(r => r.artistId === artist.id);

      return {
        id: artist.id,
        name: artist.name,
        shop_name: hasArtist ? hasArtist.shop : null,
        location_city: hasArtist ? hasArtist.shopCity : null,
        location_region: hasArtist ? hasArtist.shopState : null,
        has_multiple_locations: artist.has_multiple_locations,
        profile_url: artist.profile_url,
        is_curated: artist.is_curated,
        created_at: artist.created_at,
        styles
      };
    })
  };

  const paramsPath = join(__dirname, '../generated/tattoo-artists-neo4j-params.json');
  writeFileSync(paramsPath, JSON.stringify(paramsData, null, 2), 'utf-8');
  console.log(`✅ Generated parameters file: ${paramsPath}`);

  console.log('\n✅ Neo4j export generation complete!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateCypherScript, generateBatchCypher };
