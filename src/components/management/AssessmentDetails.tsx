import Link from "next/link";
import { ZoneBadge } from "../ui/ZoneBadge";

interface AssessmentDetailsProps {
  assessment: any;
}

export function AssessmentDetails({ assessment }: AssessmentDetailsProps) {
  if (!assessment) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Score</span>
          <span className="text-2xl font-black text-slate-900">{assessment.score}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zone</span>
          <div className="mt-1">
            <ZoneBadge zone={assessment.zone} />
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pain</span>
          <span className="text-2xl font-black text-slate-900">{assessment.pain}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Function</span>
          <span className="text-2xl font-black text-slate-900">{assessment.functionScore}</span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Metadata</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div className="flex flex-col">
            <dt className="text-xs font-medium text-slate-500">Display ID</dt>
            <dd className="text-sm font-mono text-slate-900">{assessment.displayId}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-medium text-slate-500">Source</dt>
            <dd className="text-sm font-medium text-slate-900 capitalize">{assessment.source?.replace('_', ' ') || "N/A"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-medium text-slate-500">Entry Type</dt>
            <dd className="text-sm font-medium text-slate-900 capitalize">{assessment.entryType || "N/A"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-medium text-slate-500">Date Completed</dt>
            <dd className="text-sm font-medium text-slate-900">{new Date(assessment.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {assessment.patient && (
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Linked Patient</h3>
          <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <Link href={`/leads/${assessment.patient.id}`}>
                <span className="text-sm font-bold text-primary-hover">
                  {assessment.patient.firstName} {assessment.patient.lastName}
                </span>
              </Link>
              <span className="text-xs text-slate-500">{assessment.patient.email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
