"use client";

import { useState } from "react";
import { ZoneBadge } from "@/components/ui/ZoneBadge";
import { Modal } from "@/components/ui/Modal";
import { AssessmentDetails } from "@/components/management/AssessmentDetails";
import { formatDate } from "@/lib/utils";
import { DataTable } from "@/components/data-display/DataTable";

interface RecentAssessmentsClientProps {
  recentAssessments: any[];
}

export function RecentAssessmentsClient({ recentAssessments }: RecentAssessmentsClientProps) {
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const totalCount = recentAssessments?.length || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedData = recentAssessments?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) || [];

  return (
    <>
      <DataTable
        columns={[
          { key: "displayId", label: "ID", sortable: false, className: "font-medium text-slate-900 dark:text-white font-mono", render: (a) => a.displayId || a.id.substring(0, 8) },
          { key: "score", label: "Score", sortable: false, className: "font-mono text-slate-500 dark:text-slate-400" },
          { key: "zone", label: "Zone", sortable: false, render: (a) => <ZoneBadge zone={a.zone} /> },
          { key: "patientId", label: "Type", sortable: false, render: (a) => a.patientId ? "Opted In" : "Anonymous" },
          { key: "createdAt", label: "Date", sortable: false, render: (a) => formatDate(a.createdAt) },
        ]}
        data={paginatedData}
        onRowClick={(assessment) => { setSelectedAssessment(assessment); setIsModalOpen(true); }}
        emptyStateMessage="No recent assessments found."
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
