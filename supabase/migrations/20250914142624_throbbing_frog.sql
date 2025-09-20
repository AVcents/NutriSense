/*
  # Amélioration du système alimentaire NutriSense

  1. Nouvelles Tables
    - `food_categories` - Catégories d'aliments plus précises
    - `profile_physical_history` - Historique des données physiques
    - `meal_plan_history` - Historique des programmes générés
    - `meal_templates` - Templates de repas par type
    - `nutritional_deficiencies` - Carences nutritionnelles
    - `food_suggestions` - Suggestions d'aliments par carence

  2. Modifications
    - Ajout de sous-catégories aux aliments
    - Amélioration de la logique de génération
    - Séparation profil fixe/variable

  3. Sécurité
    - RLS activé sur toutes les nouvelles tables
    - Politiques d'accès appropriées
*/

-- Créer les nouvelles catégories d'aliments
CREATE TABLE IF NOT EXISTS food_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  categorie_principale text NOT NULL CHECK (categorie_principale = ANY (ARRAY['proteine'::text, 'glucide'::text, 'legume'::text, 'graisse'::text])),
  description text,
  couleur text DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);

-- Modifier la table foods pour ajouter les sous-catégories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'foods' AND column_name = 'sous_categorie'
  ) THEN
    ALTER TABLE foods ADD COLUMN sous_categorie text;
    ALTER TABLE foods ADD COLUMN moment_repas text[] DEFAULT '{}';
    ALTER TABLE foods ADD COLUMN preparation text;
    ALTER TABLE foods ADD COLUMN conservation text;
  END IF;
END $$;

-- Historique des données physiques du profil
CREATE TABLE IF NOT EXISTS profile_physical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poids numeric NOT NULL CHECK (poids >= 30 AND poids <= 300),
  pourcentage_mg numeric CHECK (pourcentage_mg >= 5 AND pourcentage_mg <= 50),
  lbm numeric GENERATED ALWAYS AS (poids * (1 - COALESCE(pourcentage_mg, 15) / 100)) STORED,
  activite numeric NOT NULL CHECK (activite >= 1.2 AND activite <= 2.2),
  objectif text CHECK (objectif = ANY (ARRAY['perte'::text, 'maintien'::text, 'prise'::text])),
  date_mesure date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Historique des programmes générés
CREATE TABLE IF NOT EXISTS meal_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  nom_programme text NOT NULL,
  date_creation timestamptz DEFAULT now(),
  statut text DEFAULT 'archive' CHECK (statut = ANY (ARRAY['actif'::text, 'archive'::text, 'favori'::text])),
  notes text
);

-- Templates de repas par type
CREATE TABLE IF NOT EXISTS meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_repas text NOT NULL CHECK (type_repas = ANY (ARRAY['petit_dejeuner'::text, 'dejeuner'::text, 'diner'::text, 'collation'::text])),
  nom text NOT NULL,
  categories_requises jsonb NOT NULL, -- {"proteine": 1, "glucide": 1, "legume": 2}
  repartition_macros jsonb NOT NULL, -- {"proteines": 0.3, "glucides": 0.5, "lipides": 0.2}
  created_at timestamptz DEFAULT now()
);

-- Carences nutritionnelles
CREATE TABLE IF NOT EXISTS nutritional_deficiencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  nutriment_cible text NOT NULL,
  seuil_carence numeric NOT NULL,
  unite text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Suggestions d'aliments par carence
CREATE TABLE IF NOT EXISTS food_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_id uuid NOT NULL REFERENCES nutritional_deficiencies(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  efficacite_score integer DEFAULT 5 CHECK (efficacite_score >= 1 AND efficacite_score <= 10),
  created_at timestamptz DEFAULT now(),
  UNIQUE(deficiency_id, food_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS profile_physical_history_profile_id_idx ON profile_physical_history(profile_id);
CREATE INDEX IF NOT EXISTS profile_physical_history_date_idx ON profile_physical_history(date_mesure DESC);
CREATE INDEX IF NOT EXISTS meal_plan_history_profile_id_idx ON meal_plan_history(profile_id);
CREATE INDEX IF NOT EXISTS food_categories_principale_idx ON food_categories(categorie_principale);
CREATE INDEX IF NOT EXISTS foods_sous_categorie_idx ON foods(sous_categorie);

-- RLS
ALTER TABLE food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_physical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutritional_deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_suggestions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Public can read food categories"
  ON food_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own physical history"
  ON profile_physical_history FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own physical history"
  ON profile_physical_history FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can read own meal plan history"
  ON meal_plan_history FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own meal plan history"
  ON meal_plan_history FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can read meal templates"
  ON meal_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read nutritional deficiencies"
  ON nutritional_deficiencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read food suggestions"
  ON food_suggestions FOR SELECT
  TO authenticated
  USING (true);