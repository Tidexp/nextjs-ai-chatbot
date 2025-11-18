import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, chat, message } from '../lib/db/schema';

// Load environment variables
config({
  path: '.env',
});

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');

  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL is not defined in environment variables');
    console.log(
      'Please create a .env file with your PostgreSQL connection string',
    );
    console.log('You can copy env.template to .env and update the values');
    return;
  }

  try {
    // Create database connection
    const client = postgres(process.env.POSTGRES_URL);
    const db = drizzle(client);

    console.log('✅ Database connection established');

    // Test basic queries
    console.log('🔍 Testing User table...');
    const users = await db.select().from(user).limit(1);
    console.log(`✅ User table accessible (${users.length} users found)`);

    console.log('🔍 Testing Chat table...');
    const chats = await db.select().from(chat).limit(1);
    console.log(`✅ Chat table accessible (${chats.length} chats found)`);

    console.log('🔍 Testing Message_v2 table...');
    const messages = await db.select().from(message).limit(1);
    console.log(
      `✅ Message_v2 table accessible (${messages.length} messages found)`,
    );

    console.log('🎉 Database connection test successful!');
    console.log('Your chat application is ready to store data in PostgreSQL.');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Check your POSTGRES_URL in .env');
    console.log('2. Ensure your Neon database is accessible');
    console.log('3. Run migrations: npm run db:migrate');
  } finally {
    process.exit(0);
  }
}

testDatabaseConnection();
