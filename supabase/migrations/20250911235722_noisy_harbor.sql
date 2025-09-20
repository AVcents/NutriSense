/*
  # Seed des aliments - Base de données nutritionnelle

  Insertion de 40+ aliments avec valeurs nutritionnelles complètes
  répartis dans les 4 catégories principales
*/

-- PROTEINES (15 aliments)
INSERT INTO foods (nom, categorie, kcal_100g, proteines_100g, glucides_100g, lipides_100g, fibres_100g, index_glycemique, score_inflammatoire, regimes_compatibles, allergenes, prix_kg, saison) VALUES
('Blanc de poulet', 'proteine', 165, 31, 0, 3.6, 0, 0, -1, '{}', '{}', 12.50, '{}'),
('Saumon atlantique', 'proteine', 208, 25, 0, 12, 0, 0, -2, '{}', '{"poisson"}', 22.00, '{}'),
('Oeufs entiers', 'proteine', 155, 13, 1.1, 11, 0, 0, 0, '{"végétarien"}', '{"oeufs"}', 8.50, '{}'),
('Thon en conserve', 'proteine', 132, 28, 0, 1, 0, 0, -1, '{}', '{"poisson"}', 15.00, '{}'),
('Steak de boeuf', 'proteine', 271, 26, 0, 19, 0, 0, 2, '{}', '{}', 28.00, '{}'),
('Tofu ferme', 'proteine', 144, 15, 3, 9, 2, 15, -2, '{"végétarien", "végétalien"}', '{"soja"}', 6.00, '{}'),
('Lentilles rouges', 'proteine', 116, 9, 20, 0.4, 8, 30, -3, '{"végétarien", "végétalien"}', '{}', 4.50, '{}'),
('Haricots noirs', 'proteine', 132, 9, 23, 0.5, 9, 30, -3, '{"végétarien", "végétalien"}', '{}', 5.00, '{}'),
('Quinoa cuit', 'proteine', 120, 4.4, 22, 1.9, 2.8, 35, -2, '{"végétarien", "végétalien"}', '{}', 12.00, '{}'),
('Saumon fumé', 'proteine', 117, 25, 0, 4.3, 0, 0, -1, '{}', '{"poisson"}', 35.00, '{}'),
('Escalope de dinde', 'proteine', 135, 30, 0, 1, 0, 0, -1, '{}', '{}', 14.00, '{}'),
('Crevettes décortiquées', 'proteine', 85, 20, 0, 1, 0, 0, -1, '{}', '{"crustacés"}', 18.00, '{}'),
('Fromage blanc 0%', 'proteine', 47, 8, 4, 0.2, 0, 25, 0, '{"végétarien"}', '{"lait"}', 3.50, '{}'),
('Protéine de pois', 'proteine', 375, 85, 7, 7, 6, 15, -3, '{"végétarien", "végétalien"}', '{}', 25.00, '{}'),
('Sardines à l''huile', 'proteine', 208, 25, 0, 11, 0, 0, -2, '{}', '{"poisson"}', 8.00, '{}'),

-- GLUCIDES (12 aliments)
('Riz basmati cuit', 'glucide', 121, 2.5, 25, 0.4, 0.4, 50, 0, '{"végétarien", "végétalien"}', '{}', 3.50, '{}'),
('Avoine flocons', 'glucide', 389, 17, 66, 7, 10, 40, -2, '{"végétarien", "végétalien"}', '{"gluten"}', 4.00, '{}'),
('Patate douce cuite', 'glucide', 86, 2, 20, 0.1, 3, 45, -2, '{"végétarien", "végétalien"}', '{}', 2.80, '{"automne", "hiver"}'),
('Pâtes complètes cuites', 'glucide', 131, 5, 25, 1.1, 4, 40, -1, '{"végétarien", "végétalien"}', '{"gluten"}', 3.20, '{}'),
('Pain complet', 'glucide', 247, 13, 41, 4, 7, 50, 0, '{"végétarien", "végétalien"}', '{"gluten"}', 2.50, '{}'),
('Banane', 'glucide', 89, 1.1, 23, 0.3, 2.6, 55, -1, '{"végétarien", "végétalien"}', '{}', 2.20, '{}'),
('Pomme', 'glucide', 52, 0.3, 14, 0.2, 2.4, 35, -2, '{"végétarien", "végétalien"}', '{}', 3.50, '{"automne"}'),
('Flocons de sarrasin', 'glucide', 343, 13, 72, 3.4, 10, 45, -2, '{"végétarien", "végétalien"}', '{}', 6.50, '{}'),
('Millet cuit', 'glucide', 119, 3.5, 23, 1, 1.3, 50, -1, '{"végétarien", "végétalien"}', '{}', 8.00, '{}'),
('Dattes Medjool', 'glucide', 277, 1.8, 75, 0.2, 6.7, 70, 1, '{"végétarien", "végétalien"}', '{}', 18.00, '{}'),
('Courge butternut', 'glucide', 45, 1, 12, 0.1, 2, 35, -2, '{"végétarien", "végétalien"}', '{}', 2.50, '{"automne", "hiver"}'),
('Igname cuite', 'glucide', 118, 1.5, 28, 0.2, 4.1, 35, -1, '{"végétarien", "végétalien"}', '{}', 4.80, '{}'),

-- LEGUMES (10 aliments)
('Brocolis', 'legume', 34, 2.8, 7, 0.4, 2.6, 10, -3, '{"végétarien", "végétalien"}', '{}', 4.50, '{"automne", "hiver"}'),
('Epinards', 'legume', 23, 2.9, 3.6, 0.4, 2.2, 15, -3, '{"végétarien", "végétalien"}', '{}', 6.00, '{"printemps", "automne"}'),
('Courgettes', 'legume', 17, 1.2, 3.1, 0.3, 1, 15, -2, '{"végétarien", "végétalien"}', '{}', 2.80, '{"été"}'),
('Tomates cerises', 'legume', 18, 0.9, 3.9, 0.2, 1.2, 10, -2, '{"végétarien", "végétalien"}', '{}', 5.50, '{"été"}'),
('Carottes', 'legume', 41, 0.9, 10, 0.2, 2.8, 30, -2, '{"végétarien", "végétalien"}', '{}', 1.50, '{}'),
('Poivrons rouges', 'legume', 31, 1, 6, 0.3, 2.5, 15, -3, '{"végétarien", "végétalien"}', '{}', 4.20, '{"été", "automne"}'),
('Concombre', 'legume', 16, 0.7, 4, 0.1, 0.5, 10, -2, '{"végétarien", "végétalien"}', '{}', 2.00, '{"été"}'),
('Chou-fleur', 'legume', 25, 1.9, 5, 0.3, 2, 15, -3, '{"végétarien", "végétalien"}', '{}', 3.80, '{"automne", "hiver"}'),
('Aubergines', 'legume', 25, 1, 6, 0.2, 3, 15, -2, '{"végétarien", "végétalien"}', '{}', 3.50, '{"été", "automne"}'),
('Haricots verts', 'legume', 31, 1.8, 7, 0.1, 2.7, 15, -3, '{"végétarien", "végétalien"}', '{}', 4.80, '{"été"}'),

-- GRAISSES (8 aliments)
('Huile d''olive extra vierge', 'graisse', 884, 0, 0, 100, 0, 0, -3, '{"végétarien", "végétalien"}', '{}', 8.50, '{}'),
('Avocat', 'graisse', 160, 2, 9, 15, 7, 10, -3, '{"végétarien", "végétalien"}', '{}', 6.80, '{}'),
('Amandes', 'graisse', 579, 21, 22, 50, 12, 15, -2, '{"végétarien", "végétalien"}', '{"fruits à coque"}', 18.00, '{}'),
('Noix', 'graisse', 654, 15, 14, 65, 7, 15, -2, '{"végétarien", "végétalien"}', '{"fruits à coque"}', 22.00, '{}'),
('Graines de tournesol', 'graisse', 584, 21, 20, 51, 9, 35, -1, '{"végétarien", "végétalien"}', '{}', 8.00, '{}'),
('Beurre de cacahuète', 'graisse', 588, 25, 20, 50, 8, 15, 1, '{"végétarien"}', '{"arachides"}', 12.00, '{}'),
('Graines de chia', 'graisse', 486, 17, 42, 31, 34, 35, -3, '{"végétarien", "végétalien"}', '{}', 25.00, '{}'),
('Huile de coco', 'graisse', 862, 0, 0, 100, 0, 0, 0, '{"végétarien", "végétalien"}', '{}', 15.00, '{}');