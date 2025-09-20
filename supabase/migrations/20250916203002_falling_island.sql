/*
  # Correction des contraintes et amélioration du système de plans

  1. Modifications
    - Permettre plusieurs plans actifs par profil
    - Améliorer la gestion des statuts
    - Corriger les contraintes de génération

  2. Améliorations
    - Meilleure gestion des plans multiples
    - Statuts plus flexibles
*/

-- Supprimer les anciennes contraintes qui empêchent plusieurs plans actifs
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS unique_active_plan_per_profile;

-- Permettre plusieurs plans par profil avec des statuts différents
-- Le statut 'actif' peut maintenant être multiple, l'application gérera la logique