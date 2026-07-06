const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `API error: ${res.status}`);
  }

  return res.json();
}
