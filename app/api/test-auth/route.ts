import { auth } from '@/app/(auth)/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Testing authentication...');
    const session = await auth();
    console.log('✅ Session:', session);
    
    if (session?.user) {
      return NextResponse.json({
        success: true,
        message: 'User authenticated',
        user: session.user
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No user session found'
      });
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}
