"use client";

import { useState } from "react";
import { ZoneBadge } from "@/components/ui/ZoneBadge";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { AssessmentDetails } from "@/components/management/AssessmentDetails";
import { DataTable } from "@/components/data-display/DataTable";

interface LeadAssessmentsClientProps {
  assessments: any[];
}

export function LeadAssessmentsClient({ assessments }: LeadAssessmentsClientProps) {
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const totalCount = assessments?.length || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedData = assessments?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) || [];

  return (
    <>
      <DataTable
        columns={[
          { key: "displayId", label: "ID", sortable: false, className: "font-medium text-slate-900 font-mono", render: (a) => a.displayId || a.id.substring(0, 8) },
          { key: "pain", label: "Pain", sortable: false, render: (a) => a.pain !== null && a.pain !== undefined ? a.pain : "N/A" },
          { key: "functionScore", label: "Function", sortable: false, render: (a) => a.functionScore !== null && a.functionScore !== undefined ? a.functionScore : "N/A" },
          { key: "score", label: "Score", sortable: false, className: "font-medium text-slate-900 font-mono" },
          { key: "zone", label: "Zone", sortable: false, render: (a) => <ZoneBadge zone={a.zone} /> },
          { key: "createdAt", label: "Date", sortable: false, render: (a) => formatDate(a.createdAt) },
        ]}
        data={paginatedData}
        onRowClick={(assessment) => { setSelectedAssessment(assessment); setIsModalOpen(true); }}
        emptyStateMessage="No assessments recorded for this patient."
        pagination={{
          hasMore: currentPage < totalPages,
          canGoPrev: currentPage > 1,
          onNext: () => setCurrentPage((prev) => prev + 1),
          onPrev: () => setCurrentPage((prev) => prev - 1),
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assessment Details"
      >
        <AssessmentDetails assessment={selectedAssessment} />
      </Modal>
    </>
  );
}
