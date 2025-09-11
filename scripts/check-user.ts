import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
config({
  path: '.env',
});

async function checkUser() {
  console.log('🔍 Checking user in database...');
  
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL is not defined in environment variables');
    return;
  }

  try {
    // Create database connection
    const client = postgres(process.env.POSTGRES_URL);
    const db = drizzle(client);

    console.log('✅ Database connection established');

    // Check for the specific user ID from the error
    const userId = '6f21ae07-26ec-4a06-8a9c-a0c887bbd7aa';
    console.log(`🔍 Looking for user: ${userId}`);
    
    const users = await db.select().from(user).where(eq(user.id, userId));
    
    if (users.length > 0) {
      console.log('✅ User found:', users[0]);
    } else {
      console.log('❌ User not found in database');
      
      // Show all users
      const allUsers = await db.select().from(user).limit(10);
      console.log('📋 All users in database:', allUsers);
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    process.exit(0);
  }
}

checkUser();
