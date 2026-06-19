-- ============================================================================
-- IAOrientation V2 — Recherche sémantique : RPC + index pgvector
-- À lancer dans le SQL Editor Supabase.
-- ============================================================================

-- 1) RPC de similarité cosinus, RESTREINTE aux filières déjà éligibles (Couche 1).
--    L'Edge Function `embed-match` appelle cette fonction avec :
--      - query_embedding : le vecteur de l'aspiration utilisateur
--      - eligible        : les filiere_id retenus par le filtrage déterministe
--      - k               : nombre de résultats (def. 10)
--    La similarité = 1 - distance cosinus (1 = identique, 0 = orthogonal).
--    -> Peut être créée AVANT ou APRÈS la génération des embeddings.
create or replace function match_filieres(
  query_embedding vector(768),
  eligible uuid[],
  k int default 10
)
returns table (filiere_id uuid, similarite double precision)
language sql
stable
as $$
  select fe.filiere_id,
         1 - (fe.embedding <=> query_embedding) as similarite
  from filieres_embeddings fe
  where fe.filiere_id = any (eligible)
  order by fe.embedding <=> query_embedding
  limit k;
$$;

-- 2) Index ivfflat — à lancer SEULEMENT APRÈS l'insertion des ~207 embeddings
--    (ivfflat se calibre mal sur peu de lignes). lists=20 proportionné à ~207 filières.
create index if not exists filieres_embeddings_embedding_idx
  on filieres_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

-- Après création de l'index, recalage des statistiques du planner :
analyze filieres_embeddings;
