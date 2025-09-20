import React, { useState, useEffect } from 'react';
import { User, Settings, Calendar, ShoppingCart, ChefHat, LogOut, Package, History } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Profile, ProfilePhysical, MealPlan } from './types';
import AuthComponent from './components/AuthComponent';
import ProfileForm from './components/ProfileForm';
import MealPlanGenerator from './components/MealPlanGenerator';
import WeeklyPlanView from './components/WeeklyPlanView';
import ShoppingListView from './components/ShoppingListView';
import FoodManagement from './components/FoodManagement';
import ProgramHistory from './components/ProgramHistory';

type TabType = 'profile' | 'generate' | 'plan' | 'shopping' | 'foods' | 'history';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'profile', label: 'Mon Profil', icon: <User className="h-5 w-5" /> },
  { id: 'generate', label: 'Générer', icon: <ChefHat className="h-5 w-5" /> },
  { id: 'plan', label: 'Mon Plan', icon: <Calendar className="h-5 w-5" /> },
  { id: 'shopping', label: 'Courses', icon: <ShoppingCart className="h-5 w-5" /> },
  { id: 'foods', label: 'Aliments', icon: <Package className="h-5 w-5" /> },
  { id: 'history', label: 'Historique', icon: <History className="h-5 w-5" /> }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (profileError) {
        throw profileError;
      }
      
      if (profileData && profileData.length > 0) {
        const profile = profileData[0];
        // Charger les données physiques les plus récentes
        const { data: physicalData, error: physicalError } = await supabase
          .from('profile_physical_history')
          .select('*')
          .eq('profile_id', profile.id)
          .order('date_mesure', { ascending: false })
          .limit(1)

        if (physicalError) {
          console.warn('Error loading physical data:', physicalError);
        }

        profile.current_physical = physicalData && physicalData.length > 0 ? physicalData[0] : null;
        setProfile(profile);
      } else {
        // Aucun profil trouvé - c'est normal pour un nouvel utilisateur
        setProfile(null);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setActiveTab('profile');
  };

  const handleProfileSave = (savedProfile: Profile) => {
    setProfile(savedProfile);
    setActiveTab('generate');
  };

  const handlePlanGenerated = (plan: MealPlan) => {
    setActiveTab('plan');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthComponent onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ChefHat className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NutriSense AI</h1>
                <p className="text-sm text-gray-600">Générateur de programmes alimentaires</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {profile && (
                <div className="text-sm text-gray-600">
                  Bonjour, <span className="font-medium">{profile.nom}</span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border p-4 space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={tab.id !== 'profile' && tab.id !== 'foods' && !profile}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Settings className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Configuration du profil</h2>
                </div>
                <ProfileForm profile={profile} onSave={handleProfileSave} />
              </div>
            )}

            {activeTab === 'generate' && profile && profile.current_physical && (
              <MealPlanGenerator 
                profile={profile} 
                onPlanGenerated={handlePlanGenerated}
              />
            )}

            {activeTab === 'plan' && profile && profile.current_physical && (
              <WeeklyPlanView profile={profile} />
            )}

            {activeTab === 'shopping' && profile && profile.current_physical && (
              <ShoppingListView profile={profile} />
            )}

            {activeTab === 'foods' && (
              <FoodManagement />
            )}

            {activeTab === 'history' && profile && (
              <ProgramHistory 
                profile={profile} 
                onSelectPlan={(planId) => setActiveTab('plan')}
              />
            )}

            {/* Message si pas de données physiques */}
            {(activeTab === 'generate' || activeTab === 'plan' || activeTab === 'shopping') && 
             profile && !profile.current_physical && (
              <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
                <div className="p-3 bg-yellow-100 rounded-full w-fit mx-auto mb-4">
                  <Settings className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Données physiques manquantes
                </h3>
                <p className="text-gray-600 mb-4">
                  Veuillez compléter votre profil avec vos données physiques actuelles pour accéder à cette fonctionnalité.
                </p>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Compléter mon profil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}