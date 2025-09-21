/*
  # Vues matérialisées pour la recherche alimentaire

  1. Vues créées
    - `food_search_view` - Vue optimisée pour la recherche textuelle
    - `nutrient_summary_view` - Résumé nutritionnel par aliment
    - `taxonomy_hierarchy_view` - Hiérarchie taxonomique aplatie

  2. Index de recherche
    - Index GIN sur tsvector pour recherche full-text
    - Index sur GTIN pour recherche par code-barres
    - Index composites pour performance

  3. Fonctions
    - `refresh_food_search_views()` - Rafraîchissement des vues
*/

-- Extension pour la recherche full-text
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Fonction de normalisation du texte pour la recherche
CREATE OR REPLACE FUNCTION normalize_search_text(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(unaccent(trim(text_input)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vue matérialisée pour la recherche d'aliments
CREATE MATERIALIZED VIEW food_search_view AS
SELECT 
  fi.id,
  fi.source_id,
  fi.food_code_source,
  fi.food_code_local,
  fi.gtin,
  fi.name,
  fi.name_scientific,
  fi.description,
  fi.synonyms,
  fi.source_confidence,
  fi.is_active,
  s.name as source_name,
  b.name as brand_name,
  
  -- Recherche textuelle optimisée
  setweight(to_tsvector('french', coalesce(fi.name, '')), 'A') ||
  setweight(to_tsvector('french', coalesce(fi.name_scientific, '')), 'B') ||
  setweight(to_tsvector('french', coalesce(array_to_string(fi.synonyms, ' '), '')), 'C') ||
  setweight(to_tsvector('french', coalesce(fi.description, '')), 'D') as search_vector,
  
  -- Texte normalisé pour recherche par similarité
  normalize_search_text(fi.name) as name_normalized,
  array_to_string(
    array(
      select normalize_search_text(synonym) 
      from unnest(fi.synonyms) as synonym
    ), 
    ' '
  ) as synonyms_normalized,
  
  -- Métadonnées pour le tri et filtrage
  fi.created_at,
  fi.updated_at

FROM food_items fi
LEFT JOIN sources s ON fi.source_id = s.id
LEFT JOIN brands b ON fi.brand_id = b.id
WHERE fi.is_active = true;

-- Index sur la vue de recherche
CREATE UNIQUE INDEX idx_food_search_view_id ON food_search_view (id);
CREATE INDEX idx_food_search_view_vector ON food_search_view USING GIN (search_vector);
CREATE INDEX idx_food_search_view_gtin ON food_search_view (gtin) WHERE gtin IS NOT NULL;
CREATE INDEX idx_food_search_view_source ON food_search_view (source_name);
CREATE INDEX idx_food_search_view_confidence ON food_search_view (source_confidence DESC);
CREATE INDEX idx_food_search_view_name_trgm ON food_search_view USING GIN (name_normalized gin_trgm_ops);

-- Vue matérialisée pour le résumé nutritionnel
CREATE MATERIALIZED VIEW nutrient_summary_view AS
SELECT 
  fi.id as food_item_id,
  fi.name as food_name,
  fi.source_id,
  s.name as source_name,
  
  -- Macronutriments principaux
  MAX(CASE WHEN n.code = 'ENERC_KCAL' THEN fn.value END) as energy_kcal,
  MAX(CASE WHEN n.code = 'PROCNT' THEN fn.value END) as protein_g,
  MAX(CASE WHEN n.code = 'CHOCDF' THEN fn.value END) as carbs_g,
  MAX(CASE WHEN n.code = 'FAT' THEN fn.value END) as fat_g,
  MAX(CASE WHEN n.code = 'FIBTG' THEN fn.value END) as fiber_g,
  
  -- Métadonnées nutritionnelles
  COUNT(fn.id) as nutrient_count,
  AVG(fn.confidence) as avg_confidence,
  MIN(fn.confidence) as min_confidence,
  
  -- Dernière mise à jour
  MAX(fn.updated_at) as last_nutrient_update

FROM food_items fi
LEFT JOIN food_nutrients fn ON fi.id = fn.food_item_id
LEFT JOIN nutrients n ON fn.nutrient_id = n.id
LEFT JOIN sources s ON fi.source_id = s.id
WHERE fi.is_active = true
GROUP BY fi.id, fi.name, fi.source_id, s.name;

-- Index sur la vue nutritionnelle
CREATE UNIQUE INDEX idx_nutrient_summary_view_id ON nutrient_summary_view (food_item_id);
CREATE INDEX idx_nutrient_summary_view_energy ON nutrient_summary_view (energy_kcal) WHERE energy_kcal IS NOT NULL;
CREATE INDEX idx_nutrient_summary_view_protein ON nutrient_summary_view (protein_g) WHERE protein_g IS NOT NULL;
CREATE INDEX idx_nutrient_summary_view_confidence ON nutrient_summary_view (avg_confidence DESC);

-- Vue matérialisée pour la hiérarchie taxonomique
CREATE MATERIALIZED VIEW taxonomy_hierarchy_view AS
WITH RECURSIVE taxonomy_path AS (
  -- Nœuds racines
  SELECT 
    id,
    code,
    name,
    level,
    parent_id,
    ARRAY[name] as path_names,
    ARRAY[code] as path_codes,
    name as root_name,
    code as root_code
  FROM taxonomy_nodes 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Nœuds enfants
  SELECT 
    tn.id,
    tn.code,
    tn.name,
    tn.level,
    tn.parent_id,
    tp.path_names || tn.name,
    tp.path_codes || tn.code,
    tp.root_name,
    tp.root_code
  FROM taxonomy_nodes tn
  JOIN taxonomy_path tp ON tn.parent_id = tp.id
)
SELECT 
  id,
  code,
  name,
  level,
  parent_id,
  path_names,
  path_codes,
  array_to_string(path_names, ' > ') as full_path,
  array_to_string(path_codes, '.') as code_path,
  root_name,
  root_code,
  array_length(path_names, 1) as depth
FROM taxonomy_path;

-- Index sur la vue taxonomique
CREATE UNIQUE INDEX idx_taxonomy_hierarchy_view_id ON taxonomy_hierarchy_view (id);
CREATE INDEX idx_taxonomy_hierarchy_view_code ON taxonomy_hierarchy_view (code);
CREATE INDEX idx_taxonomy_hierarchy_view_level ON taxonomy_hierarchy_view (level);
CREATE INDEX idx_taxonomy_hierarchy_view_root ON taxonomy_hierarchy_view (root_code);

-- Fonction pour rafraîchir toutes les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_food_search_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY food_search_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY nutrient_summary_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY taxonomy_hierarchy_view;
  
  -- Log du rafraîchissement
  RAISE NOTICE 'Food search views refreshed at %', now();
END;
$$ LANGUAGE plpgsql;

-- Fonction de recherche optimisée
CREATE OR REPLACE FUNCTION search_foods(
  search_query TEXT,
  source_filter TEXT DEFAULT NULL,
  limit_results INTEGER DEFAULT 50,
  min_confidence FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  source_name TEXT,
  brand_name TEXT,
  gtin TEXT,
  confidence FLOAT,
  rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fsv.id,
    fsv.name,
    fsv.source_name,
    fsv.brand_name,
    fsv.gtin,
    fsv.source_confidence as confidence,
    -- Score de pertinence combiné
    (
      ts_rank_cd(fsv.search_vector, plainto_tsquery('french', search_query)) * 0.6 +
      similarity(fsv.name_normalized, normalize_search_text(search_query)) * 0.4
    ) as rank
  FROM food_search_view fsv
  WHERE 
    fsv.source_confidence >= min_confidence
    AND (source_filter IS NULL OR fsv.source_name = source_filter)
    AND (
      fsv.search_vector @@ plainto_tsquery('french', search_query)
      OR fsv.name_normalized % normalize_search_text(search_query)
      OR fsv.synonyms_normalized % normalize_search_text(search_query)
    )
  ORDER BY rank DESC, fsv.source_confidence DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour rafraîchir automatiquement les vues (optionnel)
CREATE OR REPLACE FUNCTION trigger_refresh_food_views()
RETURNS trigger AS $$
BEGIN
  -- Rafraîchissement asynchrone pour éviter les blocages
  PERFORM pg_notify('refresh_food_views', 'food_data_changed');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers sur les tables principales
CREATE TRIGGER food_items_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON food_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_food_views();

CREATE TRIGGER food_nutrients_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON food_nutrients
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_food_views();

-- Commentaires pour la documentation
COMMENT ON MATERIALIZED VIEW food_search_view IS 'Vue optimisée pour la recherche textuelle d''aliments avec support multi-langues';
COMMENT ON MATERIALIZED VIEW nutrient_summary_view IS 'Résumé des valeurs nutritionnelles principales par aliment';
COMMENT ON MATERIALIZED VIEW taxonomy_hierarchy_view IS 'Hiérarchie taxonomique FoodEx2 aplatie avec chemins complets';
COMMENT ON FUNCTION refresh_food_search_views() IS 'Rafraîchit toutes les vues matérialisées de recherche alimentaire';
COMMENT ON FUNCTION search_foods(TEXT, TEXT, INTEGER, FLOAT) IS 'Fonction de recherche optimisée avec scoring de pertinence';