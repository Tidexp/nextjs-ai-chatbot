import { config } from 'dotenv';
import { createGuestUser } from '../lib/db/queries';

// Load environment variables
config({
  path: '.env',
});

async function testGuestUser() {
  console.log('🔍 Testing guest user creation...');
  
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL is not defined in environment variables');
    return;
  }

  try {
    console.log('🔍 Creating guest user...');
    const guestUser = await createGuestUser();
    console.log('✅ Guest user created successfully:', guestUser);
    
    // Test creating another guest user
    console.log('🔍 Creating another guest user...');
    const guestUser2 = await createGuestUser();
    console.log('✅ Second guest user created successfully:', guestUser2);

  } catch (error) {
    console.error('❌ Guest user creation failed:', error);
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

testGuestUser();
