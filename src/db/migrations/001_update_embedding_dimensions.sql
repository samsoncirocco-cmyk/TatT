-- Migration: Update portfolio_embeddings to 1408 dimensions (Vertex AI Multimodal)
-- Warning: This will drop existing data!

-- 1. Enable pgvector extension if not exists
create extension if not exists vector;

-- 2. Drop existing table if dimensions mismatch
drop table if exists portfolio_embeddings;

-- 3. Recreate table with 1408 dimensions
create table portfolio_embeddings (
  id uuid primary key default uuid_generate_v4(),
  artist_id text not null,
  embedding vector(1408), -- Vertex AI Multimodal Embedding
  source_images jsonb default '[]'::jsonb,
  model_version text default 'multimodalembedding@001',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create index for cosine similarity
create index on portfolio_embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 5. Create RPC function for similarity search
create or replace function match_portfolio_embeddings (
  query_embedding vector(1408),
  match_count int
)
returns table (
  artist_id text,
  similarity float,
  source_images jsonb,
  model_version text,
  created_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  select
    portfolio_embeddings.artist_id,
    1 - (portfolio_embeddings.embedding <=> query_embedding) as similarity,
    portfolio_embeddings.source_images,
    portfolio_embeddings.model_version,
    portfolio_embeddings.created_at
  from portfolio_embeddings
  order by portfolio_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
