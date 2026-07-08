import { fetchWithAuth } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssessmentsTableClient } from "./AssessmentsTableClient";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const token = await getToken();
  if (!token) redirect("/login");

  const searchParams = await props.searchParams;
  const after = searchParams.after || "";
  const zone = searchParams.zone || "";

  console.log(">>> [SERVER] AssessmentsPage render:", { after, zone });

  let data = { data: [], meta: { hasMore: false, endCursor: null } };

  try {
    const query = new URLSearchParams({ limit: "20" });
    if (after) query.append("after", after);
    if (zone) query.append("zone", zone);

    data = await fetchWithAuth(`/assessments?${query.toString()}`, token, { cache: "no-store" });
  } catch (error) {
    console.error("Failed to fetch assessments", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assessments</h1>
        <p className="mt-2 text-sm text-slate-600">
          View all patient submissions, including both opted-in and anonymous users.
        </p>
      </div>

      <AssessmentsTableClient
        initialData={Array.isArray(data) ? data : (data?.data || [])}
        meta={data?.meta || { hasMore: false, endCursor: null }}
        currentZone={zone}
        initialCursor={after}
      />
    </div>
  );
}
