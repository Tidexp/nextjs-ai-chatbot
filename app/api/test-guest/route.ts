import { createGuestUser } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Testing guest user creation...');
    const guestUser = await createGuestUser();
    console.log('✅ Guest user created successfully:', guestUser);
    
    return NextResponse.json({
      success: true,
      message: 'Guest user created successfully',
      user: guestUser
    });
  } catch (error) {
    console.error('❌ Guest user creation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}
