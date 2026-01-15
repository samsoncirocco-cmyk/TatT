-- =============================================
-- TatTester Supabase - Common SQL Queries
-- =============================================
-- Quick reference for common operations
-- Copy & paste into Supabase SQL Editor
-- =============================================

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check all tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'designs', 'design_layers', 'portfolio_embeddings')
ORDER BY table_name;

-- Check vector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check RLS is enabled on all tables
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'designs', 'design_layers', 'portfolio_embeddings')
ORDER BY tablename;

-- Check all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check all functions
SELECT
    routines.routine_name,
    parameters.data_type,
    parameters.parameter_mode,
    parameters.parameter_name
FROM information_schema.routines
LEFT JOIN information_schema.parameters
    ON routines.specific_name = parameters.specific_name
WHERE routines.specific_schema = 'public'
AND routines.routine_name = 'match_artists'
ORDER BY routines.routine_name, parameters.ordinal_position;

-- =============================================
-- DATA INSPECTION QUERIES
-- =============================================

-- Count rows in all tables
SELECT
    'users' AS table_name,
    COUNT(*) AS row_count
FROM public.users
UNION ALL
SELECT
    'designs' AS table_name,
    COUNT(*) AS row_count
FROM public.designs
UNION ALL
SELECT
    'design_layers' AS table_name,
    COUNT(*) AS row_count
FROM public.design_layers
UNION ALL
SELECT
    'portfolio_embeddings' AS table_name,
    COUNT(*) AS row_count
FROM public.portfolio_embeddings
ORDER BY table_name;

-- View all designs with layer counts
SELECT * FROM design_summary
ORDER BY created_at DESC
LIMIT 10;

-- View recent designs
SELECT
    id,
    user_id,
    prompt,
    style,
    body_part,
    version_number,
    is_favorite,
    created_at
FROM public.designs
ORDER BY created_at DESC
LIMIT 10;

-- View designs by style
SELECT
    style,
    COUNT(*) AS design_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM public.designs
GROUP BY style
ORDER BY design_count DESC;

-- View designs by body part
SELECT
    body_part,
    COUNT(*) AS design_count,
    AVG(version_number) AS avg_versions
FROM public.designs
GROUP BY body_part
ORDER BY design_count DESC;

-- View layer statistics
SELECT
    layer_type,
    COUNT(*) AS layer_count,
    AVG(opacity) AS avg_opacity,
    COUNT(CASE WHEN visible THEN 1 END) AS visible_count,
    COUNT(CASE WHEN locked THEN 1 END) AS locked_count
FROM public.design_layers
GROUP BY layer_type
ORDER BY layer_count DESC;

-- View portfolio embeddings summary
SELECT
    style,
    COUNT(*) AS embedding_count,
    COUNT(DISTINCT artist_id) AS unique_artists
FROM public.portfolio_embeddings
GROUP BY style
ORDER BY embedding_count DESC;

-- =============================================
-- TEST DATA INSERTION
-- =============================================

-- Insert a test user
INSERT INTO public.users (id, email, full_name, preferences)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@tattester.com',
    'Test User',
    '{"favorite_styles": ["Japanese", "Traditional"], "location": "Portland"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert a test design
INSERT INTO public.designs (
    user_id,
    prompt,
    enhanced_prompt,
    style,
    body_part,
    subject,
    model,
    parameters,
    image_url,
    session_id,
    version_number
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Japanese koi fish swimming upstream',
    'Stunning Japanese-style koi fish tattoo, vibrant orange and white scales, dynamic swimming pose, traditional wave patterns, cherry blossom accents, high detail',
    'Japanese',
    'forearm',
    'koi fish',
    'sdxl',
    '{"guidance_scale": 7.5, "num_inference_steps": 50}'::jsonb,
    'https://example.com/koi-design.png',
    'session-test-001',
    1
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Insert test layers for the design above
-- (Replace <design_id> with actual UUID from previous query)
INSERT INTO public.design_layers (
    design_id,
    user_id,
    layer_name,
    layer_type,
    layer_order,
    image_url,
    blend_mode,
    opacity
)
VALUES
    (
        '<design_id>',
        '00000000-0000-0000-0000-000000000001',
        'Background Gradient',
        'background',
        0,
        'https://example.com/background.png',
        'normal',
        1.0
    ),
    (
        '<design_id>',
        '00000000-0000-0000-0000-000000000001',
        'Koi Fish Subject',
        'subject',
        1,
        'https://example.com/koi.png',
        'normal',
        1.0
    ),
    (
        '<design_id>',
        '00000000-0000-0000-0000-000000000001',
        'Water Effect',
        'effect',
        2,
        'https://example.com/water.png',
        'multiply',
        0.6
    )
ON CONFLICT DO NOTHING;

-- Insert a test portfolio embedding
-- (Using dummy zero vector for testing - replace with actual embeddings in production)
INSERT INTO public.portfolio_embeddings (
    artist_id,
    artist_name,
    portfolio_item_id,
    image_url,
    style,
    tags,
    description,
    embedding,
    metadata
)
VALUES (
    'artist-test-001',
    'Test Artist',
    'portfolio-item-001',
    'https://example.com/portfolio/koi.png',
    'Japanese',
    ARRAY['koi', 'fish', 'water', 'traditional'],
    'Beautiful Japanese koi fish tattoo on forearm',
    array_fill(0::real, ARRAY[4096])::vector(4096),
    '{"location": "Portland", "experience_years": 10, "specialties": ["Japanese", "Traditional"]}'::jsonb
)
ON CONFLICT (artist_id, portfolio_item_id) DO NOTHING;

-- =============================================
-- VECTOR SEARCH QUERIES
-- =============================================

-- Test vector search (using dummy zero vector)
SELECT
    artist_id,
    artist_name,
    portfolio_item_id,
    style,
    tags,
    similarity,
    metadata
FROM match_artists(
    query_embedding := array_fill(0::real, ARRAY[4096])::vector(4096),
    match_threshold := 0.0,
    match_count := 5
);

-- Test vector search with style filter
SELECT
    artist_id,
    artist_name,
    style,
    similarity
FROM match_artists(
    query_embedding := array_fill(0::real, ARRAY[4096])::vector(4096),
    match_threshold := 0.0,
    match_count := 10,
    filter_style := 'Japanese'
);

-- Test vector search with tag filter
SELECT
    artist_id,
    artist_name,
    tags,
    similarity
FROM match_artists(
    query_embedding := array_fill(0::real, ARRAY[4096])::vector(4096),
    match_threshold := 0.0,
    match_count := 10,
    filter_tags := ARRAY['koi', 'fish']
);

-- Direct vector similarity query (without function)
SELECT
    artist_id,
    artist_name,
    style,
    1 - (embedding <=> array_fill(0::real, ARRAY[4096])::vector(4096)) AS similarity
FROM public.portfolio_embeddings
ORDER BY embedding <=> array_fill(0::real, ARRAY[4096])::vector(4096)
LIMIT 10;

-- =============================================
-- CLEANUP QUERIES
-- =============================================

-- Delete test data (user + cascade deletes designs and layers)
DELETE FROM public.users
WHERE email = 'test@tattester.com';

-- Delete test portfolio embeddings
DELETE FROM public.portfolio_embeddings
WHERE artist_id = 'artist-test-001';

-- Delete all designs for a specific user
-- (Use with caution!)
-- DELETE FROM public.designs
-- WHERE user_id = '<user_id>';

-- Delete all layers for a specific design
-- (Use with caution!)
-- DELETE FROM public.design_layers
-- WHERE design_id = '<design_id>';

-- =============================================
-- PERFORMANCE QUERIES
-- =============================================

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries (requires pg_stat_statements extension)
-- SELECT
--     query,
--     calls,
--     total_time,
--     mean_time,
--     max_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%portfolio_embeddings%'
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- =============================================
-- MAINTENANCE QUERIES
-- =============================================

-- Analyze tables (update statistics for query planner)
ANALYZE public.users;
ANALYZE public.designs;
ANALYZE public.design_layers;
ANALYZE public.portfolio_embeddings;

-- Vacuum tables (reclaim storage)
VACUUM ANALYZE public.users;
VACUUM ANALYZE public.designs;
VACUUM ANALYZE public.design_layers;
VACUUM ANALYZE public.portfolio_embeddings;

-- Reindex vector index if performance degrades
-- REINDEX INDEX idx_portfolio_embeddings_vector;

-- =============================================
-- USEFUL AGGREGATIONS
-- =============================================

-- User activity summary
SELECT
    u.id,
    u.email,
    u.full_name,
    COUNT(DISTINCT d.id) AS total_designs,
    COUNT(DISTINCT d.session_id) AS total_sessions,
    COUNT(DISTINCT dl.id) AS total_layers,
    COUNT(CASE WHEN d.is_favorite THEN 1 END) AS favorite_designs,
    MAX(d.created_at) AS last_design_created
FROM public.users u
LEFT JOIN public.designs d ON u.id = d.user_id
LEFT JOIN public.design_layers dl ON d.id = dl.design_id
GROUP BY u.id, u.email, u.full_name
ORDER BY total_designs DESC;

-- Popular styles over time
SELECT
    DATE_TRUNC('day', created_at) AS date,
    style,
    COUNT(*) AS design_count
FROM public.designs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), style
ORDER BY date DESC, design_count DESC;

-- Layer complexity analysis
SELECT
    d.id AS design_id,
    d.prompt,
    COUNT(dl.id) AS layer_count,
    AVG(dl.opacity) AS avg_opacity,
    STRING_AGG(DISTINCT dl.layer_type, ', ') AS layer_types,
    STRING_AGG(DISTINCT dl.blend_mode, ', ') AS blend_modes
FROM public.designs d
JOIN public.design_layers dl ON d.id = dl.design_id
GROUP BY d.id, d.prompt
ORDER BY layer_count DESC
LIMIT 10;

-- =============================================
-- END OF QUERIES
-- =============================================
