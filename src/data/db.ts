import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'src/data/db');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Define File Paths
const PATHS = {
  products: path.join(DB_DIR, 'products.json'),
  categories: path.join(DB_DIR, 'categories.json'),
  brands: path.join(DB_DIR, 'brands.json'),
  auditLogs: path.join(DB_DIR, 'audit_logs.json'),
  homepage: path.join(DB_DIR, 'homepage.json'),
  users: path.join(DB_DIR, 'users.json'),
  orders: path.join(DB_DIR, 'orders.json')
};

// Seed default products if not exists
const baseProductsPath = path.join(process.cwd(), 'src/data/products.json');
if (!fs.existsSync(PATHS.products)) {
  if (fs.existsSync(baseProductsPath)) {
    fs.copyFileSync(baseProductsPath, PATHS.products);
  } else {
    fs.writeFileSync(PATHS.products, JSON.stringify([], null, 2), 'utf8');
  }
}

// Seed default categories
if (!fs.existsSync(PATHS.categories)) {
  const initialCategories = [
    { id: 'cat-1', name: 'Cakes', slug: 'cakes', description: 'Freshly baked designer cakes', status: 'Active' },
    { id: 'cat-2', name: 'Bakery', slug: 'bakery', description: 'Artisanal breads and buns', status: 'Active' },
    { id: 'cat-3', name: 'Pastries', slug: 'pastries', description: 'Single-serve sweet pastries', status: 'Active' },
    { id: 'cat-4', name: 'Flowers', slug: 'flowers', description: 'Luxury fresh flower bouquets', status: 'Active' },
    { id: 'cat-5', name: 'Gifts & Hampers', slug: 'gifts', description: 'Custom styled gift boxes', status: 'Active' },
    { id: 'cat-6', name: 'Chocolates', slug: 'chocolates', description: 'Artisanal chocolate truffles', status: 'Active' },
    { id: 'cat-7', name: 'Celebrations', slug: 'celebrations', description: 'Sparklers, banners and kits', status: 'Active' },
    { id: 'cat-8', name: 'Wellness (18+)', slug: 'wellness', description: 'Discreet and lawful adult-wellness items', status: 'Active' }
  ];
  fs.writeFileSync(PATHS.categories, JSON.stringify(initialCategories, null, 2), 'utf8');
}

// Seed default brands
if (!fs.existsSync(PATHS.brands)) {
  const initialBrands = [
    { id: 'brand-1', name: 'FATAFAT', description: 'FATAFAT signature luxury craft brand', status: 'Active', website: 'https://fatafat.com' },
    { id: 'brand-2', name: 'Durex', description: 'Verified Reckitt sexual wellbeing brand', status: 'Active', website: 'https://durex.com' },
    { id: 'brand-3', name: 'KamaSutra', description: 'Raymond consumer care intimacy brand', status: 'Active', website: 'https://kamasutra.co.in' },
    { id: 'brand-4', name: 'Skore', description: 'TTK protective devices flavor condom brand', status: 'Active', website: 'https://skore.com' },
    { id: 'brand-5', name: 'Manforce', description: 'Mankind pharma premium flavored condom brand', status: 'Active', website: 'https://manforce.com' }
  ];
  fs.writeFileSync(PATHS.brands, JSON.stringify(initialBrands, null, 2), 'utf8');
}

// Seed default activity logs
if (!fs.existsSync(PATHS.auditLogs)) {
  fs.writeFileSync(PATHS.auditLogs, JSON.stringify([], null, 2), 'utf8');
}

// Seed default homepage settings
if (!fs.existsSync(PATHS.homepage)) {
  const defaultHomepage = {
    heroImage: 'https://images.unsplash.com/photo-1464349153735-7db519248a5e?w=1600&auto=format&fit=crop&q=80',
    heroHeading: 'Beautiful Moments. Delivered Fatafat.',
    heroSubheading: 'Fresh cakes, beautiful flowers, thoughtful gifts and celebration essentials — delivered to your doorstep, right when you need them.',
    heroCtaText: 'SHOP NOW',
    heroCtaLink: '/cakes',
    sectionsVisibility: {
      hero: true,
      categories: true,
      moments: true,
      velmoraEdit: true,
      cakeEdit: true,
      flowerEdit: true,
      giftEdit: true,
      combos: true,
      personalisation: true,
      brandStory: true,
      testimonials: true
    }
  };
  fs.writeFileSync(PATHS.homepage, JSON.stringify(defaultHomepage, null, 2), 'utf8');
}

// Database helper functions
export const db = {
  // Read any JSON table
  readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders'): T[] {
    try {
      const filePath = PATHS[key];
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`Error reading database table ${key}:`, err);
      return [];
    }
  },

  // Write any JSON table
  writeTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders', data: T[]): boolean {
    try {
      const filePath = PATHS[key];
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error(`Error writing database table ${key}:`, err);
      return false;
    }
  },

  // Read Homepage config
  readHomepage(): any {
    try {
      if (!fs.existsSync(PATHS.homepage)) return {};
      const content = fs.readFileSync(PATHS.homepage, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading homepage config:', err);
      return {};
    }
  },

  // Write Homepage config
  writeHomepage(data: any): boolean {
    try {
      fs.writeFileSync(PATHS.homepage, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing homepage config:', err);
      return false;
    }
  },

  // Create an audit log entry
  logActivity(adminUser: string, action: string, product: string, previousValue: string, newValue: string) {
    const logs = this.readTable<any>('auditLogs');
    const newLog = {
      id: `log-${Date.now()}`,
      adminUser,
      action,
      dateTime: new Date().toISOString(),
      product,
      previousValue,
      newValue
    };
    logs.unshift(newLog); // Prepend for newest first
    this.writeTable('auditLogs', logs.slice(0, 100)); // Cap logs at 100 for safety
  }
};
