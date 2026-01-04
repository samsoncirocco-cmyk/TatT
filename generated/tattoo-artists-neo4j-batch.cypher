// Neo4j Batch Import Script (Optimized)
// Use this for better performance with large datasets

// Clear existing data
MATCH (n) DETACH DELETE n;

// Create indexes
CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);
CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);
CREATE INDEX color_name_index IF NOT EXISTS FOR (c:Color) ON (c.name);
CREATE INDEX specialization_name_index IF NOT EXISTS FOR (sp:Specialization) ON (sp.name);

// Create all Style nodes
UNWIND $styles AS style
MERGE (s:Style {name: style.name});

// Create all Color nodes
UNWIND $colors AS color
MERGE (c:Color {name: color.name});

// Create all Specialization nodes
UNWIND $specializations AS spec
MERGE (sp:Specialization {name: spec.name});

// Create all Location nodes
UNWIND $locations AS loc
MERGE (l:Location {city: loc.city, region: loc.region, country: loc.country});

// Create Artist nodes and relationships in batches
UNWIND $artists AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.location_city = artist.location_city,
    a.location_region = artist.location_region,
    a.location_country = artist.location_country,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = datetime(artist.created_at)
WITH a, artist
MATCH (l:Location {city: artist.location_city, region: artist.location_region, country: artist.location_country})
MERGE (a)-[:LOCATED_IN]->(l)
WITH a, artist
UNWIND artist.styles AS styleName
MATCH (s:Style {name: styleName})
MERGE (a)-[:PRACTICES_STYLE]->(s)
WITH a, artist
UNWIND artist.color_palettes AS colorName
MATCH (c:Color {name: colorName})
MERGE (a)-[:USES_COLOR]->(c)
WITH a, artist
UNWIND artist.specializations AS specName
MATCH (sp:Specialization {name: specName})
MERGE (a)-[:SPECIALIZES_IN]->(sp);

// Note: This script requires parameterized queries. Use with Neo4j driver or client.
// Parameters should be:
// $styles: [{name: "Fine Line"}, ...]
// $colors: [{name: "Black & Grey"}, ...]
// $specializations: [{name: "Portraits"}, ...]
// $locations: [{city: "Manhattan", region: "New York", country: "United States"}, ...]
// $artists: [{id: "...", name: "...", styles: ["Fine Line"], color_palettes: ["Black & Grey"], ...}, ...]