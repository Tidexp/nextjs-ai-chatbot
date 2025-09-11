import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, chat } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateUUID } from '../lib/utils';

// Load environment variables
config({
  path: '.env',
});

async function testChatCreation() {
  console.log('🔍 Testing chat creation...');
  
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL is not defined in environment variables');
    return;
  }

  try {
    // Create database connection
    const client = postgres(process.env.POSTGRES_URL);
    const db = drizzle(client);

    console.log('✅ Database connection established');

    // Test creating a user
    console.log('🔍 Creating test user...');
    const testUserId = generateUUID();
    const testUser = await db.insert(user).values({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      password: 'hashed_password',
      type: 'guest',
      displayName: 'Test User'
    }).returning();

    console.log('✅ Test user created:', testUser[0]);

    // Test creating a chat
    console.log('🔍 Creating test chat...');
    const testChatId = generateUUID();
    const testChat = await db.insert(chat).values({
      id: testChatId,
      userId: testUserId,
      title: 'Test Chat',
      visibility: 'private',
      createdAt: new Date()
    }).returning();

    console.log('✅ Test chat created:', testChat[0]);

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await db.delete(chat).where(eq(chat.id, testChatId));
    await db.delete(user).where(eq(user.id, testUserId));

    console.log('🎉 Chat creation test successful!');
    console.log('Your database is ready for chat storage.');

  } catch (error) {
    console.error('❌ Chat creation test failed:', error);
    console.log('\nError details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint
    });
  } finally {
    process.exit(0);
  }
}

testChatCreation();
