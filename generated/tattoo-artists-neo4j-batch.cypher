// Neo4j Batch Import Script (Optimized, canonical graph model)
// Use this for better performance with large datasets

// Existing data preserved (MERGE-based). Re-run generator with --wipe to include a full wipe statement.

// Create indexes
CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);
CREATE INDEX state_name_index IF NOT EXISTS FOR (st:State) ON (st.name);
CREATE INDEX city_name_index IF NOT EXISTS FOR (c:City) ON (c.name);
CREATE INDEX shop_name_index IF NOT EXISTS FOR (sh:Shop) ON (sh.name);
CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);

// Create all State nodes
UNWIND $states AS state
MERGE (st:State {name: state.name});

// Create all City nodes
UNWIND $cities AS city
MERGE (c:City {name: city.name, state: city.state});

// Create all Shop nodes
UNWIND $shops AS shop
MERGE (sh:Shop {name: shop.name, city: shop.city, state: shop.state});

// Create all Style nodes
UNWIND $styles AS style
MERGE (s:Style {name: style.name});

// Create all Website nodes
UNWIND $websites AS website
MERGE (w:Website {url: website.url});

// Create Artist nodes and relationships in batches
UNWIND $artists AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = datetime(artist.created_at)
WITH a, artist
// State -> City -> Shop -> Artist
MATCH (st:State {name: artist.location_region})
MATCH (c:City {name: artist.location_city, state: artist.location_region})
MATCH (sh:Shop {name: artist.shop_name, city: artist.location_city, state: artist.location_region})
MERGE (st)-[:HAS_CITY]->(c)
MERGE (c)-[:HAS_SHOP]->(sh)
MERGE (sh)-[:HAS_ARTIST]->(a)
WITH a, sh, artist
UNWIND artist.styles AS styleName
MATCH (s:Style {name: styleName})
MERGE (a)-[:SPECIALIZES_IN]->(s)
MERGE (sh)-[:FEATURES_STYLE]->(s)
WITH a, artist
MATCH (w:Website {url: artist.profile_url})
MERGE (a)-[:HAS_WEBSITE]->(w);

// Note: This script requires parameterized queries. Use with Neo4j driver or client.
// Parameters should be:
// $states: [{name: "New York"}, ...]
// $cities: [{name: "Manhattan", state: "New York"}, ...]
// $shops: [{name: "Ink & Iron Studio", city: "Manhattan", state: "New York"}, ...]
// $styles: [{name: "Fine Line"}, ...]
// $websites: [{url: "https://..."}, ...]
// $artists: [{id: "...", name: "...", shop_name: "...", location_city: "...", location_region: "...", styles: ["Fine Line"], profile_url: "https://...", ...}, ...]