import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET ?? '');

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    if (!authToken) return NextResponse.json({ token: null });

    const { payload } = await jwtVerify(authToken, jwtSecret);

    // Issue a short-lived Convex token
    const convexToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email as string,
      iss: process.env.AUTH_ISSUER_URL,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(jwtSecret);

    return NextResponse.json({ token: convexToken });
  } catch {
    return NextResponse.json({ token: null });
  }
}
