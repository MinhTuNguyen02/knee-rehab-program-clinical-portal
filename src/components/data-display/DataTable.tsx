"use client";

import { ReactNode } from "react";
import { CaretUp, CaretDown, ArrowsDownUp } from "@phosphor-icons/react";
import { Pagination } from "@/components/data-display/Pagination";

export interface ColumnDef<T = any> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  onRowClick?: (item: T) => void;
  emptyStateMessage?: ReactNode;
  pagination?: {
    hasMore: boolean;
    onNext: () => void;
    onPrev: () => void;
    canGoPrev: boolean;
    isPending?: boolean;
  };
}

export function DataTable<T = any>({
  columns,
  data,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  emptyStateMessage = "No data found.",
  pagination,
}: DataTableProps<T>) {

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowsDownUp size={14} className="text-slate-400" />;
    return sortDirection === "asc" ? (
      <CaretUp size={14} className="text-primary" />
    ) : (
      <CaretDown size={14} className="text-primary" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400 ${col.sortable && onSort ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : ""
                  }`}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && <SortIcon field={col.key} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {data.map((item, rowIndex) => (
            <tr
              key={(item as any).id || rowIndex}
              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${onRowClick ? "cursor-pointer" : ""
                }`}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400 ${col.className || ""}`}
                >
                  {col.render ? col.render(item) : (item as any)[col.key] ?? "N/A"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(!data || data.length === 0) && (
        <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyStateMessage}
        </div>
      )}
      {pagination && data && data.length > 0 && (
        <Pagination
          hasMore={pagination.hasMore}
          onNext={pagination.onNext}
          onPrev={pagination.onPrev}
          canGoPrev={pagination.canGoPrev}
          isPending={pagination.isPending}
        />
      )}
    </div>
  );
}
