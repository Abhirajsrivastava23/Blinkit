# Production Database Verification & Migration Guide

## Overview

Your application requires a PostgreSQL database with specific tables and columns. This guide helps you verify your production Supabase PostgreSQL database has everything needed and safely migrate if anything is missing.

**Important:** 
- ✅ These scripts do NOT modify any data or delete records
- ✅ They use idempotent operations (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)
- ✅ They preserve all existing customer, order, product, and admin data
- ❌ Never share your POSTGRES_URL in chat or commit it

## Step 1: Get Your Production Database Connection URL

Since your app is deployed on Vercel, your `POSTGRES_URL` is stored as an environment secret.

### Option A: From Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `POSTGRES_URL` 
5. Copy the value (don't share it!)

### Option B: From Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database** → **Connection string**
4. Copy the `postgresql://` connection string (from "Connection pooling" section)

## Step 2: Verify Your Production Database Schema

Before making any changes, verify that your production database has the required schema.

### Run Verification Script

In your local development environment:

```bash
# Set the connection URL (replace with your actual POSTGRES_URL)
# IMPORTANT: Do this ONLY in your local terminal, NEVER commit it
export POSTGRES_URL="postgresql://user:password@host:port/database"

# Run verification
node verify-db-schema.js
```

**Note:** On Windows PowerShell:
```powershell
$env:POSTGRES_URL = "postgresql://user:password@host:port/database"
node verify-db-schema.js
```

### What the Verification Script Does

The verification script will:
1. ✓ Connect to your production database
2. ✓ Check that all required tables exist
3. ✓ Verify all required columns are present
4. ✓ Check for required indexes
5. ✓ Count records in key tables (proves data exists)
6. ✓ Generate a report without exposing credentials
7. ✓ Save report to `db-schema-verification-report.json`

### Expected Output

```
🔍 Verifying Production Database Schema

Connecting to production database...
✓ Connected successfully

Checking required tables:

  ✓ users (15 columns)
  ✓ sessions (5 columns)
  ✓ products (16 columns)
  ✓ categories (7 columns)
  ✓ brands (8 columns)
  ✓ orders (21 columns)
  ✓ admin (5 columns)
  ✓ partners (9 columns)
  ... (more tables)

📊 SCHEMA VERIFICATION REPORT

Total Tables Required: 15
✓ PASS: 15
✗ FAIL: 0
⚠ ERROR: 0

Overall Status: PASS

✓ Production data verified: Real customer/product data exists
```

## Step 3: If Verification Fails - Run Migration

If the verification script shows missing tables or columns:

```bash
# Set connection URL (same as verification step)
export POSTGRES_URL="postgresql://user:password@host:port/database"

# Run migration (idempotent - safe to run multiple times)
node migrate-db-schema.js
```

### What the Migration Script Does

The migration script will:
1. ✓ Create any missing tables using `CREATE TABLE IF NOT EXISTS`
2. ✓ Add any missing columns using `ALTER TABLE ADD COLUMN IF NOT EXISTS`
3. ✓ Create required indexes
4. ✓ Preserve all existing data (no deletions)
5. ✓ Use database transactions (rolls back if error occurs)

### Expected Migration Output

```
🔧 Production Database Migration Starting

Creating tables (if missing)...
  ✓ Created table: users
  ◇ Table exists: products
  ✓ Created table: delivery_photos
  ... (more tables)

Adding missing columns (if any)...
  ✓ Column ensured: products.inStock

Creating indexes (if missing)...
  ✓ Index created: idx_users_email

✅ Database migration completed successfully!

All required tables and columns are now present.
Existing production data has been preserved.
```

## Required Tables & Columns

Your application requires these tables in production:

### Core Tables
- **users** - Customer user data with wellness access fields
- **sessions** - User login sessions  
- **products** - Product catalog with wellness flags
- **categories** - Product categories
- **brands** - Product brands
- **orders** - Customer orders with delivery info

### Admin & Partners
- **admin** - Admin user accounts
- **partners** - Delivery partner accounts

### Features
- **config** - Application configuration (homepage, wellness settings)
- **product_image_history** - Tracks rider photo uploads and rollback history
- **delivery_photos** - Delivery partner photo submissions
- **wellness_access_requests** - Age verification requests
- **wellness_terms_acceptances** - Terms acceptance tracking
- **inventoryIssues** - Inventory issue reports
- **auditLogs** - Audit trail of admin actions

### Critical Columns for Features

**Rider Photo Upload System:**
- products.image
- product_image_history.* (all columns)

**Wellness System:**
- products.isWellness
- products.wellnessAgeVerifyRequired
- users.wellnessAccessStatus
- users.wellnessRequestId
- wellness_access_requests.*
- wellness_terms_acceptances.*

**Delivery System:**
- orders.deliveryOtp
- orders.assignedPartnerId
- partners.isOnline
- delivery_photos.*

**Google Login:**
- users.googleProviderId
- users.email
- users.createdAt
- users.lastLoginAt

## Security Notes

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

1. **Never commit POSTGRES_URL** to git
2. **Never paste credentials in chat or PR** 
3. **Use environment variables only** (set locally, not in code)
4. **Delete the exported variable after running** the script:
   ```bash
   unset POSTGRES_URL  # or Clear-Item env:\POSTGRES_URL on PowerShell
   ```
5. **Verify scripts do NOT print connection strings** - only table/column names

## Troubleshooting

### Error: "PostgreSQL connection pool is not configured"
- Verify POSTGRES_URL is set in your environment
- Check that it's a valid connection string starting with `postgresql://`
- Verify the database server is accessible from your location

### Error: "authentication failed"
- Double-check your credentials are correct
- Ensure the user has permission to create tables/columns
- Verify the host and port are correct

### Error: "permission denied for schema public"
- The database user may not have schema modification rights
- Contact your Supabase admin or create a new database user with `CREATEDB` and `CREATEROLE` privileges

### Verification shows FAIL but you don't want to migrate yet
- This is fine! The application will still work with CREATE TABLE IF NOT EXISTS logic
- But features requiring missing tables may fail
- Run migration when ready

## Next Steps

### After Successful Verification (Status: PASS)

✅ Your production database is ready  
✅ All features (wellness, rider photos, delivery partners) are supported  
✅ Existing data is preserved  
✅ No further action needed  

### After Successful Migration

1. Re-run verification to confirm:
   ```bash
   export POSTGRES_URL="postgresql://..."
   node verify-db-schema.js
   ```

2. Verify application still works:
   - Test customer login (Google OAuth)
   - Test product browsing and filtering (wellness products)
   - Test delivery partner panel (photo upload)
   - Test wellness access requests
   - Check admin audit logs

3. Clean up your environment:
   ```bash
   unset POSTGRES_URL  # Remove the variable
   ```

## Verifying After Deployment

When you deploy this version to Vercel:

1. The application will automatically work with the production database
2. The `npm run db:seed` script will:
   - In Vercel: Migrate and seed the database if needed
   - Locally: Show a helpful message (no POSTGRES_URL)
3. All existing data is preserved
4. All features continue to work

## Files Created

- `verify-db-schema.js` - Schema verification script (read-only, safe)
- `migrate-db-schema.js` - Schema migration script (creates/alters only, preserves data)
- `db-schema-verification-report.json` - Report generated by verification script

These files should be committed to git (they don't contain credentials).

## Questions?

- Verification script only reads schema - it's completely safe to run
- Migration script uses transactions - if anything fails, changes are rolled back
- Both scripts preserve all existing data
- You can run these scripts multiple times safely (idempotent operations)

---

**Last Updated:** 2026-09-01  
**Application:** Fatafat (Velmora)  
**Database:** Supabase PostgreSQL
