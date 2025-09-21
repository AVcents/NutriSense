import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFoodDatabase() {
  console.log('🌱 Seeding food database with reference data...');

  // 1. Créer les sources de données
  const fdcSource = await prisma.source.upsert({
    where: { name: 'FDC' },
    update: {},
    create: {
      name: 'FDC',
      description: 'USDA Food Data Central',
      version: '2024-04',
      url: 'https://fdc.nal.usda.gov/',
    },
  });

  const ciqualSource = await prisma.source.upsert({
    where: { name: 'CIQUAL' },
    update: {},
    create: {
      name: 'CIQUAL',
      description: 'Table de composition nutritionnelle des aliments Ciqual',
      version: '2023',
      url: 'https://ciqual.anses.fr/',
    },
  });

  const foodex2Source = await prisma.source.upsert({
    where: { name: 'FoodEx2' },
    update: {},
    create: {
      name: 'FoodEx2',
      description: 'EFSA Food Classification and Description System',
      version: '2.1',
      url: 'https://www.efsa.europa.eu/en/data-report/food-classification-and-description-system-foodex-2',
    },
  });

  // 2. Créer les nutriments de base
  const nutrients = [
    { code: 'ENERC_KCAL', name: 'Énergie', unit: 'kcal', category: 'Energy' },
    { code: 'PROCNT', name: 'Protéines', unit: 'g', category: 'Macronutrient' },
    { code: 'CHOCDF', name: 'Glucides', unit: 'g', category: 'Macronutrient' },
    { code: 'FAT', name: 'Lipides', unit: 'g', category: 'Macronutrient' },
    { code: 'FIBTG', name: 'Fibres alimentaires', unit: 'g', category: 'Macronutrient' },
    { code: 'SUGAR', name: 'Sucres', unit: 'g', category: 'Macronutrient' },
    { code: 'NA', name: 'Sodium', unit: 'mg', category: 'Mineral' },
    { code: 'CA', name: 'Calcium', unit: 'mg', category: 'Mineral' },
    { code: 'FE', name: 'Fer', unit: 'mg', category: 'Mineral' },
    { code: 'VITC', name: 'Vitamine C', unit: 'mg', category: 'Vitamin' },
    { code: 'VITA_RAE', name: 'Vitamine A', unit: 'µg', category: 'Vitamin' },
    { code: 'VITD', name: 'Vitamine D', unit: 'µg', category: 'Vitamin' },
  ];

  for (const nutrient of nutrients) {
    await prisma.nutrient.upsert({
      where: { code: nutrient.code },
      update: {},
      create: nutrient,
    });
  }

  // 3. Créer la taxonomie FoodEx2 (structure simplifiée)
  const rootNodes = [
    { code: 'A', name: 'Produits d\'origine animale et végétale', level: 1 },
    { code: 'B', name: 'Produits transformés', level: 1 },
    { code: 'C', name: 'Boissons', level: 1 },
    { code: 'D', name: 'Additifs alimentaires', level: 1 },
  ];

  const taxonomyNodes = new Map();

  for (const node of rootNodes) {
    const created = await prisma.taxonomyNode.upsert({
      where: { code: node.code },
      update: {},
      create: node,
    });
    taxonomyNodes.set(node.code, created);
  }

  // Sous-catégories niveau 2
  const subNodes = [
    { code: 'A01', name: 'Viandes et produits carnés', level: 2, parentCode: 'A' },
    { code: 'A02', name: 'Poissons et produits de la pêche', level: 2, parentCode: 'A' },
    { code: 'A03', name: 'Légumes et produits végétaux', level: 2, parentCode: 'A' },
    { code: 'A04', name: 'Fruits et produits fruitiers', level: 2, parentCode: 'A' },
    { code: 'A05', name: 'Céréales et produits céréaliers', level: 2, parentCode: 'A' },
    { code: 'B01', name: 'Produits de boulangerie', level: 2, parentCode: 'B' },
    { code: 'B02', name: 'Produits laitiers transformés', level: 2, parentCode: 'B' },
    { code: 'C01', name: 'Boissons non alcoolisées', level: 2, parentCode: 'C' },
    { code: 'C02', name: 'Boissons alcoolisées', level: 2, parentCode: 'C' },
  ];

  for (const node of subNodes) {
    const parent = taxonomyNodes.get(node.parentCode);
    const created = await prisma.taxonomyNode.upsert({
      where: { code: node.code },
      update: {},
      create: {
        code: node.code,
        name: node.name,
        level: node.level,
        parentId: parent.id,
      },
    });
    taxonomyNodes.set(node.code, created);
  }

  // 4. Créer quelques marques de référence
  const brands = [
    { name: 'Danone', owner: 'Danone Group' },
    { name: 'Nestlé', owner: 'Nestlé S.A.' },
    { name: 'Unilever', owner: 'Unilever PLC' },
    { name: 'Carrefour', owner: 'Carrefour Group' },
  ];

  const createdBrands = new Map();
  for (const brand of brands) {
    const created = await prisma.brand.upsert({
      where: { name_owner: { name: brand.name, owner: brand.owner } },
      update: {},
      create: brand,
    });
    createdBrands.set(brand.name, created);
  }

  // 5. Créer des aliments de référence avec données nutritionnelles
  const sampleFoods = [
    {
      sourceId: fdcSource.id,
      foodCodeSource: '173410',
      name: 'Blanc de poulet, grillé',
      nameScientific: 'Gallus gallus',
      synonyms: ['Escalope de poulet', 'Filet de poulet'],
      sourceConfidence: 0.95,
      taxonomyCode: 'A01',
      nutrients: {
        'ENERC_KCAL': 165,
        'PROCNT': 31.0,
        'CHOCDF': 0,
        'FAT': 3.6,
        'FIBTG': 0,
        'NA': 74,
      },
    },
    {
      sourceId: ciqualSource.id,
      foodCodeSource: '25005',
      name: 'Riz blanc, cuit',
      synonyms: ['Riz cuit', 'Riz blanc bouilli'],
      sourceConfidence: 0.90,
      taxonomyCode: 'A05',
      nutrients: {
        'ENERC_KCAL': 130,
        'PROCNT': 2.7,
        'CHOCDF': 28.0,
        'FAT': 0.3,
        'FIBTG': 0.4,
        'NA': 1,
      },
    },
    {
      sourceId: ciqualSource.id,
      foodCodeSource: '20047',
      name: 'Brocoli, cru',
      nameScientific: 'Brassica oleracea var. italica',
      synonyms: ['Brocolis cru'],
      sourceConfidence: 0.92,
      taxonomyCode: 'A03',
      nutrients: {
        'ENERC_KCAL': 34,
        'PROCNT': 2.8,
        'CHOCDF': 7.0,
        'FAT': 0.4,
        'FIBTG': 2.6,
        'VITC': 89.2,
        'CA': 47,
      },
    },
    {
      sourceId: fdcSource.id,
      foodCodeSource: '171413',
      name: 'Yaourt nature, entier',
      synonyms: ['Yaourt blanc', 'Yaourt nature'],
      brandId: createdBrands.get('Danone')?.id,
      sourceConfidence: 0.88,
      taxonomyCode: 'B02',
      nutrients: {
        'ENERC_KCAL': 61,
        'PROCNT': 3.5,
        'CHOCDF': 4.7,
        'FAT': 3.3,
        'SUGAR': 4.7,
        'CA': 121,
      },
    },
  ];

  for (const foodData of sampleFoods) {
    // Créer l'aliment
    const foodItem = await prisma.foodItem.create({
      data: {
        sourceId: foodData.sourceId,
        foodCodeSource: foodData.foodCodeSource,
        name: foodData.name,
        nameScientific: foodData.nameScientific,
        synonyms: foodData.synonyms || [],
        brandId: foodData.brandId,
        sourceConfidence: foodData.sourceConfidence,
      },
    });

    // Ajouter les valeurs nutritionnelles
    for (const [nutrientCode, value] of Object.entries(foodData.nutrients)) {
      const nutrient = await prisma.nutrient.findUnique({
        where: { code: nutrientCode },
      });

      if (nutrient) {
        await prisma.foodNutrient.create({
          data: {
            foodItemId: foodItem.id,
            nutrientId: nutrient.id,
            value: value as number,
            confidence: 0.9,
            method: 'Laboratory analysis',
          },
        });
      }
    }

    // Ajouter la classification taxonomique
    const taxonomyNode = taxonomyNodes.get(foodData.taxonomyCode);
    if (taxonomyNode) {
      await prisma.foodTaxonomy.create({
        data: {
          foodItemId: foodItem.id,
          taxonomyNodeId: taxonomyNode.id,
          confidence: 0.95,
        },
      });
    }
  }

  console.log('✅ Food database seeded successfully!');
  console.log(`📊 Created:`);
  console.log(`   - ${await prisma.source.count()} sources`);
  console.log(`   - ${await prisma.nutrient.count()} nutrients`);
  console.log(`   - ${await prisma.taxonomyNode.count()} taxonomy nodes`);
  console.log(`   - ${await prisma.brand.count()} brands`);
  console.log(`   - ${await prisma.foodItem.count()} food items`);
  console.log(`   - ${await prisma.foodNutrient.count()} nutrient values`);
}

async function main() {
  try {
    await seedFoodDatabase();
  } catch (error) {
    console.error('❌ Error seeding food database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedFoodDatabase };