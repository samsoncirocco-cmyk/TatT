# Neo4j Quick Start Guide

## 5-Minute Setup

### Step 1: Install Neo4j (Choose One)

**Option A: Docker (Fastest)**
```bash
docker run -d \
  --name neo4j-tattester \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/tattester123 \
  neo4j:latest
```

**Option B: Neo4j Desktop**
1. Download from https://neo4j.com/download/
2. Install and create new database
3. Set password: `tattester123` (or your choice)
4. Start the database

**Option C: Neo4j Aura Free (Cloud)**
1. Sign up at https://neo4j.com/cloud/aura/
2. Create free instance
3. Save connection credentials

### Step 2: Configure Environment

Add to your `.env` file:
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=tattester123
```

For Neo4j Aura, use provided credentials:
```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_aura_password
```

### Step 3: Import Artists

```bash
npm run neo4j:import
```

Expected output:
```
✅ Loaded 100 artists from artists.json
✅ Connected to Neo4j successfully
📊 Creating indexes...
🏙️  Importing cities... (20)
🎨 Importing styles... (15)
👨‍🎨 Importing artists... (100)
✅ Import completed successfully!
```

### Step 4: Verify Import

Open Neo4j Browser: http://localhost:7474

Run this query:
```cypher
MATCH (a:Artist)
RETURN a.name, a.city, a.hourlyRate
LIMIT 10
```

## Quick Test Queries

### Find artists in Phoenix
```cypher
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
RETURN a.name, a.shopName, a.rating
ORDER BY a.rating DESC
LIMIT 5
```

### Find Traditional artists
```cypher
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
RETURN a.name, a.city, a.hourlyRate
ORDER BY a.rating DESC
```

### Find artists within budget
```cypher
MATCH (a:Artist)
WHERE a.hourlyRate <= 200 AND a.bookingAvailable = true
RETURN a.name, a.shopName, a.hourlyRate
ORDER BY a.rating DESC
LIMIT 10
```

## Troubleshooting

### Can't connect to Neo4j?
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Or restart Docker container
docker restart neo4j-tattester

# Or check Neo4j Desktop status
```

### Wrong password?
Edit `.env` file and ensure `NEO4J_PASSWORD` matches your Neo4j password.

### Import fails?
```bash
# Verify .env has correct credentials
cat .env | grep NEO4J

# Test connection manually
docker exec -it neo4j-tattester cypher-shell -u neo4j -p tattester123
```

## Next Steps

1. ✅ Import completed - explore data in Neo4j Browser
2. 📖 See `scripts/SAMPLE_QUERIES.cypher` for more queries
3. 📚 Read `scripts/README.md` for full documentation
4. 🚀 Check `NEO4J_INTEGRATION_SUMMARY.md` for Phase 1 roadmap

## Cost

- **Neo4j Desktop:** FREE (local only)
- **Neo4j Aura Free:** FREE (cloud, 200K nodes)
- **Docker:** FREE (runs locally)

Perfect for MVP development with $0 cost!

## Resources

- Neo4j Browser: http://localhost:7474
- Full Documentation: `scripts/README.md`
- Sample Queries: `scripts/SAMPLE_QUERIES.cypher`
- Integration Summary: `NEO4J_INTEGRATION_SUMMARY.md`
