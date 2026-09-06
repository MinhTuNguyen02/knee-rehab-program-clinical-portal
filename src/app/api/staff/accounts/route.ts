import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const status = searchParams.get('status') || '';

        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (role) query.append('role', role);
        if (status) query.append('status', status);

        const response = await fetch(`${API_URL}/staff/accounts?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Fetch staff accounts error:', error);
        return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
    }
}
