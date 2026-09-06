import { fetchWithAuth } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffTableClient } from "./StaffTableClient";

export const dynamic = "force-dynamic";

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

export default async function StaffManagementPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const payload = decodeJwtPayload(token);
  if (!payload || payload.role !== "admin") {
    // Only admin can access this page, doctor is redirected to dashboard
    redirect("/dashboard");
  }

  let staffAccounts: any[] = [];

  try {
    const response = await fetchWithAuth("/staff/accounts", token, { cache: "no-store" });
    staffAccounts = Array.isArray(response) ? response : (response?.data || []);
  } catch (error) {
    console.error("Failed to fetch staff accounts", error);
  }

  return (
    <div className="space-y-6">
      <StaffTableClient
        initialData={staffAccounts}
        currentUser={{
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        }}
      />
    </div>
  );
}
