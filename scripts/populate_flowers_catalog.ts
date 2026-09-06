import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const flowerProducts = [
  {
    id: "pink-rose-birthday-bliss-bouquet",
    name: "Pink Rose Birthday Bliss Bouquet",
    category: "flowers",
    price: 1349,
    originalPrice: 1349,
    discount: 0,
    rating: 4.9,
    reviewCount: 42,
    image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Lush pink roses accented with seasonal filler blooms and celebration gift wrap.",
    description: "An enchanting birthday bouquet handcrafted with blooming pink roses, delicate gypsophila, and lush greenery wrapped in luxury pastel paper.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Trim stems diagonally and place in fresh, cool water away from direct sunlight.",
    occasions: ["Birthday", "Celebration", "Romance"],
    tags: ["Pink Roses", "Birthday Bouquet", "Luxury Flowers", "Fresh Blooms"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "pretty-in-pink-floral-vase",
    name: "Pretty in Pink Floral Vase",
    category: "flowers",
    price: 1649,
    originalPrice: 1649,
    discount: 0,
    rating: 4.8,
    reviewCount: 38,
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Artisan arrangement of fresh pastel pink blooms presented in an elegant glass vase.",
    description: "A showstopping table centerpiece featuring fresh pink garden roses, carnations, and seasonal fillers elegantly pre-arranged in a reusable glass vase.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Replenish water every 2 days to maintain optimal freshness.",
    occasions: ["Birthday", "Anniversary", "Celebration", "Thank You"],
    tags: ["Floral Vase", "Pink Blooms", "Centerpiece", "Vase Included"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "rosy-orchid-celebration-bouquet",
    name: "Rosy Orchid Celebration Bouquet",
    category: "flowers",
    price: 999,
    originalPrice: 999,
    discount: 0,
    rating: 4.9,
    reviewCount: 56,
    image: "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Exotic pink orchids and garden roses hand-tied in premium gift wrap.",
    description: "A harmonious combination of royal dendrobium orchids and velvety roses hand-tied with satin ribbon to elevate every grand celebration.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in a cool, shaded spot and mist orchid florets lightly with water.",
    occasions: ["Birthday", "Celebration", "Anniversary"],
    tags: ["Orchids", "Pink Roses", "Celebration", "Exotic Blooms"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "vivid-love-6-red-roses-bouquet",
    name: "Vivid Love 6 Red Roses Bouquet",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.8,
    reviewCount: 110,
    image: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Six handpicked vibrant crimson red roses wrapped with fresh greenery.",
    description: "Classic declaration of affection featuring 6 hand-selected fresh crimson Dutch roses tied with natural jute wrapping and ribbon.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Place in clean water and trim stem bases every other day.",
    occasions: ["Valentine's Day", "Romance", "Anniversary", "Just Because"],
    tags: ["Red Roses", "Love", "Romantic", "6 Roses"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "yellow-flag-blooms",
    name: "Yellow Flag Blooms",
    category: "flowers",
    price: 949,
    originalPrice: 949,
    discount: 0,
    rating: 4.7,
    reviewCount: 29,
    image: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Radiant sunny yellow blooms designed to bring cheer and warmth to any celebration.",
    description: "Brighten someone special's day with radiant yellow blossoms symbolizing friendship, positivity, and uplifting new beginnings.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in a cool room with fresh water.",
    occasions: ["Congratulations", "Birthday", "Get Well Soon", "Celebration"],
    tags: ["Yellow Blooms", "Sunflowers", "Friendship", "Cheerful"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "lavender-blush-bouquet",
    name: "Lavender Blush Bouquet",
    category: "flowers",
    price: 1249,
    originalPrice: 1249,
    discount: 0,
    rating: 4.9,
    reviewCount: 45,
    image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Delicate lavender tones paired with blush roses and eucalyptus accents.",
    description: "A calming pastel arrangement blending soothing lavender accents, blush spray roses, and silver dollar eucalyptus in imported craft wrap.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Change water every 2 days and keep away from ripening fruits.",
    occasions: ["Birthday", "Anniversary", "Special Moments"],
    tags: ["Lavender", "Blush", "Pastel Bouquet", "Artisanal"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "exotic-blue-orchid-arrangement",
    name: "Exotic Blue Orchid Arrangement",
    category: "flowers",
    price: 699,
    originalPrice: 699,
    discount: 0,
    rating: 4.8,
    reviewCount: 64,
    image: "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Striking rare blue orchids carefully crafted in an exotic contemporary presentation.",
    description: "Captivating tinted blue orchids arranged in minimalist modern wrapping, creating a distinctive impression for upscale gifting.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Store in moderate room temperature with indirect lighting.",
    occasions: ["Celebration", "Congratulations", "Just Because"],
    tags: ["Blue Orchids", "Exotic", "Modern Bouquet", "Rare Blooms"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "ivory-roses-birthday-bouquet",
    name: "Ivory Roses Birthday Bouquet",
    category: "flowers",
    price: 1199,
    originalPrice: 1199,
    discount: 0,
    rating: 4.9,
    reviewCount: 51,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Classic pristine ivory white roses hand-arranged with baby's breath and satin ribbon.",
    description: "Sophisticated and pure, this hand-tied ivory rose bouquet features crisp white blooms surrounded by delicate baby's breath and luxury tissue wrap.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Trim 1-2 cm from stems and keep in cool fresh water.",
    occasions: ["Birthday", "Anniversary", "Congratulations"],
    tags: ["Ivory Roses", "White Roses", "Birthday", "Elegance"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "elegant-pink-rosy-celebration-bouquet",
    name: "Elegant Pink Rosy Celebration Bouquet",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.7,
    reviewCount: 77,
    image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Graceful pink roses enveloped in textured designer paper for festive gifting.",
    description: "A charming bunch of sweet pink roses accented with fresh foliage, perfectly sized for birthday surprises and heartfelt congrats.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in a cool room in fresh water.",
    occasions: ["Birthday", "Celebration", "Thank You"],
    tags: ["Pink Roses", "Celebration", "Pocket Friendly", "Graceful"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "pink-and-white-carnation-hand-tied-bouquet",
    name: "Pink & White Carnation Hand-Tied Bouquet",
    category: "flowers",
    price: 699,
    originalPrice: 699,
    discount: 0,
    rating: 4.8,
    reviewCount: 43,
    image: "https://images.unsplash.com/photo-1587556930799-8dca6a63692a?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1587556930799-8dca6a63692a?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "A timeless hand-tied bunch of ruffled pink and white carnations symbolizing love and gratitude.",
    description: "Long-lasting ruffled carnations in delicate pink and white shades, beautifully layered with seasonal greenery in dual-toned packaging.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Carnations last up to 2 weeks when water is refreshed regularly.",
    occasions: ["Birthday", "Mother's Day", "Congratulations", "Thank You"],
    tags: ["Carnations", "Pink & White", "Long Lasting", "Gratitude"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "blue-stem-edit",
    name: "Blue Stem Edit",
    category: "flowers",
    price: 449,
    originalPrice: 449,
    discount: 0,
    rating: 4.6,
    reviewCount: 31,
    image: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Modern minimalist botanical arrangement featuring distinctive tinted blue stems.",
    description: "An artistic floral edit celebrating serene azure tones and sculptural botanical silhouettes for chic contemporary spaces.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Place in fresh water and keep in ambient light.",
    occasions: ["Just Because", "Congratulations", "Celebration"],
    tags: ["Blue Blooms", "Minimalist", "Botanical", "Modern"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "meadow-sunshine-summer-bloom",
    name: "Meadow Sunshine Summer Bloom",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.8,
    reviewCount: 39,
    image: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Joyful meadow-fresh wildflowers and golden petals bursting with summer brightness.",
    description: "A cheerful burst of golden sun-drenched blooms and meadow greenery hand-tied to spread smiles and warm celebration wishes.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Display in a vase with fresh water.",
    occasions: ["Birthday", "Just Because", "Celebration"],
    tags: ["Sunshine", "Wildflowers", "Summer Blooms", "Cheerful"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "blush-rose-garden",
    name: "Blush Rose Garden",
    category: "flowers",
    price: 949,
    originalPrice: 949,
    discount: 0,
    rating: 4.9,
    reviewCount: 61,
    image: "https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Lush cluster of premium garden-grown blush roses brimming with natural sweet fragrance.",
    description: "A romantic hand-gathered collection of velvety blush pink garden roses enveloped in matte champagne wrapping paper.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Trim stems at an angle and provide fresh clean water daily.",
    occasions: ["Anniversary", "Romance", "Birthday"],
    tags: ["Garden Roses", "Blush", "Romantic", "Fragrant"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "flirtatious-gerberas",
    name: "Flirtatious Gerberas",
    category: "flowers",
    price: 549,
    originalPrice: 549,
    discount: 0,
    rating: 4.7,
    reviewCount: 48,
    image: "https://images.unsplash.com/photo-1508784411316-02b8cd4d3a3a?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1508784411316-02b8cd4d3a3a?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Playful assortment of multi-hued gerbera daisies hand-tied with bright ribbons.",
    description: "Vibrant and cheerful gerbera daisies in bold pops of pink, yellow, orange, and red arranged to bring contagious energy to every celebration.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep shallow water in the vase and refresh frequently.",
    occasions: ["Birthday", "Celebration", "Congratulations"],
    tags: ["Gerberas", "Colorful", "Playful", "Fresh Flowers"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "vibrant-royal-blue-orchid-bouquet",
    name: "Vibrant Royal Blue Orchid Bouquet",
    category: "flowers",
    price: 699,
    originalPrice: 699,
    discount: 0,
    rating: 4.9,
    reviewCount: 72,
    image: "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Majestic deep royal blue dendrobium orchids wrapped in luxurious contrast packaging.",
    description: "A magnificent bunch of deep royal blue orchids paired with crisp white wrapping and blue satin ribbons for high-impact celebratory gifting.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in a cool room away from direct AC draft.",
    occasions: ["Celebration", "Anniversary", "Special Moments"],
    tags: ["Royal Blue", "Orchids", "Luxury", "Statement Bouquet"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "white-orchid-wish",
    name: "White Orchid Wish",
    category: "flowers",
    price: 449,
    originalPrice: 449,
    discount: 0,
    rating: 4.7,
    reviewCount: 35,
    image: "https://images.unsplash.com/photo-1524355865884-84137fe296b8?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1524355865884-84137fe296b8?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Serene and graceful pure white orchid stems representing elegance, peace, and hope.",
    description: "Pristine white phalaenopsis-style orchids presented in serene frosted wrapping, making it a peaceful and graceful token of care.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep florets dry and hydrate stems in clean water.",
    occasions: ["Peace", "Congratulations", "Thank You", "Special Moments"],
    tags: ["White Orchids", "Purity", "Serenity", "Elegant"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "blue-rose-charm-for-him",
    name: "Blue Rose Charm For Him",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.8,
    reviewCount: 54,
    image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Dapper and masculine floral sleeve with electric blue roses tailored for thoughtful gifting.",
    description: "Specially styled for gentlemen, this handsome sleeve features vibrant blue roses with dark slate wrapping and silver ribbon accents.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in water away from heat sources.",
    occasions: ["Birthday", "Anniversary", "Celebration", "For Him"],
    tags: ["For Him", "Blue Roses", "Charm", "Dapper"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "roses-and-checks",
    name: "Roses And Checks",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.8,
    reviewCount: 46,
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Crisp red and pink roses styled in chic checkered boutique wrapping paper.",
    description: "Trendy checkered paper wrap framing rich red and pink roses for a stylish, modern aesthetic that looks breathtaking in photos.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Place in fresh water upon unboxing.",
    occasions: ["Anniversary", "Birthday", "Romance"],
    tags: ["Checkered Wrap", "Trendy", "Red Roses", "Boutique"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "blushing-rose-celebration",
    name: "Blushing Rose Celebration",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.7,
    reviewCount: 39,
    image: "https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Celebratory mix of blushing pink roses with seasonal foliage and party ribbons.",
    description: "A joyful hand-tied bouquet combining fresh blushing pink roses, baby eucalyptus, and sparkling gold ribbon accents.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in water and trim stems regularly.",
    occasions: ["Birthday", "Celebration", "Party"],
    tags: ["Blushing Roses", "Party", "Celebration", "Sweet"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "exotic-single-red-rose",
    name: "Exotic Single Red Rose",
    category: "flowers",
    price: 299,
    originalPrice: 299,
    discount: 0,
    rating: 4.9,
    reviewCount: 88,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "A magnificent single long-stemmed Ecuadorian red rose in a luxury presentation sleeve.",
    description: "An iconic symbol of true romance, this premium long-stem red rose comes individually sleeved with a golden seal and water vial.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Water vial attached for 24h hydration.",
    occasions: ["Romance", "Valentine's Day", "Just Because"],
    tags: ["Single Rose", "Red Rose", "True Romance", "Classic"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "blushing-roses-anniversary-sleeve",
    name: "Blushing Roses Anniversary Sleeve",
    category: "flowers",
    price: 349,
    originalPrice: 349,
    discount: 0,
    rating: 4.8,
    reviewCount: 63,
    image: "https://images.unsplash.com/photo-1546842931-886c185b4c8c?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1546842931-886c185b4c8c?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Romantic duo of fresh blushing roses wrapped in an exclusive anniversary keepsake sleeve.",
    description: "A petite yet unforgettable anniversary gift pairing twin blush roses with delicate floral fillers in an embossed anniversary sleeve.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Keep in water for long-lasting freshness.",
    occasions: ["Anniversary", "Romance", "Special Moments"],
    tags: ["Anniversary", "Blushing Roses", "Floral Sleeve", "Romance"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  },
  {
    id: "suits-and-roses",
    name: "Suits and Roses",
    category: "flowers",
    price: 499,
    originalPrice: 499,
    discount: 0,
    rating: 4.9,
    reviewCount: 52,
    image: "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=600&q=80"
    ],
    deliveryTime: "Within 12 hours",
    inStock: true,
    shortDescription: "Sophisticated formal bouquet combining premium dark roses with bow-tie suit styling.",
    description: "A debonair floral arrangement featuring deep velvety roses encased in bespoke tuxedo-suit style matte black wrapping.",
    ingredients: [],
    allergens: [],
    storageInstructions: "Place in fresh water and keep in cool temperature.",
    occasions: ["Celebration", "For Him", "Congratulations", "Anniversary"],
    tags: ["Suits and Roses", "Tuxedo Wrap", "For Him", "Gentleman Bouquet"],
    variants: [],
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z"
  }
];

async function main() {
  console.log('=== SEEDING FLOWERS CATALOG ===');

  // 1. Read existing JSON files
  const dbProductsPath = path.resolve(process.cwd(), 'src/data/db/products.json');
  const dataProductsPath = path.resolve(process.cwd(), 'src/data/products.json');

  const existingProducts: any[] = JSON.parse(fs.readFileSync(dbProductsPath, 'utf8'));
  console.log(`Current products in catalog: ${existingProducts.length}`);

  // Filter out any existing flowers if any
  const nonFlowers = existingProducts.filter((p: any) => p.category !== 'flowers' && !flowerProducts.some(f => f.id === p.id));
  console.log(`Preserved non-flower products: ${nonFlowers.length}`);

  // Combine preserved products with 22 new flower products
  const fullCatalog = [...nonFlowers, ...flowerProducts];
  console.log(`New total products in catalog: ${fullCatalog.length}`);

  // Write to both JSON files
  fs.writeFileSync(dbProductsPath, JSON.stringify(fullCatalog, null, 2), 'utf8');
  fs.writeFileSync(dataProductsPath, JSON.stringify(fullCatalog, null, 2), 'utf8');
  console.log('Successfully written updated catalog to db/products.json and products.json');

  // 2. Sync with PostgreSQL directly
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/velmora';
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('.neon.tech') ? { rejectUnauthorized: false } : undefined
  });

  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully.');

    // Insert or update all 22 flower products
    for (const f of flowerProducts) {
      await client.query(`
        INSERT INTO products (
          id, name, description, shortdescription, price, originalprice, discount, image, gallery,
          category, subcategory, rating, reviewcount, instock, deliverytime,
          ingredients, allergens, storageinstructions, occasions, variants, tags, createdat, updatedat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          shortdescription = EXCLUDED.shortdescription,
          price = EXCLUDED.price,
          originalprice = EXCLUDED.originalprice,
          discount = EXCLUDED.discount,
          image = EXCLUDED.image,
          gallery = EXCLUDED.gallery,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          rating = EXCLUDED.rating,
          reviewcount = EXCLUDED.reviewcount,
          instock = EXCLUDED.instock,
          deliverytime = EXCLUDED.deliverytime,
          occasions = EXCLUDED.occasions,
          variants = EXCLUDED.variants,
          tags = EXCLUDED.tags,
          updatedat = EXCLUDED.updatedat
      `, [
        f.id, f.name, f.description, f.shortDescription, f.price, f.originalPrice, f.discount,
        f.image, JSON.stringify(f.gallery), f.category, null,
        f.rating, f.reviewCount, f.inStock, f.deliveryTime,
        JSON.stringify(f.ingredients), JSON.stringify(f.allergens), f.storageInstructions,
        JSON.stringify(f.occasions), JSON.stringify(f.variants), JSON.stringify(f.tags),
        f.createdAt, f.updatedAt
      ]);
    }
    console.log('Successfully upserted 22 flower products in PostgreSQL products table.');

    // Verify PostgreSQL catalog
    const countRes = await client.query('SELECT count(*) as total, count(*) FILTER (WHERE category = $1) as flowers_count FROM products', ['flowers']);
    console.log(`PostgreSQL Table Summary: Total=${countRes.rows[0].total}, Flowers=${countRes.rows[0].flowers_count}`);

    client.release();
  } catch (pgErr) {
    console.warn('PostgreSQL direct sync notice (schema ensure will also sync on app start):', pgErr);
  } finally {
    await pool.end().catch(() => {});
  }

  console.log('=== SEEDING FLOWERS CATALOG COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
