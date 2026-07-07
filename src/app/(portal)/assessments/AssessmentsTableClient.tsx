"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ZoneFilter } from "@/components/management/ZoneFilter";
import { ZoneBadge } from "@/components/ui/ZoneBadge";
import { Modal } from "@/components/ui/Modal";
import { AssessmentDetails } from "@/components/management/AssessmentDetails";
import { DataTable } from "@/components/data-display/DataTable";
import { formatDate } from "@/lib/utils";

export function AssessmentsTableClient({ initialData, meta, currentPage, currentZone, currentSource }: any) {
  const router = useRouter();

  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFilterChange = (zone: string, source: string) => {
    const query = new URLSearchParams();
    if (zone) query.append("zone", zone);
    if (source) query.append("source", source);
    router.push(`/assessments?${query.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const query = new URLSearchParams();
    query.append("page", page.toString());
    if (currentZone) query.append("zone", currentZone);
    if (currentSource) query.append("source", currentSource);
    router.push(`/assessments?${query.toString()}`);
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
    let result = [...initialData];

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
          <ZoneFilter value={currentZone} onChange={(val) => handleFilterChange(val, currentSource)} />
          <select
            value={currentSource}
            onChange={(e) => handleFilterChange(currentZone, e.target.value)}
            className="block w-40 rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
          >
            <option value="">All Sources</option>
            <option value="WEBSITE">Website</option>
            <option value="QR_CODE">QR Code</option>
            <option value="EMAIL">Email</option>
          </select>
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
            { key: "createdAt", label: "Date", sortable: true, render: (a) => formatDate(a.createdAt) },
          ]}
          data={sortedData}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(assessment) => { setSelectedAssessment(assessment); setIsModalOpen(true); }}
          emptyStateMessage="No assessments found matching your criteria."
          pagination={{
            currentPage: currentPage,
            totalPages: meta.totalPages,
            totalCount: meta.total,
            onPageChange: handlePageChange
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
