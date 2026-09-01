import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function decodeJwtPayload(token: string) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
        return NextResponse.json({ error: { message: 'Invalid token' } }, { status: 400 });
    }

    return NextResponse.json({
        id: payload.sub,
        email: payload.email,
        role: payload.role || 'admin',
    });
}
