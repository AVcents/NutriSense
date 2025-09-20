import React, { useState } from 'react';
import { User, Scale, Activity, Target, AlertCircle } from 'lucide-react';
import { Profile, ProfilePhysical } from '../types';
import { supabase } from '../lib/supabase';

interface ProfileFormProps {
  profile?: Profile | null;
  onSave: (profile: Profile) => void;
}

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sédentaire (bureau, pas d\'exercice)' },
  { value: 1.375, label: 'Peu actif (exercice léger 1-3j/semaine)' },
  { value: 1.55, label: 'Modérément actif (exercice 3-5j/semaine)' },
  { value: 1.725, label: 'Très actif (exercice intense 6-7j/semaine)' },
  { value: 1.9, label: 'Extrêmement actif (exercice + travail physique)' }
];

const COMMON_ALLERGIES = ['gluten', 'lait', 'oeufs', 'poisson', 'crustacés', 'fruits à coque', 'arachides', 'soja'];
const COMMON_REGIMES = ['végétarien', 'végétalien', 'cétogène', 'paléo', 'sans gluten'];

export default function ProfileForm({ profile, onSave }: ProfileFormProps) {
  const [formData, setFormData] = useState<Partial<Profile>>({
    nom: profile?.nom || '',
    sexe: profile?.sexe || 'M',
    age: profile?.age || 30,
    taille: profile?.taille || 170,
    poids: profile?.poids || profile?.current_physical?.poids || 70,
    pourcentage_mg: profile?.pourcentage_mg || profile?.current_physical?.pourcentage_mg,
    activite: profile?.activite || profile?.current_physical?.activite || 1.55,
    objectif: profile?.objectif || profile?.current_physical?.objectif || 'maintien',
    repas_par_jour: profile?.repas_par_jour || 4,
    allergies: profile?.allergies || [],
    regimes: profile?.regimes || [],
    pathologies: profile?.pathologies || [],
    aliments_aimes: profile?.aliments_aimes || [],
    aliments_detestes: profile?.aliments_detestes || []
  });

  const [physicalData, setPhysicalData] = useState<Partial<ProfilePhysical>>({
    poids: profile?.current_physical?.poids || profile?.poids || 70,
    pourcentage_mg: profile?.current_physical?.pourcentage_mg || 15,
    activite: profile?.current_physical?.activite || 1.55,
    objectif: profile?.current_physical?.objectif || 'maintien',
    date_mesure: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const profileData = {
        ...formData,
        poids: physicalData.poids,
        pourcentage_mg: physicalData.pourcentage_mg,
        activite: physicalData.activite,
        objectif: physicalData.objectif,
        user_id: user.id,
        updated_at: new Date().toISOString()
      } as Profile;

      let savedProfile;

      if (profile?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', profile.id)
          .select()
          .single();
        
        if (error) throw error;
        savedProfile = data;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (error) throw error;
        savedProfile = data;
      }

      // Sauvegarder les données physiques
      const physicalDataToSave = {
        ...physicalData,
        profile_id: savedProfile.id
      } as ProfilePhysical;

      const { data: physicalResult, error: physicalError } = await supabase
        .from('profile_physical_history')
        .insert(physicalDataToSave)
        .select()
        .single();

      if (physicalError) throw physicalError;

      // Retourner le profil avec les données physiques actuelles
      savedProfile.current_physical = physicalResult;
      onSave(savedProfile);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, field: keyof Profile) => {
    const newArray = array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Informations personnelles */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Informations personnelles</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sexe</label>
            <select
              value={formData.sexe}
              onChange={(e) => setFormData(prev => ({ ...prev, sexe: e.target.value as 'M' | 'F' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Âge (années)</label>
            <input
              type="number"
              min="10"
              max="120"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Taille (cm)</label>
            <input
              type="number"
              min="100"
              max="250"
              value={formData.taille}
              onChange={(e) => setFormData(prev => ({ ...prev, taille: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Données corporelles */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Scale className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Composition corporelle actuelle</h2>
            <p className="text-sm text-gray-600">Ces données seront sauvegardées dans votre historique</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Poids (kg)</label>
            <input
              type="number"
              min="30"
              max="300"
              step="0.1"
              value={physicalData.poids}
              onChange={(e) => setPhysicalData(prev => ({ ...prev, poids: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">% Masse grasse (optionnel)</label>
            <input
              type="number"
              min="5"
              max="50"
              step="0.1"
              value={physicalData.pourcentage_mg || ''}
              onChange={(e) => setPhysicalData(prev => ({ ...prev, pourcentage_mg: e.target.value ? parseFloat(e.target.value) : undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de mesure</label>
            <input
              type="date"
              value={physicalData.date_mesure}
              onChange={(e) => setPhysicalData(prev => ({ ...prev, date_mesure: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Activité et objectifs */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Activity className="h-5 w-5 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Activité et objectifs</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Niveau d'activité</label>
            <select
              value={physicalData.activite}
              onChange={(e) => setPhysicalData(prev => ({ ...prev, activite: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ACTIVITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Objectif</label>
            <select
              value={physicalData.objectif}
              onChange={(e) => setPhysicalData(prev => ({ ...prev, objectif: e.target.value as 'perte' | 'maintien' | 'prise' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="perte">Perte de poids (-15%)</option>
              <option value="maintien">Maintien du poids</option>
              <option value="prise">Prise de poids (+10%)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de repas par jour</label>
            <select
              value={formData.repas_par_jour}
              onChange={(e) => setFormData(prev => ({ ...prev, repas_par_jour: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={3}>3 repas</option>
              <option value={4}>4 repas (+ collation)</option>
              <option value={5}>5 repas</option>
              <option value={6}>6 repas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contraintes alimentaires */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <Target className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Contraintes alimentaires</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Allergies</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map(allergie => (
                <button
                  key={allergie}
                  type="button"
                  onClick={() => toggleArrayItem(formData.allergies || [], allergie, 'allergies')}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    formData.allergies?.includes(allergie)
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {allergie}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Régimes suivis</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_REGIMES.map(regime => (
                <button
                  key={regime}
                  type="button"
                  onClick={() => toggleArrayItem(formData.regimes || [], regime, 'regimes')}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    formData.regimes?.includes(regime)
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {regime}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enregistrement...' : profile ? 'Mettre à jour le profil' : 'Créer le profil'}
        </button>
      </div>
    </form>
  );
}