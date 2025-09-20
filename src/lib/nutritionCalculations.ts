import { Profile, ProfilePhysical, NutritionTargets, MealDistribution } from '../types';

// Calcul du métabolisme de base selon Henry/Oxford
export function calculateBMR(profile: Profile, physical: ProfilePhysical): number {
  const { sexe, age, taille } = profile;
  const { poids } = physical;
  
  if (sexe === 'M') {
    if (age >= 18 && age <= 30) {
      return 15.3 * poids + 679;
    } else if (age >= 31 && age <= 60) {
      return 11.6 * poids + 879;
    } else {
      return 13.5 * poids + 487;
    }
  } else { // Femme
    if (age >= 18 && age <= 30) {
      return 14.7 * poids + 496;
    } else if (age >= 31 && age <= 60) {
      return 8.7 * poids + 829;
    } else {
      return 10.5 * poids + 596;
    }
  }
}

// Calcul de la dépense énergétique totale quotidienne
export function calculateTDEE(profile: Profile, physical: ProfilePhysical): number {
  const bmr = calculateBMR(profile, physical);
  return bmr * physical.activite;
}

// Calcul des objectifs caloriques
export function calculateCalorieTarget(profile: Profile, physical: ProfilePhysical): number {
  const tdee = calculateTDEE(profile, physical);
  
  switch (physical.objectif) {
    case 'perte':
      return tdee * 0.85;
    case 'prise':
      return tdee * 1.1;
    default:
      return tdee;
  }
}

// Calcul des macronutriments
export function calculateMacroTargets(profile: Profile, physical: ProfilePhysical): NutritionTargets {
  const calories = calculateCalorieTarget(profile, physical);
  const lbm = physical.lbm || physical.poids * 0.85; // Si pas de %MG, estimation à 15%
  
  // Protéines: 1.8-2g/kg LBM
  const proteines = lbm * 1.9;
  
  // Lipides: 0.9-1g/kg poids corporel
  const lipides = physical.poids * 0.95;
  
  // Glucides: le reste des calories
  const caloriesProteines = proteines * 4;
  const caloriesLipides = lipides * 9;
  const caloriesGlucides = calories - caloriesProteines - caloriesLipides;
  const glucides = Math.max(0, caloriesGlucides / 4);
  
  return {
    calories: Math.round(calories),
    proteines: Math.round(proteines),
    glucides: Math.round(glucides),
    lipides: Math.round(lipides)
  };
}

// Répartition des repas (30/35/25/10%)
export function getMealDistribution(): MealDistribution {
  return {
    petit_dejeuner: 0.30,
    dejeuner: 0.35,
    diner: 0.25,
    collation: 0.10
  };
}

// Calcul du score nutritionnel d'un aliment amélioré
export function calculateFoodScore(food: any): number {
  const proteinDensity = food.proteines_100g / food.kcal_100g;
  const fiberDensity = food.fibres_100g / 100;
  const glycemicIndex = food.index_glycemique || 50;
  const inflammatoryScore = food.score_inflammatoire || 0;
  const price = food.prix_kg || 10;
  
  return (
    0.45 * proteinDensity * 100 +
    0.25 * fiberDensity * 100 -
    0.15 * (glycemicIndex / 100) * 100 -
    0.10 * inflammatoryScore * 10 -
    0.05 * (price / 20) * 100
  );
}

// Vérification de la compatibilité d'un aliment avec un moment de repas
export function isFoodCompatibleWithMeal(food: any, mealType: string): boolean {
  if (!food.moment_repas || food.moment_repas.length === 0) {
    return true; // Si pas de restriction, compatible avec tous les repas
  }
  return food.moment_repas.includes(mealType);
}

// Vérification des contraintes alimentaires
export function isCompatibleFood(food: any, profile: Profile): boolean {
  // Vérifier les allergies
  if (food.allergenes && food.allergenes.some((allergen: string) => 
    profile.allergies.includes(allergen)
  )) {
    return false;
  }
  
  // Vérifier la compatibilité avec les régimes
  if (profile.regimes.length > 0) {
    return profile.regimes.some((regime: string) => 
      food.regimes_compatibles.includes(regime)
    );
  }
  
  // Vérifier les aliments détestés
  if (profile.aliments_detestes.includes(food.nom)) {
    return false;
  }
  
  return true;
}

// Sélection intelligente d'aliments par catégorie pour un repas
export function selectFoodsByCategory(
  foods: any[], 
  profile: Profile, 
  mealType: string, 
  requiredCategories: Record<string, number>
): any[] {
  const selectedFoods: any[] = [];
  
  console.log(`🔍 Sélection aliments pour ${mealType}`);
  console.log('Catégories requises:', requiredCategories);
  console.log('Total aliments disponibles:', foods.length);
  
  for (const [category, count] of Object.entries(requiredCategories)) {
    console.log(`🎯 Recherche catégorie: ${category} (${count} aliments)`);
    
    const compatibleFoods = foods.filter(food => 
      food.sous_categorie === category &&
      isCompatibleFood(food, profile) &&
      isFoodCompatibleWithMeal(food, mealType)
    );
    
    console.log(`✅ Aliments compatibles trouvés pour ${category}:`, compatibleFoods.length);
    
    if (compatibleFoods.length === 0) continue;
    
    // Trier par score nutritionnel
    const scoredFoods = compatibleFoods
      .map(food => ({ ...food, score: calculateFoodScore(food) }))
      .sort((a, b) => b.score - a.score);
    
    // Sélectionner les meilleurs aliments avec un peu de randomisation
    for (let i = 0; i < count && i < scoredFoods.length; i++) {
      const randomIndex = Math.floor(Math.random() * Math.min(3, scoredFoods.length - i));
      selectedFoods.push(scoredFoods[i + randomIndex]);
    }
  }
  
  console.log(`📋 Total aliments sélectionnés:`, selectedFoods.length);
  
  return selectedFoods;
}

// Calcul des macros pour une quantité donnée
export function calculateMacrosForQuantity(food: any, grammes: number) {
  const factor = grammes / 100;
  
  return {
    kcal_calculees: food.kcal_100g * factor,
    proteines_calculees: food.proteines_100g * factor,
    glucides_calculees: food.glucides_100g * factor,
    lipides_calculees: food.lipides_100g * factor,
    fibres_calculees: (food.fibres_100g || 0) * factor
  };
}

// Calcul intelligent des quantités pour respecter les macros
export function calculateOptimalQuantities(
  selectedFoods: any[],
  targets: { kcal_target: number; proteines_target: number; glucides_target: number; lipides_target: number }
): Array<{ food: any; quantity: number }> {
  const result: Array<{ food: any; quantity: number }> = [];
  
  let remainingCalories = targets.kcal_target;
  let remainingProteins = targets.proteines_target;
  let remainingCarbs = targets.glucides_target;
  let remainingFats = targets.lipides_target;
  
  // Prioriser les protéines
  const proteinFoods = selectedFoods.filter(f => f.categorie === 'proteine');
  for (const food of proteinFoods) {
    const targetProtein = Math.min(remainingProteins * 0.8, food.proteines_100g * 3); // Max 300g
    const quantity = Math.min(300, (targetProtein / food.proteines_100g) * 100);
    
    if (quantity >= 10) { // Minimum 10g
      const macros = calculateMacrosForQuantity(food, quantity);
      result.push({ food, quantity: Math.round(quantity) });
      
      remainingCalories -= macros.kcal_calculees;
      remainingProteins -= macros.proteines_calculees;
      remainingCarbs -= macros.glucides_calculees;
      remainingFats -= macros.lipides_calculees;
    }
  }
  
  // Ajouter les glucides
  const carbFoods = selectedFoods.filter(f => f.categorie === 'glucide');
  for (const food of carbFoods) {
    const targetCarbs = Math.min(remainingCarbs * 0.7, food.glucides_100g * 2);
    const quantity = Math.min(200, (targetCarbs / food.glucides_100g) * 100);
    
    if (quantity >= 10) {
      const macros = calculateMacrosForQuantity(food, quantity);
      result.push({ food, quantity: Math.round(quantity) });
      
      remainingCalories -= macros.kcal_calculees;
      remainingCarbs -= macros.glucides_calculees;
      remainingFats -= macros.lipides_calculees;
    }
  }
  
  // Ajouter les légumes (quantité fixe)
  const vegetableFoods = selectedFoods.filter(f => f.categorie === 'legume');
  for (const food of vegetableFoods) {
    const quantity = Math.random() * 100 + 50; // 50-150g
    const macros = calculateMacrosForQuantity(food, quantity);
    result.push({ food, quantity: Math.round(quantity) });
    
    remainingCalories -= macros.kcal_calculees;
    remainingCarbs -= macros.glucides_calculees;
  }
  
  // Ajouter les graisses pour compléter
  const fatFoods = selectedFoods.filter(f => f.categorie === 'graisse');
  for (const food of fatFoods) {
    const targetFats = Math.min(remainingFats * 0.5, food.lipides_100g * 0.3);
    const quantity = Math.min(30, (targetFats / food.lipides_100g) * 100);
    
    if (quantity >= 5) {
      result.push({ food, quantity: Math.round(quantity) });
    }
  }
  
  return result;
}