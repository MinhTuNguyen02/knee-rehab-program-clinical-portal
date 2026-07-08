import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const reqHeaders = new Headers(options.headers || {});
  reqHeaders.set("Authorization", `Bearer ${token}`);
  reqHeaders.set("Content-Type", "application/json");

  try {
    const headerStore = await headers();
    const forwardedFor = headerStore.get("x-forwarded-for");
    const realIp = headerStore.get("x-real-ip");

    if (forwardedFor) reqHeaders.set("x-forwarded-for", forwardedFor);
    if (realIp) reqHeaders.set("x-real-ip", realIp);
  } catch (e) {
    // headers() might throw if not called in server context, ignore
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: reqHeaders,
    });
  } catch (error: any) {
    throw new Error(error.message || "Failed to connect to the server");
  }

  if (res.status === 401) {
    try {
      const cookieStore = await cookies();
      cookieStore.delete("auth_token");
    } catch (e) {
      // Ignore cookie deletion errors in non-writable contexts
    }
    redirect("/login?reason=expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errorMessage = data?.error?.message || data?.message || `API error: ${res.status}`;
    throw new Error(errorMessage);
  }

  const json = await res.json();
  if (json.meta !== undefined) {
    return json;
  }

  return json.data || json;
}
