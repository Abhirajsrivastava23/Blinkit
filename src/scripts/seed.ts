import { db } from '../data/db';

async function main() {
  console.log('Starting Supabase PostgreSQL seeding script...');
  const res = await db.seedDatabase();
  if (res.success) {
    console.log('SUCCESS:', res.message);
    process.exit(0);
  } else {
    console.error('FAILED:', res.error);
    process.exit(1);
  }
}

main();
