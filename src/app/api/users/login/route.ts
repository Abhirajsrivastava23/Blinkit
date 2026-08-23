import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, googleProviderId, profileImage, wellnessAccessStatus } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const users = await db.readTable<any>('users') || [];
    const idx = users.findIndex((u: any) => u.email === email);
    
    let finalUser: any;
    if (idx > -1) {
      finalUser = {
        ...users[idx],
        name: name || users[idx].name,
        profileImage: profileImage || users[idx].profileImage,
        googleProviderId: googleProviderId || users[idx].googleProviderId,
        lastLoginAt: new Date().toISOString()
      };
      // Keep existing status if already present
      if (wellnessAccessStatus && !users[idx].wellnessAccessStatus) {
        finalUser.wellnessAccessStatus = wellnessAccessStatus;
      }
      users[idx] = finalUser;
    } else {
      finalUser = {
        userId: 'u-' + Math.floor(1000 + Math.random() * 9000),
        googleProviderId: googleProviderId || 'google-' + Date.now(),
        name,
        email,
        profileImage: profileImage || '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        wellnessAccessStatus: wellnessAccessStatus || 'NOT_REQUESTED'
      };
      users.push(finalUser);
    }
    
    await db.writeTable('users', users);
    return NextResponse.json(finalUser);
  } catch (err) {
    console.error('Error logging in user:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
