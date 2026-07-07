"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/management/SearchBar";
import { ZoneFilter } from "@/components/management/ZoneFilter";
import { ZoneBadge } from "@/components/ui/ZoneBadge";
import { DataTable } from "@/components/data-display/DataTable";
import { formatDate } from "@/lib/utils";

export function LeadsTableClient({ initialData, meta, currentPage, currentZone }: any) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleZoneChange = (zone: string) => {
    const query = new URLSearchParams();
    if (zone) query.append("zone", zone);
    router.push(`/leads?${query.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const query = new URLSearchParams();
    query.append("page", page.toString());
    if (currentZone) query.append("zone", currentZone);
    router.push(`/leads?${query.toString()}`);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...initialData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(lead =>
        (lead.firstName?.toLowerCase() || "").includes(q) ||
        (lead.lastName?.toLowerCase() || "").includes(q) ||
        (lead.email?.toLowerCase() || "").includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "name") {
        valA = `${a.firstName} ${a.lastName}`;
        valB = `${b.firstName} ${b.lastName}`;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialData, searchQuery, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or email..." />
        <ZoneFilter value={currentZone} onChange={handleZoneChange} />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <DataTable
          columns={[
            { key: "name", label: "Name", sortable: true, className: "font-medium text-slate-900 dark:text-white", render: (lead) => `${lead.firstName} ${lead.lastName}` },
            { key: "email", label: "Email", sortable: true },
            { key: "zone", label: "Zone", sortable: true, render: (lead) => <ZoneBadge zone={lead.assessments?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.zone} /> },
            { key: "score", label: "Score", sortable: false, className: "font-mono font-medium text-slate-900 dark:text-slate-100", render: (lead) => lead.assessments?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.score || "N/A" },
            { key: "kneeSide", label: "Knee Side", sortable: false, className: "capitalize", render: (lead) => ({ "R": "Right", "L": "Left", "B": "Both" } as Record<string, string>)[lead.kneeSide] || lead.kneeSide || "Unknown" },
            { key: "createdAt", label: "Date", sortable: true, render: (lead) => formatDate(lead.createdAt) },
          ]}
          data={filteredAndSortedData}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
          emptyStateMessage="No leads found matching your criteria."
          pagination={{
            currentPage: currentPage,
            totalPages: meta.totalPages,
            totalCount: meta.total,
            onPageChange: handlePageChange
          }}
        />
      </div>
    </div>
  );
}
