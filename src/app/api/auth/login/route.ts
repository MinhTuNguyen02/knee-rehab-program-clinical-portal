import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ message: data.message || "Login failed" }, { status: res.status });
    }

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ user: { email: data.email, role: data.role } });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
