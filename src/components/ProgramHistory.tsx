import React, { useState, useEffect } from 'react';
import { History, Calendar, Star, Archive, Eye, Trash2 } from 'lucide-react';
import { MealPlanHistory, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface ProgramHistoryProps {
  profile: Profile;
  onSelectPlan?: (planId: string) => void;
}

export default function ProgramHistory({ profile, onSelectPlan }: ProgramHistoryProps) {
  const [history, setHistory] = useState<MealPlanHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [profile.id]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plan_history')
        .select(`
          *,
          meal_plan:meal_plans (
            id,
            date_debut,
            kcal_target,
            proteines_target,
            glucides_target,
            lipides_target,
            statut
          )
        `)
        .eq('profile_id', profile.id)
        .order('date_creation', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePlanStatus = async (historyId: string, newStatus: 'actif' | 'archive' | 'favori') => {
    try {
      const { error } = await supabase
        .from('meal_plan_history')
        .update({ statut: newStatus })
        .eq('id', historyId);

      if (error) throw error;
      
      // Si on active un plan, désactiver les autres
      if (newStatus === 'actif') {
        await supabase
          .from('meal_plan_history')
          .update({ statut: 'archive' })
          .eq('profile_id', profile.id)
          .neq('id', historyId);
      }

      loadHistory();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
    }
  };

  const deletePlan = async (historyId: string, planId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) return;

    try {
      // Supprimer l'historique et le plan
      await Promise.all([
        supabase.from('meal_plan_history').delete().eq('id', historyId),
        supabase.from('meal_plans').delete().eq('id', planId)
      ]);

      loadHistory();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'actif':
        return <Calendar className="h-4 w-4 text-green-600" />;
      case 'favori':
        return <Star className="h-4 w-4 text-yellow-600" />;
      default:
        return <Archive className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'actif':
        return 'Actif';
      case 'favori':
        return 'Favori';
      default:
        return 'Archivé';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actif':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'favori':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun programme généré</h3>
        <p className="text-gray-600">Vos programmes générés apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <History className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Historique des programmes</h2>
            <p className="text-gray-600">{history.length} programmes générés</p>
          </div>
        </div>
      </div>

      {/* Liste des programmes */}
      <div className="space-y-4">
        {history.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(item.statut)}`}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(item.statut)}
                    {getStatusLabel(item.statut)}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.nom_programme}</h3>
              </div>
              
              <div className="text-sm text-gray-600">
                {new Date(item.date_creation).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {item.meal_plan && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">
                    {Math.round(item.meal_plan.kcal_target)}
                  </div>
                  <div className="text-sm text-gray-600">Calories/jour</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-500">
                    {Math.round(item.meal_plan.proteines_target)}g
                  </div>
                  <div className="text-sm text-gray-600">Protéines</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-500">
                    {Math.round(item.meal_plan.glucides_target)}g
                  </div>
                  <div className="text-sm text-gray-600">Glucides</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-500">
                    {Math.round(item.meal_plan.lipides_target)}g
                  </div>
                  <div className="text-sm text-gray-600">Lipides</div>
                </div>
              </div>
            )}

            {item.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{item.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {item.statut !== 'actif' && (
                  <button
                    onClick={() => updatePlanStatus(item.id, 'actif')}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Calendar className="h-3 w-3" />
                    Activer
                  </button>
                )}
                
                <button
                  onClick={() => updatePlanStatus(item.id, item.statut === 'favori' ? 'archive' : 'favori')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                    item.statut === 'favori'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  <Star className="h-3 w-3" />
                  {item.statut === 'favori' ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onSelectPlan && (
                  <button
                    onClick={() => onSelectPlan(item.plan_id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    Voir le détail
                  </button>
                )}
                
                <button
                  onClick={() => deletePlan(item.id, item.plan_id)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}