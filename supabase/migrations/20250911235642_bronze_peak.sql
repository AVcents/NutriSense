/*
  # NutriSense AI - Schema complet

  1. Nouvelles Tables
    - `profiles` - Profils utilisateur avec données anthropométriques et préférences
    - `foods` - Base d'aliments avec valeurs nutritionnelles complètes
    - `meal_plans` - Plans de repas avec objectifs caloriques
    - `meals` - Repas individuels dans les plans
    - `meal_items` - Items d'aliments dans chaque repas
    - `shopping_lists` - Listes de courses agrégées par plan

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour accès utilisateur authentifié seulement

  3. Fonctionnalités
    - Calcul automatique TMB/TDEE
    - Scoring nutritionnel des aliments
    - Contraintes de cohérence des données
*/

-- Table des profils utilisateur
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  sexe text CHECK (sexe IN ('M', 'F')) NOT NULL,
  age integer NOT NULL CHECK (age >= 10 AND age <= 120),
  taille integer NOT NULL CHECK (taille >= 100 AND taille <= 250), -- en cm
  poids numeric NOT NULL CHECK (poids >= 30 AND poids <= 300), -- en kg
  pourcentage_mg numeric CHECK (pourcentage_mg >= 5 AND pourcentage_mg <= 50), -- %
  lbm numeric GENERATED ALWAYS AS (poids * (1 - COALESCE(pourcentage_mg, 15) / 100)) STORED, -- Lean Body Mass calculée
  activite numeric NOT NULL CHECK (activite >= 1.2 AND activite <= 2.2), -- Facteur d'activité
  objectif text CHECK (objectif IN ('perte', 'maintien', 'prise')) DEFAULT 'maintien',
  repas_par_jour integer DEFAULT 4 CHECK (repas_par_jour >= 3 AND repas_par_jour <= 6),
  allergies text[] DEFAULT '{}',
  regimes text[] DEFAULT '{}', -- végétarien, végétalien, cétogène, etc.
  pathologies text[] DEFAULT '{}',
  aliments_aimes text[] DEFAULT '{}',
  aliments_detestes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des aliments
CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  categorie text CHECK (categorie IN ('proteine', 'glucide', 'legume', 'graisse')) NOT NULL,
  kcal_100g numeric NOT NULL CHECK (kcal_100g >= 0),
  proteines_100g numeric NOT NULL CHECK (proteines_100g >= 0),
  glucides_100g numeric NOT NULL CHECK (glucides_100g >= 0),
  lipides_100g numeric NOT NULL CHECK (lipides_100g >= 0),
  fibres_100g numeric DEFAULT 0 CHECK (fibres_100g >= 0),
  index_glycemique integer CHECK (index_glycemique >= 0 AND index_glycemique <= 100),
  score_inflammatoire integer DEFAULT 0 CHECK (score_inflammatoire >= -10 AND score_inflammatoire <= 10),
  regimes_compatibles text[] DEFAULT '{}',
  allergenes text[] DEFAULT '{}',
  prix_kg numeric CHECK (prix_kg >= 0), -- en euros
  saison text[] DEFAULT '{}', -- printemps, été, automne, hiver
  created_at timestamptz DEFAULT now()
);

-- Table des plans de repas
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  kcal_target numeric NOT NULL CHECK (kcal_target > 0),
  proteines_target numeric NOT NULL CHECK (proteines_target > 0),
  glucides_target numeric NOT NULL CHECK (glucides_target > 0),
  lipides_target numeric NOT NULL CHECK (lipides_target > 0),
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'termine', 'suspendu')),
  created_at timestamptz DEFAULT now()
);

-- Table des repas
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  jour integer NOT NULL CHECK (jour >= 1 AND jour <= 7),
  type_repas text CHECK (type_repas IN ('petit_dejeuner', 'dejeuner', 'diner', 'collation')) NOT NULL,
  kcal_target numeric NOT NULL CHECK (kcal_target > 0),
  proteines_target numeric NOT NULL CHECK (proteines_target > 0),
  glucides_target numeric NOT NULL CHECK (glucides_target > 0),
  lipides_target numeric NOT NULL CHECK (lipides_target > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, jour, type_repas)
);

-- Table des items de repas
CREATE TABLE IF NOT EXISTS meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE RESTRICT NOT NULL,
  grammes numeric NOT NULL CHECK (grammes > 0),
  kcal_calculees numeric NOT NULL CHECK (kcal_calculees >= 0),
  proteines_calculees numeric NOT NULL CHECK (proteines_calculees >= 0),
  glucides_calculees numeric NOT NULL CHECK (glucides_calculees >= 0),
  lipides_calculees numeric NOT NULL CHECK (lipides_calculees >= 0),
  created_at timestamptz DEFAULT now()
);

-- Table des listes de courses
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  food_id uuid REFERENCES foods(id) ON DELETE RESTRICT NOT NULL,
  grammes_total numeric NOT NULL CHECK (grammes_total > 0),
  categorie text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, food_id)
);

-- Activation RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies pour foods (lecture pour tous les utilisateurs authentifiés)
CREATE POLICY "Authenticated users can read foods"
  ON foods FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour meal_plans
CREATE POLICY "Users can manage own meal plans"
  ON meal_plans FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Policies pour meals
CREATE POLICY "Users can manage own meals"
  ON meals FOR ALL
  TO authenticated
  USING (plan_id IN (
    SELECT mp.id FROM meal_plans mp 
    JOIN profiles p ON mp.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

-- Policies pour meal_items
CREATE POLICY "Users can manage own meal items"
  ON meal_items FOR ALL
  TO authenticated
  USING (meal_id IN (
    SELECT m.id FROM meals m
    JOIN meal_plans mp ON m.plan_id = mp.id
    JOIN profiles p ON mp.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Policies pour shopping_lists
CREATE POLICY "Users can manage own shopping lists"
  ON shopping_lists FOR ALL
  TO authenticated
  USING (plan_id IN (
    SELECT mp.id FROM meal_plans mp 
    JOIN profiles p ON mp.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS foods_categorie_idx ON foods(categorie);
CREATE INDEX IF NOT EXISTS meal_plans_profile_id_idx ON meal_plans(profile_id);
CREATE INDEX IF NOT EXISTS meals_plan_id_idx ON meals(plan_id);
CREATE INDEX IF NOT EXISTS meal_items_meal_id_idx ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS shopping_lists_plan_id_idx ON shopping_lists(plan_id);