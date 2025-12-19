// ============================================
// TatTester Neo4j Sample Queries
// ============================================
// Quick reference for common queries
// Copy and paste into Neo4j Browser (localhost:7474)
// ============================================

// --------------------------------------------
// 1. VIEW ALL DATA
// --------------------------------------------

// See all artists (first 25)
MATCH (a:Artist)
RETURN a
LIMIT 25;

// See full graph structure
MATCH (a:Artist)-[r]->(n)
RETURN a, r, n
LIMIT 100;

// Count everything
MATCH (a:Artist) WITH count(a) as artists
MATCH (c:City) WITH artists, count(c) as cities
MATCH (s:Style) WITH artists, cities, count(s) as styles
MATCH (t:Tag) WITH artists, cities, styles, count(t) as tags
RETURN artists, cities, styles, tags;

// --------------------------------------------
// 2. ARTIST LOOKUP QUERIES
// --------------------------------------------

// Get specific artist by ID
MATCH (a:Artist {id: 1})
RETURN a;

// Get artist with all relationships
MATCH (a:Artist {id: 1})
OPTIONAL MATCH (a)-[:LOCATED_IN]->(c:City)
OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(s:Style)
OPTIONAL MATCH (a)-[:TAGGED_WITH]->(t:Tag)
RETURN a,
       c.name AS city,
       collect(DISTINCT s.name) AS styles,
       collect(DISTINCT t.name) AS tags;

// Search artists by name (case-insensitive)
MATCH (a:Artist)
WHERE toLower(a.name) CONTAINS 'sarah'
RETURN a.name, a.shopName, a.city, a.rating
ORDER BY a.rating DESC;

// --------------------------------------------
// 3. FILTER BY LOCATION
// --------------------------------------------

// All artists in Phoenix
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// All artists in Scottsdale
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Scottsdale'})
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// Count artists per city
MATCH (a:Artist)-[:LOCATED_IN]->(c:City)
RETURN c.name AS city, count(a) AS artistCount
ORDER BY artistCount DESC;

// --------------------------------------------
// 4. FILTER BY STYLE
// --------------------------------------------

// All Traditional artists
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
RETURN a.name, a.shopName, a.city, a.hourlyRate
ORDER BY a.rating DESC;

// Artists who do Realism
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Realism'})
RETURN a.name, a.shopName, a.city, a.hourlyRate
ORDER BY a.rating DESC;

// Artists who do Watercolor
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Watercolor'})
RETURN a.name, a.shopName, a.city, a.hourlyRate
ORDER BY a.rating DESC;

// Count artists per style
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style)
RETURN s.name AS style, count(a) AS artistCount
ORDER BY artistCount DESC;

// --------------------------------------------
// 5. FILTER BY BUDGET
// --------------------------------------------

// Artists under $200/hour
MATCH (a:Artist)
WHERE a.hourlyRate <= 200
RETURN a.name, a.shopName, a.city, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// Artists between $150-$250/hour
MATCH (a:Artist)
WHERE a.hourlyRate >= 150 AND a.hourlyRate <= 250
RETURN a.name, a.shopName, a.city, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// Available artists within budget
MATCH (a:Artist)
WHERE a.bookingAvailable = true AND a.hourlyRate <= 200
RETURN a.name, a.shopName, a.city, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// --------------------------------------------
// 6. COMBINED FILTERS (City + Style)
// --------------------------------------------

// Traditional artists in Phoenix
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
MATCH (a)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// Realism artists in Scottsdale
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Scottsdale'})
MATCH (a)-[:SPECIALIZES_IN]->(s:Style {name: 'Realism'})
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// Watercolor artists in Tempe under $200/hr
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Tempe'})
MATCH (a)-[:SPECIALIZES_IN]->(s:Style {name: 'Watercolor'})
WHERE a.hourlyRate <= 200
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// --------------------------------------------
// 7. DISTANCE-BASED QUERIES (SPATIAL)
// --------------------------------------------

// Artists within 50km of Phoenix downtown
WITH point({latitude: 33.4484, longitude: -112.074}) AS phoenixDowntown
MATCH (a:Artist)
WHERE point.distance(a.location, phoenixDowntown) < 50000
RETURN a.name, a.city, a.shopName,
       round(point.distance(a.location, phoenixDowntown) / 1000) AS distanceKm
ORDER BY distanceKm
LIMIT 10;

// Artists within 25km of Scottsdale
WITH point({latitude: 33.4942, longitude: -111.9261}) AS scottsdale
MATCH (a:Artist)
WHERE point.distance(a.location, scottsdale) < 25000
RETURN a.name, a.city, a.shopName,
       round(point.distance(a.location, scottsdale) / 1000) AS distanceKm
ORDER BY distanceKm;

// Artists within 100km of Tucson
WITH point({latitude: 32.2226, longitude: -110.9747}) AS tucson
MATCH (a:Artist)
WHERE point.distance(a.location, tucson) < 100000
RETURN a.name, a.city, a.shopName,
       round(point.distance(a.location, tucson) / 1000) AS distanceKm
ORDER BY distanceKm
LIMIT 20;

// --------------------------------------------
// 8. TAG-BASED QUERIES
// --------------------------------------------

// Artists tagged with 'dragon'
MATCH (a:Artist)-[:TAGGED_WITH]->(t:Tag {name: 'dragon'})
RETURN a.name, a.shopName, a.city
ORDER BY a.rating DESC;

// Artists tagged with 'colorful'
MATCH (a:Artist)-[:TAGGED_WITH]->(t:Tag {name: 'colorful'})
RETURN a.name, a.shopName, a.city
ORDER BY a.rating DESC;

// All unique tags
MATCH (t:Tag)
RETURN t.name AS tag
ORDER BY tag;

// Artists with specific tags
MATCH (a:Artist)-[:TAGGED_WITH]->(t:Tag)
WHERE t.name IN ['dragon', 'colorful', 'geometric']
RETURN a.name, a.shopName, collect(t.name) AS tags
ORDER BY a.rating DESC;

// --------------------------------------------
// 9. RATING AND EXPERIENCE FILTERS
// --------------------------------------------

// Top-rated artists (4.5+ stars)
MATCH (a:Artist)
WHERE a.rating >= 4.5
RETURN a.name, a.shopName, a.city, a.rating, a.reviewCount
ORDER BY a.rating DESC, a.reviewCount DESC;

// Highly experienced artists (10+ years)
MATCH (a:Artist)
WHERE a.yearsExperience >= 10
RETURN a.name, a.shopName, a.city, a.yearsExperience, a.rating
ORDER BY a.yearsExperience DESC;

// Top artists with lots of reviews
MATCH (a:Artist)
WHERE a.reviewCount >= 300
RETURN a.name, a.shopName, a.city, a.rating, a.reviewCount
ORDER BY a.reviewCount DESC;

// --------------------------------------------
// 10. COMPLEX MATCHING QUERY (TATTESTER ALGORITHM)
// --------------------------------------------

// Find best artist matches for user preferences
// Modify these parameters to test different searches:
WITH ['Traditional', 'Realism'] AS userStyles,          // User's preferred styles
     ['dragon', 'colorful'] AS userKeywords,            // User's keywords
     point({latitude: 33.4484, longitude: -112.074}) AS userLocation,  // Phoenix downtown
     200 AS maxBudget                                   // Max hourly rate

MATCH (a:Artist)
WHERE a.hourlyRate <= maxBudget AND a.bookingAvailable = true

// Calculate style overlap score
OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(s:Style)
WHERE s.name IN userStyles
WITH a, userLocation, userKeywords, count(DISTINCT s) AS styleScore

// Calculate keyword match score
OPTIONAL MATCH (a)-[:TAGGED_WITH]->(t:Tag)
WHERE t.name IN userKeywords
WITH a, userLocation, styleScore, count(DISTINCT t) AS keywordScore

// Calculate distance
WITH a, styleScore, keywordScore,
     point.distance(a.location, userLocation) / 1000 AS distanceKm

// Calculate weighted match score (40% style, 25% keyword, 15% distance)
WITH a,
     styleScore * 0.4 AS styleWeight,
     keywordScore * 0.25 AS keywordWeight,
     (50 - CASE WHEN distanceKm > 50 THEN 50 ELSE distanceKm END) * 0.15 AS distanceWeight,
     styleScore, keywordScore, distanceKm

WITH a, styleWeight + keywordWeight + distanceWeight AS matchScore,
     styleScore, keywordScore, distanceKm

RETURN a.name, a.shopName, a.city, a.hourlyRate, a.rating,
       round(matchScore * 100) AS matchPercentage,
       styleScore AS styleMatches,
       keywordScore AS keywordMatches,
       round(distanceKm) AS distanceKm
ORDER BY matchScore DESC
LIMIT 20;

// --------------------------------------------
// 11. MULTI-STYLE ARTISTS
// --------------------------------------------

// Artists who specialize in multiple styles
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style)
WITH a, collect(s.name) AS styles, count(s) AS styleCount
WHERE styleCount >= 3
RETURN a.name, a.shopName, a.city, styles, styleCount
ORDER BY styleCount DESC;

// Artists who do both Traditional and Realism
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s1:Style {name: 'Traditional'})
MATCH (a)-[:SPECIALIZES_IN]->(s2:Style {name: 'Realism'})
RETURN a.name, a.shopName, a.city, a.rating
ORDER BY a.rating DESC;

// --------------------------------------------
// 12. PORTFOLIO AND INSTAGRAM
// --------------------------------------------

// Get portfolio images for an artist
MATCH (a:Artist {id: 1})
RETURN a.name, a.portfolioImages;

// Artists with Instagram handles
MATCH (a:Artist)
WHERE a.instagram IS NOT NULL
RETURN a.name, a.instagram, a.shopName
LIMIT 10;

// --------------------------------------------
// 13. AVAILABILITY QUERIES
// --------------------------------------------

// Available artists in Phoenix
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
WHERE a.bookingAvailable = true
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC;

// Unavailable artists (for waitlist)
MATCH (a:Artist)
WHERE a.bookingAvailable = false
RETURN a.name, a.shopName, a.city, a.rating
ORDER BY a.rating DESC;

// --------------------------------------------
// 14. SHOP-BASED QUERIES
// --------------------------------------------

// All artists at Golden Rule Tattoo
MATCH (a:Artist)
WHERE a.shopName CONTAINS 'Golden Rule'
RETURN a.name, a.shopName, a.city
ORDER BY a.rating DESC;

// Count artists per shop
MATCH (a:Artist)
RETURN a.shopName AS shop, count(a) AS artistCount
ORDER BY artistCount DESC
LIMIT 10;

// --------------------------------------------
// 15. ADVANCED RECOMMENDATIONS
// --------------------------------------------

// Similar artists to a given artist (same styles and tags)
MATCH (target:Artist {id: 1})
MATCH (target)-[:SPECIALIZES_IN]->(s:Style)<-[:SPECIALIZES_IN]-(similar:Artist)
WHERE target <> similar
WITH similar, count(DISTINCT s) AS commonStyles
MATCH (target:Artist {id: 1})
MATCH (target)-[:TAGGED_WITH]->(t:Tag)<-[:TAGGED_WITH]-(similar)
WITH similar, commonStyles, count(DISTINCT t) AS commonTags
RETURN similar.name, similar.shopName, similar.city,
       commonStyles, commonTags,
       commonStyles + commonTags AS similarityScore
ORDER BY similarityScore DESC
LIMIT 10;

// Artists in the same city with similar hourly rates
MATCH (a1:Artist {id: 1})-[:LOCATED_IN]->(c:City)<-[:LOCATED_IN]-(a2:Artist)
WHERE a1 <> a2
  AND abs(a1.hourlyRate - a2.hourlyRate) <= 50
RETURN a2.name, a2.shopName, a2.hourlyRate, a1.hourlyRate AS referenceRate
ORDER BY abs(a1.hourlyRate - a2.hourlyRate);

// ============================================
// END OF SAMPLE QUERIES
// ============================================

// To visualize the graph in Neo4j Browser:
// 1. Run any of the queries above
// 2. Click on the visualization tab
// 3. Expand relationships to see connections
// 4. Use the graph view for intuitive exploration
