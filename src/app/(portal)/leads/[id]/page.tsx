import { fetchWithAuth } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ZoneBadge } from "@/components/ui/ZoneBadge";
import { LeadAssessmentsClient } from "@/components/features/LeadAssessmentsClient";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, UserCircle, EnvelopeSimple, Phone, CalendarBlank, GenderIntersex, WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";

export default async function LeadDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  let lead;
  try {
    lead = await fetchWithAuth(`/leads/${params.id}`, token, { next: { revalidate: 0 } });
  } catch (error) {
    return (
      <div className="space-y-6">
        <Link href="/leads" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} />
          Back to leads
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-medium text-red-800">Lead not found</h3>
          <p className="mt-2 text-sm text-red-600">The requested patient could not be found or you do not have permission to view it.</p>
        </div>
      </div>
    );
  }

  // Ensure assessments is an array and sort them
  const assessments = lead.assessments ? [...lead.assessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  return (
    <div className="space-y-6">
      <Link href="/leads" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={16} />
        Back to leads
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 flex items-center gap-2">
            <CalendarBlank size={16} />
            Added on {formatDate(lead.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Info Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-6">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Patient Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><EnvelopeSimple size={14} /> Email</span>
              <p className="text-sm text-slate-900 font-medium break-all">{lead.email || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><Phone size={14} /> Mobile</span>
              <p className="text-sm text-slate-900 font-medium">{lead.mobile || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><UserCircle size={14} /> Age</span>
              <p className="text-sm text-slate-900 font-medium">{lead.age || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><GenderIntersex size={14} /> Gender</span>
              <p className="text-sm text-slate-900 font-medium capitalize">{lead.gender || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><WarningCircle size={14} /> Knee Side</span>
              <p className="text-sm text-slate-900 font-medium capitalize">{({ "R": "Right", "L": "Left", "B": "Both" } as Record<string, string>)[lead.kneeSide] || lead.kneeSide || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><CheckCircle size={14} /> Consent</span>
              <p className="text-sm text-slate-900 font-medium">{lead.consentAccepted ? "Accepted" : "Not accepted"}</p>
            </div>
          </div>
        </div>

        {/* Preferences / Meta Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-6">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Preferences</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Notifications</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {lead.notificationPrefs && Object.keys(lead.notificationPrefs).length > 0 ? (
                  Object.entries(lead.notificationPrefs)
                    .filter(([_, value]) => value)
                    .map(([pref]) => (
                      <span key={pref} className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 uppercase">
                        {pref.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))
                ) : (
                  <p className="text-sm text-slate-900">None</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment History */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-base font-semibold text-slate-900">Assessment History</h3>
          <p className="mt-1 text-sm text-slate-500">All assessments submitted by this patient.</p>
        </div>
        <LeadAssessmentsClient assessments={assessments} />
      </div>
    </div>
  );
}
