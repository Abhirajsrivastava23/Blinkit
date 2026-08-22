import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SEED_DIR = path.join(process.cwd(), 'src/data/db');
const DB_DIR = process.env.NODE_ENV === 'production' || process.env.VERCEL
  ? '/tmp/fatafat_db'
  : SEED_DIR;

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

const FILE_NAMES: Record<string, string> = {
  products: 'products.json',
  categories: 'categories.json',
  brands: 'brands.json',
  auditLogs: 'audit_logs.json',
  homepage: 'homepage.json',
  users: 'users.json',
  orders: 'orders.json',
  admin: 'admin.json',
  partners: 'partners.json',
  sessions: 'sessions.json',
  inventoryIssues: 'inventory_issues.json'
};

function ensureFileExists(key: keyof typeof PATHS) {
  const filePath = PATHS[key];
  if (!fs.existsSync(filePath)) {
    const seedPath = path.join(SEED_DIR, FILE_NAMES[key]);
    if (fs.existsSync(seedPath)) {
      try {
        fs.copyFileSync(seedPath, filePath);
      } catch (err) {
        console.error(`Failed to copy seed file for ${key}:`, err);
      }
    } else {
      if (key === 'homepage') {
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
        fs.writeFileSync(filePath, JSON.stringify(defaultHomepage, null, 2), 'utf8');
      } else if (key === 'categories') {
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
        fs.writeFileSync(filePath, JSON.stringify(initialCategories, null, 2), 'utf8');
      } else if (key === 'brands') {
        const initialBrands = [
          { id: 'brand-1', name: 'FATAFAT', description: 'FATAFAT signature luxury craft brand', status: 'Active', website: 'https://fatafat.com' },
          { id: 'brand-2', name: 'Durex', description: 'Verified Reckitt sexual wellbeing brand', status: 'Active', website: 'https://durex.com' },
          { id: 'brand-3', name: 'KamaSutra', description: 'Raymond consumer care intimacy brand', status: 'Active', website: 'https://kamasutra.co.in' },
          { id: 'brand-4', name: 'Skore', description: 'TTK protective devices flavor condom brand', status: 'Active', website: 'https://skore.com' },
          { id: 'brand-5', name: 'Manforce', description: 'Mankind pharma premium flavored condom brand', status: 'Active', website: 'https://manforce.com' }
        ];
        fs.writeFileSync(filePath, JSON.stringify(initialBrands, null, 2), 'utf8');
      } else {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
      }
    }
  }
}

// Seed default products if not exists
ensureFileExists('products');

// Seed default categories
ensureFileExists('categories');

// Seed default brands
ensureFileExists('brands');

// Seed default activity logs
ensureFileExists('auditLogs');

// Seed default homepage settings
ensureFileExists('homepage');

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
ensureFileExists('admin');
const adminList: AdminRecord[] = fs.existsSync(PATHS.admin) ? JSON.parse(fs.readFileSync(PATHS.admin, 'utf8')) : [];

const getRuntimeSalt = () => process.env['AUTH_SECRET'] || 'fatafat_salt';

const getSeededAdmins = (): AdminRecord[] => {
  const salt = getRuntimeSalt();
  const hash = crypto.createHash('sha256').update('admin123' + salt).digest('hex');
  return [
    { email: 'superadmin@fatafat.com', passwordHash: hash, name: 'FATAFAT Super Admin', phone: '9999999990', role: 'admin' },
    { email: 'admin@fatafat.com', passwordHash: hash, name: 'FATAFAT Ops Admin', phone: '9999999991', role: 'admin' },
    { email: 'manager@fatafat.com', passwordHash: hash, name: 'FATAFAT Inv Manager', phone: '9999999992', role: 'admin' },
    { email: 'admin@fatafat.local', passwordHash: hash, name: 'Local Dev Admin', phone: '9999999993', role: 'admin' }
  ];
};

const defaultAdmins = getSeededAdmins();

let adminUpdated = false;
for (const defAdmin of defaultAdmins) {
  const existingIdx = adminList.findIndex((a) => a.email.toLowerCase() === defAdmin.email.toLowerCase());
  if (existingIdx === -1) {
    adminList.push(defAdmin);
    adminUpdated = true;
  } else {
    if (adminList[existingIdx].passwordHash !== defAdmin.passwordHash) {
      adminList[existingIdx].passwordHash = defAdmin.passwordHash;
      adminUpdated = true;
    }
  }
}
if (adminUpdated || !fs.existsSync(PATHS.admin)) {
  fs.writeFileSync(PATHS.admin, JSON.stringify(adminList, null, 2), 'utf8');
}

// Seed delivery partners with location rules
ensureFileExists('partners');
const partnerList: PartnerRecord[] = fs.existsSync(PATHS.partners) ? JSON.parse(fs.readFileSync(PATHS.partners, 'utf8')) : [];

const getSeededPartners = (): PartnerRecord[] => {
  const salt = getRuntimeSalt();
  const hash = crypto.createHash('sha256').update('rider123' + salt).digest('hex');
  return [
    {
      id: 'DP-001',
      name: 'Rahul',
      phone: '9999999999',
      email: 'rider@fatafat.com',
      passwordHash: hash,
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
      passwordHash: hash,
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
      passwordHash: hash,
      role: 'delivery_partner',
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao',
      status: 'Active',
      isOnline: true
    }
  ];
};

const defaultPartners = getSeededPartners();

let partnerUpdated = false;
for (const defPartner of defaultPartners) {
  const existingIdx = partnerList.findIndex((p) => p.id.toLowerCase() === defPartner.id.toLowerCase() || p.email.toLowerCase() === defPartner.email.toLowerCase());
  if (existingIdx === -1) {
    partnerList.push(defPartner);
    partnerUpdated = true;
  } else {
    if (partnerList[existingIdx].passwordHash !== defPartner.passwordHash) {
      partnerList[existingIdx].passwordHash = defPartner.passwordHash;
      partnerUpdated = true;
    }
  }
}
if (partnerUpdated || !fs.existsSync(PATHS.partners)) {
  fs.writeFileSync(PATHS.partners, JSON.stringify(partnerList, null, 2), 'utf8');
}

// Seed sessions table
ensureFileExists('sessions');

// Seed inventory issue reports
ensureFileExists('inventoryIssues');

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
