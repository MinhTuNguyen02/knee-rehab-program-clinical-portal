'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getForwardedHeaders(): Promise<HeadersInit> {
    const headerStore = await headers();
    const forwardedFor = headerStore.get('x-forwarded-for');
    const realIp = headerStore.get('x-real-ip');

    const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (forwardedFor) reqHeaders['x-forwarded-for'] = forwardedFor;
    if (realIp) reqHeaders['x-real-ip'] = realIp;
    return reqHeaders;
}

export async function adminLogin(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    const reqHeaders = await getForwardedHeaders();

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || 'Invalid credentials' };
        }

        // Set HttpOnly Cookie
        const cookieStore = await cookies();
        cookieStore.set('auth_token', data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

    } catch (error) {
        return { error: 'Internal server error' };
    }

    // Direct
    redirect('/dashboard');
}

export async function adminForgotPassword(formData: FormData) {
    const email = formData.get('email') as string;

    if (!email) {
        return { error: 'Email is required' };
    }

    const reqHeaders = await getForwardedHeaders();

    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || 'Failed to request reset link' };
        }

        return { success: data.message || 'Check your email for reset instructions' };
    } catch (error) {
        return { error: 'Internal server error' };
    }
}

export async function adminResetPassword(formData: FormData) {
    const token = formData.get('token') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!token || !newPassword) {
        return { error: 'Token and new password are required' };
    }

    const reqHeaders = await getForwardedHeaders();

    try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({ token, newPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || 'Failed to reset password' };
        }

        return { success: data.message || 'Password reset successfully' };
    } catch (error) {
        return { error: 'Internal server error' };
    }
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    redirect('/login');
}