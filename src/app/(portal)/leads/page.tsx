import { fetchWithAuth } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeadsTableClient } from "./LeadsTableClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const token = await getToken();
  if (!token) redirect("/login");

  const searchParams = await props.searchParams;
  const after = searchParams.after || "";
  const zone = searchParams.zone || "";

  let data = { data: [], meta: { hasMore: false, endCursor: null } };


  try {
    const query = new URLSearchParams({ limit: "20" });
    if (after) query.append("after", after);
    if (zone) query.append("zone", zone);

    data = await fetchWithAuth(`/leads?${query.toString()}`, token, { cache: "no-store" });
  } catch (error) {
    console.error("Failed to fetch leads", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Leads</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage opted-in patients from the knee rehab assessment.
        </p>
      </div>

      <LeadsTableClient
        initialData={Array.isArray(data) ? data : (data?.data || [])}
        meta={data.meta || { hasMore: false, endCursor: null }}
        currentZone={zone}
        initialCursor={after}
      />
    </div>
  );
}
