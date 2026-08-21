const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/mockData.ts');
let content = fs.readFileSync(filePath, 'utf8');

const wellnessProducts = `  // ======================= WELLNESS (10) =======================
  {
    id: 'well-1',
    name: 'Durex Mutual Climax Condoms',
    category: 'wellness',
    price: 380,
    originalPrice: 450,
    discount: 15,
    rating: 4.8,
    reviewCount: 389,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Durex Mutual Climax condoms are designed for mutual pleasure. Coated with climax-delay Performa lubricant (containing 5% benzocaine) on the inside, and featuring raised ribbed and dotted textures on the outside to speed up her climax.',
    ingredients: ['Natural Rubber Latex', 'Benzocaine 5% active lubricant'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Store in a cool, dry place under 30°C away from direct sunlight. Do not open with teeth.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10'],
    wellnessBrand: 'Durex',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '10',
    wellnessLubrication: 'Benzocaine 5% Delay Lubrication',
    wellnessTexture: 'Ribbed & Dotted',
    wellnessVerified: true,
    wellnessSku: 'SKU-DUREX-MC-10',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'Benzocaine 5% active delay lubricant',
      texture: 'Ribbed and Dotted',
      sizeFit: '56mm Nominal Width, Easy-On shaped, teat ended',
      storage: 'Store in a cool dry cabinet away from direct heat.',
      manufacturer: 'Reckitt Benckiser Healthcare India Pvt Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-2',
    name: 'Durex Air Ultra Thin Condoms',
    category: 'wellness',
    price: 420,
    originalPrice: 500,
    discount: 16,
    rating: 4.7,
    reviewCount: 512,
    image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Durex Air condoms are the thinnest latex condoms developed by Durex, designed to provide a natural feeling while maintaining high safety levels. High lubrication for a smooth glide.',
    ingredients: ['Natural Rubber Latex', 'Extra Silicone Lubrication Oil'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Store in a cool dry place away from heat. Electronically tested.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10'],
    wellnessBrand: 'Durex',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '10',
    wellnessLubrication: 'High-Grade Silicone Lubricated',
    wellnessTexture: 'Smooth',
    wellnessVerified: true,
    wellnessSku: 'SKU-DUREX-AIR-10',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'High-grade premium silicone oil coating',
      texture: 'Smooth',
      sizeFit: '53mm Nominal Width, straight-walled, teat ended',
      storage: 'Keep in dry cabinet. Do not store in wallets or hot vehicles.',
      manufacturer: 'Reckitt Benckiser Healthcare India Pvt Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-3',
    name: 'Durex Play Sweet Strawberry Lubricant',
    category: 'wellness',
    price: 320,
    originalPrice: 350,
    discount: 8,
    rating: 4.6,
    reviewCount: 205,
    image: 'https://images.unsplash.com/photo-1601049676099-e7ed07d825b0?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Durex Play Sweet Strawberry is a water-soluble personal lubricant designed to add a fruity flavor and silky smoothness. It is non-greasy, sugar-free, edible, and condom-compatible.',
    ingredients: ['Purified Water Base', 'Glycerin', 'Strawberry Flavor Extract'],
    allergens: ['Hypoallergenic', 'Sugar-Free'],
    storageInstructions: 'Wipe bottle rim after use. Keep cap closed. Consume within 3 months of opening.',
    occasions: ['Just Because'],
    variants: ['50 ml Tube', '100 ml Tube'],
    wellnessBrand: 'Durex',
    wellnessType: 'Lubricants',
    wellnessMaterial: 'Water-Based',
    wellnessPackSize: '50ml',
    wellnessLubrication: 'Water-Based Flavor Gel',
    wellnessTexture: 'Silky Smooth',
    wellnessFlavor: 'Strawberry',
    wellnessVerified: true,
    wellnessSku: 'SKU-DUREX-LUB-STRAW',
    wellnessDetails: {
      material: 'Water-soluble formulation',
      lubrication: 'Strawberry flavor personal lubricant gel',
      texture: 'Silky gel texture',
      sizeFit: '50 ml Tube',
      flavor: 'Strawberry',
      storage: 'Store in cool place. Avoid eye contact.',
      manufacturer: 'Reckitt Benckiser Healthcare India Pvt Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1601049676099-e7ed07d825b0?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-4',
    name: 'KamaSutra Dotted Condoms',
    category: 'wellness',
    price: 160,
    originalPrice: 200,
    discount: 20,
    rating: 4.5,
    reviewCount: 154,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'KamaSutra Dotted condoms feature hundreds of unique raised dots on the latex surface to increase sensation and friction. Highly lubricated for maximum comfort.',
    ingredients: ['Natural Rubber Latex', 'Silicone Lubricant Coating'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Store in cool place away from light.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10', 'Pack of 12'],
    wellnessBrand: 'KamaSutra',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '12',
    wellnessLubrication: 'Silicone Lubricated',
    wellnessTexture: 'Dotted',
    wellnessVerified: true,
    wellnessSku: 'SKU-KS-DOTTED-12',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'Standard silicone oil coating',
      texture: 'Raised Dotted',
      sizeFit: '53mm Nominal Width, straight-walled',
      storage: 'Keep dry and away from heavy pressure.',
      manufacturer: 'Raymond Consumer Care Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-5',
    name: 'KamaSutra Ribbed Condoms',
    category: 'wellness',
    price: 150,
    originalPrice: 180,
    discount: 16,
    rating: 4.4,
    reviewCount: 98,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'KamaSutra Ribbed condoms are crafted with pronounced raised rings along the latex length, maximizing physical stimulation and warmth.',
    ingredients: ['Natural Rubber Latex', 'Silicone Oil'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Store under 30°C in dry places.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10'],
    wellnessBrand: 'KamaSutra',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '10',
    wellnessLubrication: 'Silicone Lubricated',
    wellnessTexture: 'Ribbed',
    wellnessVerified: true,
    wellnessSku: 'SKU-KS-RIBBED-10',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'Silicone oil coating',
      texture: 'Pronounced Ribbed rings',
      sizeFit: '53mm Nominal Width',
      storage: 'Keep in dry cabinet. Do not store in wallets.',
      manufacturer: 'Raymond Consumer Care Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-6',
    name: 'Skore Chocolate Flavoured Condoms',
    category: 'wellness',
    price: 135,
    originalPrice: 150,
    discount: 10,
    rating: 4.6,
    reviewCount: 198,
    image: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Skore Chocolate flavoured condoms are colored and chocolate-scented to make your intimate moments sweeter. Features raised dots for added sensation.',
    ingredients: ['Natural Rubber Latex', 'Chocolate Scented Silicone Oil'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Store in dry cabinets. Do not open with scissors.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10'],
    wellnessBrand: 'Skore',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '10',
    wellnessLubrication: 'Flavoured Silicone Lubricant',
    wellnessTexture: 'Dotted',
    wellnessFlavor: 'Chocolate',
    wellnessVerified: true,
    wellnessSku: 'SKU-SKORE-CHOCO-10',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'Chocolate flavored silicone oil',
      texture: 'Dotted texture',
      sizeFit: '53mm Nominal Width',
      flavor: 'Chocolate',
      storage: 'Store in cool and dry place.',
      manufacturer: 'TTK Protective Devices Limited'
    },
    gallery: [
      'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-7',
    name: 'Manforce Chocolate Flavoured Condoms',
    category: 'wellness',
    price: 120,
    originalPrice: 150,
    discount: 20,
    rating: 4.6,
    reviewCount: 312,
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Manforce Chocolate flavoured condoms are multi-textured (dotted and ribbed) with a rich sweet chocolate aroma. Ideal for enhancing intimacy.',
    ingredients: ['Natural Latex', 'Chocolate scent oil base'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Store cool and dry away from sunlight.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10', 'Pack of 20'],
    wellnessBrand: 'Manforce',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '10',
    wellnessLubrication: 'Flavoured Lubricated',
    wellnessTexture: 'Ribbed & Dotted',
    wellnessFlavor: 'Chocolate',
    wellnessVerified: true,
    wellnessSku: 'SKU-MANFORCE-CHOCO-10',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'Chocolate flavored silicone oil base',
      texture: 'Ribbed and Dotted multi-texture',
      sizeFit: '53mm Nominal Width, straight-walled',
      flavor: 'Chocolate',
      storage: 'Store in cool dark dry place.',
      manufacturer: 'Mankind Pharma Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-8',
    name: 'Manforce Strawberry Flavoured Condoms',
    category: 'wellness',
    price: 120,
    originalPrice: 150,
    discount: 20,
    rating: 4.5,
    reviewCount: 224,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Manforce Strawberry flavoured condoms combine ribbed and dotted textures with a refreshing strawberry fragrance. Electronically tested for maximum safety.',
    ingredients: ['Natural Latex', 'Strawberry scent oil base'],
    allergens: ['Latex Allergy Warning'],
    storageInstructions: 'Keep in dry cabinet.',
    occasions: ['Just Because'],
    variants: ['Pack of 3', 'Pack of 10', 'Pack of 20'],
    wellnessBrand: 'Manforce',
    wellnessType: 'Condoms',
    wellnessMaterial: 'Natural Rubber Latex',
    wellnessPackSize: '10',
    wellnessLubrication: 'Flavoured Lubricated',
    wellnessTexture: 'Ribbed & Dotted',
    wellnessFlavor: 'Strawberry',
    wellnessVerified: true,
    wellnessSku: 'SKU-MANFORCE-STRAW-10',
    wellnessDetails: {
      material: 'Natural Rubber Latex',
      lubrication: 'Strawberry flavored silicone oil base',
      texture: 'Ribbed and Dotted multi-texture',
      sizeFit: '53mm Nominal Width',
      flavor: 'Strawberry',
      storage: 'Keep in dry cupboard.',
      manufacturer: 'Mankind Pharma Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-9',
    name: 'Clean and Dry Intimate Wash',
    category: 'wellness',
    price: 179,
    originalPrice: 199,
    discount: 10,
    rating: 4.5,
    reviewCount: 142,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '15-20 mins',
    inStock: true,
    description: 'Clean and Dry Intimate Wash is a daily pH-balanced wash enriched with tea tree oil and vitamins. Cleanses gently to help prevent irritation, odor, and itching.',
    ingredients: ['Soap-free base', 'Lactic Acid', 'Tea Tree Leaf Oil', 'Vitamins'],
    allergens: ['Sulfate-Free', 'Paraben-Free'],
    storageInstructions: 'For external wash only. Keep in cool dry bathroom cabinet.',
    occasions: ['Just Because'],
    variants: ['100 ml Bottle'],
    wellnessBrand: 'Clean & Dry',
    wellnessType: 'Intimate Care',
    wellnessMaterial: 'pH Wash Base',
    wellnessPackSize: '100ml',
    wellnessLubrication: 'Mild Foaming Wash',
    wellnessTexture: 'Liquid Wash',
    wellnessVerified: true,
    wellnessSku: 'SKU-CD-WASH-100',
    wellnessDetails: {
      material: 'Soap-free organic base',
      lubrication: 'pH-balanced gentle foaming wash',
      texture: 'Smooth liquid wash',
      sizeFit: '100 ml Bottle',
      storage: 'Store in cool place. Avoid direct contact with eyes.',
      manufacturer: 'Midas Care Pharmaceuticals Pvt Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'well-10',
    name: 'KamaSutra Silky Water-Based Lubricant',
    category: 'wellness',
    price: 299,
    originalPrice: 349,
    discount: 14,
    rating: 4.7,
    reviewCount: 112,
    image: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=600&auto=format&fit=crop&q=80',
    deliveryTime: '20-30 mins',
    inStock: true,
    description: 'KamaSutra Silky water-based lubricant provides velvet smooth personal lubrication. Condom compatible, easy to wash, and neutral pH formulation.',
    ingredients: ['Purified Water Base', 'Glycerin', 'Propylene Glycol'],
    allergens: ['Hypoallergenic'],
    storageInstructions: 'Close cap tight after use. Store at room temperature.',
    occasions: ['Just Because'],
    variants: ['50 ml Tube'],
    wellnessBrand: 'KamaSutra',
    wellnessType: 'Lubricants',
    wellnessMaterial: 'Water-Based',
    wellnessPackSize: '50ml',
    wellnessLubrication: 'Water-Soluble Personal Gel',
    wellnessTexture: 'Silky Smooth',
    wellnessVerified: true,
    wellnessSku: 'SKU-KS-LUB-SILKY',
    wellnessDetails: {
      material: 'Water-based personal formulation',
      lubrication: 'Silky personal lubricating gel',
      texture: 'Silky smooth water-based gel',
      sizeFit: '50 ml Tube',
      storage: 'Store at room temperature. Keep cap locked.',
      manufacturer: 'Raymond Consumer Care Ltd'
    },
    gallery: [
      'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=600&auto=format&fit=crop&q=80'
    ]
  }`;

// Find WELLNESS block inside mockData.ts
const startLabel = '// ======================= WELLNESS (10) =======================';
const startIdx = content.indexOf(startLabel);
if (startIdx === -1) {
  console.log("Could not find WELLNESS block start.");
  process.exit(1);
}

// Find the end index which is the end of the array brackets before MOCK_REVIEWS
const endIdx = content.indexOf('];', startIdx);
if (endIdx === -1) {
  console.log("Could not find block end.");
  process.exit(1);
}

// Replace the block
content = content.substring(0, startIdx) + wellnessProducts + '\n  ' + content.substring(endIdx);
fs.writeFileSync(filePath, content, 'utf8');

console.log("Successfully replaced wellness data block in mockData.ts.");
