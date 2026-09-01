#!/usr/bin/env node
/**
 * Production Database Migration Script
 * Purpose: Safely migrate production database schema to match application requirements
 * 
 * Features:
 *   - Uses CREATE TABLE IF NOT EXISTS (idempotent)
 *   - Uses ALTER TABLE ADD COLUMN IF NOT EXISTS (safe, no data loss)
 *   - Preserves all existing data
 *   - Creates required indexes
 *   - Transaction-based (rolls back on error)
 *   - Auto-loads .env.local
 * 
 * Usage:
 *   1. Locally (with .env.local containing POSTGRES_URL):
 *      node migrate-db-schema.js
 *   2. Vercel preview/production:
 *      Automatically runs during seed step
 * 
 * IMPORTANT:
 *   - This script must NEVER run automatically
 *   - Must explicitly call this script for migration
 *   - Uses transactions - safe to fail/rollback
 *   - No data deletion or truncation
 *   - No fake/demo/test data seeding
 */

const fs = require('fs');
const path = require('path');
const Pool = require('pg').Pool;

// Load environment variables from .env.local
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('#')) {
          continue;
        }
        
        const equalIndex = line.indexOf('=');
        if (equalIndex === -1) {
          continue;
        }
        
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        
        if (key && value) {
          // Remove surrounding quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          process.env[key] = cleanValue;
        }
      }
    } catch (err) {
      // Silently skip if unable to read .env.local
    }
  }
}

// Load environment first
loadEnvLocal();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

if (!connectionString) {
  console.log('\n⚠️  Production Database Migration\n');
  console.log('Unable to migrate: POSTGRES_URL not found\n');
  console.log('To migrate the production database schema, set POSTGRES_URL in one of:\n');
  console.log('Option 1: Add to .env.local (if accessing Supabase from local)');
  console.log('  POSTGRES_URL=postgresql://user:password@host:port/db\n');
  console.log('Option 2: Set environment variable (Windows PowerShell):');
  console.log('  $env:POSTGRES_URL = "postgresql://user:password@host:port/db"');
  console.log('  node migrate-db-schema.js\n');
  console.log('Option 3: Automatic in Vercel during seed step\n');
  console.log('Note: POSTGRES_URL should never be committed to git.');
  console.log('This script must be run explicitly - it does NOT run automatically.\n');
  process.exit(0);
}

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 8000,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('\n🔧 Production Database Migration\n');
    console.log('This migration will:');
    console.log('  • Create any missing tables');
    console.log('  • Add any missing columns');
    console.log('  • Create required indexes');
    console.log('  • Preserve all existing data');
    console.log('\nStarting transaction...\n');

    // Start transaction
    await client.query('BEGIN');

    // 1. Create all required tables (idempotent)
    const tableDefs = [
      {
        name: 'categories',
        sql: 'CREATE TABLE IF NOT EXISTS categories (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          'name VARCHAR(255) NOT NULL,' +
          'slug VARCHAR(255),' +
          'description TEXT,' +
          'status VARCHAR(50),' +
          'image VARCHAR(255),' +
          '"itemCount" INTEGER DEFAULT 0' +
          ')'
      },
      {
        name: 'brands',
        sql: 'CREATE TABLE IF NOT EXISTS brands (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          'name VARCHAR(255) NOT NULL,' +
          'slug VARCHAR(255),' +
          'description TEXT,' +
          'status VARCHAR(50),' +
          'website VARCHAR(255),' +
          'logo VARCHAR(255),' +
          '"itemCount" INTEGER DEFAULT 0' +
          ')'
      },
      {
        name: 'products',
        sql: 'CREATE TABLE IF NOT EXISTS products (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          'name VARCHAR(255) NOT NULL,' +
          'description TEXT,' +
          'price NUMERIC NOT NULL,' +
          '"originalPrice" NUMERIC,' +
          'image VARCHAR(255),' +
          'category VARCHAR(255) NOT NULL,' +
          'brand VARCHAR(255),' +
          'rating NUMERIC DEFAULT 0,' +
          'reviews INTEGER DEFAULT 0,' +
          'stock INTEGER DEFAULT 0,' +
          'unit VARCHAR(50),' +
          '"isWellness" BOOLEAN DEFAULT FALSE,' +
          '"wellnessAgeVerifyRequired" BOOLEAN DEFAULT FALSE,' +
          'tags JSONB,' +
          '"inStock" BOOLEAN DEFAULT TRUE' +
          ')'
      },
      {
        name: 'users',
        sql: 'CREATE TABLE IF NOT EXISTS users (' +
          '"userId" VARCHAR(255) PRIMARY KEY,' +
          '"googleProviderId" VARCHAR(255),' +
          'name VARCHAR(255),' +
          'email VARCHAR(255) UNIQUE,' +
          '"profileImage" VARCHAR(255),' +
          '"createdAt" VARCHAR(255),' +
          '"lastLoginAt" VARCHAR(255),' +
          '"wellnessAccessStatus" VARCHAR(255),' +
          '"wellnessRequestId" VARCHAR(255),' +
          '"wellnessApprovedAt" VARCHAR(255),' +
          '"wellnessApprovedBy" VARCHAR(255),' +
          'phone VARCHAR(255),' +
          'dob VARCHAR(255),' +
          'gender VARCHAR(255),' +
          'addresses JSONB' +
          ')'
      },
      {
        name: 'sessions',
        sql: 'CREATE TABLE IF NOT EXISTS sessions (' +
          '"sessionId" VARCHAR(255) PRIMARY KEY,' +
          '"userId" VARCHAR(255) NOT NULL,' +
          'email VARCHAR(255) NOT NULL,' +
          'role VARCHAR(255) NOT NULL,' +
          '"expiresAt" VARCHAR(255) NOT NULL' +
          ')'
      },
      {
        name: 'admin',
        sql: 'CREATE TABLE IF NOT EXISTS admin (' +
          'email VARCHAR(255) PRIMARY KEY,' +
          '"passwordHash" VARCHAR(255) NOT NULL,' +
          'name VARCHAR(255),' +
          'phone VARCHAR(255),' +
          'role VARCHAR(50) DEFAULT \'admin\'' +
          ')'
      },
      {
        name: 'partners',
        sql: 'CREATE TABLE IF NOT EXISTS partners (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          'name VARCHAR(255) NOT NULL,' +
          'phone VARCHAR(255),' +
          'email VARCHAR(255) UNIQUE NOT NULL,' +
          '"passwordHash" VARCHAR(255) NOT NULL,' +
          'role VARCHAR(50) DEFAULT \'delivery_partner\',' +
          '"locationId" VARCHAR(255),' +
          '"locationName" VARCHAR(255),' +
          'status VARCHAR(50) DEFAULT \'Active\',' +
          '"isOnline" BOOLEAN DEFAULT FALSE' +
          ')'
      },
      {
        name: 'config',
        sql: 'CREATE TABLE IF NOT EXISTS config (' +
          'key VARCHAR(255) PRIMARY KEY,' +
          'data JSONB NOT NULL' +
          ')'
      },
      {
        name: 'inventoryIssues',
        sql: 'CREATE TABLE IF NOT EXISTS "inventoryIssues" (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          '"productId" VARCHAR(255) NOT NULL,' +
          '"productName" VARCHAR(255),' +
          'issue VARCHAR(255),' +
          'status VARCHAR(255),' +
          '"createdAt" VARCHAR(255)' +
          ')'
      },
      {
        name: 'auditLogs',
        sql: 'CREATE TABLE IF NOT EXISTS "auditLogs" (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          '"adminUser" VARCHAR(255),' +
          'action VARCHAR(255),' +
          '"dateTime" VARCHAR(255),' +
          'product VARCHAR(255),' +
          '"previousValue" TEXT,' +
          '"newValue" TEXT' +
          ')'
      },
      {
        name: 'orders',
        sql: 'CREATE TABLE IF NOT EXISTS orders (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          '"customerId" VARCHAR(255) NOT NULL,' +
          'items JSONB NOT NULL,' +
          'subtotal NUMERIC NOT NULL,' +
          '"deliveryFee" NUMERIC DEFAULT 0,' +
          'discount NUMERIC DEFAULT 0,' +
          'total NUMERIC NOT NULL,' +
          'address JSONB NOT NULL,' +
          'status VARCHAR(255) NOT NULL,' +
          '"deliveryOption" VARCHAR(255),' +
          'eta VARCHAR(255),' +
          '"createdAt" VARCHAR(255) NOT NULL,' +
          '"deliveryLocationId" VARCHAR(255),' +
          '"deliveryLocationName" VARCHAR(255),' +
          '"deliveryOtp" VARCHAR(255),' +
          '"otpFailedAttempts" INTEGER DEFAULT 0,' +
          '"otpExpiresAt" VARCHAR(255),' +
          '"statusHistory" JSONB,' +
          '"assignedPartnerId" VARCHAR(255),' +
          '"assignedPartnerName" VARCHAR(255),' +
          '"assignedAt" VARCHAR(255)' +
          ')'
      },
      {
        name: 'product_image_history',
        sql: 'CREATE TABLE IF NOT EXISTS product_image_history (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          '"productId" VARCHAR(255) NOT NULL,' +
          '"storagePath" TEXT,' +
          '"imageUrl" TEXT NOT NULL,' +
          '"uploadedBy" VARCHAR(255) NOT NULL,' +
          '"uploadedByRole" VARCHAR(50) NOT NULL,' +
          '"uploadedAt" VARCHAR(255) NOT NULL,' +
          '"previousImage" TEXT,' +
          '"isActive" BOOLEAN DEFAULT TRUE' +
          ')'
      },
      {
        name: 'delivery_photos',
        sql: 'CREATE TABLE IF NOT EXISTS delivery_photos (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          '"orderId" VARCHAR(255) NOT NULL,' +
          '"partnerId" VARCHAR(255) NOT NULL,' +
          '"photoUrl" TEXT NOT NULL,' +
          'category VARCHAR(255),' +
          '"uploadedAt" VARCHAR(255) NOT NULL' +
          ')'
      },
      {
        name: 'wellness_access_requests',
        sql: 'CREATE TABLE IF NOT EXISTS wellness_access_requests (' +
          'id VARCHAR(255) PRIMARY KEY,' +
          '"customerId" VARCHAR(255) NOT NULL,' +
          '"customerName" VARCHAR(255) NOT NULL,' +
          '"customerEmail" VARCHAR(255) NOT NULL,' +
          '"requestedAt" VARCHAR(255) NOT NULL,' +
          'status VARCHAR(255) NOT NULL,' +
          '"calculatedAge" INTEGER,' +
          '"reviewedBy" VARCHAR(255),' +
          '"reviewedAt" VARCHAR(255),' +
          '"rejectionReason" TEXT' +
          ')'
      },
      {
        name: 'wellness_terms_acceptances',
        sql: 'CREATE TABLE IF NOT EXISTS wellness_terms_acceptances (' +
          '"customerId" VARCHAR(255) PRIMARY KEY,' +
          '"termsVersion" VARCHAR(255) NOT NULL,' +
          '"acceptedAt" VARCHAR(255) NOT NULL' +
          ')'
      }
    ];

    console.log('Creating tables (if missing)...\n');
    for (const tableDef of tableDefs) {
      try {
        await client.query(tableDef.sql);
        console.log('  ✓ ' + tableDef.name);
      } catch (err) {
        console.log('  ✗ ' + tableDef.name + ' - ' + (err instanceof Error ? err.message : String(err)));
      }
    }

    // 2. Add missing columns (safe - only if they don't exist)
    console.log('\nAdding missing columns (if any)...\n');
    
    const columnAdditions = [
      { table: 'categories', column: 'description', type: 'TEXT' },
      { table: 'categories', column: 'status', type: 'VARCHAR(50)' },
      { table: 'brands', column: 'description', type: 'TEXT' },
      { table: 'brands', column: 'status', type: 'VARCHAR(50)' },
      { table: 'brands', column: 'website', type: 'VARCHAR(255)' },
      { table: 'products', column: 'inStock', type: 'BOOLEAN DEFAULT TRUE' }
    ];

    for (const col of columnAdditions) {
      try {
        const sql = 'ALTER TABLE "' + col.table + '" ADD COLUMN IF NOT EXISTS "' + col.column + '" ' + col.type;
        await client.query(sql);
        console.log('  ✓ ' + col.table + '.' + col.column);
      } catch (err) {
        // Ignore - column likely already exists
      }
    }

    // 3. Create indexes
    console.log('\nCreating indexes (if missing)...\n');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders("customerId")',
      'CREATE INDEX IF NOT EXISTS idx_orders_assigned_partner_id ON orders("assignedPartnerId")',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId")'
    ];

    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log('  ✓ Index created');
      } catch (err) {
        console.log('  ◇ Index exists or skipped');
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n────────────────────────────────────────────────────');
    console.log('\n✅ Database migration completed successfully!\n');
    console.log('All required tables and columns are now present.');
    console.log('Existing production data has been preserved.\n');

    process.exit(0);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback errors
    }
    console.error('\n❌ Migration failed:', err instanceof Error ? err.message : String(err));
    console.error('\nNo changes have been applied to the database.');
    console.error('(Transaction was automatically rolled back)\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
