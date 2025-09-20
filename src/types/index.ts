export interface Profile {
  id: string;
  user_id: string;
  nom: string;
  sexe: 'M' | 'F';
  age: number;
  taille: number;
  poids: number;
  pourcentage_mg?: number;
  lbm?: number;
  activite: number;
  objectif: 'perte' | 'maintien' | 'prise';
  repas_par_jour: number;
  allergies: string[];
  regimes: string[];
  pathologies: string[];
  aliments_aimes: string[];
  aliments_detestes: string[];
  created_at?: string;
  updated_at?: string;
  current_physical?: ProfilePhysical;
}

export interface ProfilePhysical {
  id: string;
  profile_id: string;
  poids: number;
  pourcentage_mg?: number;
  lbm?: number;
  activite: number;
  objectif: 'perte' | 'maintien' | 'prise';
  date_mesure: string;
  created_at?: string;
}

export interface Food {
  id: string;
  nom: string;
  categorie: 'proteine' | 'glucide' | 'legume' | 'graisse';
  sous_categorie?: string;
  kcal_100g: number;
  proteines_100g: number;
  glucides_100g: number;
  lipides_100g: number;
  fibres_100g: number;
  index_glycemique?: number;
  score_inflammatoire: number;
  regimes_compatibles: string[];
  allergenes: string[];
  prix_kg?: number;
  saison: string[];
  moment_repas: string[];
  preparation?: string;
  conservation?: string;
}

export interface FoodCategory {
  id: string;
  nom: string;
  categorie_principale: 'proteine' | 'glucide' | 'legume' | 'graisse';
  description?: string;
  couleur: string;
}

export interface MealPlan {
  id: string;
  profile_id: string;
  date_debut: string;
  kcal_target: number;
  proteines_target: number;
  glucides_target: number;
  lipides_target: number;
  statut: 'actif' | 'termine' | 'suspendu';
  meals?: Meal[];
}

export interface MealPlanHistory {
  id: string;
  profile_id: string;
  plan_id: string;
  nom_programme: string;
  date_creation: string;
  statut: 'actif' | 'archive' | 'favori';
  notes?: string;
  meal_plan?: MealPlan;
}

export interface Meal {
  id: string;
  plan_id: string;
  jour: number;
  type_repas: 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation';
  kcal_target: number;
  proteines_target: number;
  glucides_target: number;
  lipides_target: number;
  meal_items?: MealItem[];
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_id: string;
  grammes: number;
  kcal_calculees: number;
  proteines_calculees: number;
  glucides_calculees: number;
  lipides_calculees: number;
  food?: Food;
}

export interface MealTemplate {
  id: string;
  type_repas: 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation';
  nom: string;
  categories_requises: Record<string, number>;
  repartition_macros: Record<string, number>;
}

export interface ShoppingListItem {
  id: string;
  plan_id: string;
  food_id: string;
  grammes_total: number;
  categorie: string;
  food?: Food;
}

export interface NutritionalDeficiency {
  id: string;
  nom: string;
  nutriment_cible: string;
  seuil_carence: number;
  unite: string;
  description?: string;
}

export interface FoodSuggestion {
  id: string;
  deficiency_id: string;
  food_id: string;
  efficacite_score: number;
  food?: Food;
  deficiency?: NutritionalDeficiency;
}

export interface NutritionTargets {
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
}

export interface MealDistribution {
  petit_dejeuner: number;
  dejeuner: number;
  diner: number;
  collation: number;
}