import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

import productsJson from './db/products.json';
import categoriesJson from './db/categories.json';
import brandsJson from './db/brands.json';
import homepageJson from './db/homepage.json';
import inventoryIssuesJson from './db/inventory_issues.json';
import auditLogsJson from './db/audit_logs.json';
import ordersJson from './db/orders.json';
import sessionsJson from './db/sessions.json';
import partnersJson from './db/partners.json';
import usersJson from './db/users.json';
import adminJson from './db/admin.json';
import { resolveImageUrl } from '../utils/imageUtils';
import { Product } from './mockData';


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



// Clean connection string using URL parser to preserve query params while removing sslmode
function getSanitizedConnectionString(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    return url.toString();
  } catch {
    return raw;
  }
}

let pool: Pool | null = null;
let dbInitError = '';

export function getPool(): Pool | null {
  const globalWithPg = global as typeof globalThis & {
    _pgPool?: Pool;
  };
  if (globalWithPg._pgPool) {
    pool = globalWithPg._pgPool;
    return pool;
  }

  const rawConnectionString = (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRESQL_URL ||
    ''
  ).trim();

  if (!rawConnectionString) {
    return null;
  }

  try {
    const isLocal = rawConnectionString.includes('localhost') || rawConnectionString.includes('127.0.0.1');
    if (!isLocal && typeof process !== 'undefined') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const connectionString = getSanitizedConnectionString(rawConnectionString);
    globalWithPg._pgPool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      max: 20,
      ssl: isLocal ? false : {
        rejectUnauthorized: false
      }
    });
    pool = globalWithPg._pgPool;
    ensureDbSchema(pool).catch(() => {});
    return pool;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    dbInitError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

let schemaEnsured = false;
export async function ensureDbSchema(p: Pool): Promise<void> {
  if (schemaEnsured) return;
  try {
    // 1. Ensure required columns in orders table
    await p.query(`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentVerifiedAt" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentSubmittedAt" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentRejectedAt" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "statusHistory" JSONB;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryLocationId" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryLocationName" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryOtp" TEXT;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "otpFailedAttempts" INTEGER DEFAULT 0;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TEXT;
    `).catch(() => {});

    // 2. Ensure payment_transactions table exists with indexes
    await p.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        id TEXT PRIMARY KEY,
        "orderId" TEXT,
        "customerId" TEXT,
        amount NUMERIC,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'PENDING',
        method TEXT,
        provider TEXT,
        "transactionReference" TEXT,
        utr TEXT,
        "proofImageUrl" TEXT,
        "submittedAt" TEXT,
        "verifiedAt" TEXT,
        "verifiedBy" TEXT,
        "rejectedAt" TEXT,
        "rejectedBy" TEXT,
        "rejectionReason" TEXT,
        "paymentProofType" TEXT,
        "paymentProofSize" NUMERIC,
        "createdAt" TEXT,
        "updatedAt" TEXT,
        "paidAt" TEXT,
        "failureReason" TEXT,
        "attemptCount" INTEGER DEFAULT 0,
        "lastAttemptAt" TEXT,
        metadata JSONB,
        "razorpayOrderId" TEXT,
        "razorpayPaymentId" TEXT,
        "razorpaySignature" TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_payment_order_id ON "payment_transactions" ("orderId");
      CREATE INDEX IF NOT EXISTS idx_payment_rzp_order ON "payment_transactions" ("razorpayOrderId");
      CREATE INDEX IF NOT EXISTS idx_payment_rzp_pay ON "payment_transactions" ("razorpayPaymentId");
    `).catch(() => {});

    // 3. Ensure sessions table exists with indexes
    await p.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sessionId" TEXT PRIMARY KEY,
        "userId" TEXT,
        "email" TEXT,
        "role" TEXT,
        "expiresAt" TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON "sessions" ("userId");
    `).catch(() => {});

    schemaEnsured = true;
  } catch (err) {
    console.warn('[DB SCHEMA WARNING] Could not verify schema extensions:', err);
  }
}

// Initial pool check
getPool();

const globalForDb = globalThis as unknown as {
  _inMemoryData?: Record<string, Record<string, unknown>[]>;
  _inMemoryConfig?: Record<string, unknown>;
  _pgPool?: Pool;
};

if (!globalForDb._inMemoryData) {
  globalForDb._inMemoryData = {
    products: [...productsJson],
    categories: [...categoriesJson],
    brands: [...brandsJson],
    inventoryIssues: [...inventoryIssuesJson],
    auditLogs: [...auditLogsJson],
    orders: [...ordersJson],
    sessions: [...sessionsJson],
    partners: [...partnersJson],
    users: [...usersJson],
    admin: [...adminJson],
    payment_transactions: [],
    product_image_history: [],
    coupons: [],
    coupon_usages: [],
  };
}

const inMemoryData = globalForDb._inMemoryData;

if (!globalForDb._inMemoryConfig) {
  globalForDb._inMemoryConfig = {
    wellness_settings: { published: false },
    homepage: homepageJson
  };
}

const inMemoryConfig = globalForDb._inMemoryConfig;

const ALLOWED_COLUMNS: Record<string, string[]> = {
  categories: ['id', 'name', 'slug', 'description', 'status', 'image', 'itemCount'],
  brands: ['id', 'name', 'slug', 'description', 'status', 'website', 'logo', 'itemCount'],
  products: [
    'id', 'name', 'description', 'price', 'originalPrice', 'discount', 'image', 'gallery',
    'category', 'subCategory', 'brand', 'rating', 'reviewCount', 'reviews', 'stock', 'unit',
    'inStock', 'deliveryTime', 'ingredients', 'allergens', 'storageInstructions', 'occasions',
    'variants', 'wellnessBrand', 'wellnessType', 'wellnessMaterial', 'wellnessPackSize',
    'wellnessTexture', 'wellnessFlavor', 'wellnessVerified', 'wellnessSku', 'wellnessDetails',
    'isWellness', 'wellnessAgeVerifyRequired', 'tags', 'createdAt', 'updatedAt'
  ],
  users: ['userId', 'googleProviderId', 'name', 'email', 'profileImage', 'createdAt', 'lastLoginAt', 'wellnessAccessStatus', 'wellnessRequestId', 'wellnessApprovedAt', 'wellnessApprovedBy', 'phone', 'dob', 'gender', 'addresses'],
  sessions: ['sessionId', 'userId', 'email', 'role', 'expiresAt'],
  admin: ['email', 'passwordHash', 'name', 'phone', 'role'],
  partners: ['id', 'name', 'phone', 'email', 'passwordHash', 'role', 'locationId', 'locationName', 'status', 'isOnline'],
  config: ['key', 'data'],
  inventoryIssues: ['id', 'productId', 'productName', 'issue', 'status', 'createdAt'],
  auditLogs: ['id', 'adminUser', 'action', 'dateTime', 'product', 'previousValue', 'newValue'],
  orders: [
    'id', 'customerId', 'customerEmail', 'items', 'subtotal', 'deliveryFee', 'discount', 'total', 'couponCode',
    'address', 'status', 'deliveryOption', 'deliveryTimeSlot', 'eta', 'createdAt', 'updatedAt',
    'deliveryLocationId', 'deliveryLocationName', 'deliveryOtp', 'otpFailedAttempts', 'otpExpiresAt',
    'statusHistory', 'assignedPartnerId', 'assignedPartnerName', 'assignedAt',
    'paymentStatus', 'paymentMethod', 'paymentId', 'scheduledDeliveryAt',
    'cancellationReason', 'cancelledAt', 'delivery_otp_verified', 'otp_verified_at',
    'verified_by_partner_id', 'delivery_completed_at', 'adminOverride',
    'utr', 'proofImageUrl', 'paymentSubmittedAt', 'paymentVerifiedAt', 'paymentRejectedAt', 'rejectionReason',
    'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'
  ],
  product_image_history: ['id', 'productId', 'storagePath', 'imageUrl', 'uploadedBy', 'uploadedByRole', 'uploadedAt', 'previousImage', 'isActive'],
  payment_transactions: ['id', 'orderId', 'customerId', 'amount', 'currency', 'status', 'method', 'provider', 'transactionReference', 'utr', 'proofImageUrl', 'submittedAt', 'verifiedAt', 'verifiedBy', 'rejectedAt', 'rejectedBy', 'rejectionReason', 'paymentProofType', 'paymentProofSize', 'createdAt', 'updatedAt', 'paidAt', 'failureReason', 'attemptCount', 'lastAttemptAt', 'metadata', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
  coupons: ['id', 'code', 'discountType', 'discountValue', 'minSpend', 'maxDiscount', 'startDate', 'expiryDate', 'isActive', 'usageLimit', 'usageCount', 'perCustomerLimit', 'targetAudience', 'selectedCustomerIds', 'createdAt', 'updatedAt', 'createdBy'],
  coupon_usages: ['id', 'couponId', 'couponCode', 'customerId', 'customerEmail', 'orderId', 'discountAmount', 'usedAt']
};

export function normalizeProductRecord(row: Record<string, unknown> | Product | any): Product {
  if (!row || typeof row !== 'object') return row as unknown as Product;
  const parsed: Record<string, any> = { ...row };

  // Parse JSON fields safely if stringified
  for (const col of ['gallery', 'tags', 'ingredients', 'allergens', 'occasions', 'variants', 'wellnessDetails', 'wellnessdetails']) {
    const val = parsed[col];
    if (typeof val === 'string') {
      try {
        parsed[col] = JSON.parse(val);
      } catch {
        parsed[col] = val;
      }
    }
  }

  // Handle lowercase PostgreSQL column aliases
  if (parsed.originalprice !== undefined && parsed.originalPrice === undefined) parsed.originalPrice = parsed.originalprice;
  if (parsed.subcategory !== undefined && parsed.subCategory === undefined) parsed.subCategory = parsed.subcategory;
  if (parsed.deliverytime !== undefined && parsed.deliveryTime === undefined) parsed.deliveryTime = parsed.deliverytime;
  if (parsed.instock !== undefined && parsed.inStock === undefined) parsed.inStock = parsed.instock;
  if (parsed.reviewcount !== undefined && parsed.reviewCount === undefined) parsed.reviewCount = parsed.reviewcount;
  if (parsed.wellnessbrand !== undefined && parsed.wellnessBrand === undefined) parsed.wellnessBrand = parsed.wellnessbrand;
  if (parsed.wellnesstype !== undefined && parsed.wellnessType === undefined) parsed.wellnessType = parsed.wellnesstype;
  if (parsed.wellnessmaterial !== undefined && parsed.wellnessMaterial === undefined) parsed.wellnessMaterial = parsed.wellnessmaterial;
  if (parsed.wellnesspacksize !== undefined && parsed.wellnessPackSize === undefined) parsed.wellnessPackSize = parsed.wellnesspacksize;
  if (parsed.wellnesslubrication !== undefined && parsed.wellnessLubrication === undefined) parsed.wellnessLubrication = parsed.wellnesslubrication;
  if (parsed.wellnesstexture !== undefined && parsed.wellnessTexture === undefined) parsed.wellnessTexture = parsed.wellnesstexture;
  if (parsed.wellnessflavor !== undefined && parsed.wellnessFlavor === undefined) parsed.wellnessFlavor = parsed.wellnessflavor;
  if (parsed.wellnessverified !== undefined && parsed.wellnessVerified === undefined) parsed.wellnessVerified = parsed.wellnessverified;
  if (parsed.wellnesssku !== undefined && parsed.wellnessSku === undefined) parsed.wellnessSku = parsed.wellnesssku;
  if (parsed.wellnessdetails !== undefined && parsed.wellnessDetails === undefined) parsed.wellnessDetails = parsed.wellnessdetails;
  if (parsed.storageinstructions !== undefined && parsed.storageInstructions === undefined) parsed.storageInstructions = parsed.storageinstructions;
  if (parsed.isegglessdefault !== undefined && parsed.isEgglessDefault === undefined) parsed.isEgglessDefault = parsed.isegglessdefault;
  if (parsed.egglessavailable !== undefined && parsed.egglessAvailable === undefined) parsed.egglessAvailable = parsed.egglessavailable;

  parsed.id = String(parsed.id || '').trim();
  parsed.name = String(parsed.name || '').trim();
  parsed.category = String(parsed.category || 'cakes') as any;
  parsed.price = Number(parsed.price || 0);
  parsed.originalPrice = Number(parsed.originalPrice || parsed.price || 0);
  parsed.discount = parsed.discount !== undefined ? Number(parsed.discount) : (parsed.originalPrice > parsed.price ? Math.round(((parsed.originalPrice - parsed.price) / parsed.originalPrice) * 100) : 0);
  parsed.rating = Number(parsed.rating || 4.5);
  parsed.reviewCount = Number(parsed.reviewCount || parsed.reviews || 0);
  parsed.image = resolveImageUrl(String(parsed.image || ''), parsed.category);
  parsed.gallery = Array.isArray(parsed.gallery) && parsed.gallery.length > 0 ? parsed.gallery : [parsed.image];
  parsed.deliveryTime = parsed.deliveryTime || '30-45 mins';
  parsed.inStock = parsed.inStock !== undefined ? Boolean(parsed.inStock) : true;
  parsed.description = String(parsed.description || '');
  parsed.ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : (parsed.wellnessMaterial ? [parsed.wellnessMaterial] : ['Premium Ingredients']);
  parsed.allergens = Array.isArray(parsed.allergens) ? parsed.allergens : ['Standard warnings apply'];
  parsed.storageInstructions = parsed.storageInstructions || 'Store fresh.';
  parsed.occasions = Array.isArray(parsed.occasions) ? parsed.occasions : ['Just Because'];
  parsed.variants = Array.isArray(parsed.variants) ? parsed.variants : ['Standard'];
  parsed.wellnessBrand = parsed.wellnessBrand || parsed.brand || undefined;
  parsed.wellnessVerified = parsed.wellnessVerified !== undefined ? Boolean(parsed.wellnessVerified) : true;

  return parsed as Product;
}

export function normalizeOrderRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  // Parse JSON fields safely if stringified
  for (const col of ['tags', 'addresses', 'items', 'statusHistory', 'address', 'adminOverride', 'metadata']) {
    const val = parsed[col];
    if (typeof val === 'string') {
      try {
        parsed[col] = JSON.parse(val);
      } catch {
        parsed[col] = val;
      }
    }
  }

  // Guarantee structured array for items
  if (Array.isArray(parsed.items)) {
    parsed.items = parsed.items.map((item: any) => {
      if (!item || typeof item !== 'object') return item;
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      return {
        productId: String(item.productId || item.id || '').trim(),
        id: String(item.id || item.productId || '').trim(),
        name: String(item.name || item.title || 'Product').trim(),
        price,
        quantity: qty,
        image: item.image || item.imageUrl || '',
        unit: item.unit || '',
        category: item.category || undefined,
        subtotal: Number(item.subtotal || (price * qty))
      };
    });
  } else {
    parsed.items = [];
  }

  // Guarantee structured object for address
  if (!parsed.address || typeof parsed.address !== 'object') {
    parsed.address = {};
  }

  // Canonical ID normalization
  parsed.id = String(parsed.id || parsed.ID || '').replace(/^#+/, '').trim();

  // Customer ID & email normalization
  if (parsed.customerid && !parsed.customerId) parsed.customerId = parsed.customerid;
  if (parsed.customeremail && !parsed.customerEmail) parsed.customerEmail = parsed.customeremail;

  // Delivery & Location normalization
  if (parsed.deliverylocationid && !parsed.deliveryLocationId) parsed.deliveryLocationId = parsed.deliverylocationid;
  if (parsed.deliverylocationname && !parsed.deliveryLocationName) parsed.deliveryLocationName = parsed.deliverylocationname;
  if (parsed.deliveryoption && !parsed.deliveryOption) parsed.deliveryOption = parsed.deliveryoption;
  if (parsed.deliverytimeslot && !parsed.deliveryTimeSlot) parsed.deliveryTimeSlot = parsed.deliverytimeslot;
  if (parsed.scheduleddeliveryat && !parsed.scheduledDeliveryAt) parsed.scheduledDeliveryAt = parsed.scheduleddeliveryat;
  if (parsed.deliveryfee !== undefined && parsed.deliveryFee === undefined) parsed.deliveryFee = parsed.deliveryfee;

  // Pricing numbers
  parsed.total = Number(parsed.total || 0);
  parsed.subtotal = Number(parsed.subtotal || 0);
  parsed.deliveryFee = Number(parsed.deliveryFee ?? 0);
  parsed.discount = Number(parsed.discount || 0);

  // OTP fields
  if (parsed.deliveryotp && !parsed.deliveryOtp) parsed.deliveryOtp = parsed.deliveryotp;
  if (parsed.otpfailedattempts !== undefined && parsed.otpFailedAttempts === undefined) parsed.otpFailedAttempts = Number(parsed.otpfailedattempts || 0);
  if (parsed.otpexpiresat && !parsed.otpExpiresAt) parsed.otpExpiresAt = parsed.otpexpiresat;
  if (parsed.deliveryotpverified !== undefined && parsed.delivery_otp_verified === undefined) parsed.delivery_otp_verified = Boolean(parsed.deliveryotpverified);
  if (parsed.otpverifiedat && !parsed.otp_verified_at) parsed.otp_verified_at = parsed.otpverifiedat;
  if (parsed.verifiedbypartnerid && !parsed.verified_by_partner_id) parsed.verified_by_partner_id = parsed.verifiedbypartnerid;
  if (parsed.deliverycompletedat && !parsed.delivery_completed_at) parsed.delivery_completed_at = parsed.deliverycompletedat;
  if (parsed.adminoverride && !parsed.adminOverride) parsed.adminOverride = parsed.adminoverride;

  // Assignment fields (CRITICAL CANONICAL NORMALIZATION)
  if (parsed.assignedpartnerid !== undefined && parsed.assignedPartnerId === undefined) {
    parsed.assignedPartnerId = parsed.assignedpartnerid || null;
  }
  if (parsed.assignedpartnername !== undefined && parsed.assignedPartnerName === undefined) {
    parsed.assignedPartnerName = parsed.assignedpartnername || null;
  }
  if (parsed.assignedat !== undefined && parsed.assignedAt === undefined) {
    parsed.assignedAt = parsed.assignedat || null;
  }
  if (parsed.statushistory && !parsed.statusHistory) parsed.statusHistory = parsed.statushistory;

  // Payment fields
  if (parsed.paymentstatus && !parsed.paymentStatus) parsed.paymentStatus = parsed.paymentstatus;
  if (parsed.paymentmethod && !parsed.paymentMethod) parsed.paymentMethod = parsed.paymentmethod;
  if (parsed.paymentid && !parsed.paymentId) parsed.paymentId = parsed.paymentid;
  if (parsed.proofimageurl && !parsed.proofImageUrl) parsed.proofImageUrl = parsed.proofimageurl;
  if (parsed.paymentsubmittedat && !parsed.paymentSubmittedAt) parsed.paymentSubmittedAt = parsed.paymentsubmittedat;
  if (parsed.paymentverifiedat && !parsed.paymentVerifiedAt) parsed.paymentVerifiedAt = parsed.paymentverifiedat;
  if (parsed.paymentrejectedat && !parsed.paymentRejectedAt) parsed.paymentRejectedAt = parsed.paymentrejectedat;
  if (parsed.rejectionreason && !parsed.rejectionReason) parsed.rejectionReason = parsed.rejectionreason;
  if (parsed.razorpayorderid && !parsed.razorpayOrderId) parsed.razorpayOrderId = parsed.razorpayorderid;
  if (parsed.razorpaypaymentid && !parsed.razorpayPaymentId) parsed.razorpayPaymentId = parsed.razorpaypaymentid;
  if (parsed.razorpaysignature && !parsed.razorpaySignature) parsed.razorpaySignature = parsed.razorpaysignature;
  if (parsed.cancellationreason && !parsed.cancellationReason) parsed.cancellationReason = parsed.cancellationreason;
  if (parsed.cancelledat && !parsed.cancelledAt) parsed.cancelledAt = parsed.cancelledat;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.updatedat && !parsed.updatedAt) parsed.updatedAt = parsed.updatedat;

  return parsed;
}

export function normalizePaymentRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (typeof parsed.metadata === 'string') {
    try {
      parsed.metadata = JSON.parse(parsed.metadata);
    } catch {
      // keep string
    }
  }

  if (parsed.orderid && !parsed.orderId) parsed.orderId = parsed.orderid;
  if (parsed.orderId) parsed.orderId = String(parsed.orderId).replace(/^#+/, '').trim();
  if (parsed.id) parsed.id = String(parsed.id).trim();
  if (parsed.customerid && !parsed.customerId) parsed.customerId = parsed.customerid;
  if (parsed.transactionreference && !parsed.transactionReference) parsed.transactionReference = parsed.transactionreference;
  if (parsed.proofimageurl && !parsed.proofImageUrl) parsed.proofImageUrl = parsed.proofimageurl;
  if (parsed.submittedat && !parsed.submittedAt) parsed.submittedAt = parsed.submittedat;
  if (parsed.verifiedat && !parsed.verifiedAt) parsed.verifiedAt = parsed.verifiedat;
  if (parsed.verifiedby && !parsed.verifiedBy) parsed.verifiedBy = parsed.verifiedby;
  if (parsed.rejectedat && !parsed.rejectedAt) parsed.rejectedAt = parsed.rejectedat;
  if (parsed.rejectedby && !parsed.rejectedBy) parsed.rejectedBy = parsed.rejectedby;
  if (parsed.rejectionreason && !parsed.rejectionReason) parsed.rejectionReason = parsed.rejectionreason;
  if (parsed.paymentprooftype && !parsed.paymentProofType) parsed.paymentProofType = parsed.paymentprooftype;
  if (parsed.paymentproofsize !== undefined && parsed.paymentProofSize === undefined) parsed.paymentProofSize = parsed.paymentproofsize;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.updatedat && !parsed.updatedAt) parsed.updatedAt = parsed.updatedat;
  if (parsed.paidat && !parsed.paidAt) parsed.paidAt = parsed.paidat;
  if (parsed.failurereason && !parsed.failureReason) parsed.failureReason = parsed.failurereason;
  if (parsed.attemptcount !== undefined && parsed.attemptCount === undefined) parsed.attemptCount = Number(parsed.attemptcount || 0);
  if (parsed.lastattemptat && !parsed.lastAttemptAt) parsed.lastAttemptAt = parsed.lastattemptat;
  if (parsed.razorpayorderid && !parsed.razorpayOrderId) parsed.razorpayOrderId = parsed.razorpayorderid;
  if (parsed.razorpaypaymentid && !parsed.razorpayPaymentId) parsed.razorpayPaymentId = parsed.razorpaypaymentid;
  if (parsed.razorpaysignature && !parsed.razorpaySignature) parsed.razorpaySignature = parsed.razorpaysignature;

  parsed.amount = Number(parsed.amount || 0);

  return parsed;
}

export function normalizePartnerRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (parsed.passwordhash && !parsed.passwordHash) parsed.passwordHash = parsed.passwordhash;
  if (parsed.locationid && !parsed.locationId) parsed.locationId = parsed.locationid;
  if (parsed.locationname && !parsed.locationName) parsed.locationName = parsed.locationname;
  if (parsed.isonline !== undefined && parsed.isOnline === undefined) parsed.isOnline = Boolean(parsed.isonline);

  return parsed;
}

export function normalizeCouponRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  parsed.id = String(parsed.id || '').trim();
  parsed.code = String(parsed.code || '').trim().toUpperCase();
  parsed.discountType = String(parsed.discountType || parsed.discounttype || 'percentage').toLowerCase();
  parsed.discountValue = Number(parsed.discountValue ?? parsed.discountvalue ?? 0);
  parsed.minSpend = Number(parsed.minSpend ?? parsed.minspend ?? parsed.minOrderAmount ?? parsed.minorderamount ?? 0);
  parsed.maxDiscount = parsed.maxDiscount !== undefined && parsed.maxDiscount !== null 
    ? Number(parsed.maxDiscount) 
    : (parsed.maxdiscount !== undefined && parsed.maxdiscount !== null 
        ? Number(parsed.maxdiscount) 
        : (parsed.maxDiscountAmount !== undefined && parsed.maxDiscountAmount !== null 
            ? Number(parsed.maxDiscountAmount) 
            : (parsed.maxdiscountamount !== undefined && parsed.maxdiscountamount !== null ? Number(parsed.maxdiscountamount) : undefined)));
  parsed.isActive = parsed.isActive !== undefined 
    ? Boolean(parsed.isActive) 
    : (parsed.isactive !== undefined ? Boolean(parsed.isactive) : true);
  parsed.usageLimit = parsed.usageLimit !== undefined && parsed.usageLimit !== null 
    ? Number(parsed.usageLimit) 
    : (parsed.usagelimit !== undefined && parsed.usagelimit !== null ? Number(parsed.usagelimit) : undefined);
  parsed.usageCount = Number(parsed.usageCount ?? parsed.usagecount ?? 0);
  parsed.perCustomerLimit = parsed.perCustomerLimit !== undefined && parsed.perCustomerLimit !== null 
    ? Number(parsed.perCustomerLimit) 
    : (parsed.percustomerlimit !== undefined && parsed.percustomerlimit !== null ? Number(parsed.percustomerlimit) : undefined);
  parsed.targetAudience = String(parsed.targetAudience || parsed.targetaudience || 'ALL').toUpperCase();

  if (typeof parsed.selectedCustomerIds === 'string') {
    try { parsed.selectedCustomerIds = JSON.parse(parsed.selectedCustomerIds); } catch { parsed.selectedCustomerIds = []; }
  } else if (typeof parsed.selectedcustomerids === 'string') {
    try { parsed.selectedCustomerIds = JSON.parse(parsed.selectedcustomerids); } catch { parsed.selectedCustomerIds = []; }
  } else if (!Array.isArray(parsed.selectedCustomerIds)) {
    parsed.selectedCustomerIds = Array.isArray(parsed.selectedcustomerids) ? parsed.selectedcustomerids : [];
  }

  if (parsed.startdate && !parsed.startDate) parsed.startDate = parsed.startdate;
  if (parsed.expirydate && !parsed.expiryDate) parsed.expiryDate = parsed.expirydate;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.updatedat && !parsed.updatedAt) parsed.updatedAt = parsed.updatedat;
  if (parsed.createdby && !parsed.createdBy) parsed.createdBy = parsed.createdby;

  return parsed;
}

export function normalizeCouponUsageRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  parsed.id = String(parsed.id || '').trim();
  if (parsed.couponid && !parsed.couponId) parsed.couponId = parsed.couponid;
  if (parsed.couponcode && !parsed.couponCode) parsed.couponCode = parsed.couponcode;
  if (parsed.customerid && !parsed.customerId) parsed.customerId = parsed.customerid;
  if (parsed.customeremail && !parsed.customerEmail) parsed.customerEmail = parsed.customeremail;
  if (parsed.orderid && !parsed.orderId) parsed.orderId = parsed.orderid;
  if (parsed.discountamount !== undefined && parsed.discountAmount === undefined) parsed.discountAmount = Number(parsed.discountamount);
  if (parsed.usedat && !parsed.usedAt) parsed.usedAt = parsed.usedat;

  parsed.discountAmount = Number(parsed.discountAmount || 0);

  return parsed;
}

export function normalizeUserRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (typeof parsed.addresses === 'string') {
    try {
      parsed.addresses = JSON.parse(parsed.addresses);
    } catch {
      // keep
    }
  }

  if (parsed.userid && !parsed.userId) parsed.userId = parsed.userid;
  if (parsed.googleproviderid && !parsed.googleProviderId) parsed.googleProviderId = parsed.googleproviderid;
  if (parsed.profileimage && !parsed.profileImage) parsed.profileImage = parsed.profileimage;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.lastloginat && !parsed.lastLoginAt) parsed.lastLoginAt = parsed.lastloginat;
  if (parsed.wellnessaccessstatus && !parsed.wellnessAccessStatus) parsed.wellnessAccessStatus = parsed.wellnessaccessstatus;
  if (parsed.wellnessrequestid && !parsed.wellnessRequestId) parsed.wellnessRequestId = parsed.wellnessrequestid;
  if (parsed.wellnessapprovedat && !parsed.wellnessApprovedAt) parsed.wellnessApprovedAt = parsed.wellnessapprovedat;
  if (parsed.wellnessapprovedby && !parsed.wellnessApprovedBy) parsed.wellnessApprovedBy = parsed.wellnessapprovedby;

  return parsed;
}

export function normalizeSessionRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (parsed.sessionid && !parsed.sessionId) parsed.sessionId = parsed.sessionid;
  if (parsed.userid && !parsed.userId) parsed.userId = parsed.userid;
  if (parsed.expiresat && !parsed.expiresAt) parsed.expiresAt = parsed.expiresat;

  return parsed;
}

async function insertRow(p: Pool, table: string, item: Record<string, unknown>) {
  const allowed = ALLOWED_COLUMNS[table];
  const allowedLowerMap = new Map<string, string>();
  for (const col of allowed || []) {
    allowedLowerMap.set(col.toLowerCase(), col);
  }

  const cols: string[] = [];
  const vals: string[] = [];
  const queryVals: unknown[] = [];

  for (const [k, rawV] of Object.entries(item)) {
    const canonicalCol = allowedLowerMap.get(k.toLowerCase());
    if (!canonicalCol) continue;
    if (cols.includes(`"${canonicalCol}"`)) continue;

    cols.push(`"${canonicalCol}"`);
    queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
    vals.push(`$${queryVals.length}`);
  }

  if (cols.length === 0) return;
  const queryText = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`;
  await p.query(queryText, queryVals);
}

async function bulkInsert(client: PoolClient, table: string, items: Record<string, unknown>[]) {
  if (items.length === 0) return;
  const allowed = ALLOWED_COLUMNS[table];
  const allowedLowerMap = new Map<string, string>();
  for (const col of allowed || []) {
    allowedLowerMap.set(col.toLowerCase(), col);
  }

  for (const item of items) {
    const cols: string[] = [];
    const vals: string[] = [];
    const queryVals: unknown[] = [];

    for (const [k, rawV] of Object.entries(item)) {
      const canonicalCol = allowedLowerMap.get(k.toLowerCase());
      if (!canonicalCol) continue;
      if (cols.includes(`"${canonicalCol}"`)) continue;

      cols.push(`"${canonicalCol}"`);
      queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
      vals.push(`$${queryVals.length}`);
    }

    if (cols.length === 0) continue;
    const queryText = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`;
    await client.query(queryText, queryVals);
  }
}

export const db = {
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (dbInitError && !pool) {
      return { ok: false, error: dbInitError };
    }
    if (!pool) {
      return { ok: false, error: 'PostgreSQL connection pool is not configured' };
    }
    try {
      const res = await pool.query('SELECT NOW()');
      if (res.rows.length > 0) {
        return { ok: true };
      }
      return { ok: false, error: 'Query executed but returned no results' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
    if (!pool) {
      // Local fallback for basic queries if pool is not configured
      const lower = text.toLowerCase();
      if (lower.includes('insert into payment_transactions') && params && params.length >= 2) {
        const id = String(params[0]);
        const orderId = String(params[1]);
        const customerId = params[2] ? String(params[2]) : '';
        const amount = Number(params[3] || 0);
        const status = params[5] ? String(params[5]) : 'PENDING';
        const utr = params[8] ? String(params[8]) : (params[6] ? String(params[6]) : '');
        const proofImageUrl = params[9] ? String(params[9]) : '';
        const submittedAt = params[10] ? String(params[10]) : new Date().toISOString();

        const list = inMemoryData['payment_transactions'] || [];
        const existingIdx = list.findIndex(p => String(p.orderId || p.orderid).toLowerCase() === orderId.toLowerCase() || String(p.id).toLowerCase() === id.toLowerCase());
        const record: Record<string, unknown> = {
          id,
          orderId,
          customerId,
          amount,
          currency: 'INR',
          status,
          method: 'UPI',
          provider: 'MANUAL_UPI',
          utr,
          proofImageUrl,
          submittedAt,
          createdAt: submittedAt,
          updatedAt: submittedAt,
          attemptCount: 1
        };

        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...record };
        } else {
          list.push(record);
        }
        inMemoryData['payment_transactions'] = list;
        return { rows: [record as T] };
      }
      if (lower.includes('select') && lower.includes('orders') && (lower.includes('id =') || lower.includes('lower(id) =') || lower.includes('id) =')) && params && params[0]) {
        const orderId = String(params[0]).toLowerCase();
        const list = inMemoryData['orders'] || [];
        const found = list.filter((o: Record<string, unknown>) => String(o.id || o.ID || '').toLowerCase() === orderId);
        return { rows: found.map(normalizeOrderRecord) as T[] };
      }
      if (lower.includes('select') && lower.includes('payment_transactions') && params && params[0]) {
        const idVal = String(params[0]).toLowerCase();
        const list = inMemoryData['payment_transactions'] || [];
        const found = list.filter((p: Record<string, unknown>) => String(p.id || '').toLowerCase() === idVal || String(p.orderId || p.orderid || '').toLowerCase() === idVal);
        return { rows: found.map(normalizePaymentRecord) as T[] };
      }
      if (lower.includes('update payment_transactions') && params) {
        const list = inMemoryData['payment_transactions'] || [];
        const statusVal = String(params[0] || 'PAID');
        const lastParam = String(params[params.length - 1] || '').toLowerCase();
        for (let i = 0; i < list.length; i++) {
          if (String(list[i].id || '').toLowerCase() === lastParam || String(list[i].orderId || '').toLowerCase() === lastParam) {
            list[i].status = statusVal;
            list[i].updatedAt = new Date().toISOString();
            if (statusVal === 'PAID') {
              list[i].paidAt = list[i].updatedAt;
              if (params[1]) list[i].verifiedAt = String(params[1]);
              if (params[2]) list[i].verifiedBy = String(params[2]);
            }
            if (statusVal === 'REJECTED') {
              if (params[1]) list[i].rejectedAt = String(params[1]);
              if (params[2]) list[i].rejectedBy = String(params[2]);
              if (params[3]) list[i].rejectionReason = String(params[3]);
            }
          }
        }
        return { rows: [] };
      }
      if (lower.includes('insert into sessions') && params && params.length >= 5) {
        const sessionId = String(params[0]);
        const userId = String(params[1]);
        const email = String(params[2]);
        const role = String(params[3]);
        const expiresAt = String(params[4]);

        const list = inMemoryData['sessions'] || [];
        const existingIdx = list.findIndex(s => String(s.sessionId || s.sessionid).toLowerCase() === sessionId.toLowerCase());
        const record = { sessionId, userId, email, role, expiresAt };
        if (existingIdx >= 0) {
          list[existingIdx] = record;
        } else {
          list.push(record);
        }
        inMemoryData['sessions'] = list;
        return { rows: [record as unknown as T] };
      }
      if (lower.includes('select') && lower.includes('sessions') && params && params[0]) {
        const token = String(params[0]).toLowerCase();
        const list = inMemoryData['sessions'] || [];
        const found = list.filter((s: Record<string, unknown>) => String(s.sessionId || s.sessionid || '').toLowerCase() === token);
        return { rows: found.map(normalizeSessionRecord) as unknown as T[] };
      }
      if (lower.includes('delete from sessions') && params && params[0]) {
        const token = String(params[0]).toLowerCase();
        const list = inMemoryData['sessions'] || [];
        inMemoryData['sessions'] = list.filter((s: Record<string, unknown>) => String(s.sessionId || s.sessionid || '').toLowerCase() !== token);
        return { rows: [] };
      }
      if (lower.includes('insert into product_image_history') && params && params.length >= 9) {
        const id = String(params[0]);
        const productId = String(params[1]);
        const storagePath = String(params[2]);
        const imageUrl = String(params[3]);
        const uploadedBy = String(params[4]);
        const uploadedByRole = String(params[5]);
        const uploadedAt = String(params[6]);
        const previousImage = String(params[7]);
        const isActive = Boolean(params[8]);

        const list = inMemoryData['product_image_history'] || [];
        const record = { id, productId, storagePath, imageUrl, uploadedBy, uploadedByRole, uploadedAt, previousImage, isActive };
        list.unshift(record);
        inMemoryData['product_image_history'] = list;
        return { rows: [record as unknown as T] };
      }
      if (lower.includes('select') && lower.includes('product_image_history') && params && params[0]) {
        const prodId = String(params[0]).toLowerCase();
        const list = inMemoryData['product_image_history'] || [];
        const found = list.filter((h: any) => String(h.productId || '').toLowerCase() === prodId);
        return { rows: found as unknown as T[] };
      }
      if (lower.includes('update product_image_history') && params && params[0]) {
        const prodId = String(params[0]).toLowerCase();
        const list = inMemoryData['product_image_history'] || [];
        for (const item of list) {
          if (String(item.productId || '').toLowerCase() === prodId) {
            item.isActive = false;
          }
        }
        return { rows: [] };
      }
      if (lower.includes('insert into "auditlogs"') && params && params.length >= 7) {
        const list = inMemoryData['auditLogs'] || [];
        const record = { id: String(params[0]), adminUser: String(params[1]), action: String(params[2]), dateTime: String(params[3]), product: String(params[4]), previousValue: String(params[5]), newValue: String(params[6]) };
        list.unshift(record);
        inMemoryData['auditLogs'] = list;
        return { rows: [record as unknown as T] };
      }
      if (lower.includes('update orders') && params) {
        return { rows: [] };
      }
      return { rows: [] };
    }
    const res = await pool.query(text, params);
    return {
      rows: res.rows.map(row => {
        const parsed: Record<string, unknown> = {};
        for (const col of Object.keys(row)) {
          const val = row[col];
          if (col === 'tags' || col === 'addresses' || col === 'items' || col === 'statusHistory' || col === 'address' || col === 'adminOverride' || col === 'metadata') {
            if (typeof val === 'string') {
              try {
                parsed[col] = JSON.parse(val);
              } catch {
                parsed[col] = val;
              }
            } else {
              parsed[col] = val;
            }
          } else {
            parsed[col] = val;
          }
        }
        return parsed;
      }) as T[]
    };
  },

  async readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues' | 'product_image_history' | 'payment_transactions'): Promise<T[]> {
    const activePool = getPool();
    if (!activePool) {
      const memList = (inMemoryData[key] || []) as unknown as Record<string, unknown>[];
      if (key === 'orders') return memList.map(normalizeOrderRecord) as unknown as T[];
      if (key === 'products') return memList.map(normalizeProductRecord) as unknown as T[];
      if (key === 'payment_transactions') return memList.map(normalizePaymentRecord) as unknown as T[];
      if (key === 'partners') return memList.map(normalizePartnerRecord) as unknown as T[];
      if (key === 'users') return memList.map(normalizeUserRecord) as unknown as T[];
      if (key === 'sessions') return memList.map(normalizeSessionRecord) as unknown as T[];
      return memList as unknown as T[];
    }
    
    try {
      const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key === 'product_image_history' ? 'product_image_history' : key === 'payment_transactions' ? 'payment_transactions' : key;
      const res = await activePool.query(`SELECT * FROM "${tableName}"`);
      
      const parsedList = res.rows.map(row => {
        let parsed: Record<string, unknown> = {};
        for (const col of Object.keys(row)) {
          const val = row[col];
          if (col === 'tags' || col === 'addresses' || col === 'items' || col === 'statusHistory' || col === 'address' || col === 'adminOverride' || col === 'metadata' || col === 'gallery' || col === 'ingredients' || col === 'allergens' || col === 'occasions' || col === 'variants' || col === 'wellnessDetails') {
            if (typeof val === 'string') {
              try {
                parsed[col] = JSON.parse(val);
              } catch {
                parsed[col] = val;
              }
            } else {
              parsed[col] = val;
            }
          } else {
            parsed[col] = val;
          }
        }

        if (key === 'orders') {
          parsed = normalizeOrderRecord(parsed);
        } else if (key === 'products') {
          parsed = normalizeProductRecord(parsed) as unknown as Record<string, unknown>;
        } else if (key === 'payment_transactions') {
          parsed = normalizePaymentRecord(parsed);
        } else if (key === 'partners') {
          parsed = normalizePartnerRecord(parsed);
        } else if (key === 'users') {
          parsed = normalizeUserRecord(parsed);
        } else if (key === 'sessions') {
          parsed = normalizeSessionRecord(parsed);
        } else if (key === 'categories') {
          parsed.image = resolveImageUrl(parsed.image as string, parsed.id as string);
        }

        return parsed;
      });

      if (key === 'products') {
        const existingIds = new Set(parsedList.map((p: any) => String(p.id || '').toLowerCase().trim()));
        for (const defaultProd of productsJson) {
          const defaultId = String(defaultProd.id || '').toLowerCase().trim();
          if (defaultId && !existingIds.has(defaultId)) {
            const normalized = normalizeProductRecord(defaultProd) as unknown as Record<string, unknown>;
            parsedList.unshift(normalized);
            try {
              insertRow(activePool, 'products', defaultProd).catch(() => {});
            } catch {}
          }
        }
      }

      return parsedList as unknown as T[];
    } catch (err) {
      console.error(`PostgreSQL error reading table ${key}:`, err);
      const memList = (inMemoryData[key] || []) as unknown as Record<string, unknown>[];
      if (key === 'orders') return memList.map(normalizeOrderRecord) as unknown as T[];
      if (key === 'products') return memList.map(normalizeProductRecord) as unknown as T[];
      if (key === 'payment_transactions') return memList.map(normalizePaymentRecord) as unknown as T[];
      if (key === 'partners') return memList.map(normalizePartnerRecord) as unknown as T[];
      if (key === 'users') return memList.map(normalizeUserRecord) as unknown as T[];
      if (key === 'sessions') return memList.map(normalizeSessionRecord) as unknown as T[];
      return memList as unknown as T[];
    }
  },

  async writeTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues' | 'product_image_history' | 'payment_transactions', data: T[]): Promise<boolean> {
    inMemoryData[key] = [...data] as unknown as Record<string, unknown>[];
    const activePool = getPool();
    if (!activePool) {
      return true;
    }
    
    const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key === 'product_image_history' ? 'product_image_history' : key === 'payment_transactions' ? 'payment_transactions' : key;
    const client = await activePool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "${tableName}"`);
      
      const allowed = ALLOWED_COLUMNS[key];
      const allowedLowerMap = new Map<string, string>();
      for (const col of allowed || []) {
        allowedLowerMap.set(col.toLowerCase(), col);
      }

      for (const item of data) {
        const record = item as Record<string, unknown>;
        const cols: string[] = [];
        const vals: string[] = [];
        const queryVals: unknown[] = [];

        for (const [k, rawV] of Object.entries(record)) {
          const canonicalCol = allowedLowerMap.get(k.toLowerCase());
          if (!canonicalCol) continue;
          if (cols.includes(`"${canonicalCol}"`)) continue;

          cols.push(`"${canonicalCol}"`);
          queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
          vals.push(`$${queryVals.length}`);
        }

        if (cols.length === 0) continue;
        const queryText = `INSERT INTO "${tableName}" (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
        await client.query(queryText, queryVals);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`PostgreSQL error writing table ${key}:`, err);
      return false;
    } finally {
      client.release();
    }
  },

  /**
   * Dedicated Single Order Retrieval & Mutation Methods
   */
  async getOrderById(orderId: string): Promise<Record<string, unknown> | null> {
    let rawId = String(orderId || '').trim();
    if (!rawId || rawId === 'undefined' || rawId === 'null') return null;

    // Recursively unwrap URL encoded characters
    while (rawId.includes('%23') || rawId.includes('%20') || rawId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(rawId);
        if (decoded === rawId) break;
        rawId = decoded;
      } catch {
        break;
      }
    }

    const cleanNoHash = rawId.replace(/^#+/, '').trim();
    const cleanDigitsOnly = cleanNoHash.replace(/^FT/i, '').trim();
    const candidateIds = Array.from(new Set([
      rawId,
      rawId.toLowerCase(),
      cleanNoHash,
      cleanNoHash.toLowerCase(),
      cleanDigitsOnly,
      cleanDigitsOnly.toLowerCase(),
      '#' + cleanNoHash,
      'FT' + cleanDigitsOnly,
      '#FT' + cleanDigitsOnly,
      'ft' + cleanDigitsOnly,
      '#ft' + cleanDigitsOnly,
    ].filter(Boolean)));

    const activePool = getPool();
    if (activePool) {
      try {
        const candidateLower = Array.from(new Set(candidateIds.map(c => c.toLowerCase())));
        const candidateNoHashLower = Array.from(new Set(candidateIds.map(c => c.replace(/^#+/, '').toLowerCase())));

        const res = await activePool.query(
          `SELECT * FROM "orders" 
           WHERE LOWER(TRIM("id")) = ANY($1::text[]) 
              OR REPLACE(LOWER(TRIM("id")), '#', '') = ANY($2::text[])
              OR REGEXP_REPLACE(LOWER(TRIM("id")), '^#?ft', '', 'i') = $3
           LIMIT 1`,
          [candidateLower, candidateNoHashLower, cleanDigitsOnly.toLowerCase()]
        );
        if (res.rows.length > 0) {
          const normalized = normalizeOrderRecord(res.rows[0]);
          const authoritativeId = String(normalized.id || '').replace(/^#+/, '').trim().toLowerCase();
          const list = inMemoryData['orders'] || [];
          const idx = list.findIndex(o => {
            const oid = String(o.id || o.ID || '').replace(/^#+/, '').trim().toLowerCase();
            return oid === authoritativeId || candidateLower.includes(oid);
          });
          if (idx >= 0) list[idx] = normalized;
          else list.unshift(normalized);
          inMemoryData['orders'] = list;
          return normalized;
        }

        // Secondary fallback for IDs with numeric suffix matching
        if (cleanDigitsOnly.length >= 4) {
          const fallbackRes = await activePool.query(
            `SELECT * FROM "orders" WHERE "id" LIKE '%' || $1 || '%' LIMIT 1`,
            [cleanDigitsOnly]
          );
          if (fallbackRes.rows.length > 0) {
            const normalized = normalizeOrderRecord(fallbackRes.rows[0]);
            return normalized;
          }
        }
      } catch (err) {
        console.error(`[DATABASE ERROR] getOrderById query failed for ID "${cleanNoHash}":`, err);
      }
    }

    // In-memory fallback
    const list = inMemoryData['orders'] || [];
    const candidateLowerSet = new Set(candidateIds.map(c => c.toLowerCase()));
    const found = list.find(o => {
      const oid = String(o.id || o.ID || '').trim().toLowerCase();
      const oidClean = oid.replace(/^#+/, '').trim();
      const oidDigits = oidClean.replace(/^ft/i, '').trim();
      return candidateLowerSet.has(oid) || candidateLowerSet.has(oidClean) || candidateLowerSet.has(oidDigits) || (cleanDigitsOnly.length >= 4 && oid.includes(cleanDigitsOnly));
    });
    return found ? normalizeOrderRecord(found) : null;
  },

  async getOrderByRazorpayOrderId(rzpOrderId: string): Promise<Record<string, unknown> | null> {
    const rawRzp = String(rzpOrderId || '').trim();
    if (!rawRzp) return null;

    const activePool = getPool();
    if (activePool) {
      try {
        const res = await activePool.query(
          `SELECT * FROM "orders" 
           WHERE "razorpayOrderId" = $1 
              OR LOWER(TRIM("razorpayOrderId")) = LOWER(TRIM($1))
              OR (metadata IS NOT NULL AND metadata->>'razorpayOrderId' = $1)
           LIMIT 1`,
          [rawRzp]
        );
        if (res.rows.length > 0) {
          return normalizeOrderRecord(res.rows[0]);
        }
      } catch (err) {}
    }

    // Check payment_transactions
    const payment = await this.getPaymentByRazorpayOrderId(rawRzp);
    if (payment && payment.orderId) {
      const order = await this.getOrderById(String(payment.orderId));
      if (order) return order;
    }

    // Check in-memory
    const list = inMemoryData['orders'] || [];
    const found = list.find((o: any) => {
      const r1 = String(o.razorpayOrderId || o.razorpayorderid || '').trim();
      return r1 === rawRzp || r1.toLowerCase() === rawRzp.toLowerCase();
    });
    return found ? normalizeOrderRecord(found) : null;
  },

  async getOrderByRazorpayPaymentId(rzpPaymentId: string): Promise<Record<string, unknown> | null> {
    const rawPay = String(rzpPaymentId || '').trim();
    if (!rawPay) return null;

    const activePool = getPool();
    if (activePool) {
      try {
        const res = await activePool.query(
          `SELECT * FROM "orders" 
           WHERE "razorpayPaymentId" = $1 
              OR LOWER(TRIM("razorpayPaymentId")) = LOWER(TRIM($1))
              OR "paymentId" = $1
           LIMIT 1`,
          [rawPay]
        );
        if (res.rows.length > 0) {
          return normalizeOrderRecord(res.rows[0]);
        }
      } catch (err) {}
    }

    // Check payment_transactions
    const payment = await this.getPaymentByRazorpayPaymentId(rawPay);
    if (payment && payment.orderId) {
      const order = await this.getOrderById(String(payment.orderId));
      if (order) return order;
    }

    // Check in-memory
    const list = inMemoryData['orders'] || [];
    const found = list.find((o: any) => {
      const p1 = String(o.razorpayPaymentId || o.razorpaypaymentid || o.paymentId || '').trim();
      return p1 === rawPay || p1.toLowerCase() === rawPay.toLowerCase();
    });
    return found ? normalizeOrderRecord(found) : null;
  },

  async createOrder(orderData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rawId = String(orderData.id || '').trim() || `FT${Math.floor(100000 + Math.random() * 900000)}`;
    const cleanId = rawId.replace(/^#+/, '').trim();
    const now = new Date().toISOString();

    const normalized = normalizeOrderRecord({
      ...orderData,
      id: cleanId,
      createdAt: orderData.createdAt || now,
      updatedAt: orderData.updatedAt || now
    });

    // Save in shared memory
    const list = inMemoryData['orders'] || [];
    const idx = list.findIndex(o => {
      const oid = String(o.id || o.ID || '').replace(/^#+/, '').trim().toLowerCase();
      return oid === cleanId.toLowerCase();
    });
    if (idx >= 0) {
      list[idx] = normalized;
    } else {
      list.unshift(normalized);
    }
    inMemoryData['orders'] = list;

    // Save in PostgreSQL
    const activePool = getPool();
    if (activePool) {
      try {
        const allowedOrderCols = ALLOWED_COLUMNS['orders'] || [];
        const allowedLowerMap = new Map<string, string>();
        for (const col of allowedOrderCols) {
          allowedLowerMap.set(col.toLowerCase(), col);
        }

        const cols: string[] = ['"id"'];
        const valPlaceholders: string[] = ['$1'];
        const insertVals: unknown[] = [cleanId];
        const updateSetClauses: string[] = [];
        const processedCols = new Set<string>();

        for (const [key, val] of Object.entries(normalized)) {
          if (key.toLowerCase() === 'id') continue;
          const canonicalCol = allowedLowerMap.get(key.toLowerCase());
          if (!canonicalCol) continue;
          if (processedCols.has(canonicalCol)) continue;
          processedCols.add(canonicalCol);

          cols.push(`"${canonicalCol}"`);
          const jsonVal = val && typeof val === 'object' ? JSON.stringify(val) : val;
          insertVals.push(jsonVal);
          valPlaceholders.push(`$${insertVals.length}`);
          updateSetClauses.push(`"${canonicalCol}" = EXCLUDED."${canonicalCol}"`);
        }

        const queryText = `INSERT INTO "orders" (${cols.join(', ')}) 
                           VALUES (${valPlaceholders.join(', ')}) 
                           ON CONFLICT ("id") DO UPDATE SET ${updateSetClauses.join(', ')} 
                           RETURNING *`;
        const res = await activePool.query(queryText, insertVals);
        if (res.rows.length > 0) {
          const persisted = normalizeOrderRecord(res.rows[0]);
          if (idx >= 0) list[idx] = persisted;
          else list[0] = persisted;
          inMemoryData['orders'] = list;
          return persisted;
        }
      } catch (err) {
        console.error(`[DATABASE ERROR] createOrder failed for ID "${cleanId}":`, err);
      }
    }

    return normalized;
  },

  async updateOrder(orderId: string, updates: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    let rawId = String(orderId || '').trim();
    if (!rawId) return null;

    while (rawId.includes('%23') || rawId.includes('%20') || rawId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(rawId);
        if (decoded === rawId) break;
        rawId = decoded;
      } catch {
        break;
      }
    }

    // Attempt to resolve existing order first to obtain authoritative ID
    const existing = await this.getOrderById(rawId);
    const authoritativeId = existing?.id ? String(existing.id).replace(/^#+/, '').trim() : rawId.replace(/^#+/, '').trim();
    const cleanDigitsOnly = authoritativeId.replace(/^FT/i, '').trim();

    const candidateIds = Array.from(new Set([
      rawId,
      authoritativeId,
      cleanDigitsOnly,
      '#' + authoritativeId,
      'FT' + cleanDigitsOnly,
      '#FT' + cleanDigitsOnly
    ].filter(Boolean)));
    const candidateLower = Array.from(new Set(candidateIds.map(c => c.toLowerCase())));

    const list = inMemoryData['orders'] || [];
    const idx = list.findIndex(o => {
      const oid = String(o.id || o.ID || '').replace(/^#+/, '').trim().toLowerCase();
      return oid === authoritativeId.toLowerCase() || candidateLower.includes(oid);
    });

    const now = new Date().toISOString();
    const cleanUpdates = { ...updates, id: authoritativeId, updatedAt: updates.updatedAt || now };

    let merged: Record<string, unknown>;
    if (idx >= 0) {
      merged = normalizeOrderRecord({ ...list[idx], ...cleanUpdates });
      list[idx] = merged;
    } else if (existing) {
      merged = normalizeOrderRecord({ ...existing, ...cleanUpdates });
      list.unshift(merged);
    } else {
      merged = normalizeOrderRecord({ ...cleanUpdates, id: authoritativeId });
      list.unshift(merged);
    }
    inMemoryData['orders'] = list;

    const activePool = getPool();
    if (!activePool) {
      return merged;
    }

    try {
      const allowedOrderCols = ALLOWED_COLUMNS['orders'] || [];
      const allowedLowerMap = new Map<string, string>();
      for (const col of allowedOrderCols) {
        allowedLowerMap.set(col.toLowerCase(), col);
      }

      // 1. Attempt UPDATE with RETURNING *
      const setClauses: string[] = [];
      const values: unknown[] = [];
      const processedUpdateCols = new Set<string>();

      for (const [key, val] of Object.entries(cleanUpdates)) {
        if (key.toLowerCase() === 'id') continue;
        const canonicalCol = allowedLowerMap.get(key.toLowerCase());
        if (!canonicalCol) continue;
        if (processedUpdateCols.has(canonicalCol)) continue;
        processedUpdateCols.add(canonicalCol);

        values.push(val && typeof val === 'object' ? JSON.stringify(val) : val);
        setClauses.push(`"${canonicalCol}" = $${values.length}`);
      }

      if (setClauses.length > 0) {
        values.push(candidateLower);
        const queryText = `UPDATE "orders" SET ${setClauses.join(', ')} 
                           WHERE LOWER(TRIM("id")) = ANY($${values.length}::text[]) 
                              OR REPLACE(LOWER(TRIM("id")), '#', '') = ANY($${values.length}::text[]) 
                           RETURNING *`;
        const res = await activePool.query(queryText, values);
        if (res.rows.length > 0) {
          const persisted = normalizeOrderRecord(res.rows[0]);
          if (idx >= 0) list[idx] = persisted;
          else list[0] = persisted;
          inMemoryData['orders'] = list;
          return persisted;
        }
      }

      // 2. If row was not found in DB, perform atomic UPSERT with RETURNING *
      const cols: string[] = ['"id"'];
      const valPlaceholders: string[] = ['$1'];
      const insertVals: unknown[] = [authoritativeId];
      const updateSetClauses: string[] = [];
      const processedUpsertCols = new Set<string>();

      for (const [key, val] of Object.entries(merged)) {
        if (key.toLowerCase() === 'id') continue;
        const canonicalCol = allowedLowerMap.get(key.toLowerCase());
        if (!canonicalCol) continue;
        if (processedUpsertCols.has(canonicalCol)) continue;
        processedUpsertCols.add(canonicalCol);

        cols.push(`"${canonicalCol}"`);
        const jsonVal = val && typeof val === 'object' ? JSON.stringify(val) : val;
        insertVals.push(jsonVal);
        valPlaceholders.push(`$${insertVals.length}`);
        updateSetClauses.push(`"${canonicalCol}" = EXCLUDED."${canonicalCol}"`);
      }

      const upsertQuery = `INSERT INTO "orders" (${cols.join(', ')}) 
                           VALUES (${valPlaceholders.join(', ')}) 
                           ON CONFLICT ("id") DO UPDATE SET ${updateSetClauses.join(', ')} 
                           RETURNING *`;
      const upsertRes = await activePool.query(upsertQuery, insertVals);
      if (upsertRes.rows.length > 0) {
        const persisted = normalizeOrderRecord(upsertRes.rows[0]);
        if (idx >= 0) list[idx] = persisted;
        else list[0] = persisted;
        inMemoryData['orders'] = list;
        return persisted;
      }

      return merged;
    } catch (err) {
      console.error('Error updating order row in database:', err);
      return merged;
    }
  },

  /**
   * Dedicated Atomic Order Status Update Helper
   */
  async updateOrderStatus(orderId: string, newStatus: string, additionalUpdates: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
    const existing = await this.getOrderById(orderId);
    if (!existing) return null;

    const prevStatus = String(existing.status || '');
    const historyList = Array.isArray(existing.statusHistory) ? [...existing.statusHistory] : [];
    if (newStatus && newStatus !== prevStatus) {
      historyList.push({
        previousStatus: prevStatus,
        newStatus,
        timestamp: new Date().toISOString()
      });
    }

    const updates: Record<string, unknown> = {
      ...additionalUpdates,
      status: newStatus,
      statusHistory: historyList,
      updatedAt: new Date().toISOString()
    };

    return this.updateOrder(orderId, updates);
  },

  /**
   * Dedicated Single Product Image Mutation Method
   */
  async updateProductImage(productId: string, imageUrl: string): Promise<{ success: boolean; product?: Record<string, unknown>; error?: string }> {
    const cleanId = decodeURIComponent(String(productId || '')).trim();
    if (!cleanId) {
      return { success: false, error: 'Product ID is required' };
    }
    if (!imageUrl) {
      return { success: false, error: 'Image URL is required' };
    }

    let updatedProduct: Record<string, unknown> | null = null;

    if (pool) {
      try {
        await pool.query('ALTER TABLE products ALTER COLUMN image TYPE TEXT').catch(() => {});
        
        // 1. Direct atomic single-row update by ID
        const res = await pool.query(
          `UPDATE products 
           SET image = $1 
           WHERE LOWER(TRIM(id)) = LOWER(TRIM($2)) 
           RETURNING *`,
          [imageUrl, cleanId]
        );

        if (res.rows.length > 0) {
          updatedProduct = res.rows[0];
        } else {
          // Fallback: match by name if cleanId was passed as product name
          const resByName = await pool.query(
            `UPDATE products 
             SET image = $1 
             WHERE LOWER(TRIM(name)) = LOWER(TRIM($2)) 
             RETURNING *`,
            [imageUrl, cleanId]
          );
          if (resByName.rows.length > 0) {
            updatedProduct = resByName.rows[0];
          }
        }
      } catch (err) {
        console.error(`[DATABASE ERROR] updateProductImage query failed for product "${cleanId}":`, err);
      }
    }

    // Always update in-memory products array
    const memList = inMemoryData['products'] || [];
    const idx = memList.findIndex((p: any) => 
      String(p.id || p.ID || '').trim().toLowerCase() === cleanId.toLowerCase() ||
      String(p.name || '').trim().toLowerCase() === cleanId.toLowerCase()
    );

    if (idx >= 0) {
      memList[idx] = {
        ...memList[idx],
        image: imageUrl,
      };
      if (Array.isArray(memList[idx].gallery)) {
        memList[idx].gallery = [imageUrl, ...(memList[idx].gallery as string[]).filter((img: string) => img !== imageUrl)];
      } else {
        memList[idx].gallery = [imageUrl];
      }
      if (!updatedProduct) {
        updatedProduct = memList[idx];
      }
    }

    if (!updatedProduct) {
      return { success: false, error: `Product not found in database for ID: "${cleanId}"` };
    }

    return {
      success: true,
      product: {
        ...updatedProduct,
        id: updatedProduct.id || cleanId,
        image: imageUrl,
      }
    };
  },

  /**
   * User / Customer Management Methods
   */
  async getUsers(search?: string): Promise<Record<string, unknown>[]> {
    let rawList: Record<string, unknown>[] = [];
    if (!pool) {
      rawList = inMemoryData['users'] || [];
    } else {
      try {
        const res = await pool.query('SELECT * FROM users ORDER BY "createdAt" DESC');
        rawList = res.rows;
      } catch (err) {
        console.error('Error fetching users from DB:', err);
        rawList = inMemoryData['users'] || [];
      }
    }
    let normalized = rawList.map(normalizeUserRecord);
    if (search) {
      const q = String(search).toLowerCase().trim();
      normalized = normalized.filter((u: any) => {
        const name = String(u.name || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        const phone = String(u.phone || '').toLowerCase();
        const userId = String(u.userId || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || userId.includes(q);
      });
    }
    return normalized;
  },

  async getUserById(userIdOrEmailOrPhone: string): Promise<Record<string, unknown> | null> {
    const clean = String(userIdOrEmailOrPhone || '').trim().toLowerCase();
    if (!clean) return null;
    if (!pool) {
      const list = inMemoryData['users'] || [];
      const found = list.find((u: any) => 
        String(u.userId || '').toLowerCase() === clean ||
        String(u.email || '').toLowerCase() === clean ||
        String(u.phone || '').replace(/\D/g, '') === clean.replace(/\D/g, '')
      );
      return found ? normalizeUserRecord(found) : null;
    }
    try {
      const res = await pool.query(
        'SELECT * FROM users WHERE LOWER("userId") = $1 OR LOWER(email) = $1 OR phone = $2 LIMIT 1',
        [clean, clean.replace(/\D/g, '')]
      );
      if (res.rows.length === 0) return null;
      return normalizeUserRecord(res.rows[0]);
    } catch (err) {
      console.error('Error fetching user by identifier from DB:', err);
      const list = inMemoryData['users'] || [];
      const found = list.find((u: any) => 
        String(u.userId || '').toLowerCase() === clean ||
        String(u.email || '').toLowerCase() === clean ||
        String(u.phone || '').replace(/\D/g, '') === clean.replace(/\D/g, '')
      );
      return found ? normalizeUserRecord(found) : null;
    }
  },

  async upsertUser(userData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const normalized = normalizeUserRecord(userData);
    const now = new Date().toISOString();
    if (!normalized.userId) {
      normalized.userId = normalized.phone || normalized.email ? String(normalized.phone || normalized.email) : `u-${Date.now()}`;
    }
    if (!normalized.createdAt) {
      normalized.createdAt = now;
    }
    normalized.lastLoginAt = now;
    normalized.role = normalized.role || 'customer';

    // 1. Update in-memory
    const list = inMemoryData['users'] || [];
    const idx = list.findIndex((u: any) => 
      String(u.userId || '').toLowerCase() === String(normalized.userId).toLowerCase() ||
      (normalized.email && String(u.email || '').toLowerCase() === String(normalized.email).toLowerCase()) ||
      (normalized.phone && String(u.phone || '').replace(/\D/g, '') === String(normalized.phone).replace(/\D/g, ''))
    );

    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...normalized,
        createdAt: list[idx].createdAt || normalized.createdAt
      };
    } else {
      list.push(normalized);
    }
    inMemoryData['users'] = list;

    // 2. Update PostgreSQL if pool available
    if (pool) {
      try {
        const query = `
          INSERT INTO users (
            "userId", "googleProviderId", name, email, "profileImage",
            "createdAt", "lastLoginAt", "wellnessAccessStatus", "wellnessRequestId",
            "wellnessApprovedAt", "wellnessApprovedBy", phone, dob, gender, addresses
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT ("userId") DO UPDATE SET
            name = COALESCE(EXCLUDED.name, users.name),
            email = COALESCE(EXCLUDED.email, users.email),
            phone = COALESCE(EXCLUDED.phone, users.phone),
            "profileImage" = COALESCE(EXCLUDED."profileImage", users."profileImage"),
            "lastLoginAt" = EXCLUDED."lastLoginAt",
            dob = COALESCE(EXCLUDED.dob, users.dob),
            gender = COALESCE(EXCLUDED.gender, users.gender),
            addresses = COALESCE(EXCLUDED.addresses, users.addresses)
          RETURNING *;
        `;
        const params = [
          normalized.userId,
          normalized.googleProviderId || null,
          normalized.name || 'Customer',
          normalized.email || null,
          normalized.profileImage || null,
          normalized.createdAt,
          normalized.lastLoginAt,
          normalized.wellnessAccessStatus || 'NOT_REQUESTED',
          normalized.wellnessRequestId || null,
          normalized.wellnessApprovedAt || null,
          normalized.wellnessApprovedBy || null,
          normalized.phone || null,
          normalized.dob || null,
          normalized.gender || null,
          JSON.stringify(normalized.addresses || [])
        ];
        const res = await pool.query(query, params);
        if (res.rows.length > 0) {
          return normalizeUserRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error upserting user in DB:', err);
      }
    }

    return normalized;
  },

  /**
   * Coupon Management & Validation Methods
   */
  async getCoupons(includeInactive = false): Promise<Record<string, unknown>[]> {
    let rawList: Record<string, unknown>[] = [];
    if (!pool) {
      rawList = inMemoryData['coupons'] || [];
    } else {
      try {
        const query = includeInactive 
          ? 'SELECT * FROM coupons ORDER BY "createdAt" DESC' 
          : 'SELECT * FROM coupons WHERE "isActive" = TRUE ORDER BY "createdAt" DESC';
        const res = await pool.query(query);
        rawList = res.rows;
      } catch (err) {
        console.error('Error fetching coupons from DB:', err);
        rawList = inMemoryData['coupons'] || [];
      }
    }
    const normalized = rawList.map(normalizeCouponRecord);
    return includeInactive ? normalized : normalized.filter((c: any) => c.isActive);
  },

  async getCouponById(id: string): Promise<Record<string, unknown> | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;
    if (!pool) {
      const list = inMemoryData['coupons'] || [];
      const found = list.find((c: any) => String(c.id).toLowerCase() === cleanId.toLowerCase());
      return found ? normalizeCouponRecord(found) : null;
    }
    try {
      const res = await pool.query('SELECT * FROM coupons WHERE LOWER(id) = LOWER($1) LIMIT 1', [cleanId]);
      if (res.rows.length === 0) return null;
      return normalizeCouponRecord(res.rows[0]);
    } catch (err) {
      console.error('Error fetching coupon by id:', err);
      const list = inMemoryData['coupons'] || [];
      const found = list.find((c: any) => String(c.id).toLowerCase() === cleanId.toLowerCase());
      return found ? normalizeCouponRecord(found) : null;
    }
  },

  async getCouponByCode(code: string): Promise<Record<string, unknown> | null> {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return null;
    if (!pool) {
      const list = inMemoryData['coupons'] || [];
      const found = list.find((c: any) => String(c.code).trim().toUpperCase() === cleanCode);
      return found ? normalizeCouponRecord(found) : null;
    }
    try {
      const res = await pool.query('SELECT * FROM coupons WHERE UPPER(TRIM(code)) = UPPER(TRIM($1)) LIMIT 1', [cleanCode]);
      if (res.rows.length === 0) return null;
      return normalizeCouponRecord(res.rows[0]);
    } catch (err) {
      console.error('Error fetching coupon by code:', err);
      const list = inMemoryData['coupons'] || [];
      const found = list.find((c: any) => String(c.code).trim().toUpperCase() === cleanCode);
      return found ? normalizeCouponRecord(found) : null;
    }
  },

  async upsertCoupon(couponData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const normalized = normalizeCouponRecord(couponData);
    if (!normalized.id) {
      normalized.id = `coupon-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    }
    if (!normalized.createdAt) {
      normalized.createdAt = new Date().toISOString();
    }
    normalized.updatedAt = new Date().toISOString();

    // 1. Update in-memory
    const list = inMemoryData['coupons'] || [];
    const idx = list.findIndex((c: any) => String(c.id).toLowerCase() === String(normalized.id).toLowerCase() || String(c.code).toUpperCase() === String(normalized.code).toUpperCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...normalized };
    } else {
      list.push(normalized);
    }
    inMemoryData['coupons'] = list;

    // 2. Update PostgreSQL if available
    if (pool) {
      try {
        const query = `
          INSERT INTO coupons (
            id, code, "discountType", "discountValue", "minSpend", "maxDiscount",
            "startDate", "expiryDate", "isActive", "usageLimit", "usageCount",
            "perCustomerLimit", "targetAudience", "selectedCustomerIds",
            "createdAt", "updatedAt", "createdBy"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            "discountType" = EXCLUDED."discountType",
            "discountValue" = EXCLUDED."discountValue",
            "minSpend" = EXCLUDED."minSpend",
            "maxDiscount" = EXCLUDED."maxDiscount",
            "startDate" = EXCLUDED."startDate",
            "expiryDate" = EXCLUDED."expiryDate",
            "isActive" = EXCLUDED."isActive",
            "usageLimit" = EXCLUDED."usageLimit",
            "usageCount" = EXCLUDED."usageCount",
            "perCustomerLimit" = EXCLUDED."perCustomerLimit",
            "targetAudience" = EXCLUDED."targetAudience",
            "selectedCustomerIds" = EXCLUDED."selectedCustomerIds",
            "updatedAt" = EXCLUDED."updatedAt"
          RETURNING *;
        `;
        const params = [
          normalized.id,
          normalized.code,
          normalized.discountType,
          normalized.discountValue,
          normalized.minSpend || 0,
          normalized.maxDiscount || null,
          normalized.startDate || null,
          normalized.expiryDate || null,
          normalized.isActive !== false,
          normalized.usageLimit || null,
          normalized.usageCount || 0,
          normalized.perCustomerLimit || null,
          normalized.targetAudience || 'ALL',
          JSON.stringify(normalized.selectedCustomerIds || []),
          normalized.createdAt,
          normalized.updatedAt,
          normalized.createdBy || null
        ];
        const res = await pool.query(query, params);
        if (res.rows.length > 0) {
          return normalizeCouponRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error upserting coupon in DB:', err);
      }
    }

    return normalized;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return false;

    // Remove from in-memory
    const list = inMemoryData['coupons'] || [];
    inMemoryData['coupons'] = list.filter((c: any) => String(c.id).toLowerCase() !== cleanId.toLowerCase() && String(c.code).toLowerCase() !== cleanId.toLowerCase());

    if (pool) {
      try {
        await pool.query('DELETE FROM coupons WHERE LOWER(id) = LOWER($1) OR LOWER(code) = LOWER($1)', [cleanId]);
      } catch (err) {
        console.error('Error deleting coupon from DB:', err);
      }
    }
    return true;
  },

  async recordCouponUsage(usageData: {
    couponId: string;
    couponCode: string;
    customerId: string;
    customerEmail?: string;
    orderId?: string;
    discountAmount: number;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const usage = {
      id: `usage-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      couponId: String(usageData.couponId || '').trim(),
      couponCode: String(usageData.couponCode || '').trim().toUpperCase(),
      customerId: String(usageData.customerId || '').trim(),
      customerEmail: usageData.customerEmail ? String(usageData.customerEmail).trim() : null,
      orderId: usageData.orderId ? String(usageData.orderId).trim() : null,
      discountAmount: Number(usageData.discountAmount || 0),
      usedAt: now
    };

    // Save in-memory
    const list = inMemoryData['coupon_usages'] || [];
    list.push(usage);
    inMemoryData['coupon_usages'] = list;

    // Increment usageCount on coupon
    const couponsList = inMemoryData['coupons'] || [];
    const couponIdx = couponsList.findIndex((c: any) => String(c.id) === usage.couponId || String(c.code).toUpperCase() === usage.couponCode);
    if (couponIdx >= 0) {
      couponsList[couponIdx].usageCount = (Number(couponsList[couponIdx].usageCount) || 0) + 1;
    }

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO coupon_usages (id, "couponId", "couponCode", "customerId", "customerEmail", "orderId", "discountAmount", "usedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [usage.id, usage.couponId, usage.couponCode, usage.customerId, usage.customerEmail, usage.orderId, usage.discountAmount, usage.usedAt]
        );
        await pool.query(
          `UPDATE coupons SET "usageCount" = COALESCE("usageCount", 0) + 1 WHERE id = $1 OR UPPER(code) = $2`,
          [usage.couponId, usage.couponCode]
        );
      } catch (err) {
        console.error('Error recording coupon usage in DB:', err);
      }
    }

    return usage;
  },

  async getCouponUsageCount(couponIdOrCode: string, customerId?: string): Promise<number> {
    const clean = String(couponIdOrCode || '').trim().toUpperCase();
    if (!pool) {
      const list = inMemoryData['coupon_usages'] || [];
      return list.filter((u: any) => {
        const matchCoupon = String(u.couponId || '').toUpperCase() === clean || String(u.couponCode || '').toUpperCase() === clean;
        if (!matchCoupon) return false;
        if (customerId) {
          const cId = String(customerId).trim().toLowerCase();
          const uCustId = String(u.customerId || '').trim().toLowerCase();
          const uCustEmail = String(u.customerEmail || '').trim().toLowerCase();
          return uCustId === cId || uCustEmail === cId;
        }
        return true;
      }).length;
    }
    try {
      if (customerId) {
        const cId = String(customerId).trim().toLowerCase();
        const res = await pool.query(
          `SELECT COUNT(*) FROM coupon_usages 
           WHERE (UPPER("couponId") = $1 OR UPPER("couponCode") = $1) 
           AND (LOWER("customerId") = $2 OR LOWER("customerEmail") = $2)`,
          [clean, cId]
        );
        return parseInt(res.rows[0]?.count || '0', 10);
      } else {
        const res = await pool.query(
          `SELECT COUNT(*) FROM coupon_usages WHERE UPPER("couponId") = $1 OR UPPER("couponCode") = $1`,
          [clean]
        );
        return parseInt(res.rows[0]?.count || '0', 10);
      }
    } catch (err) {
      console.error('Error counting coupon usage in DB:', err);
      return 0;
    }
  },

  async validateCoupon(
    code: string,
    subtotal: number,
    customer?: { userId?: string; email?: string; phone?: string }
  ): Promise<{
    valid: boolean;
    error?: string;
    discountAmount?: number;
    coupon?: Record<string, unknown>;
  }> {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, error: 'Please enter a coupon code.' };
    }

    const coupon = await this.getCouponByCode(cleanCode);
    if (!coupon) {
      return { valid: false, error: 'Invalid coupon code.' };
    }

    if (!coupon.isActive) {
      return { valid: false, error: 'This coupon is currently inactive.' };
    }

    const now = new Date();
    if (coupon.startDate && new Date(String(coupon.startDate)) > now) {
      return { valid: false, error: 'This coupon is not active yet.' };
    }
    if (coupon.expiryDate && new Date(String(coupon.expiryDate)) < now) {
      return { valid: false, error: 'This coupon has expired.' };
    }

    const minSpend = Number(coupon.minSpend) || 0;
    if (minSpend > 0 && subtotal < minSpend) {
      return { valid: false, error: `Minimum spend of ₹${minSpend} required for this coupon.` };
    }

    // Check overall usage limit
    if (coupon.usageLimit && Number(coupon.usageLimit) > 0) {
      const totalUsed = await this.getCouponUsageCount(String(coupon.id));
      if (totalUsed >= Number(coupon.usageLimit)) {
        return { valid: false, error: 'This coupon has reached its maximum total usage limit.' };
      }
    }

    // Check customer targeting (ALL vs SELECTED)
    const audience = String(coupon.targetAudience || 'ALL').toUpperCase();
    if (audience === 'SELECTED') {
      if (!customer || (!customer.userId && !customer.email && !customer.phone)) {
        return { valid: false, error: 'Please log in to use this account-specific coupon.' };
      }

      const selectedIds: string[] = Array.isArray(coupon.selectedCustomerIds) 
        ? coupon.selectedCustomerIds.map((id: any) => String(id).trim().toLowerCase()) 
        : [];

      const cUser = customer.userId ? String(customer.userId).trim().toLowerCase() : '';
      const cEmail = customer.email ? String(customer.email).trim().toLowerCase() : '';
      const cPhone = customer.phone ? String(customer.phone).trim().toLowerCase() : '';

      const isAllowed = selectedIds.some(id => id === cUser || id === cEmail || id === cPhone);
      if (!isAllowed) {
        return { valid: false, error: 'This coupon is not available for your account.' };
      }
    }

    // Check per-customer usage limit
    if (coupon.perCustomerLimit && Number(coupon.perCustomerLimit) > 0 && customer) {
      const custIdentifier = customer.userId || customer.email || customer.phone;
      if (custIdentifier) {
        const custUsed = await this.getCouponUsageCount(String(coupon.id), custIdentifier);
        if (custUsed >= Number(coupon.perCustomerLimit)) {
          return { valid: false, error: 'You have already used this coupon the maximum allowed number of times.' };
        }
      }
    }

    // Calculate discount
    let discount = 0;
    const val = Number(coupon.discountValue) || 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((subtotal * val) / 100);
      if (coupon.maxDiscount && Number(coupon.maxDiscount) > 0) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else {
      discount = val;
    }
    discount = Math.min(discount, subtotal);

    return {
      valid: true,
      discountAmount: discount,
      coupon
    };
  },

  /**
   * Delivery Partner Management Methods (PostgreSQL Atomic CRUD)
   */
  async getPartners(locationId?: string): Promise<Record<string, unknown>[]> {
    let rawList: Record<string, unknown>[] = [];
    const activePool = getPool();
    if (!activePool) {
      rawList = inMemoryData['partners'] || [];
    } else {
      try {
        const query = locationId
          ? 'SELECT * FROM partners WHERE LOWER(TRIM("locationId")) = LOWER(TRIM($1)) ORDER BY id ASC'
          : 'SELECT * FROM partners ORDER BY id ASC';
        const params = locationId ? [locationId] : [];
        const res = await activePool.query(query, params);
        rawList = res.rows;
      } catch (err) {
        console.error('Error fetching partners from PostgreSQL:', err);
        rawList = inMemoryData['partners'] || [];
      }
    }
    const normalized = rawList.map(normalizePartnerRecord);
    return normalized;
  },

  async getPartnerById(idOrEmailOrPhone: string): Promise<Record<string, unknown> | null> {
    const rawInput = String(idOrEmailOrPhone || '').trim();
    if (!rawInput) return null;
    const cleanLower = rawInput.toLowerCase();
    const cleanDigits = rawInput.replace(/\D/g, '');

    const activePool = getPool();
    if (activePool) {
      try {
        const query = `
          SELECT * FROM partners 
          WHERE LOWER(TRIM(id)) = $1 
             OR LOWER(TRIM(email)) = $1 
             OR (LENGTH($2) >= 4 AND REGEXP_REPLACE(phone, '\\D', '', 'g') = $2)
          LIMIT 1
        `;
        const res = await activePool.query(query, [cleanLower, cleanDigits || '']);
        if (res.rows && res.rows.length > 0) {
          return normalizePartnerRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error fetching partner by identifier from DB:', err);
      }
    }

    const memList = inMemoryData['partners'] || [];
    const found = memList.find((p: any) => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pEmail = String(p.email || '').toLowerCase().trim();
      const pPhoneDigits = String(p.phone || '').replace(/\D/g, '');
      return (
        pId === cleanLower ||
        pEmail === cleanLower ||
        (cleanDigits.length >= 4 && pPhoneDigits === cleanDigits)
      );
    });

    return found ? normalizePartnerRecord(found) : null;
  },

  async upsertPartner(partnerData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const normalized = normalizePartnerRecord(partnerData);
    const cleanId = String(normalized.id || '').trim();
    const cleanName = String(normalized.name || '').trim();
    const cleanEmail = String(normalized.email || '').trim().toLowerCase();
    const cleanPhone = String(normalized.phone || '').trim();
    const passwordHash = String(normalized.passwordHash || '').trim();
    const role = 'delivery_partner';
    const locationId = String(normalized.locationId || 'nawabganj-unnao').trim();
    const locationName = String(normalized.locationName || (locationId === 'nawabganj-unnao' ? 'Nawabganj, Unnao' : 'Chandigarh University, UP')).trim();
    const status = String(normalized.status || 'Active').trim();
    const isOnline = Boolean(normalized.isOnline);

    const partnerRecord: Record<string, unknown> = {
      id: cleanId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash,
      role,
      locationId,
      locationName,
      status,
      isOnline
    };

    // 1. Update in-memory
    const list = inMemoryData['partners'] || [];
    const idx = list.findIndex((p: any) => 
      String(p.id || '').toLowerCase().trim() === cleanId.toLowerCase() ||
      String(p.email || '').toLowerCase().trim() === cleanEmail
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...partnerRecord };
    } else {
      list.push(partnerRecord);
    }
    inMemoryData['partners'] = list;

    // 2. Persist to PostgreSQL single row atomically
    const activePool = getPool();
    if (activePool) {
      try {
        const query = `
          INSERT INTO partners (id, name, phone, email, "passwordHash", role, "locationId", "locationName", status, "isOnline")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, partners.phone),
            email = COALESCE(EXCLUDED.email, partners.email),
            "passwordHash" = CASE WHEN EXCLUDED."passwordHash" != '' THEN EXCLUDED."passwordHash" ELSE partners."passwordHash" END,
            "locationId" = COALESCE(EXCLUDED."locationId", partners."locationId"),
            "locationName" = COALESCE(EXCLUDED."locationName", partners."locationName"),
            status = COALESCE(EXCLUDED.status, partners.status),
            "isOnline" = COALESCE(EXCLUDED."isOnline", partners."isOnline")
          RETURNING *;
        `;
        const res = await activePool.query(query, [
          cleanId,
          cleanName,
          cleanPhone,
          cleanEmail,
          passwordHash,
          role,
          locationId,
          locationName,
          status,
          isOnline
        ]);
        if (res.rows.length > 0) {
          return normalizePartnerRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error upserting partner in PostgreSQL:', err);
      }
    }

    return partnerRecord;
  },

  async deletePartner(partnerId: string): Promise<boolean> {
    const cleanId = String(partnerId || '').trim();
    if (!cleanId) return false;

    // 1. Remove from in-memory
    const list = inMemoryData['partners'] || [];
    inMemoryData['partners'] = list.filter((p: any) => 
      String(p.id || '').toLowerCase().trim() !== cleanId.toLowerCase()
    );

    // 2. Atomic single-row DELETE in PostgreSQL
    const activePool = getPool();
    if (activePool) {
      try {
        await activePool.query('DELETE FROM partners WHERE LOWER(TRIM(id)) = LOWER(TRIM($1))', [cleanId]);
        // Also cleanup active sessions for this partner
        await activePool.query('DELETE FROM sessions WHERE LOWER(TRIM("userId")) = LOWER(TRIM($1))', [cleanId]);
      } catch (err) {
        console.error('Error deleting partner from PostgreSQL:', err);
      }
    }

    return true;
  },

  /**
   * Payment Transaction Methods
   */
  async getPaymentByOrderId(orderId: string): Promise<Record<string, unknown> | null> {
    let raw = String(orderId || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;

    while (raw.includes('%23') || raw.includes('%20') || raw.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(raw);
        if (decoded === raw) break;
        raw = decoded;
      } catch {
        break;
      }
    }
    const cleanNoHash = raw.replace(/^#+/, '').trim();
    const cleanNoPay = cleanNoHash.replace(/^pay[-_]/i, '').trim();
    const cleanDigitsOnly = cleanNoPay.replace(/^#?ft/i, '').trim();

    const candidateIds = Array.from(new Set([
      raw,
      raw.toLowerCase(),
      cleanNoHash,
      cleanNoHash.toLowerCase(),
      cleanNoPay,
      cleanNoPay.toLowerCase(),
      cleanDigitsOnly,
      cleanDigitsOnly.toLowerCase(),
      '#' + cleanNoHash,
      'FT' + cleanDigitsOnly,
      '#FT' + cleanDigitsOnly,
      'ft' + cleanDigitsOnly,
      '#ft' + cleanDigitsOnly,
      'pay-' + cleanNoHash,
      'pay-' + cleanNoPay,
      'pay-FT' + cleanDigitsOnly,
      'pay-' + cleanDigitsOnly
    ].filter(Boolean)));

    const activePool = getPool();
    if (activePool) {
      try {
        const candidateLower = Array.from(new Set(candidateIds.map(c => c.toLowerCase())));
        const candidateNoHashLower = Array.from(new Set(candidateIds.map(c => c.replace(/^#+/, '').toLowerCase())));

        const res = await activePool.query(
          `SELECT * FROM payment_transactions 
           WHERE LOWER(TRIM("orderId")) = ANY($1::text[]) 
              OR LOWER(TRIM(id)) = ANY($1::text[])
              OR REPLACE(LOWER(TRIM("orderId")), '#', '') = ANY($2::text[])
              OR REGEXP_REPLACE(LOWER(TRIM("orderId")), '^#?ft', '', 'i') = $3
              OR REGEXP_REPLACE(LOWER(TRIM(id)), '^pay-(#?ft)?', '', 'i') = $3
           LIMIT 1`,
          [candidateLower, candidateNoHashLower, cleanDigitsOnly.toLowerCase()]
        );
        if (res.rows.length > 0) {
          return normalizePaymentRecord(res.rows[0]);
        }

        if (cleanDigitsOnly.length >= 4) {
          const fallbackRes = await activePool.query(
            `SELECT * FROM payment_transactions WHERE "orderId" LIKE '%' || $1 || '%' OR id LIKE '%' || $1 || '%' LIMIT 1`,
            [cleanDigitsOnly]
          );
          if (fallbackRes.rows.length > 0) {
            return normalizePaymentRecord(fallbackRes.rows[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching payment by orderId from DB:', err);
      }
    }

    const list = inMemoryData['payment_transactions'] || [];
    const candidateLowerSet = new Set(candidateIds.map(c => c.toLowerCase()));
    const found = list.find((p: Record<string, unknown>) => {
      const pOid = String(p.orderId || p.orderid || '').toLowerCase();
      const pOidClean = pOid.replace(/^#+/, '').trim();
      const pOidDigits = pOidClean.replace(/^ft/i, '').trim();
      const pId = String(p.id || '').toLowerCase();
      const pIdClean = pId.replace(/^pay[-_]/i, '').replace(/^#+/, '').trim();
      const pIdDigits = pIdClean.replace(/^ft/i, '').trim();

      return (
        candidateLowerSet.has(pOid) ||
        candidateLowerSet.has(pOidClean) ||
        candidateLowerSet.has(pOidDigits) ||
        candidateLowerSet.has(pId) ||
        candidateLowerSet.has(pIdClean) ||
        candidateLowerSet.has(pIdDigits) ||
        (cleanDigitsOnly.length >= 4 && (pOid.includes(cleanDigitsOnly) || pId.includes(cleanDigitsOnly)))
      );
    });
    return found ? normalizePaymentRecord(found) : null;
  },

  async getPaymentById(paymentId: string): Promise<Record<string, unknown> | null> {
    let raw = String(paymentId || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;

    while (raw.includes('%23') || raw.includes('%20') || raw.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(raw);
        if (decoded === raw) break;
        raw = decoded;
      } catch {
        break;
      }
    }
    const cleanNoHash = raw.replace(/^#+/, '').trim();
    const cleanNoPay = cleanNoHash.replace(/^pay[-_]/i, '').trim();
    const cleanDigitsOnly = cleanNoPay.replace(/^#?ft/i, '').trim();

    const candidateIds = Array.from(new Set([
      raw,
      raw.toLowerCase(),
      cleanNoHash,
      cleanNoHash.toLowerCase(),
      cleanNoPay,
      cleanNoPay.toLowerCase(),
      cleanDigitsOnly,
      cleanDigitsOnly.toLowerCase(),
      '#' + cleanNoHash,
      'FT' + cleanDigitsOnly,
      '#FT' + cleanDigitsOnly,
      'ft' + cleanDigitsOnly,
      '#ft' + cleanDigitsOnly,
      'pay-' + cleanNoHash,
      'pay-' + cleanNoPay,
      'pay-FT' + cleanDigitsOnly,
      'pay-' + cleanDigitsOnly
    ].filter(Boolean)));

    const activePool = getPool();
    if (activePool) {
      try {
        const candidateLower = Array.from(new Set(candidateIds.map(c => c.toLowerCase())));
        const candidateNoHashLower = Array.from(new Set(candidateIds.map(c => c.replace(/^#+/, '').toLowerCase())));

        const res = await activePool.query(
          `SELECT * FROM payment_transactions 
           WHERE LOWER(TRIM(id)) = ANY($1::text[]) 
              OR LOWER(TRIM("orderId")) = ANY($1::text[]) 
              OR REPLACE(LOWER(TRIM("orderId")), '#', '') = ANY($2::text[])
              OR REGEXP_REPLACE(LOWER(TRIM(id)), '^pay-(#?ft)?', '', 'i') = $3
              OR REGEXP_REPLACE(LOWER(TRIM("orderId")), '^#?ft', '', 'i') = $3
           LIMIT 1`,
          [candidateLower, candidateNoHashLower, cleanDigitsOnly.toLowerCase()]
        );
        if (res.rows.length > 0) {
          return normalizePaymentRecord(res.rows[0]);
        }

        if (cleanDigitsOnly.length >= 4) {
          const fallbackRes = await activePool.query(
            `SELECT * FROM payment_transactions WHERE id LIKE '%' || $1 || '%' OR "orderId" LIKE '%' || $1 || '%' LIMIT 1`,
            [cleanDigitsOnly]
          );
          if (fallbackRes.rows.length > 0) {
            return normalizePaymentRecord(fallbackRes.rows[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching payment by id from DB:', err);
      }
    }

    const list = inMemoryData['payment_transactions'] || [];
    const candidateLowerSet = new Set(candidateIds.map(c => c.toLowerCase()));
    const found = list.find((p: Record<string, unknown>) => {
      const pId = String(p.id || '').toLowerCase();
      const pIdClean = pId.replace(/^pay[-_]/i, '').replace(/^#+/, '').trim();
      const pIdDigits = pIdClean.replace(/^ft/i, '').trim();
      const pOid = String(p.orderId || p.orderid || '').toLowerCase();
      const pOidClean = pOid.replace(/^#+/, '').trim();
      const pOidDigits = pOidClean.replace(/^ft/i, '').trim();

      return (
        candidateLowerSet.has(pId) ||
        candidateLowerSet.has(pIdClean) ||
        candidateLowerSet.has(pIdDigits) ||
        candidateLowerSet.has(pOid) ||
        candidateLowerSet.has(pOidClean) ||
        candidateLowerSet.has(pOidDigits) ||
        (cleanDigitsOnly.length >= 4 && (pId.includes(cleanDigitsOnly) || pOid.includes(cleanDigitsOnly)))
      );
    });
    return found ? normalizePaymentRecord(found) : null;
  },

  async getPaymentByRazorpayOrderId(razorpayOrderId: string): Promise<Record<string, unknown> | null> {
    const raw = String(razorpayOrderId || '').trim();
    if (!raw) return null;

    const activePool = getPool();
    if (activePool) {
      try {
        const res = await activePool.query(
          `SELECT * FROM payment_transactions 
           WHERE "razorpayOrderId" = $1 OR "transactionReference" = $1 OR id = $1 LIMIT 1`,
          [raw]
        );
        if (res.rows.length > 0) {
          return normalizePaymentRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error fetching payment by razorpayOrderId from DB:', err);
      }
    }

    const list = inMemoryData['payment_transactions'] || [];
    const found = list.find((p: Record<string, unknown>) => 
      String(p.razorpayOrderId || p.razorpayorderid || p.transactionReference || p.id || '').trim() === raw
    );
    return found ? normalizePaymentRecord(found) : null;
  },

  async getPaymentByRazorpayPaymentId(razorpayPaymentId: string): Promise<Record<string, unknown> | null> {
    const raw = String(razorpayPaymentId || '').trim();
    if (!raw) return null;

    const activePool = getPool();
    if (activePool) {
      try {
        const res = await activePool.query(
          `SELECT * FROM payment_transactions 
           WHERE "razorpayPaymentId" = $1 OR "paymentId" = $1 OR id = $1 LIMIT 1`,
          [raw]
        );
        if (res.rows.length > 0) {
          return normalizePaymentRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error fetching payment by razorpayPaymentId from DB:', err);
      }
    }

    const list = inMemoryData['payment_transactions'] || [];
    const found = list.find((p: Record<string, unknown>) => 
      String(p.razorpayPaymentId || p.razorpaypaymentid || p.paymentId || p.id || '').trim() === raw
    );
    return found ? normalizePaymentRecord(found) : null;
  },

  /**
   * Dedicated Atomic Payment Transaction Upsert Method
   */
  async upsertPaymentTransaction(payment: {
    id?: string;
    orderId: string;
    customerId?: string;
    amount?: number;
    currency?: string;
    status: string;
    method?: string;
    provider?: string;
    transactionReference?: string;
    utr?: string;
    proofImageUrl?: string;
    submittedAt?: string;
    verifiedAt?: string;
    verifiedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    paymentProofType?: string;
    paidAt?: string | null;
    createdAt?: string;
    metadata?: Record<string, unknown>;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }): Promise<Record<string, unknown>> {
    const rawOrderId = String(payment.orderId || '').trim();
    const cleanOrderId = rawOrderId.replace(/^#+/, '').trim();
    const cleanId = String(payment.id || `pay-${cleanOrderId}`).trim();
    const now = new Date().toISOString();

    const currentSubmittedAt = payment.submittedAt || (payment.status === 'PAYMENT_VERIFICATION_PENDING' ? now : undefined);
    const paidAt = payment.status === 'PAID' ? (payment.verifiedAt || payment.paidAt || now) : null;

    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => 
      String(p.orderId || p.orderid || '').replace(/^#+/, '').trim().toLowerCase() === cleanOrderId.toLowerCase() ||
      String(p.id || '').trim().toLowerCase() === cleanId.toLowerCase()
    );

    const mergedRecord: Record<string, unknown> = {
      ...(idx >= 0 ? list[idx] : {}),
      id: cleanId,
      orderId: cleanOrderId,
      customerId: payment.customerId || (idx >= 0 ? list[idx].customerId : 'customer'),
      amount: payment.amount !== undefined ? payment.amount : (idx >= 0 ? list[idx].amount : 0),
      currency: payment.currency || (idx >= 0 ? list[idx].currency : 'INR') || 'INR',
      status: payment.status,
      method: payment.method || (idx >= 0 ? list[idx].method : 'Razorpay') || 'Razorpay',
      provider: payment.provider || (idx >= 0 ? list[idx].provider : 'RAZORPAY') || 'RAZORPAY',
      transactionReference: payment.transactionReference !== undefined ? payment.transactionReference : (payment.razorpayPaymentId || (idx >= 0 ? list[idx].transactionReference : undefined)),
      utr: payment.utr !== undefined ? payment.utr : (idx >= 0 ? list[idx].utr : ''),
      proofImageUrl: payment.proofImageUrl !== undefined ? payment.proofImageUrl : (idx >= 0 ? list[idx].proofImageUrl : ''),
      submittedAt: currentSubmittedAt || (idx >= 0 ? list[idx].submittedAt : now),
      verifiedAt: payment.verifiedAt !== undefined ? payment.verifiedAt : (idx >= 0 ? list[idx].verifiedAt : undefined),
      verifiedBy: payment.verifiedBy !== undefined ? payment.verifiedBy : (idx >= 0 ? list[idx].verifiedBy : undefined),
      rejectedAt: payment.rejectedAt !== undefined ? payment.rejectedAt : (idx >= 0 ? list[idx].rejectedAt : undefined),
      rejectedBy: payment.rejectedBy !== undefined ? payment.rejectedBy : (idx >= 0 ? list[idx].rejectedBy : undefined),
      rejectionReason: payment.rejectionReason !== undefined ? payment.rejectionReason : (idx >= 0 ? list[idx].rejectionReason : undefined),
      paymentProofType: payment.paymentProofType || (idx >= 0 ? list[idx].paymentProofType : 'image') || 'image',
      razorpayOrderId: payment.razorpayOrderId !== undefined ? payment.razorpayOrderId : (idx >= 0 ? list[idx].razorpayOrderId : undefined),
      razorpayPaymentId: payment.razorpayPaymentId !== undefined ? payment.razorpayPaymentId : (idx >= 0 ? list[idx].razorpayPaymentId : undefined),
      razorpaySignature: payment.razorpaySignature !== undefined ? payment.razorpaySignature : (idx >= 0 ? list[idx].razorpaySignature : undefined),
      updatedAt: now,
      createdAt: (idx >= 0 && list[idx].createdAt) ? list[idx].createdAt : now,
      paidAt: paidAt || (idx >= 0 ? list[idx].paidAt : null),
      metadata: {
        ...((idx >= 0 && typeof list[idx].metadata === 'object') ? list[idx].metadata : {}),
        ...(payment.metadata || {})
      }
    };

    if (idx >= 0) {
      list[idx] = mergedRecord;
    } else {
      list.unshift(mergedRecord);
    }
    inMemoryData['payment_transactions'] = list;

    const activePool = getPool();
    if (!activePool) {
      return normalizePaymentRecord(mergedRecord);
    }

    try {
      const res = await activePool.query(
        `INSERT INTO payment_transactions (
          id, "orderId", "customerId", amount, currency, status, method, provider,
          "transactionReference", utr, "proofImageUrl", "submittedAt", "verifiedAt", "verifiedBy",
          "rejectedAt", "rejectedBy", "rejectionReason", "paymentProofType",
          "createdAt", "updatedAt", "paidAt", "attemptCount", metadata,
          "razorpayOrderId", "razorpayPaymentId", "razorpaySignature"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        ON CONFLICT ("orderId") DO UPDATE
        SET status = EXCLUDED.status,
            amount = CASE WHEN EXCLUDED.amount > 0 THEN EXCLUDED.amount ELSE payment_transactions.amount END,
            method = COALESCE(EXCLUDED.method, payment_transactions.method),
            provider = COALESCE(EXCLUDED.provider, payment_transactions.provider),
            "transactionReference" = COALESCE(EXCLUDED."transactionReference", payment_transactions."transactionReference"),
            utr = COALESCE(EXCLUDED.utr, payment_transactions.utr),
            "proofImageUrl" = COALESCE(EXCLUDED."proofImageUrl", payment_transactions."proofImageUrl"),
            "submittedAt" = COALESCE(EXCLUDED."submittedAt", payment_transactions."submittedAt"),
            "verifiedAt" = COALESCE(EXCLUDED."verifiedAt", payment_transactions."verifiedAt"),
            "verifiedBy" = COALESCE(EXCLUDED."verifiedBy", payment_transactions."verifiedBy"),
            "rejectedAt" = COALESCE(EXCLUDED."rejectedAt", payment_transactions."rejectedAt"),
            "rejectedBy" = COALESCE(EXCLUDED."rejectedBy", payment_transactions."rejectedBy"),
            "rejectionReason" = COALESCE(EXCLUDED."rejectionReason", payment_transactions."rejectionReason"),
            "paymentProofType" = COALESCE(EXCLUDED."paymentProofType", payment_transactions."paymentProofType"),
            "paidAt" = CASE WHEN EXCLUDED.status = 'PAID' THEN COALESCE(EXCLUDED."paidAt", $21) ELSE payment_transactions."paidAt" END,
            "razorpayOrderId" = COALESCE(EXCLUDED."razorpayOrderId", payment_transactions."razorpayOrderId"),
            "razorpayPaymentId" = COALESCE(EXCLUDED."razorpayPaymentId", payment_transactions."razorpayPaymentId"),
            "razorpaySignature" = COALESCE(EXCLUDED."razorpaySignature", payment_transactions."razorpaySignature"),
            "updatedAt" = EXCLUDED."updatedAt",
            metadata = COALESCE(payment_transactions.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb)
        RETURNING *`,
        [
          cleanId,
          cleanOrderId,
          mergedRecord.customerId,
          Number(mergedRecord.amount || 0),
          mergedRecord.currency,
          mergedRecord.status,
          mergedRecord.method,
          mergedRecord.provider,
          mergedRecord.transactionReference || null,
          mergedRecord.utr || null,
          mergedRecord.proofImageUrl || null,
          mergedRecord.submittedAt || null,
          mergedRecord.verifiedAt || null,
          mergedRecord.verifiedBy || null,
          mergedRecord.rejectedAt || null,
          mergedRecord.rejectedBy || null,
          mergedRecord.rejectionReason || null,
          mergedRecord.paymentProofType || 'image',
          mergedRecord.createdAt,
          now,
          paidAt || null,
          1,
          JSON.stringify(mergedRecord.metadata || {}),
          mergedRecord.razorpayOrderId || null,
          mergedRecord.razorpayPaymentId || null,
          mergedRecord.razorpaySignature || null
        ]
      );

      if (res.rows.length > 0) {
        return normalizePaymentRecord(res.rows[0]);
      }
    } catch (err) {
      console.error(`[DATABASE ERROR] upsertPaymentTransaction failed for order "${cleanOrderId}":`, err);
    }

    return normalizePaymentRecord(mergedRecord);
  },

  /**
   * Dedicated Atomic Product Management Methods
   */
  async getProductById(idOrSlug: string): Promise<Product | null> {
    let raw = String(idOrSlug || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;

    while (raw.includes('%23') || raw.includes('%20') || raw.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(raw);
        if (decoded === raw) break;
        raw = decoded;
      } catch {
        break;
      }
    }
    const clean = raw.trim();
    const slug = clean.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const activePool = getPool();
    if (activePool) {
      try {
        const res = await activePool.query(
          'SELECT * FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1)) OR LOWER(TRIM(id)) = LOWER(TRIM($2)) OR LOWER(TRIM(name)) = LOWER(TRIM($1)) OR LOWER(REPLACE(LOWER(TRIM(name)), \' \', \'-\')) = LOWER(TRIM($2)) LIMIT 1',
          [clean, slug]
        );
        if (res.rows.length > 0) {
          return normalizeProductRecord(res.rows[0]);
        }
      } catch (err) {
        console.error('Error fetching product from DB:', err);
      }
    }

    const list = (inMemoryData['products'] && inMemoryData['products'].length > 0) ? inMemoryData['products'] : productsJson;
    let found = list.find((p: any) => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pName = String(p.name || '').toLowerCase().trim();
      const pSlug = pName.replace(/ /g, '-');
      const targetClean = clean.toLowerCase();
      const targetSlug = slug.toLowerCase();
      return pId === targetClean || pId === targetSlug || pName === targetClean || pSlug === targetSlug;
    });

    if (!found && Array.isArray(productsJson)) {
      found = (productsJson as any[]).find((p: any) => {
        const pId = String(p.id || '').toLowerCase().trim();
        const pName = String(p.name || '').toLowerCase().trim();
        const pSlug = pName.replace(/ /g, '-');
        const targetClean = clean.toLowerCase();
        const targetSlug = slug.toLowerCase();
        return pId === targetClean || pId === targetSlug || pName === targetClean || pSlug === targetSlug;
      });
    }

    return found ? normalizeProductRecord(found) : null;
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const products = await this.readTable<Product>('products');
    
    // Auto-generate safe slug and SKU if not provided
    const name = String(productData.name || '').trim();
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    let targetId = String(productData.id || '').trim();
    if (!targetId) {
      const isSlugExists = products.some(p => p.id.toLowerCase() === slug.toLowerCase() || p.name.toLowerCase().replace(/ /g, '-') === slug.toLowerCase());
      targetId = isSlugExists ? `${slug}-${Date.now().toString().slice(-4)}` : slug;
    }

    const brandPrefix = productData.wellnessBrand ? productData.wellnessBrand.substring(0, 3).toUpperCase() : 'VM';
    const generatedSku = productData.wellnessSku || `SKU-${brandPrefix}-${Date.now().toString().slice(-5)}`;

    const price = Number(productData.price || 0);
    const originalPrice = Number(productData.originalPrice || price);
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const category = (productData.category || 'cakes') as any;
    const primaryImage = productData.image || '';

    const newProduct: Product = {
      id: targetId,
      name,
      category,
      subCategory: productData.subCategory,
      price,
      originalPrice,
      discount,
      rating: productData.rating || 4.5,
      reviewCount: productData.reviewCount || 0,
      image: primaryImage,
      deliveryTime: productData.deliveryTime || '30-45 mins',
      inStock: productData.inStock !== undefined ? productData.inStock : true,
      description: productData.description || '',
      ingredients: productData.ingredients && productData.ingredients.length > 0 ? productData.ingredients : (productData.wellnessMaterial ? [productData.wellnessMaterial] : ['Premium Ingredients']),
      allergens: productData.allergens && productData.allergens.length > 0 ? productData.allergens : ['Standard warnings apply'],
      storageInstructions: productData.storageInstructions || 'Store fresh.',
      occasions: productData.occasions && productData.occasions.length > 0 ? productData.occasions : ['Just Because'],
      variants: productData.variants && productData.variants.length > 0 ? productData.variants : ['Standard'],
      wellnessBrand: productData.wellnessBrand,
      wellnessType: category === 'wellness' ? productData.wellnessType : undefined,
      wellnessMaterial: category === 'wellness' ? productData.wellnessMaterial : undefined,
      wellnessPackSize: category === 'wellness' ? productData.wellnessPackSize : undefined,
      wellnessTexture: category === 'wellness' ? productData.wellnessTexture : undefined,
      wellnessFlavor: category === 'wellness' ? productData.wellnessFlavor : undefined,
      wellnessVerified: category === 'wellness' ? (productData.wellnessVerified !== undefined ? productData.wellnessVerified : true) : true,
      wellnessSku: generatedSku,
      wellnessDetails: category === 'wellness' ? {
        material: productData.wellnessMaterial || 'Latex',
        lubrication: 'Silicone Lubrication',
        texture: productData.wellnessTexture || 'Smooth',
        sizeFit: '53mm Nominal Width',
        flavor: productData.wellnessFlavor || undefined,
        storage: productData.storageInstructions || 'Store in a cool dry place.',
        manufacturer: 'FATAFAT Sourced Manufacturer'
      } : undefined,
      gallery: productData.gallery && productData.gallery.length > 0 ? productData.gallery : [primaryImage]
    };

    const normalized = normalizeProductRecord(newProduct);

    // Save in-memory
    const list = inMemoryData['products'] || [];
    const existingIdx = list.findIndex(p => String(p.id).toLowerCase() === targetId.toLowerCase());
    if (existingIdx >= 0) {
      list[existingIdx] = normalized as any;
    } else {
      list.unshift(normalized as any);
    }
    inMemoryData['products'] = list;

    // Save in PostgreSQL
    const activePool = getPool();
    if (activePool) {
      try {
        const allowed = ALLOWED_COLUMNS['products'] || [];
        const allowedLowerMap = new Map<string, string>();
        for (const col of allowed) allowedLowerMap.set(col.toLowerCase(), col);

        const cols: string[] = [];
        const vals: string[] = [];
        const queryVals: unknown[] = [];

        for (const [k, rawV] of Object.entries(normalized as unknown as Record<string, unknown>)) {
          const canonicalCol = allowedLowerMap.get(k.toLowerCase());
          if (!canonicalCol) continue;
          if (cols.includes(`"${canonicalCol}"`)) continue;
          cols.push(`"${canonicalCol}"`);
          queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
          vals.push(`$${queryVals.length}`);
        }

        if (cols.length > 0) {
          const updateSets = cols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
          const queryText = `INSERT INTO "products" (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO UPDATE SET ${updateSets} RETURNING *`;
          const res = await activePool.query(queryText, queryVals);
          if (res.rows.length > 0) {
            return normalizeProductRecord(res.rows[0]);
          }
        }
      } catch (err) {
        console.error('Error creating product in DB:', err);
      }
    }

    return normalized;
  },

  async updateProduct(idOrSlug: string, updates: Partial<Product>): Promise<Product | null> {
    const existing = await this.getProductById(idOrSlug);
    if (!existing) return null;

    const existingId = existing.id;
    const cleanTarget = String(idOrSlug).trim();

    const price = updates.price !== undefined ? Number(updates.price) : existing.price;
    const originalPrice = updates.originalPrice !== undefined ? Number(updates.originalPrice) : existing.originalPrice;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : (updates.discount !== undefined ? Number(updates.discount) : existing.discount);

    const merged: Product = {
      ...existing,
      ...updates,
      id: existingId, // Preserve immutable, stable ID
      price,
      originalPrice,
      discount,
      wellnessDetails: (existing.category === 'wellness' || updates.category === 'wellness') ? {
        material: updates.wellnessMaterial || existing.wellnessMaterial || 'Latex',
        lubrication: updates.wellnessTexture === 'Smooth' ? 'Silicone Lubricated' : 'Textured Rib/Dot Oil',
        texture: updates.wellnessTexture || existing.wellnessTexture || 'Smooth',
        sizeFit: '53mm Nominal Width',
        flavor: updates.wellnessFlavor !== undefined ? updates.wellnessFlavor : existing.wellnessFlavor,
        storage: updates.storageInstructions || existing.storageInstructions || 'Store fresh.',
        manufacturer: updates.wellnessDetails?.manufacturer || existing.wellnessDetails?.manufacturer || 'FATAFAT Sourced Manufacturer'
      } : undefined
    };

    const normalized = normalizeProductRecord(merged);

    // Update in-memory
    const list = inMemoryData['products'] || [];
    const idx = list.findIndex(p => 
      String(p.id).toLowerCase() === existingId.toLowerCase() || 
      String(p.id).toLowerCase() === cleanTarget.toLowerCase() ||
      String(p.name).toLowerCase() === cleanTarget.toLowerCase()
    );
    if (idx >= 0) {
      list[idx] = normalized as any;
    } else {
      list.unshift(normalized as any);
    }
    inMemoryData['products'] = list;

    // Update in PostgreSQL
    const activePool = getPool();
    if (activePool) {
      try {
        const allowed = ALLOWED_COLUMNS['products'] || [];
        const allowedLowerMap = new Map<string, string>();
        for (const col of allowed) allowedLowerMap.set(col.toLowerCase(), col);

        const setClauses: string[] = [];
        const queryVals: unknown[] = [];

        for (const [k, rawV] of Object.entries(normalized as unknown as Record<string, unknown>)) {
          if (k.toLowerCase() === 'id') continue;
          const canonicalCol = allowedLowerMap.get(k.toLowerCase());
          if (!canonicalCol) continue;
          queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
          setClauses.push(`"${canonicalCol}" = $${queryVals.length}`);
        }

        if (setClauses.length > 0) {
          queryVals.push(existingId);
          const idParam = `$${queryVals.length}`;
          queryVals.push(cleanTarget);
          const targetParam = `$${queryVals.length}`;

          const queryText = `UPDATE "products" SET ${setClauses.join(', ')} WHERE LOWER(TRIM(id)) = LOWER(TRIM(${idParam})) OR LOWER(TRIM(id)) = LOWER(TRIM(${targetParam})) RETURNING *`;
          const res = await activePool.query(queryText, queryVals);
          if (res.rows.length > 0) {
            return normalizeProductRecord(res.rows[0]);
          }
        }
      } catch (err) {
        console.error('Error updating product in DB:', err);
      }
    }

    return normalized;
  },

  async deleteProduct(idOrSlug: string): Promise<boolean> {
    const existing = await this.getProductById(idOrSlug);
    if (!existing) return false;

    const existingId = existing.id;
    const cleanTarget = String(idOrSlug).trim();

    // Delete from in-memory
    const list = inMemoryData['products'] || [];
    inMemoryData['products'] = list.filter(p => 
      String(p.id).toLowerCase() !== existingId.toLowerCase() &&
      String(p.id).toLowerCase() !== cleanTarget.toLowerCase() &&
      String(p.name).toLowerCase() !== cleanTarget.toLowerCase()
    );

    // Delete from PostgreSQL
    const activePool = getPool();
    if (activePool) {
      try {
        await activePool.query('DELETE FROM "products" WHERE LOWER(TRIM(id)) = LOWER(TRIM($1)) OR LOWER(TRIM(id)) = LOWER(TRIM($2))', [existingId, cleanTarget]);
      } catch (err) {
        console.error('Error deleting product from DB:', err);
      }
    }

    return true;
  },

  async createPayment(payment: Record<string, unknown>): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === payment.id || (payment.orderId && p.orderId === payment.orderId));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payment };
    } else {
      list.push(payment);
    }
    inMemoryData['payment_transactions'] = list;

    if (!pool) {
      return true;
    }
    try {
      const {
        id,
        orderId,
        customerId,
        amount,
        currency,
        status,
        method,
        provider,
        createdAt,
        updatedAt,
        attemptCount,
      } = payment;

      await pool.query(
        `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, "createdAt", "updatedAt", "attemptCount")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          orderId,
          customerId,
          amount,
          currency || 'INR',
          status,
          method,
          provider,
          createdAt,
          updatedAt,
          attemptCount || 0,
        ]
      );
      return true;
    } catch (err) {
      console.error('Error creating payment:', err);
      return true;
    }
  },

  async updatePaymentStatus(
    paymentId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    const paidAt = status === 'PAID' ? updatedAt : null;
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status,
        updatedAt,
        ...(paidAt ? { paidAt } : {}),
        ...(metadata ? { metadata: { ...((list[idx].metadata as Record<string, unknown>) || {}), ...metadata } } : {})
      };
    }

    if (!pool) {
      return true;
    }
    try {
      let query = `UPDATE payment_transactions SET status = $1, "updatedAt" = $2`;
      const params: unknown[] = [status, updatedAt];

      if (paidAt) {
        query += `, "paidAt" = $${params.length + 1}`;
        params.push(paidAt);
      }

      if (metadata) {
        query += `, metadata = $${params.length + 1}`;
        params.push(JSON.stringify(metadata));
      }

      query += ` WHERE LOWER(id) = LOWER($${params.length + 1}) OR LOWER("orderId") = LOWER($${params.length + 1})`;
      params.push(paymentId);

      await pool.query(query, params);
      return true;
    } catch (err) {
      console.error('Error updating payment status:', err);
      return true;
    }
  },

  async updatePaymentWithReference(
    paymentId: string,
    transactionReference: string,
    status: string
  ): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    const paidAt = status === 'PAID' ? updatedAt : null;
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        transactionReference,
        status,
        updatedAt,
        ...(paidAt ? { paidAt } : {})
      };
    }

    if (!pool) {
      return true;
    }
    try {
      let query = `UPDATE payment_transactions 
                   SET "transactionReference" = $1, status = $2, "updatedAt" = $3`;
      const params: unknown[] = [transactionReference, status, updatedAt];

      if (paidAt) {
        query += `, "paidAt" = $${params.length + 1}`;
        params.push(paidAt);
      }

      query += ` WHERE id = $${params.length + 1}`;
      params.push(paymentId);

      await pool.query(query, params);
      return true;
    } catch (err) {
      console.error('Error updating payment with reference:', err);
      return true;
    }
  },

  async markPaymentFailed(
    paymentId: string,
    failureReason: string
  ): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: 'FAILED',
        failureReason,
        updatedAt
      };
    }

    if (!pool) {
      return true;
    }
    try {
      await pool.query(
        `UPDATE payment_transactions 
         SET status = $1, "failureReason" = $2, "updatedAt" = $3
         WHERE id = $4`,
        ['FAILED', failureReason, updatedAt, paymentId]
      );
      return true;
    } catch (err) {
      console.error('Error marking payment as failed:', err);
      return true;
    }
  },

  async incrementPaymentRetry(paymentId: string): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        attemptCount: (Number(list[idx].attemptCount) || 0) + 1,
        lastAttemptAt: updatedAt,
        updatedAt
      };
    }

    if (!pool) {
      return true;
    }
    try {
      await pool.query(
        `UPDATE payment_transactions 
         SET "attemptCount" = "attemptCount" + 1, "lastAttemptAt" = $1, "updatedAt" = $2
         WHERE id = $3`,
        [updatedAt, updatedAt, paymentId]
      );
      return true;
    } catch (err) {
      console.error('Error incrementing payment retry:', err);
      return true;
    }
  },

  async getPaymentHistory(customerId: string, limit: number = 50): Promise<Record<string, unknown>[]> {
    if (!pool) {
      const list = inMemoryData['payment_transactions'] || [];
      return list.filter((p: Record<string, unknown>) => String(p.customerId) === String(customerId)).slice(0, limit);
    }
    try {
      const res = await pool.query(
        `SELECT * FROM payment_transactions 
         WHERE "customerId" = $1 
         ORDER BY "createdAt" DESC 
         LIMIT $2`,
        [customerId, limit]
      );
      return res.rows;
    } catch (err) {
      console.error('Error fetching payment history:', err);
      const list = inMemoryData['payment_transactions'] || [];
      return list.filter((p: Record<string, unknown>) => String(p.customerId) === String(customerId)).slice(0, limit);
    }
  },

  async getConfig<T = unknown>(key: string): Promise<T | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT data FROM config WHERE key = $1', [key]);
        if (res.rows.length > 0) {
          const d = res.rows[0].data;
          return typeof d === 'string' ? JSON.parse(d) : (d as T);
        }
      } catch (err) {
        console.error(`Error reading config for ${key}:`, err);
      }
    }
    return (inMemoryConfig[key] as T) || null;
  },

  async setConfig<T = unknown>(key: string, data: T): Promise<boolean> {
    inMemoryConfig[key] = data;
    if (!pool) return true;
    try {
      await pool.query(
        'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        [key, typeof data === 'object' ? JSON.stringify(data) : data]
      );
      return true;
    } catch (err) {
      console.error(`Error writing config for ${key}:`, err);
      return false;
    }
  },

  async getWellnessSettings(): Promise<{ published: boolean }> {
    const config = await this.getConfig<{ published: boolean }>('wellness_settings');
    return config && typeof config.published === 'boolean' ? config : { published: false };
  },

  async setWellnessSettings(published: boolean): Promise<boolean> {
    return this.setConfig('wellness_settings', { published: !!published });
  },

  async readHomepage(): Promise<Record<string, unknown>> {
    if (!pool) return {};
    try {
      const res = await pool.query("SELECT data FROM config WHERE key = 'homepage'");
      if (res.rows.length > 0) {
        const val = res.rows[0].data;
        if (typeof val === 'string') {
          return JSON.parse(val);
        }
        return val || {};
      }
      return {};
    } catch (err) {
      console.error('PostgreSQL error reading homepage config:', err);
      return {};
    }
  },

  async writeHomepage(data: Record<string, unknown>): Promise<boolean> {
    if (!pool) return false;
    try {
      await pool.query(
        'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        ['homepage', JSON.stringify(data)]
      );
      return true;
    } catch (err) {
      console.error('PostgreSQL error writing homepage config:', err);
      return false;
    }
  },

  async logActivity(adminUser: string, action: string, product: string, previousValue: string, newValue: string) {
    if (!pool) return;
    try {
      const newLog = {
        id: `log-${Date.now()}`,
        adminUser,
        action,
        dateTime: new Date().toISOString(),
        product,
        previousValue,
        newValue
      };
      await insertRow(pool, 'auditLogs', newLog);
    } catch (err) {
      console.error('PostgreSQL error logging activity:', err);
    }
  },

  /**
   * Dedicated Live Entity Counts for Data Management Module
   */
  async getEntityCounts(): Promise<{
    customers: number;
    orders: number;
    payments: number;
    partners: number;
    sessions: number;
    issues: number;
    products: number;
    categories: number;
    brands: number;
    admins: number;
  }> {
    if (pool) {
      try {
        const [cUsers, cOrders, cPayments, cPartners, cSessions, cIssues, cProducts, cCategories, cBrands, cAdmins] = await Promise.all([
          pool.query('SELECT COUNT(*) FROM users').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM orders').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM payment_transactions').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM partners').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM sessions').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM "inventoryIssues"').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM products').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM categories').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM brands').catch(() => ({ rows: [{ count: 0 }] })),
          pool.query('SELECT COUNT(*) FROM admin').catch(() => ({ rows: [{ count: 0 }] })),
        ]);
        return {
          customers: parseInt((cUsers.rows[0] as any)?.count || '0', 10),
          orders: parseInt((cOrders.rows[0] as any)?.count || '0', 10),
          payments: parseInt((cPayments.rows[0] as any)?.count || '0', 10),
          partners: parseInt((cPartners.rows[0] as any)?.count || '0', 10),
          sessions: parseInt((cSessions.rows[0] as any)?.count || '0', 10),
          issues: parseInt((cIssues.rows[0] as any)?.count || '0', 10),
          products: parseInt((cProducts.rows[0] as any)?.count || '0', 10),
          categories: parseInt((cCategories.rows[0] as any)?.count || '0', 10),
          brands: parseInt((cBrands.rows[0] as any)?.count || '0', 10),
          admins: parseInt((cAdmins.rows[0] as any)?.count || '0', 10) || (inMemoryData['admin'] || []).length || 1,
        };
      } catch (err) {
        console.warn('PostgreSQL entity counts warning:', err);
      }
    }

    return {
      customers: (inMemoryData['users'] || []).length,
      orders: (inMemoryData['orders'] || []).length,
      payments: (inMemoryData['payment_transactions'] || []).length,
      partners: (inMemoryData['partners'] || []).length,
      sessions: (inMemoryData['sessions'] || []).length,
      issues: (inMemoryData['inventoryIssues'] || []).length,
      products: (inMemoryData['products'] || []).length,
      categories: (inMemoryData['categories'] || []).length,
      brands: (inMemoryData['brands'] || []).length,
      admins: (inMemoryData['admin'] || []).length || 1,
    };
  },

  /**
   * Dedicated Server-Side Atomic Database Reset & Data Management Execution
   */
  async executeDatabaseReset(
    action: 'CUSTOMERS' | 'ORDERS' | 'PAYMENTS' | 'DELIVERY_PARTNERS' | 'SESSIONS_TEST_DATA' | 'CLEAR_TRANSACTIONAL' | 'FULL_RESET',
    adminEmail: string
  ): Promise<{
    success: boolean;
    action: string;
    affected: Record<string, number>;
    preserved: Record<string, number | boolean>;
    error?: string;
  }> {
    const affected: Record<string, number> = {};
    const normalizedAction = String(action || '').toUpperCase();

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (normalizedAction === 'CUSTOMERS') {
          const uRes = await client.query('SELECT COUNT(*) FROM users');
          affected.customers = parseInt(uRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM users');

          const sRes = await client.query("SELECT COUNT(*) FROM sessions WHERE role = 'customer'");
          affected.customerSessions = parseInt(sRes.rows[0]?.count || '0', 10);
          await client.query("DELETE FROM sessions WHERE role = 'customer'");
        } else if (normalizedAction === 'ORDERS') {
          const oRes = await client.query('SELECT COUNT(*) FROM orders');
          affected.orders = parseInt(oRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM orders');

          const iRes = await client.query('SELECT COUNT(*) FROM "inventoryIssues"');
          affected.inventoryIssues = parseInt(iRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM "inventoryIssues"');
        } else if (normalizedAction === 'PAYMENTS') {
          const pRes = await client.query('SELECT COUNT(*) FROM payment_transactions');
          affected.payments = parseInt(pRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM payment_transactions');

          await client.query(`
            UPDATE orders 
            SET "paymentStatus" = 'NOT_STARTED', 
                utr = NULL, 
                "proofImageUrl" = NULL, 
                "paymentSubmittedAt" = NULL, 
                "paymentVerifiedAt" = NULL, 
                "paymentRejectedAt" = NULL, 
                "rejectionReason" = NULL
          `);
        } else if (normalizedAction === 'DELIVERY_PARTNERS') {
          const dpRes = await client.query('SELECT COUNT(*) FROM partners');
          affected.deliveryPartners = parseInt(dpRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM partners');

          const sRes = await client.query("SELECT COUNT(*) FROM sessions WHERE role = 'delivery_partner'");
          affected.partnerSessions = parseInt(sRes.rows[0]?.count || '0', 10);
          await client.query("DELETE FROM sessions WHERE role = 'delivery_partner'");

          await client.query('DELETE FROM delivery_photos').catch(() => {});
          await client.query(`
            UPDATE orders 
            SET "assignedPartnerId" = NULL, 
                "assignedPartnerName" = NULL, 
                "assignedAt" = NULL
          `);
        } else if (normalizedAction === 'SESSIONS_TEST_DATA') {
          const sRes = await client.query("SELECT COUNT(*) FROM sessions WHERE role != 'admin'");
          affected.sessions = parseInt(sRes.rows[0]?.count || '0', 10);
          await client.query("DELETE FROM sessions WHERE role != 'admin'");

          const iRes = await client.query('SELECT COUNT(*) FROM "inventoryIssues"');
          affected.inventoryIssues = parseInt(iRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM "inventoryIssues"');

          await client.query('DELETE FROM delivery_photos').catch(() => {});
          await client.query('DELETE FROM wellness_access_requests').catch(() => {});
          await client.query('DELETE FROM wellness_terms_acceptances').catch(() => {});
        } else if (normalizedAction === 'CLEAR_TRANSACTIONAL' || normalizedAction === 'FULL_RESET') {
          const oRes = await client.query('SELECT COUNT(*) FROM orders');
          affected.orders = parseInt(oRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM orders');

          const pRes = await client.query('SELECT COUNT(*) FROM payment_transactions');
          affected.payments = parseInt(pRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM payment_transactions');

          const uRes = await client.query('SELECT COUNT(*) FROM users');
          affected.customers = parseInt(uRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM users');

          const iRes = await client.query('SELECT COUNT(*) FROM "inventoryIssues"');
          affected.inventoryIssues = parseInt(iRes.rows[0]?.count || '0', 10);
          await client.query('DELETE FROM "inventoryIssues"');

          const sRes = await client.query("SELECT COUNT(*) FROM sessions WHERE role NOT IN ('admin', 'delivery_partner')");
          affected.sessions = parseInt(sRes.rows[0]?.count || '0', 10);
          await client.query("DELETE FROM sessions WHERE role NOT IN ('admin', 'delivery_partner')");

          await client.query('DELETE FROM delivery_photos').catch(() => {});
          await client.query('DELETE FROM wellness_access_requests').catch(() => {});
          await client.query('DELETE FROM wellness_terms_acceptances').catch(() => {});
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Database transaction rollback during reset:', err);
        return {
          success: false,
          action: normalizedAction,
          affected: {},
          preserved: {},
          error: err instanceof Error ? err.message : 'Database transaction failed during reset'
        };
      } finally {
        client.release();
      }
    }

    // Synchronize In-Memory Tables
    if (normalizedAction === 'CUSTOMERS') {
      affected.customers = (inMemoryData['users'] || []).length;
      inMemoryData['users'] = [];
      inMemoryData['sessions'] = (inMemoryData['sessions'] || []).filter(s => s.role !== 'customer');
    } else if (normalizedAction === 'ORDERS') {
      affected.orders = (inMemoryData['orders'] || []).length;
      inMemoryData['orders'] = [];
      inMemoryData['inventoryIssues'] = [];
    } else if (normalizedAction === 'PAYMENTS') {
      affected.payments = (inMemoryData['payment_transactions'] || []).length;
      inMemoryData['payment_transactions'] = [];
      const ords = inMemoryData['orders'] || [];
      for (const o of ords) {
        o.paymentStatus = 'NOT_STARTED';
        o.utr = undefined;
        o.proofImageUrl = undefined;
        o.paymentSubmittedAt = undefined;
        o.paymentVerifiedAt = undefined;
        o.paymentRejectedAt = undefined;
        o.rejectionReason = undefined;
      }
    } else if (normalizedAction === 'DELIVERY_PARTNERS') {
      affected.deliveryPartners = (inMemoryData['partners'] || []).length;
      inMemoryData['partners'] = [];
      inMemoryData['sessions'] = (inMemoryData['sessions'] || []).filter(s => s.role !== 'delivery_partner');
      const ords = inMemoryData['orders'] || [];
      for (const o of ords) {
        o.assignedPartnerId = undefined;
        o.assignedPartnerName = undefined;
        o.assignedAt = undefined;
      }
    } else if (normalizedAction === 'SESSIONS_TEST_DATA') {
      affected.sessions = (inMemoryData['sessions'] || []).filter(s => s.role !== 'admin').length;
      inMemoryData['sessions'] = (inMemoryData['sessions'] || []).filter(s => s.role === 'admin');
      inMemoryData['inventoryIssues'] = [];
    } else if (normalizedAction === 'CLEAR_TRANSACTIONAL' || normalizedAction === 'FULL_RESET') {
      affected.orders = (inMemoryData['orders'] || []).length;
      affected.payments = (inMemoryData['payment_transactions'] || []).length;
      affected.customers = (inMemoryData['users'] || []).length;
      inMemoryData['orders'] = [];
      inMemoryData['payment_transactions'] = [];
      inMemoryData['users'] = [];
      inMemoryData['inventoryIssues'] = [];
      inMemoryData['sessions'] = (inMemoryData['sessions'] || []).filter(s => s.role === 'admin' || s.role === 'delivery_partner');
    }

    // Preserved counts
    const preserved = {
      adminAccounts: (inMemoryData['admin'] || []).length || 1,
      products: (inMemoryData['products'] || []).length,
      categories: (inMemoryData['categories'] || []).length,
      brands: (inMemoryData['brands'] || []).length,
      deliveryPartners: (inMemoryData['partners'] || []).length,
      systemSettings: true,
      paymentConfig: true
    };

    this.logActivity(
      adminEmail || 'Super Admin',
      `DATA_MANAGEMENT_${normalizedAction}`,
      'Database Reset Executed',
      JSON.stringify(affected),
      'Records purged cleanly'
    );

    return {
      success: true,
      action: normalizedAction,
      affected,
      preserved
    };
  },

  async seedDatabase(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!pool) {
      return { success: false, error: 'PostgreSQL connection pool is not configured' };
    }
    
    const client = await pool.connect();
    try {
      // 1. Acquire advisory lock (session level) to prevent concurrent seeding requests
      await client.query('SELECT pg_advisory_lock(123456)');
      
      console.log('Acquired database seeding lock. Starting schema initialization...');
      
      // 2. Create Schema
      await client.query('BEGIN');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255),
          description TEXT,
          status VARCHAR(50),
          image VARCHAR(255),
          "itemCount" INTEGER DEFAULT 0
        );
      `);
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT');
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(50)');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS brands (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255),
          description TEXT,
          status VARCHAR(50),
          website VARCHAR(255),
          logo VARCHAR(255),
          "itemCount" INTEGER DEFAULT 0
        );
      `);
      await client.query('ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT');
      await client.query('ALTER TABLE brands ADD COLUMN IF NOT EXISTS status VARCHAR(50)');
      await client.query('ALTER TABLE brands ADD COLUMN IF NOT EXISTS website VARCHAR(255)');

      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC NOT NULL,
          "originalPrice" NUMERIC,
          image VARCHAR(255),
          gallery JSONB,
          category VARCHAR(255) NOT NULL,
          brand VARCHAR(255),
          rating NUMERIC DEFAULT 0,
          reviews INTEGER DEFAULT 0,
          stock INTEGER DEFAULT 0,
          unit VARCHAR(50),
          "isWellness" BOOLEAN DEFAULT FALSE,
          "wellnessAgeVerifyRequired" BOOLEAN DEFAULT FALSE,
          tags JSONB,
          "inStock" BOOLEAN DEFAULT TRUE
        );
      `);
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "inStock" BOOLEAN DEFAULT TRUE');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "subCategory" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "discount" NUMERIC DEFAULT 0');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "deliveryTime" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "ingredients" JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "allergens" JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "storageInstructions" TEXT');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "occasions" JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "variants" JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessBrand" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessType" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessMaterial" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessPackSize" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessTexture" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessFlavor" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessVerified" BOOLEAN DEFAULT TRUE');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessSku" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "wellnessDetails" JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "createdAt" VARCHAR(255)');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "updatedAt" VARCHAR(255)');
      await client.query('ALTER TABLE products ALTER COLUMN image TYPE TEXT').catch(() => {});
      await client.query('ALTER TABLE categories ALTER COLUMN image TYPE TEXT').catch(() => {});

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          "userId" VARCHAR(255) PRIMARY KEY,
          "googleProviderId" VARCHAR(255),
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE,
          "profileImage" VARCHAR(255),
          "createdAt" VARCHAR(255),
          "lastLoginAt" VARCHAR(255),
          "wellnessAccessStatus" VARCHAR(255),
          "wellnessRequestId" VARCHAR(255),
          "wellnessApprovedAt" VARCHAR(255),
          "wellnessApprovedBy" VARCHAR(255),
          phone VARCHAR(255),
          dob VARCHAR(255),
          gender VARCHAR(255),
          addresses JSONB
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          "sessionId" VARCHAR(255) PRIMARY KEY,
          "userId" VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          "expiresAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS delivery_photos (
          id VARCHAR(255) PRIMARY KEY,
          "orderId" VARCHAR(255) NOT NULL,
          "partnerId" VARCHAR(255) NOT NULL,
          "photoUrl" TEXT NOT NULL,
          category VARCHAR(50),
          "uploadedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wellness_terms_acceptances (
          "customerId" VARCHAR(255) PRIMARY KEY,
          "termsVersion" VARCHAR(50) NOT NULL,
          "acceptedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS product_image_history (
          id VARCHAR(255) PRIMARY KEY,
          "productId" VARCHAR(255) NOT NULL,
          "storagePath" TEXT,
          "imageUrl" TEXT NOT NULL,
          "uploadedBy" VARCHAR(255) NOT NULL,
          "uploadedByRole" VARCHAR(50) NOT NULL,
          "uploadedAt" VARCHAR(255) NOT NULL,
          "previousImage" TEXT,
          "isActive" BOOLEAN DEFAULT TRUE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS admin (
          email VARCHAR(255) PRIMARY KEY,
          "passwordHash" VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          phone VARCHAR(255),
          role VARCHAR(50) DEFAULT 'admin'
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS partners (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          "passwordHash" VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'delivery_partner',
          "locationId" VARCHAR(255),
          "locationName" VARCHAR(255),
          status VARCHAR(50) DEFAULT 'Active',
          "isOnline" BOOLEAN DEFAULT FALSE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS config (
          key VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "inventoryIssues" (
          id VARCHAR(255) PRIMARY KEY,
          "productId" VARCHAR(255) NOT NULL,
          "productName" VARCHAR(255),
          issue VARCHAR(255),
          status VARCHAR(255),
          "createdAt" VARCHAR(255)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "auditLogs" (
          id VARCHAR(255) PRIMARY KEY,
          "adminUser" VARCHAR(255),
          action VARCHAR(255),
          "dateTime" VARCHAR(255),
          product VARCHAR(255),
          "previousValue" TEXT,
          "newValue" TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(255) PRIMARY KEY,
          "customerId" VARCHAR(255) NOT NULL,
          items JSONB NOT NULL,
          subtotal NUMERIC NOT NULL,
          "deliveryFee" NUMERIC DEFAULT 0,
          discount NUMERIC DEFAULT 0,
          total NUMERIC NOT NULL,
          address JSONB NOT NULL,
          status VARCHAR(255) NOT NULL,
          "deliveryOption" VARCHAR(255),
          eta VARCHAR(255),
          "createdAt" VARCHAR(255) NOT NULL,
          "deliveryLocationId" VARCHAR(255),
          "deliveryLocationName" VARCHAR(255),
          "deliveryOtp" VARCHAR(255),
          "otpFailedAttempts" INTEGER DEFAULT 0,
          "otpExpiresAt" VARCHAR(255),
          "statusHistory" JSONB,
          "assignedPartnerId" VARCHAR(255),
          "assignedPartnerName" VARCHAR(255),
          "assignedAt" VARCHAR(255),
          "paymentStatus" VARCHAR(255) DEFAULT 'PENDING',
          "paymentMethod" VARCHAR(255),
          "scheduledDeliveryAt" VARCHAR(255),
          "cancellationReason" TEXT,
          "cancelledAt" VARCHAR(255)
        );
      `);

      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customerEmail" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "updatedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryTimeSlot" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryLocationId" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryLocationName" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryOtp" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "otpFailedAttempts" INTEGER DEFAULT 0');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "otpExpiresAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "statusHistory" JSONB');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "assignedPartnerId" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "assignedPartnerName" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "assignedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "couponCode" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "delivery_otp_verified" BOOLEAN DEFAULT FALSE');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "otp_verified_at" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "verified_by_partner_id" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "delivery_completed_at" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "adminOverride" JSONB');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentId" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS utr VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentSubmittedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentVerifiedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentRejectedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "razorpayOrderId" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "razorpayPaymentId" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT');

      await client.query(`
        CREATE TABLE IF NOT EXISTS wellness_terms_acceptances (
          "customerId" VARCHAR(255) PRIMARY KEY,
          "termsVersion" VARCHAR(255) NOT NULL,
          "acceptedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS delivery_photos (
          id VARCHAR(255) PRIMARY KEY,
          "orderId" VARCHAR(255) NOT NULL,
          "partnerId" VARCHAR(255) NOT NULL,
          "photoUrl" TEXT NOT NULL,
          category VARCHAR(255) NOT NULL,
          "uploadedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wellness_access_requests (
          id VARCHAR(255) PRIMARY KEY,
          "customerId" VARCHAR(255) NOT NULL,
          "customerName" VARCHAR(255) NOT NULL,
          "customerEmail" VARCHAR(255) NOT NULL,
          "requestedAt" VARCHAR(255) NOT NULL,
          status VARCHAR(255) NOT NULL,
          "calculatedAge" INTEGER,
          "reviewedBy" VARCHAR(255),
          "reviewedAt" VARCHAR(255),
          "rejectionReason" TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id VARCHAR(255) PRIMARY KEY,
          "orderId" VARCHAR(255) NOT NULL UNIQUE,
          "customerId" VARCHAR(255) NOT NULL,
          amount NUMERIC NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          status VARCHAR(50) NOT NULL,
          method VARCHAR(50) NOT NULL,
          provider VARCHAR(50) NOT NULL,
          "transactionReference" VARCHAR(255),
          utr VARCHAR(255),
          "proofImageUrl" TEXT,
          "submittedAt" VARCHAR(255),
          "verifiedAt" VARCHAR(255),
          "verifiedBy" VARCHAR(255),
          "rejectedAt" VARCHAR(255),
          "rejectedBy" VARCHAR(255),
          "rejectionReason" TEXT,
          "paymentProofType" VARCHAR(50),
          "paymentProofSize" INTEGER,
          "createdAt" VARCHAR(255) NOT NULL,
          "updatedAt" VARCHAR(255) NOT NULL,
          "paidAt" VARCHAR(255),
          "failureReason" TEXT,
          "attemptCount" INTEGER DEFAULT 0,
          "lastAttemptAt" VARCHAR(255),
          "razorpayOrderId" VARCHAR(255),
          "razorpayPaymentId" VARCHAR(255),
          "razorpaySignature" TEXT,
          metadata JSONB
        );
      `);

      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS utr VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "submittedAt" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "verifiedAt" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "verifiedBy" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "rejectedAt" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "rejectedBy" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "paymentProofType" VARCHAR(50)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "paymentProofSize" INTEGER');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "razorpayOrderId" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "razorpayPaymentId" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT');

      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders("customerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_orders_assigned_partner_id ON orders("assignedPartnerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id ON payment_transactions("customerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions("orderId")');
      await client.query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id VARCHAR(255) PRIMARY KEY,
          code VARCHAR(255) UNIQUE NOT NULL,
          "discountType" VARCHAR(50) NOT NULL,
          "discountValue" NUMERIC NOT NULL,
          "minSpend" NUMERIC DEFAULT 0,
          "maxDiscount" NUMERIC,
          "startDate" VARCHAR(255),
          "expiryDate" VARCHAR(255),
          "isActive" BOOLEAN DEFAULT TRUE,
          "usageLimit" INTEGER,
          "usageCount" INTEGER DEFAULT 0,
          "perCustomerLimit" INTEGER,
          "targetAudience" VARCHAR(50) DEFAULT 'ALL',
          "selectedCustomerIds" JSONB,
          "createdAt" VARCHAR(255) NOT NULL,
          "updatedAt" VARCHAR(255),
          "createdBy" VARCHAR(255)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS coupon_usages (
          id VARCHAR(255) PRIMARY KEY,
          "couponId" VARCHAR(255) NOT NULL,
          "couponCode" VARCHAR(255) NOT NULL,
          "customerId" VARCHAR(255) NOT NULL,
          "customerEmail" VARCHAR(255),
          "orderId" VARCHAR(255),
          "discountAmount" NUMERIC NOT NULL,
          "usedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code))');
      await client.query('CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages("couponId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer_id ON coupon_usages("customerId")');

      await client.query('COMMIT');
      
      console.log('PostgreSQL schema initialized. Starting data seeding...');
      
      // 3. Seed Tables Idempotently (ON CONFLICT DO NOTHING)
      const salt = process.env['AUTH_SECRET'] || 'fatafat_salt';
      
      // Seed Admins - exactly ONE super admin
      const adminPasswordInput = process.env.ADMIN_PASSWORD || 'superadmin123';
      const adminHash = crypto.createHash('sha256').update(adminPasswordInput + salt).digest('hex');
      const adminsSeed = [
        { email: 'superadmin@fatafat.com', passwordHash: adminHash, name: 'FATAFAT Super Admin', phone: '9999999990', role: 'admin' }
      ];
      await client.query("DELETE FROM admin");
      await bulkInsert(client, 'admin', adminsSeed);
      
       // Actively purge fake/demo production data from tables
      await client.query("DELETE FROM orders WHERE id LIKE 'FT-TEST-%' OR id LIKE 'order-test-%'");
      await client.query("DELETE FROM partners WHERE id IN ('DP-001', 'DP-002', 'DP-003')");
      await client.query("DELETE FROM sessions WHERE \"userId\" IN ('DP-001', 'DP-002', 'DP-003', 'DP-TEST-99')");
      
      // Seed Categories, Brands, Products, Users, Partners, Sessions, InventoryIssues, AuditLogs
      await bulkInsert(client, 'categories', categoriesJson);
      await bulkInsert(client, 'brands', brandsJson);
      await bulkInsert(client, 'products', productsJson);
      await bulkInsert(client, 'users', usersJson);
      await bulkInsert(client, 'partners', partnersJson);
      await bulkInsert(client, 'inventoryIssues', inventoryIssuesJson);
      await bulkInsert(client, 'auditLogs', auditLogsJson);
      await bulkInsert(client, 'sessions', sessionsJson);

      // Seed Orders (Filter out test orders as requested)
      const ordersSeed = ordersJson.filter((o) => {
        const ord = o as Record<string, unknown>;
        return !!(ord && ord.id && typeof ord.id === 'string' && !ord.id.startsWith('FT-TEST-') && !ord.id.startsWith('order-test-'));
      });
      await bulkInsert(client, 'orders', ordersSeed);

      // Seed homepage config
      const homepageCountRes = await client.query("SELECT COUNT(*) FROM config WHERE key = 'homepage'");
      if (parseInt(homepageCountRes.rows[0].count, 10) === 0) {
        await client.query(
          'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
          ['homepage', JSON.stringify(homepageJson)]
        );
      }

      // Seed wellness settings config
      const wellnessSettingsCount = await client.query("SELECT COUNT(*) FROM config WHERE key = 'wellness_settings'");
      if (parseInt(wellnessSettingsCount.rows[0].count, 10) === 0) {
        await client.query(
          'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
          ['wellness_settings', JSON.stringify({ published: false })]
        );
      }
      
      console.log('Database seeding completed successfully.');
      return { success: true, message: 'Schema and seed data initialized successfully.' };
    } catch (err: unknown) {
      console.error('Error during database seeding:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      // Release advisory lock
      await client.query('SELECT pg_advisory_unlock(123456)');
      client.release();
    }
  }
};
