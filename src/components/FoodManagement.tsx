import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Package } from 'lucide-react';
import { Food, FoodCategory } from '../types';
import { supabase } from '../lib/supabase';

const CATEGORY_COLORS = {
  proteine: 'bg-red-100 text-red-800 border-red-200',
  glucide: 'bg-blue-100 text-blue-800 border-blue-200',
  legume: 'bg-green-100 text-green-800 border-green-200',
  graisse: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

export default function FoodManagement() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [foodsResult, categoriesResult] = await Promise.all([
        supabase.from('foods').select('*').order('nom'),
        supabase.from('food_categories').select('*').order('nom')
      ]);

      if (foodsResult.error) throw foodsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setFoods(foodsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || food.categorie === selectedCategory;
    const matchesSubCategory = !selectedSubCategory || food.sous_categorie === selectedSubCategory;
    
    return matchesSearch && matchesCategory && matchesSubCategory;
  });

  const groupedFoods = filteredFoods.reduce((acc, food) => {
    const key = food.sous_categorie || 'Non catégorisé';
    if (!acc[key]) acc[key] = [];
    acc[key].push(food);
    return acc;
  }, {} as Record<string, Food[]>);

  const subCategories = [...new Set(foods.map(f => f.sous_categorie).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Base d'aliments</h2>
              <p className="text-gray-600">{foods.length} aliments disponibles</p>
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="h-4 w-4" />
            Ajouter un aliment
          </button>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un aliment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Toutes les catégories</option>
            <option value="proteine">Protéines</option>
            <option value="glucide">Glucides</option>
            <option value="legume">Légumes</option>
            <option value="graisse">Graisses</option>
          </select>

          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Toutes les sous-catégories</option>
            {subCategories.map(subCat => (
              <option key={subCat} value={subCat}>{subCat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des aliments groupés */}
      <div className="space-y-6">
        {Object.entries(groupedFoods).map(([subCategory, categoryFoods]) => (
          <div key={subCategory} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{subCategory}</h3>
              <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                {categoryFoods.length} aliments
              </span>
            </div>

            <div className="grid gap-3">
              {categoryFoods.map(food => (
                <div key={food.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[food.categorie]}`}>
                      {food.categorie}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{food.nom}</div>
                      <div className="text-sm text-gray-600">
                        {Math.round(food.kcal_100g)} kcal/100g • 
                        P: {food.proteines_100g}g • 
                        G: {food.glucides_100g}g • 
                        L: {food.lipides_100g}g
                        {food.prix_kg && ` • ${food.prix_kg.toFixed(2)}€/kg`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {food.regimes_compatibles.length > 0 && (
                      <div className="flex gap-1">
                        {food.regimes_compatibles.slice(0, 2).map(regime => (
                          <span key={regime} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {regime}
                          </span>
                        ))}
                        {food.regimes_compatibles.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{food.regimes_compatibles.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredFoods.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun aliment trouvé</h3>
          <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
        </div>
      )}
    </div>
  );
}