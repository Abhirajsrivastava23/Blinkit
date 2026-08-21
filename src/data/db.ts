import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  orders: path.join(DB_DIR, 'orders.json'),
  admin: path.join(DB_DIR, 'admin.json'),
  partners: path.join(DB_DIR, 'partners.json'),
  sessions: path.join(DB_DIR, 'sessions.json'),
  inventoryIssues: path.join(DB_DIR, 'inventory_issues.json')
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

interface AdminRecord {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: string;
}

interface PartnerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: string;
  locationId: string;
  locationName: string;
  status: string;
  isOnline: boolean;
}

interface AuditLogRecord {
  id: string;
  adminUser: string;
  action: string;
  dateTime: string;
  product: string;
  previousValue: string;
  newValue: string;
}

// Seed admin credentials separately & securely
const adminList: AdminRecord[] = fs.existsSync(PATHS.admin) ? JSON.parse(fs.readFileSync(PATHS.admin, 'utf8')) : [];
const adminHash = crypto.createHash('sha256').update('admin123' + 'fatafat_salt').digest('hex');

const defaultAdmins: AdminRecord[] = [
  { email: 'superadmin@fatafat.com', passwordHash: adminHash, name: 'FATAFAT Super Admin', phone: '9999999990', role: 'admin' },
  { email: 'admin@fatafat.com', passwordHash: adminHash, name: 'FATAFAT Ops Admin', phone: '9999999991', role: 'admin' },
  { email: 'manager@fatafat.com', passwordHash: adminHash, name: 'FATAFAT Inv Manager', phone: '9999999992', role: 'admin' },
  { email: 'admin@fatafat.local', passwordHash: adminHash, name: 'Local Dev Admin', phone: '9999999993', role: 'admin' }
];

let adminUpdated = false;
for (const defAdmin of defaultAdmins) {
  if (!adminList.some((a) => a.email.toLowerCase() === defAdmin.email.toLowerCase())) {
    adminList.push(defAdmin);
    adminUpdated = true;
  }
}
if (adminUpdated || !fs.existsSync(PATHS.admin)) {
  fs.writeFileSync(PATHS.admin, JSON.stringify(adminList, null, 2), 'utf8');
}

// Seed delivery partners with location rules
const partnerList: PartnerRecord[] = fs.existsSync(PATHS.partners) ? JSON.parse(fs.readFileSync(PATHS.partners, 'utf8')) : [];
const riderHash = crypto.createHash('sha256').update('rider123' + 'fatafat_salt').digest('hex');

const defaultPartners: PartnerRecord[] = [
  {
    id: 'DP-001',
    name: 'Rahul',
    phone: '9999999999',
    email: 'rider@fatafat.com',
    passwordHash: riderHash,
    role: 'delivery_partner',
    locationId: 'nawabganj-unnao',
    locationName: 'Nawabganj, Unnao',
    status: 'Active',
    isOnline: true
  },
  {
    id: 'DP-002',
    name: 'Aman',
    phone: '8888888888',
    email: 'aman_rider@fatafat.com',
    passwordHash: riderHash,
    role: 'delivery_partner',
    locationId: 'chandigarh-university-up',
    locationName: 'Chandigarh University, Uttar Pradesh',
    status: 'Active',
    isOnline: false
  },
  {
    id: 'DP-003',
    name: 'Rider Local',
    phone: '7777777777',
    email: 'rider@fatafat.local',
    passwordHash: riderHash,
    role: 'delivery_partner',
    locationId: 'nawabganj-unnao',
    locationName: 'Nawabganj, Unnao',
    status: 'Active',
    isOnline: true
  }
];

let partnerUpdated = false;
for (const defPartner of defaultPartners) {
  if (!partnerList.some((p) => p.id.toLowerCase() === defPartner.id.toLowerCase() || p.email.toLowerCase() === defPartner.email.toLowerCase())) {
    partnerList.push(defPartner);
    partnerUpdated = true;
  }
}
if (partnerUpdated || !fs.existsSync(PATHS.partners)) {
  fs.writeFileSync(PATHS.partners, JSON.stringify(partnerList, null, 2), 'utf8');
}

// Seed sessions table
if (!fs.existsSync(PATHS.sessions)) {
  fs.writeFileSync(PATHS.sessions, JSON.stringify([], null, 2), 'utf8');
}

// Seed inventory issue reports
if (!fs.existsSync(PATHS.inventoryIssues)) {
  fs.writeFileSync(PATHS.inventoryIssues, JSON.stringify([], null, 2), 'utf8');
}

// Database helper functions
export const db = {
  // Read any JSON table
  readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues'): T[] {
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
  writeTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues', data: T[]): boolean {
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
  readHomepage(): Record<string, unknown> {
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
  writeHomepage(data: Record<string, unknown>): boolean {
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
    const logs = this.readTable<AuditLogRecord>('auditLogs');
    const newLog: AuditLogRecord = {
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
