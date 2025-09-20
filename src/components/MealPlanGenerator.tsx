import React, { useState, useEffect } from 'react';
import { ChefHat, RefreshCw, Calendar, Target } from 'lucide-react';
import { Profile, Food, MealPlan, Meal, MealItem, NutritionTargets, MealTemplate } from '../types';
import { supabase } from '../lib/supabase';
import { 
  calculateMacroTargets, 
  getMealDistribution, 
  selectFoodsByCategory,
  calculateOptimalQuantities
} from '../lib/nutritionCalculations';
import MacroChart from './MacroChart';

interface MealPlanGeneratorProps {
  profile: Profile;
  onPlanGenerated: (plan: MealPlan) => void;
}

const MEAL_TYPES = [
  { key: 'petit_dejeuner', label: 'Petit-déjeuner', icon: '🌅' },
  { key: 'dejeuner', label: 'Déjeuner', icon: '☀️' },
  { key: 'diner', label: 'Dîner', icon: '🌙' },
  { key: 'collation', label: 'Collation', icon: '🍎' }
] as const;

export default function MealPlanGenerator({ profile, onPlanGenerated }: MealPlanGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile.current_physical) {
    return <div>Données physiques manquantes</div>;
  }

  const targets = calculateMacroTargets(profile, profile.current_physical);
  const mealDistribution = getMealDistribution();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [foodsResult, templatesResult] = await Promise.all([
        supabase.from('foods').select('*').order('nom'),
        supabase.from('meal_templates').select('*')
      ]);
      
      if (foodsResult.error) throw foodsResult.error;
      if (templatesResult.error) throw templatesResult.error;
      
      setFoods(foodsResult.data || []);
      setMealTemplates(templatesResult.data || []);
    } catch (err) {
      setError('Erreur lors du chargement des données');
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    setError(null);
    
    console.log('🚀 Début de la génération du plan');
    console.log('Profile:', profile);
    console.log('Foods disponibles:', foods.length);
    console.log('Templates disponibles:', mealTemplates.length);

    try {
      // Générer un nom de programme
      const programName = `Programme ${profile.current_physical?.objectif} - ${new Date().toLocaleDateString('fr-FR')}`;

      // 1. Créer le plan de repas
      const planData = {
        profile_id: profile.id,
        date_debut: new Date().toISOString().split('T')[0],
        kcal_target: targets.calories,
        proteines_target: targets.proteines,
        glucides_target: targets.glucides,
        lipides_target: targets.lipides,
        statut: 'actif'
      };

      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .insert(planData)
        .select()
        .single();

      if (planError) throw planError;
      
      console.log('✅ Plan créé:', plan);

      // Désactiver les anciens plans actifs pour ce profil
      await supabase
        .from('meal_plans')
        .update({ statut: 'termine' })
        .eq('profile_id', profile.id)
        .eq('statut', 'actif')
        .neq('id', plan.id);
      
      console.log('✅ Anciens plans désactivés');

      // 2. Générer les repas pour chaque jour
      const meals: Meal[] = [];
      const mealItems: MealItem[] = [];

      for (let day = 1; day <= 7; day++) {
        const dayMeals = await generateDayMeals(plan.id, day, targets, mealDistribution);
        meals.push(...dayMeals.meals);
        mealItems.push(...dayMeals.items);
        console.log(`✅ Jour ${day} généré: ${dayMeals.meals.length} repas, ${dayMeals.items.length} items`);
      }
      
      console.log('📊 Total généré:', meals.length, 'repas,', mealItems.length, 'items');

      // 3. Insérer tous les repas et items
      console.log('💾 Insertion des repas...');
      const { error: mealsError } = await supabase
        .from('meals')
        .insert(meals);

      if (mealsError) throw mealsError;
      console.log('✅ Repas insérés');

      console.log('💾 Insertion des items...');
      const { error: itemsError } = await supabase
        .from('meal_items')
        .insert(mealItems);

      if (itemsError) throw itemsError;
      console.log('✅ Items insérés');

      // 4. Générer la liste de courses
      console.log('🛒 Génération liste de courses...');
      await generateShoppingList(plan.id, mealItems);
      console.log('✅ Liste de courses générée');

      // 5. Ajouter à l'historique
      console.log('📝 Ajout à l\'historique...');
      await supabase
        .from('meal_plan_history')
        .insert({
          profile_id: profile.id,
          plan_id: plan.id,
          nom_programme: programName,
          statut: 'actif'
        });
      console.log('✅ Historique mis à jour');

      // 6. Charger le plan complet
      console.log('🔄 Chargement du plan complet...');
      const { data: fullPlan, error: loadError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals (
            *,
            meal_items (
              *,
              food:foods (*)
            )
          )
        `)
        .eq('id', plan.id)
        .single();

      if (loadError) throw loadError;
      console.log('✅ Plan complet chargé:', fullPlan);

      setGeneratedPlan(fullPlan);
      onPlanGenerated(fullPlan);
      console.log('🎉 Génération terminée avec succès!');

    } catch (err) {
      console.error('❌ Erreur détaillée:', err);
      console.error('Stack trace:', err.stack);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const generateDayMeals = async (planId: string, day: number, targets: NutritionTargets, distribution: any) => {
    const meals: Meal[] = [];
    const items: MealItem[] = [];
    
    console.log(`🍽️ Génération jour ${day}, repas par jour: ${profile.repas_par_jour}`);

    // Déterminer les types de repas selon le nombre configuré
    let mealTypes: string[] = [];
    
    if (profile.repas_par_jour === 3) {
      mealTypes = ['petit_dejeuner', 'dejeuner', 'diner'];
    } else if (profile.repas_par_jour === 4) {
      mealTypes = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];
    } else if (profile.repas_par_jour === 5) {
      mealTypes = ['petit_dejeuner', 'collation', 'dejeuner', 'collation', 'diner'];
    } else if (profile.repas_par_jour === 6) {
      mealTypes = ['petit_dejeuner', 'collation', 'dejeuner', 'collation', 'diner', 'collation'];
    }
    
    console.log(`📋 Types de repas pour le jour ${day}:`, mealTypes);

    // Ajuster la répartition selon le nombre de repas
    const adjustedDistribution = { ...distribution };
    if (profile.repas_par_jour === 5) {
      adjustedDistribution.petit_dejeuner = 0.25;
      adjustedDistribution.dejeuner = 0.35;
      adjustedDistribution.diner = 0.25;
      adjustedDistribution.collation = 0.15 / 2; // Répartir entre 2 collations
    } else if (profile.repas_par_jour === 6) {
      adjustedDistribution.petit_dejeuner = 0.20;
      adjustedDistribution.dejeuner = 0.30;
      adjustedDistribution.diner = 0.25;
      adjustedDistribution.collation = 0.25 / 3; // Répartir entre 3 collations
    }

    let collationCount = 0;
    for (const mealType of mealTypes) {
      // Pour les collations multiples, ajuster les portions
      let distributionFactor = adjustedDistribution[mealType];
      if (mealType === 'collation') {
        collationCount++;
        // Répartir équitablement entre les collations
        if (profile.repas_par_jour === 5) distributionFactor = 0.15 / 2;
        if (profile.repas_par_jour === 6) distributionFactor = 0.25 / 3;
      }

      const mealTargets = {
        kcal_target: targets.calories * distributionFactor,
        proteines_target: targets.proteines * distributionFactor,
        glucides_target: targets.glucides * distributionFactor,
        lipides_target: targets.lipides * distributionFactor
      };

      console.log(`🎯 Objectifs repas ${mealType}:`, mealTargets);

      const meal: Meal = {
        id: crypto.randomUUID(),
        plan_id: planId,
        jour: day,
        type_repas: mealType as any,
        ...mealTargets
      };

      meals.push(meal);

      // Générer les aliments pour ce repas
      console.log(`🥘 Génération aliments pour ${mealType}...`);
      const mealItems = await generateMealItems(meal, mealTargets);
      console.log(`✅ ${mealItems.length} aliments générés pour ${mealType}`);
      items.push(...mealItems);
    }

    return { meals, items };
  };

  const generateMealItems = async (meal: Meal, targets: any): Promise<MealItem[]> => {
    console.log(`🔍 Génération items pour repas ${meal.type_repas}, objectifs:`, targets);
    
    return generateMealItemsWithTemplate(meal, targets, {
      categories_requises: {
        'Viandes rouges': 1,
        'Céréales complètes': 1,
        'Légumes verts': 1,
        'Huiles végétales': 1
      }
    });
  };

  const generateMealItemsOld = async (meal: Meal, targets: any, mealType: string): Promise<MealItem[]> => {
    // Trouver un template approprié pour ce type de repas
    const template = mealTemplates.find(t => t.type_repas === mealType) || 
                    mealTemplates.find(t => t.type_repas === 'dejeuner'); // Fallback

    if (!template) {
      // Template par défaut si aucun n'est trouvé
      const defaultTemplate = {
        categories_requises: {
          'viande rouge': 1,
          'cereales completes': 1,
          'legumes verts': 1,
          'huile vegetale': 1
        }
      };
      return await generateMealItemsWithTemplate(meal, targets, defaultTemplate);
    }

    return await generateMealItemsWithTemplate(meal, targets, template);
  };

  const generateMealItemsWithTemplate = async (meal: Meal, targets: any, template: any): Promise<MealItem[]> => {
    const items: MealItem[] = [];
    
    console.log(`🏗️ Template utilisé:`, template);
    console.log(`📊 Aliments disponibles par catégorie:`);
    
    // Debug: compter les aliments par sous-catégorie
    const foodsBySubCategory = foods.reduce((acc, food) => {
      const key = food.sous_categorie || 'Non catégorisé';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Sous-catégories disponibles:', foodsBySubCategory);

    // Sélectionner les aliments selon les catégories requises
    const selectedFoods = selectFoodsByCategory(foods, profile, meal.type_repas, template.categories_requises);
    console.log(`🎯 Aliments sélectionnés:`, selectedFoods.length);
    
    if (selectedFoods.length === 0) {
      console.warn(`Aucun aliment compatible trouvé pour ${meal.type_repas}, utilisation d'aliments de base`);
      // Utiliser des aliments de base si aucun compatible n'est trouvé
      const basicFoods = foods.filter(f => 
        f.categorie === 'proteine' || f.categorie === 'glucide' || f.categorie === 'legume'
      ).slice(0, 3);
      
      console.log(`🔄 Utilisation d'aliments de base:`, basicFoods.map(f => f.nom));
      
      for (const food of basicFoods) {
        const quantity = 100; // Quantité par défaut
        const factor = quantity / 100;
        
        items.push({
          id: crypto.randomUUID(),
          meal_id: meal.id,
          food_id: food.id,
          grammes: quantity,
          kcal_calculees: Math.round(food.kcal_100g * factor * 10) / 10,
          proteines_calculees: Math.round(food.proteines_100g * factor * 10) / 10,
          glucides_calculees: Math.round(food.glucides_100g * factor * 10) / 10,
          lipides_calculees: Math.round(food.lipides_100g * factor * 10) / 10
        });
      }
      
      return items;
    }

    // Calculer les quantités optimales
    const foodQuantities = calculateOptimalQuantities(selectedFoods, targets);
    console.log(`⚖️ Quantités calculées:`, foodQuantities.map(fq => ({ nom: fq.food.nom, quantity: fq.quantity })));
    
    for (const { food, quantity } of foodQuantities) {
      const factor = quantity / 100;

      items.push({
        id: crypto.randomUUID(),
        meal_id: meal.id,
        food_id: food.id,
        grammes: quantity,
        kcal_calculees: Math.round(food.kcal_100g * factor * 10) / 10,
        proteines_calculees: Math.round(food.proteines_100g * factor * 10) / 10,
        glucides_calculees: Math.round(food.glucides_100g * factor * 10) / 10,
        lipides_calculees: Math.round(food.lipides_100g * factor * 10) / 10
      });
    }
    
    console.log(`✅ Items générés pour ${meal.type_repas}:`, items.length);

    return items;
  };

  const generateShoppingList = async (planId: string, allItems: MealItem[]) => {
    const foodTotals = new Map<string, { food_id: string; grammes_total: number; categorie: string }>();

    // Agréger les quantités par aliment
    for (const item of allItems) {
      const food = foods.find(f => f.id === item.food_id);
      if (food) {
        const existing = foodTotals.get(item.food_id);
        if (existing) {
          existing.grammes_total += item.grammes;
        } else {
          foodTotals.set(item.food_id, {
            food_id: item.food_id,
            grammes_total: item.grammes,
            categorie: food.categorie
          });
        }
      }
    }

    // Insérer dans la table shopping_lists
    const shoppingItems = Array.from(foodTotals.values()).map(item => ({
      plan_id: planId,
      food_id: item.food_id,
      grammes_total: Math.round(item.grammes_total),
      categorie: item.categorie
    }));

    const { error } = await supabase
      .from('shopping_lists')
      .insert(shoppingItems);

    if (error) throw error;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Objectifs nutritionnels */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Target className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Objectifs nutritionnels calculés</h2>
        </div>

        <MacroChart targets={targets} size="lg" />
      </div>

      {/* Génération du plan */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ChefHat className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Génération du plan de repas</h2>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Génère un plan personnalisé sur 7 jours respectant vos contraintes alimentaires
          </p>
          <button
            onClick={generateMealPlan}
            disabled={loading || foods.length === 0 || mealTemplates.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {foods.length === 0 && (
              <span className="text-xs bg-red-500 px-2 py-1 rounded">Aucun aliment</span>
            )}
            {loading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Calendar className="h-5 w-5" />
            )}
            {loading ? 'Génération...' : 'Générer le plan'}
          </button>
        </div>
        
        {/* Debug info */}
        <div className="text-xs text-gray-500 mt-2">
          Debug: {foods.length} aliments, {mealTemplates.length} templates
        </div>
      </div>

      {generatedPlan && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan généré avec succès!</h3>
          <p className="text-gray-600">
            Votre plan de 7 jours est prêt. Consultez l'onglet "Mon Plan" pour voir le détail
            des repas et la liste de courses.
          </p>
        </div>
      )}
    </div>
  );
}