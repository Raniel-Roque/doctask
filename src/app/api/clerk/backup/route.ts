import { NextResponse } from 'next/server';
import { downloadClerkBackup } from '../../../../../convex/utils/backup';

export async function POST(request: Request) {
  try {
    const { instructorId } = await request.json();
    
    if (!instructorId) {
      return NextResponse.json(
        { error: 'Instructor ID is required' },
        { status: 400 }
      );
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return NextResponse.json(
        { error: 'Clerk Secret Key not configured' },
        { status: 500 }
      );
    }

    const backup = await downloadClerkBackup(clerkSecretKey);
    
    return NextResponse.json(backup);
  } catch (error) {
    console.error('Error in Clerk backup API:', error);
    return NextResponse.json(
      { error: 'Failed to generate Clerk backup' },
      { status: 500 }
    );
  }
} 