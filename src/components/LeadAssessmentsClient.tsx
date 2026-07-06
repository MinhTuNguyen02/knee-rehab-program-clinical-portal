"use client";

import { useState } from "react";
import { ZoneBadge } from "@/components/ZoneBadge";
import { Modal } from "@/components/Modal";
import { AssessmentDetails } from "@/components/AssessmentDetails";
import { DataTable } from "@/components/DataTable";

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
            { key: "createdAt", label: "Date", sortable: false, render: (a) => new Date(a.createdAt).toLocaleDateString() },
          ]}
          data={paginatedData}
          onRowClick={(assessment) => { setSelectedAssessment(assessment); setIsModalOpen(true); }}
          emptyStateMessage="No assessments recorded for this patient."
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            totalCount: totalCount,
            onPageChange: setCurrentPage
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
