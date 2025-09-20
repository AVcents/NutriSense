import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Euro } from 'lucide-react';
import { ShoppingListItem, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface ShoppingListViewProps {
  profile: Profile;
}

const CATEGORY_ICONS = {
  proteine: '🥩',
  glucide: '🌾',
  legume: '🥬',
  graisse: '🥑'
};

const CATEGORY_LABELS = {
  proteine: 'Protéines',
  glucide: 'Glucides & Féculents',
  legume: 'Légumes',
  graisse: 'Matières grasses'
};

export default function ShoppingListView({ profile }: ShoppingListViewProps) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(true);

  useEffect(() => {
    loadShoppingList();
  }, [profile.id]);

  const loadShoppingList = async () => {
    try {
      // Récupérer le plan actuel
      const { data: currentPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!currentPlan) {
        setShoppingItems([]);
        setLoading(false);
        return;
      }

      // Récupérer la liste de courses
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          food:foods (*)
        `)
        .eq('plan_id', currentPlan.id)
        .order('categorie');

      if (error) throw error;
      setShoppingItems(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement de la liste de courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByCategory = () => {
    const grouped: { [key: string]: ShoppingListItem[] } = {};
    
    shoppingItems.forEach(item => {
      if (!grouped[item.categorie]) {
        grouped[item.categorie] = [];
      }
      grouped[item.categorie].push(item);
    });

    return grouped;
  };

  const calculateTotalPrice = () => {
    return shoppingItems.reduce((total, item) => {
      const pricePerKg = item.food?.prix_kg || 0;
      const quantityKg = item.grammes_total / 1000;
      return total + (pricePerKg * quantityKg);
    }, 0);
  };

  const formatQuantity = (grammes: number) => {
    if (grammes >= 1000) {
      return `${(grammes / 1000).toFixed(1)} kg`;
    }
    return `${grammes} g`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (shoppingItems.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune liste de courses</h3>
        <p className="text-gray-600">Générez d'abord votre plan de repas pour créer votre liste</p>
      </div>
    );
  }

  const groupedItems = groupByCategory ? groupItemsByCategory() : null;
  const totalPrice = calculateTotalPrice();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Liste de courses</h2>
              <p className="text-gray-600">{shoppingItems.length} articles</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {totalPrice.toFixed(2)} €
              </div>
              <div className="text-sm text-gray-600">Budget estimé</div>
            </div>
            
            <button
              onClick={() => setGroupByCategory(!groupByCategory)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {groupByCategory ? 'Vue liste' : 'Par catégorie'}
            </button>
          </div>
        </div>
      </div>

      {/* Liste de courses */}
      {groupByCategory && groupedItems ? (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </h3>
                <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                  {items.length} articles
                </span>
              </div>

              <div className="grid gap-3">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{item.food?.nom}</div>
                      <div className="text-sm text-gray-600">
                        {formatQuantity(item.grammes_total)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {item.food?.prix_kg 
                          ? `${((item.food.prix_kg * item.grammes_total) / 1000).toFixed(2)} €`
                          : 'Prix non défini'
                        }
                      </div>
                      {item.food?.prix_kg && (
                        <div className="text-sm text-gray-600">
                          {item.food.prix_kg.toFixed(2)} €/kg
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="grid gap-3">
            {shoppingItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {CATEGORY_ICONS[item.categorie as keyof typeof CATEGORY_ICONS]}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{item.food?.nom}</div>
                    <div className="text-sm text-gray-600">
                      {formatQuantity(item.grammes_total)} • {CATEGORY_LABELS[item.categorie as keyof typeof CATEGORY_LABELS]}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {item.food?.prix_kg 
                      ? `${((item.food.prix_kg * item.grammes_total) / 1000).toFixed(2)} €`
                      : 'Prix non défini'
                    }
                  </div>
                  {item.food?.prix_kg && (
                    <div className="text-sm text-gray-600">
                      {item.food.prix_kg.toFixed(2)} €/kg
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Package className="h-5 w-5" />
            <span>Liste prête pour vos courses</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Euro className="h-4 w-4" />
            Exporter PDF
          </button>
        </div>
      </div>
    </div>
  );
}