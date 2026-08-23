import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';

export interface AuditLogRecord {
  id: string;
  adminUser: string;
  action: string;
  dateTime: string;
  product: string;
  previousValue: string;
  newValue: string;
}

export interface AdminRecord {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: 'admin';
}

export interface PartnerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: 'delivery_partner';
  locationId: 'nawabganj-unnao' | 'chandigarh-university-up';
  locationName: string;
  status: 'Active' | 'Inactive';
  isOnline: boolean;
}

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// Local filesystem fallback configuration (development only)
const SEED_DIR = path.join(process.cwd(), 'src/data/db');
const DB_DIR = isProduction
  ? '/tmp/fatafat_db'
  : SEED_DIR;

if (!isProduction && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

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
    }
  }
}

// Ensure local fallback files exist in development only
if (!isProduction) {
  ensureFileExists('admin');
  ensureFileExists('partners');
  ensureFileExists('sessions');
  ensureFileExists('inventoryIssues');
}

// MongoDB connection setup
const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let mongoInitError = '';

if (uri) {
  try {
    if (process.env.NODE_ENV === 'development') {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };
      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri);
        globalWithMongo._mongoClientPromise = client.connect();
      }
      clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
  } catch (err: any) {
    console.error('Failed to initialize MongoClient:', err);
    mongoInitError = err.message || String(err);
  }
}

async function getMongoDb(): Promise<Db | null> {
  if (!clientPromise) return null;
  try {
    const connectedClient = await clientPromise;
    return connectedClient.db(process.env.MONGODB_DB || 'fatafat');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    return null;
  }
}

// Seeding tracker for MongoDB
let isSeeding = false;
let isSeeded = false;

const getRuntimeSalt = () => process.env['AUTH_SECRET'] || 'fatafat_salt';

async function ensureMongoSeeded(mongoDb: Db) {
  if (isSeeded || isSeeding) return;
  isSeeding = true;
  try {
    const salt = getRuntimeSalt();
    const hash = crypto.createHash('sha256').update('admin123' + salt).digest('hex');
    const riderHash = crypto.createHash('sha256').update('rider123' + salt).digest('hex');

    for (const key of Object.keys(PATHS) as Array<keyof typeof PATHS>) {
      const collection = mongoDb.collection(key);
      const count = await collection.countDocuments();
      if (count === 0) {
        let seedData: any[] = [];
        
        // Custom seeding rules for admin/partners hashes with active salts
        if (key === 'admin') {
          seedData = [
            { email: 'superadmin@fatafat.com', passwordHash: hash, name: 'FATAFAT Super Admin', phone: '9999999990', role: 'admin' },
            { email: 'admin@fatafat.com', passwordHash: hash, name: 'FATAFAT Ops Admin', phone: '9999999991', role: 'admin' },
            { email: 'manager@fatafat.com', passwordHash: hash, name: 'FATAFAT Inv Manager', phone: '9999999992', role: 'admin' },
            { email: 'admin@fatafat.local', passwordHash: hash, name: 'Local Dev Admin', phone: '9999999993', role: 'admin' }
          ];
        } else if (key === 'partners') {
          seedData = [
            { id: 'DP-001', name: 'Rahul', phone: '9999999999', email: 'rider@fatafat.com', passwordHash: riderHash, role: 'delivery_partner', locationId: 'nawabganj-unnao', locationName: 'Nawabganj, Unnao', status: 'Active', isOnline: true },
            { id: 'DP-002', name: 'Aman', phone: '8888888888', email: 'aman_rider@fatafat.com', passwordHash: riderHash, role: 'delivery_partner', locationId: 'chandigarh-university-up', locationName: 'Chandigarh University, Uttar Pradesh', status: 'Active', isOnline: false },
            { id: 'DP-003', name: 'Rider Local', phone: '7777777777', email: 'rider@fatafat.local', passwordHash: riderHash, role: 'delivery_partner', locationId: 'nawabganj-unnao', locationName: 'Nawabganj, Unnao', status: 'Active', isOnline: true }
          ];
        } else {
          // Read from seed JSON files
          const seedFilePath = path.join(SEED_DIR, FILE_NAMES[key]);
          if (fs.existsSync(seedFilePath)) {
            const content = fs.readFileSync(seedFilePath, 'utf8');
            seedData = JSON.parse(content);
          }
        }

        // Filter out any mock/test orders
        if (key === 'orders' && Array.isArray(seedData)) {
          seedData = seedData.filter((o: any) => o && o.id && !o.id.startsWith('FT-TEST-'));
        }

        if (Array.isArray(seedData) && seedData.length > 0) {
          await collection.insertMany(seedData);
          console.log(`Seeded MongoDB collection "${key}" successfully.`);
        }
      }
    }

    // Seed homepage config
    const configCol = mongoDb.collection('config');
    const homepageDoc = await configCol.findOne({ key: 'homepage' });
    if (!homepageDoc) {
      const seedFilePath = path.join(SEED_DIR, 'homepage.json');
      if (fs.existsSync(seedFilePath)) {
        const content = fs.readFileSync(seedFilePath, 'utf8');
        const data = JSON.parse(content);
        await configCol.updateOne(
          { key: 'homepage' },
          { $set: { ...data } },
          { upsert: true }
        );
        console.log('Seeded homepage config successfully.');
      }
    }

    isSeeded = true;
  } catch (err) {
    console.error('Failed to seed MongoDB:', err);
  } finally {
    isSeeding = false;
  }
}

// Database helper functions (asynchronous wrapper)
export const db = {
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (mongoInitError) {
      return { ok: false, error: `MongoClient initialization failed: ${mongoInitError}` };
    }
    try {
      const mongoDb = await getMongoDb();
      if (!mongoDb) {
        return { ok: false, error: 'MongoClient is not configured or connection URI is missing' };
      }
      await mongoDb.collection('users').countDocuments();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  },

  // Read any table (supports MongoDB with filesystem fallback)
  async readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues'): Promise<T[]> {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      await ensureMongoSeeded(mongoDb);
      try {
        const collection = mongoDb.collection(key);
        const docs = await collection.find({}).toArray();
        return docs.map(d => {
          const { _id, ...rest } = d;
          return rest;
        }) as unknown as T[];
      } catch (err) {
        console.error(`MongoDB error reading table ${key}:`, err);
        throw err;
      }
    }

    if (isProduction) {
      throw new Error(`Database connection failed in production mode for reading table: ${key}`);
    }

    // Local JSON DB fallback
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

  // Write any table (supports MongoDB with filesystem fallback)
  async writeTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues', data: T[]): Promise<boolean> {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      await ensureMongoSeeded(mongoDb);
      try {
        const collection = mongoDb.collection(key);
        await collection.deleteMany({});
        if (data.length > 0) {
          const docs = data.map(item => ({ ...item }));
          await collection.insertMany(docs as any);
        }
        return true;
      } catch (err) {
        console.error(`MongoDB error writing table ${key}:`, err);
        return false;
      }
    }

    if (isProduction) {
      throw new Error(`Database connection failed in production mode for writing table: ${key}`);
    }

    // Local JSON DB fallback
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
  async readHomepage(): Promise<Record<string, unknown>> {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      await ensureMongoSeeded(mongoDb);
      try {
        const collection = mongoDb.collection('config');
        const doc = await collection.findOne({ key: 'homepage' });
        if (doc) {
          const { _id, key, ...config } = doc;
          return config;
        }
        return {};
      } catch (err) {
        console.error('MongoDB error reading homepage config:', err);
        return {};
      }
    }

    if (isProduction) {
      throw new Error(`Database connection failed in production mode for reading homepage config`);
    }

    // Local JSON DB fallback
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
  async writeHomepage(data: Record<string, unknown>): Promise<boolean> {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      await ensureMongoSeeded(mongoDb);
      try {
        const collection = mongoDb.collection('config');
        await collection.updateOne(
          { key: 'homepage' },
          { $set: { ...data } },
          { upsert: true }
        );
        return true;
      } catch (err) {
        console.error('MongoDB error writing homepage config:', err);
        return false;
      }
    }

    if (isProduction) {
      throw new Error(`Database connection failed in production mode for writing homepage config`);
    }

    // Local JSON DB fallback
    try {
      fs.writeFileSync(PATHS.homepage, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing homepage config:', err);
      return false;
    }
  },

  // Create an audit log entry
  async logActivity(adminUser: string, action: string, product: string, previousValue: string, newValue: string) {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      await ensureMongoSeeded(mongoDb);
      try {
        const collection = mongoDb.collection('auditLogs');
        const newLog = {
          id: `log-${Date.now()}`,
          adminUser,
          action,
          dateTime: new Date().toISOString(),
          product,
          previousValue,
          newValue
        };
        await collection.insertOne(newLog);
        return;
      } catch (err) {
        console.error('MongoDB error logging activity:', err);
      }
    }

    if (isProduction) {
      console.error('Database connection failed in production mode for logging activity');
      return;
    }

    // Local JSON DB fallback
    const logs = await this.readTable<AuditLogRecord>('auditLogs');
    const newLog: AuditLogRecord = {
      id: `log-${Date.now()}`,
      adminUser,
      action,
      dateTime: new Date().toISOString(),
      product,
      previousValue,
      newValue
    };
    logs.unshift(newLog);
    await this.writeTable('auditLogs', logs.slice(0, 100));
  }
};
