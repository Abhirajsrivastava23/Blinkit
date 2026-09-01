import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local BEFORE importing db module
// This ensures POSTGRES_URL is available when db.ts initializes the connection pool
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠ .env.local file not found at ${envPath}`);
    return;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const [key, ...valueParts] = line.split('=');
      const trimmedKey = key.trim();
      const value = valueParts.join('=').trim();

      if (trimmedKey && value) {
        // Remove surrounding quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[trimmedKey] = cleanValue;
      }
    }

    console.log('✓ Loaded environment variables from .env.local');
  } catch (error) {
    console.error('⚠ Warning: Could not read .env.local file:', error instanceof Error ? error.message : String(error));
  }
}

// Load env before importing db
loadEnvFile();

// Check if POSTGRES_URL is available
const hasPostgresUrl = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

if (!hasPostgresUrl) {
  console.log('\n📝 Database Seeding Information:');
  console.log('────────────────────────────────────────────');
  console.log('✗ POSTGRES_URL environment variable not found');
  console.log('\nℹ Development Environment:');
  console.log('  • The application uses mock data in development');
  console.log('  • Database seeding is only needed for production');
  console.log('\n✓ Production Environment (Vercel):');
  console.log('  • POSTGRES_URL is automatically available in Vercel');
  console.log('  • Run this command in a Vercel preview or production environment');
  console.log('  • Or set POSTGRES_URL manually to seed a specific database');
  console.log('\n💡 To seed manually:');
  console.log('  export POSTGRES_URL="postgresql://user:pass@host:port/db"');
  console.log('  npm run db:seed');
  console.log('────────────────────────────────────────────\n');
  process.exit(0);
}

console.log('✓ Database environment configured (POSTGRES_URL is available)');

import { db } from '../data/db';

async function main() {
  console.log('\n🌱 Starting Supabase PostgreSQL seeding script...\n');
  const res = await db.seedDatabase();
  
  if (res.success) {
    console.log('\n✅ SUCCESS:', res.message);
    console.log('\n📊 Database seeding completed successfully!');
    process.exit(0);
  } else {
    console.error('\n❌ FAILED:', res.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
