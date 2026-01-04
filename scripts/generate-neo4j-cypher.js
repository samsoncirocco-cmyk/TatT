/**
 * Generate Neo4j Cypher Import Script
 * 
 * Converts the generated tattoo artist data into Neo4j Cypher statements
 * for importing artists, styles, colors, specializations, and relationships
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
    '// Generated from Supabase-compatible dataset',
    '',
    '// Clear existing data (optional - remove if you want to merge)',
    'MATCH (n) DETACH DELETE n;',
    '',
    '// Create indexes',
    'CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);',
    'CREATE INDEX artist_name_index IF NOT EXISTS FOR (a:Artist) ON (a.name);',
    'CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);',
    'CREATE INDEX color_name_index IF NOT EXISTS FOR (c:Color) ON (c.name);',
    'CREATE INDEX specialization_name_index IF NOT EXISTS FOR (sp:Specialization) ON (sp.name);',
    'CREATE INDEX location_city_index IF NOT EXISTS FOR (l:Location) ON (l.city);',
    '',
    '// Create Style nodes',
    ...neo4jData.nodes.styles.map(style => 
      `MERGE (s:Style {name: '${escapeCypher(style.name)}'});`
    ),
    '',
    '// Create Color nodes',
    ...neo4jData.nodes.colors.map(color => 
      `MERGE (c:Color {name: '${escapeCypher(color.name)}'});`
    ),
    '',
    '// Create Specialization nodes',
    ...neo4jData.nodes.specializations.map(spec => 
      `MERGE (sp:Specialization {name: '${escapeCypher(spec.name)}'});`
    ),
    '',
    '// Create Location nodes',
    ...neo4jData.nodes.locations.map(loc => 
      `MERGE (l:Location {city: '${escapeCypher(loc.city)}', region: '${escapeCypher(loc.region)}', country: '${escapeCypher(loc.country)}'});`
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
        `location_city: '${escapeCypher(artist.location_city)}'`,
        `location_region: '${escapeCypher(artist.location_region)}'`,
        `location_country: '${escapeCypher(artist.location_country)}'`,
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
    lines.push('    a.location_city = artist.location_city,');
    lines.push('    a.location_region = artist.location_region,');
    lines.push('    a.location_country = artist.location_country,');
    lines.push('    a.has_multiple_locations = artist.has_multiple_locations,');
    lines.push('    a.profile_url = artist.profile_url,');
    lines.push('    a.is_curated = artist.is_curated,');
    lines.push('    a.created_at = artist.created_at;');
  }
  
  lines.push('');
  lines.push('// Create LOCATED_IN relationships');
  lines.push('MATCH (a:Artist), (l:Location)');
  lines.push('WHERE a.location_city = l.city AND a.location_region = l.region AND a.location_country = l.country');
  lines.push('MERGE (a)-[:LOCATED_IN]->(l);');
  
  lines.push('');
  lines.push('// Create PRACTICES_STYLE relationships');
  for (const rel of neo4jData.relationships.PRACTICES_STYLE) {
    lines.push(
      `MATCH (a:Artist {id: '${rel.from}'}), (s:Style {name: '${escapeCypher(rel.to)}'}) ` +
      `MERGE (a)-[:PRACTICES_STYLE]->(s);`
    );
  }
  
  lines.push('');
  lines.push('// Create USES_COLOR relationships');
  for (const rel of neo4jData.relationships.USES_COLOR) {
    lines.push(
      `MATCH (a:Artist {id: '${rel.from}'}), (c:Color {name: '${escapeCypher(rel.to)}'}) ` +
      `MERGE (a)-[:USES_COLOR]->(c);`
    );
  }
  
  lines.push('');
  lines.push('// Create SPECIALIZES_IN relationships');
  for (const rel of neo4jData.relationships.SPECIALIZES_IN) {
    lines.push(
      `MATCH (a:Artist {id: '${rel.from}'}), (sp:Specialization {name: '${escapeCypher(rel.to)}'}) ` +
      `MERGE (a)-[:SPECIALIZES_IN]->(sp);`
    );
  }
  
  lines.push('');
  lines.push('// Verification queries');
  lines.push('MATCH (a:Artist) RETURN count(a) as artistCount;');
  lines.push('MATCH (s:Style) RETURN count(s) as styleCount;');
  lines.push('MATCH (c:Color) RETURN count(c) as colorCount;');
  lines.push('MATCH (sp:Specialization) RETURN count(sp) as specializationCount;');
  lines.push('MATCH (l:Location) RETURN count(l) as locationCount;');
  lines.push('MATCH (a:Artist)-[r:PRACTICES_STYLE]->(s:Style) RETURN count(r) as practicesStyleCount;');
  lines.push('MATCH (a:Artist)-[r:USES_COLOR]->(c:Color) RETURN count(r) as usesColorCount;');
  lines.push('MATCH (a:Artist)-[r:SPECIALIZES_IN]->(sp:Specialization) RETURN count(r) as specializesInCount;');
  lines.push('MATCH (a:Artist)-[r:LOCATED_IN]->(l:Location) RETURN count(r) as locatedInCount;');
  
  return lines.join('\n');
}

/**
 * Generate optimized batch Cypher (more efficient for large datasets)
 */
function generateBatchCypher(neo4jData) {
  const lines = [
    '// Neo4j Batch Import Script (Optimized)',
    '// Use this for better performance with large datasets',
    '',
    '// Clear existing data',
    'MATCH (n) DETACH DELETE n;',
    '',
    '// Create indexes',
    'CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);',
    'CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);',
    'CREATE INDEX color_name_index IF NOT EXISTS FOR (c:Color) ON (c.name);',
    'CREATE INDEX specialization_name_index IF NOT EXISTS FOR (sp:Specialization) ON (sp.name);',
    '',
    '// Create all Style nodes',
    'UNWIND $styles AS style',
    'MERGE (s:Style {name: style.name});',
    '',
    '// Create all Color nodes',
    'UNWIND $colors AS color',
    'MERGE (c:Color {name: color.name});',
    '',
    '// Create all Specialization nodes',
    'UNWIND $specializations AS spec',
    'MERGE (sp:Specialization {name: spec.name});',
    '',
    '// Create all Location nodes',
    'UNWIND $locations AS loc',
    'MERGE (l:Location {city: loc.city, region: loc.region, country: loc.country});',
    '',
    '// Create Artist nodes and relationships in batches',
    'UNWIND $artists AS artist',
    'MERGE (a:Artist {id: artist.id})',
    'SET a.name = artist.name,',
    '    a.location_city = artist.location_city,',
    '    a.location_region = artist.location_region,',
    '    a.location_country = artist.location_country,',
    '    a.has_multiple_locations = artist.has_multiple_locations,',
    '    a.profile_url = artist.profile_url,',
    '    a.is_curated = artist.is_curated,',
    '    a.created_at = datetime(artist.created_at)',
    'WITH a, artist',
    'MATCH (l:Location {city: artist.location_city, region: artist.location_region, country: artist.location_country})',
    'MERGE (a)-[:LOCATED_IN]->(l)',
    'WITH a, artist',
    'UNWIND artist.styles AS styleName',
    'MATCH (s:Style {name: styleName})',
    'MERGE (a)-[:PRACTICES_STYLE]->(s)',
    'WITH a, artist',
    'UNWIND artist.color_palettes AS colorName',
    'MATCH (c:Color {name: colorName})',
    'MERGE (a)-[:USES_COLOR]->(c)',
    'WITH a, artist',
    'UNWIND artist.specializations AS specName',
    'MATCH (sp:Specialization {name: specName})',
    'MERGE (a)-[:SPECIALIZES_IN]->(sp);',
    '',
    '// Note: This script requires parameterized queries. Use with Neo4j driver or client.',
    '// Parameters should be:',
    '// $styles: [{name: "Fine Line"}, ...]',
    '// $colors: [{name: "Black & Grey"}, ...]',
    '// $specializations: [{name: "Portraits"}, ...]',
    '// $locations: [{city: "Manhattan", region: "New York", country: "United States"}, ...]',
    '// $artists: [{id: "...", name: "...", styles: ["Fine Line"], color_palettes: ["Black & Grey"], ...}, ...]'
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
    styles: neo4jData.nodes.styles,
    colors: neo4jData.nodes.colors,
    specializations: neo4jData.nodes.specializations,
    locations: neo4jData.nodes.locations,
    artists: neo4jData.nodes.artists.map(artist => {
      // Find relationships to build arrays
      const styles = neo4jData.relationships.PRACTICES_STYLE
        .filter(r => r.from === artist.id)
        .map(r => r.to);
      const colors = neo4jData.relationships.USES_COLOR
        .filter(r => r.from === artist.id)
        .map(r => r.to);
      const specializations = neo4jData.relationships.SPECIALIZES_IN
        .filter(r => r.from === artist.id)
        .map(r => r.to);
      
      return {
        id: artist.id,
        name: artist.name,
        location_city: artist.location_city,
        location_region: artist.location_region,
        location_country: artist.location_country,
        has_multiple_locations: artist.has_multiple_locations,
        profile_url: artist.profile_url,
        is_curated: artist.is_curated,
        created_at: artist.created_at,
        styles,
        color_palettes: colors,
        specializations
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

