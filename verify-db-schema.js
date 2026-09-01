#!/usr/bin/env node
/**
 * Production Database Schema Verification Script
 * Purpose: Verify that production database has all required tables and columns
 * 
 * Features:
 *   - Auto-loads .env.local if POSTGRES_URL is present
 *   - Pure Node.js JavaScript (no TypeScript syntax)
 *   - Windows PowerShell compatible (no shell syntax needed)
 *   - Read-only verification (never modifies database)
 *   - No credentials printed in output
 * 
 * Usage:
 *   1. Locally (with .env.local containing POSTGRES_URL):
 *      node verify-db-schema.js
 *   2. Vercel preview/production environment:
 *      Automatically uses POSTGRES_URL from environment
 * 
 * Note: POSTGRES_URL must be available in either:
 *   - .env.local file in project root
 *   - process.env (set before running script)
 *   - Vercel environment variables (during deployment)
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
  console.log('\n⚠️  Production Database Verification\n');
  console.log('Unable to verify: POSTGRES_URL not found\n');
  console.log('To verify production database schema, set POSTGRES_URL in one of:\n');
  console.log('Option 1: Add to .env.local (if accessing Supabase from local)');
  console.log('  POSTGRES_URL=postgresql://user:password@host:port/db\n');
  console.log('Option 2: Set environment variable (Windows PowerShell):');
  console.log('  $env:POSTGRES_URL = "postgresql://user:password@host:port/db"');
  console.log('  node verify-db-schema.js\n');
  console.log('Option 3: Automatic in Vercel preview/production\n');
  console.log('Note: POSTGRES_URL should never be committed to git.\n');
  process.exit(0);
}

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 8000,
  ssl: { rejectUnauthorized: false }
});

const requiredTables = {
  'users': ['userId', 'email', 'googleProviderId', 'wellnessAccessStatus', 'wellnessRequestId', 'wellnessApprovedAt', 'wellnessApprovedBy'],
  'sessions': ['sessionId', 'userId', 'email', 'role', 'expiresAt'],
  'products': ['id', 'name', 'price', 'image', 'category', 'stock', 'inStock', 'isWellness'],
  'categories': ['id', 'name', 'slug'],
  'brands': ['id', 'name', 'slug'],
  'orders': ['id', 'customerId', 'items', 'total', 'status', 'deliveryOtp', 'assignedPartnerId'],
  'admin': ['email', 'passwordHash', 'role'],
  'partners': ['id', 'email', 'passwordHash', 'role', 'locationId', 'status', 'isOnline'],
  'config': ['key', 'data'],
  'inventoryIssues': ['id', 'productId', 'productName', 'status'],
  'auditLogs': ['id', 'adminUser', 'action', 'dateTime', 'product'],
  'product_image_history': ['id', 'productId', 'imageUrl', 'uploadedBy', 'uploadedByRole', 'uploadedAt', 'isActive'],
  'delivery_photos': ['id', 'orderId', 'partnerId', 'photoUrl', 'uploadedAt'],
  'wellness_access_requests': ['id', 'customerId', 'status', 'requestedAt'],
  'wellness_terms_acceptances': ['customerId', 'acceptedAt']
};

async function verify() {
  const report = {
    timestamp: new Date().toISOString(),
    productionDbConnected: false,
    databaseHost: '',
    tables: {},
    dataCounts: {},
    summary: {}
  };

  try {
    console.log('\n🔍 Production Database Schema Verification\n');
    console.log('Connecting to production database...\n');
    
    // Test connection and extract host
    const connTest = await pool.query('SELECT NOW()');
    if (connTest.rows.length === 0) {
      throw new Error('Query returned no results');
    }

    report.productionDbConnected = true;
    
    // Extract host from connection string (for non-sensitive info)
    try {
      const urlObj = new URL(connectionString);
      report.databaseHost = urlObj.hostname;
    } catch (e) {
      // Ignore if unable to parse
    }

    console.log('✓ Successfully connected to production database\n');

    // Check each required table
    console.log('Verifying schema (15 required tables):\n');
    
    const tableResults = [];
    let passCount = 0;
    let failCount = 0;
    
    for (const tableName of Object.keys(requiredTables)) {
      try {
        const colQuery = 
          'SELECT column_name, data_type, is_nullable ' +
          'FROM information_schema.columns ' +
          'WHERE table_schema = \'public\' AND table_name = $1 ' +
          'ORDER BY ordinal_position';
        
        const colResult = await pool.query(colQuery, [tableName]);
        
        if (colResult.rows.length === 0) {
          report.tables[tableName] = {
            exists: false,
            status: 'MISSING'
          };
          tableResults.push('  ✗ ' + tableName + ' - TABLE NOT FOUND');
          failCount++;
        } else {
          const actualColumns = colResult.rows.map(function(r) { return r.column_name; });
          const requiredCols = requiredTables[tableName];
          const missingColumns = requiredCols.filter(function(col) { 
            return actualColumns.indexOf(col) === -1;
          });
          
          if (missingColumns.length === 0) {
            report.tables[tableName] = {
              exists: true,
              status: 'PASS',
              columnCount: actualColumns.length
            };
            tableResults.push('  ✓ ' + tableName + ' (' + actualColumns.length + ' columns)');
            passCount++;
          } else {
            report.tables[tableName] = {
              exists: true,
              status: 'MISSING_COLS',
              missingColumns: missingColumns,
              columnCount: actualColumns.length
            };
            tableResults.push('  ⚠ ' + tableName + ' - MISSING COLUMNS: ' + missingColumns.join(', '));
            failCount++;
          }
        }
      } catch (err) {
        report.tables[tableName] = {
          exists: false,
          status: 'ERROR',
          error: err instanceof Error ? err.message : String(err)
        };
        tableResults.push('  ✗ ' + tableName + ' - ERROR');
        failCount++;
      }
    }
    
    console.log(tableResults.join('\n'));
    console.log('\n');

    // Get data counts from key tables
    console.log('Checking production data (verifying real data exists):\n');
    const dataTables = ['users', 'products', 'orders', 'admin', 'partners'];
    for (const table of dataTables) {
      try {
        const countResult = await pool.query('SELECT COUNT(*) as count FROM "' + table + '"');
        const count = parseInt(countResult.rows[0].count, 10);
        report.dataCounts[table] = count;
        console.log('  • ' + table + ': ' + count + ' records');
      } catch (err) {
        report.dataCounts[table] = 'N/A';
      }
    }

    // Summary
    const errorCount = Object.keys(report.tables).filter(function(t) {
      return report.tables[t].status === 'ERROR';
    }).length;

    const overallStatus = errorCount > 0 ? 'FAIL' : (failCount > 0 ? 'PARTIAL' : 'PASS');

    report.summary = {
      totalTables: Object.keys(requiredTables).length,
      passCount: passCount,
      failCount: failCount,
      errorCount: errorCount,
      overallStatus: overallStatus,
      productionDbActuallyVerified: report.productionDbConnected
    };

    // Final report
    console.log('\n────────────────────────────────────────────────────');
    console.log('\n📊 DATABASE VERIFICATION REPORT\n');
    console.log('Production DB Connected:        ' + (report.productionDbConnected ? 'YES' : 'NO'));
    console.log('Database Host:                  ' + (report.databaseHost || 'unknown'));
    console.log('Total Tables Required:          ' + report.summary.totalTables);
    console.log('  ✓ PASS:                       ' + report.summary.passCount);
    console.log('  ✗ FAIL:                       ' + report.summary.failCount);
    console.log('  ⚠ ERROR:                      ' + report.summary.errorCount);
    console.log('\nOverall Status:                 ' + report.summary.overallStatus.toUpperCase());

    if (report.summary.failCount > 0) {
      console.log('\n⚠ MISSING TABLES/COLUMNS:');
      for (const table of Object.keys(report.tables)) {
        const info = report.tables[table];
        if (info.status === 'MISSING') {
          console.log('  • ' + table + ' - does not exist');
        } else if (info.status === 'MISSING_COLS' && info.missingColumns) {
          console.log('  • ' + table + ' missing: ' + info.missingColumns.join(', '));
        }
      }
    }

    if (Object.keys(report.dataCounts).length > 0) {
      const hasData = Object.keys(report.dataCounts).every(function(key) {
        const val = report.dataCounts[key];
        return typeof val === 'number' && val > 0;
      });
      
      if (hasData) {
        console.log('\n✓ Production data verified: Real customer/product data exists');
        report.summary.productionDataPreserved = true;
      } else {
        console.log('\n⚠ Some tables are empty');
      }
    }

    console.log('\n────────────────────────────────────────────────────\n');

    // Write report to file
    const reportPath = path.join(process.cwd(), 'db-schema-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('📄 Full report saved to: db-schema-verification-report.json\n');

    process.exit(report.summary.overallStatus === 'PASS' ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Verification failed:', err instanceof Error ? err.message : String(err));
    console.error('\nPossible causes:');
    console.error('  1. Database URL is invalid or inaccessible');
    console.error('  2. Database credentials are incorrect');
    console.error('  3. Network connection to database failed');
    console.error('  4. POSTGRES_URL is not set in environment or .env.local\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
