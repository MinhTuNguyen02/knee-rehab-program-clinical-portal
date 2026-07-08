"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ZoneFilter } from "@/components/management/ZoneFilter";
import { ZoneBadge } from "@/components/ui/ZoneBadge";
import { Modal } from "@/components/ui/Modal";
import { AssessmentDetails } from "@/components/management/AssessmentDetails";
import { DataTable } from "@/components/data-display/DataTable";
import { formatDate } from "@/lib/utils";

export function AssessmentsTableClient({ initialData, meta, currentZone, initialCursor }: any) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentAfter = initialCursor || "";

  const handleFilterChange = (zone: string) => {
    setCursorHistory([]);
    const query = new URLSearchParams();
    if (zone) query.append("zone", zone);

    startTransition(() => {
      router.push(`/assessments?${query.toString()}`);
    });
  };

  const handleNextPage = () => {
    if (!meta.hasMore || !meta.endCursor) return;

    const query = new URLSearchParams();
    query.append("after", meta.endCursor);
    if (currentZone) query.append("zone", currentZone);

    setCursorHistory((prev) => [...prev, currentAfter]);
    startTransition(() => {
      router.push(`/assessments?${query.toString()}`);
    });
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;

    const newHistory = [...cursorHistory];
    const prevCursor = newHistory.pop() || "";

    const query = new URLSearchParams();
    if (prevCursor) query.append("after", prevCursor);
    if (currentZone) query.append("zone", currentZone);

    setCursorHistory(newHistory);
    startTransition(() => {
      router.push(`/assessments?${query.toString()}`);
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    let result = [...(initialData || [])];

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "patient") {
        valA = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Anonymous";
        valB = b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : "Anonymous";
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialData, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4">
          <ZoneFilter value={currentZone} onChange={(val) => handleFilterChange(val)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <DataTable
          columns={[
            { key: "displayId", label: "ID", sortable: false, className: "font-medium text-slate-900 font-mono", render: (a) => a.displayId || a.id.substring(0, 8) },
            { key: "score", label: "Score", sortable: true, className: "font-medium text-slate-900 font-mono" },
            { key: "zone", label: "Zone", sortable: true, render: (a) => <ZoneBadge zone={a.zone} /> },
            { key: "source", label: "Source", sortable: false, className: "capitalize", render: (a) => a.source?.replace('_', ' ') || "N/A" },
            {
              key: "patient",
              label: "Linked Patient",
              sortable: true,
              render: (a) => a.patient ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/leads/${a.patient.id}`);
                  }}
                  className="text-primary hover:text-primary-hover font-medium underline-offset-2 hover:underline"
                >
                  {a.patient.firstName} {a.patient.lastName}
                </button>
              ) : (
                <span className="text-slate-400 italic">Anonymous</span>
              )
            },
            { key: "createdAt", label: "Date", sortable: true, render: (a) => <span suppressHydrationWarning>{formatDate(a.createdAt)}</span> },
          ]}
          data={sortedData}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(assessment) => { setSelectedAssessment(assessment); setIsModalOpen(true); }}
          emptyStateMessage="No assessments found matching your criteria."
          pagination={{
            hasMore: meta.hasMore,
            canGoPrev: cursorHistory.length > 0,
            onNext: handleNextPage,
            onPrev: handlePrevPage,
            isPending: isPending,
          }}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assessment Details"
      >
        <AssessmentDetails assessment={selectedAssessment} />
      </Modal>
    </div>
  );
}
