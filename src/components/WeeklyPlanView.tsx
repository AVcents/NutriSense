import React, { useState, useEffect } from 'react';
import { Calendar, ChefHat, ShoppingCart, Download } from 'lucide-react';
import { MealPlan, Meal, Profile } from '../types';
import { supabase } from '../lib/supabase';
import MacroChart from './MacroChart';

interface WeeklyPlanViewProps {
  profile: Profile;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES = {
  petit_dejeuner: { label: 'Petit-déjeuner', icon: '🌅' },
  dejeuner: { label: 'Déjeuner', icon: '☀️' },
  diner: { label: 'Dîner', icon: '🌙' },
  collation: { label: 'Collation', icon: '🍎' }
};

const getMealTypeOrder = (type: string, index: number = 0) => {
  const baseOrder = { petit_dejeuner: 0, dejeuner: 2, diner: 4, collation: 1 };
  return baseOrder[type] + (type === 'collation' ? index * 0.1 : 0);
};

export default function WeeklyPlanView({ profile }: WeeklyPlanViewProps) {
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    loadCurrentPlan();
  }, [profile.id]);

  const loadCurrentPlan = async () => {
    try {
      const { data, error } = await supabase
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
        .eq('profile_id', profile.id)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentPlan(data);
    } catch (err) {
      console.error('Erreur lors du chargement du plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMealsForDay = (day: number) => {
    if (!currentPlan?.meals) return [];
    
    const dayMeals = currentPlan.meals
      .filter(meal => meal.jour === day)
    
    // Grouper les collations et les numéroter
    const collations = dayMeals.filter(m => m.type_repas === 'collation');
    const otherMeals = dayMeals.filter(m => m.type_repas !== 'collation');
    
    // Trier et numéroter
    const sortedMeals = [
      ...otherMeals.sort((a, b) => getMealTypeOrder(a.type_repas) - getMealTypeOrder(b.type_repas)),
      ...collations.map((meal, index) => ({ ...meal, collationIndex: index + 1 }))
    ].sort((a, b) => {
      const aOrder = getMealTypeOrder(a.type_repas, a.collationIndex || 0);
      const bOrder = getMealTypeOrder(b.type_repas, b.collationIndex || 0);
      return aOrder - bOrder;
    });
    
    return sortedMeals;
  };

  const calculateDayTotals = (day: number) => {
    const meals = getMealsForDay(day);
    return meals.reduce((totals, meal) => {
      const mealTotals = (meal.meal_items || []).reduce((mealSum, item) => ({
        kcal: mealSum.kcal + item.kcal_calculees,
        proteines: mealSum.proteines + item.proteines_calculees,
        glucides: mealSum.glucides + item.glucides_calculees,
        lipides: mealSum.lipides + item.lipides_calculees
      }), { kcal: 0, proteines: 0, glucides: 0, lipides: 0 });

      return {
        calories: totals.calories + mealTotals.kcal,
        proteines: totals.proteines + mealTotals.proteines,
        glucides: totals.glucides + mealTotals.glucides,
        lipides: totals.lipides + mealTotals.lipides
      };
    }, { calories: 0, proteines: 0, glucides: 0, lipides: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="text-center py-12">
        <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun plan actif</h3>
        <p className="text-gray-600">Générez d'abord votre plan de repas personnalisé</p>
      </div>
    );
  }

  const targets = {
    calories: currentPlan.kcal_target,
    proteines: currentPlan.proteines_target,
    glucides: currentPlan.glucides_target,
    lipides: currentPlan.lipides_target
  };

  const currentDayTotals = calculateDayTotals(selectedDay);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* En-tête avec objectifs */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Plan de la semaine</h2>
            <p className="text-gray-600">
              Début: {new Date(currentPlan.date_debut).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <MacroChart 
          targets={targets} 
          current={currentDayTotals}
          size="md" 
        />
      </div>

      {/* Sélecteur de jour */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day, index) => (
            <button
              key={day}
              onClick={() => setSelectedDay(index + 1)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === index + 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Repas du jour sélectionné */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {getMealsForDay(selectedDay).map(meal => (
          <div key={meal.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{MEAL_TYPES[meal.type_repas].icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {MEAL_TYPES[meal.type_repas].label}
                  {meal.type_repas === 'collation' && meal.collationIndex && ` ${meal.collationIndex}`}
                </h3>
                <p className="text-sm text-gray-600">
                  Objectif: {Math.round(meal.kcal_target)} kcal
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {meal.meal_items?.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.food?.nom}</div>
                    <div className="text-sm text-gray-600">{item.grammes}g</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{Math.round(item.kcal_calculees)} kcal</div>
                    <div className="text-gray-600">
                      P:{Math.round(item.proteines_calculees)}g | 
                      G:{Math.round(item.glucides_calculees)}g | 
                      L:{Math.round(item.lipides_calculees)}g
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Total repas:</span>
                <span className="font-medium">
                  {Math.round(
                    (meal.meal_items || []).reduce((sum, item) => sum + item.kcal_calculees, 0)
                  )} kcal
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Résumé du jour */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Résumé - {DAYS[selectedDay - 1]}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {Math.round(currentDayTotals.calories)}
            </div>
            <div className="text-sm text-gray-600">Calories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {Math.round(currentDayTotals.proteines)}g
            </div>
            <div className="text-sm text-gray-600">Protéines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {Math.round(currentDayTotals.glucides)}g
            </div>
            <div className="text-sm text-gray-600">Glucides</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {Math.round(currentDayTotals.lipides)}g
            </div>
            <div className="text-sm text-gray-600">Lipides</div>
          </div>
        </div>
      </div>
    </div>
  );
}