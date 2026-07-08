"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface PaginationProps {
  hasMore: boolean;
  onNext: () => void;
  onPrev?: () => void;
  canGoPrev?: boolean;
  isPending?: boolean;
}

export function Pagination({ hasMore, onNext, onPrev, canGoPrev = false, isPending = false }: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-1 items-center justify-between">
        <p></p>
        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
          <button
            onClick={onPrev}
            disabled={(!canGoPrev || isPending) ? true : undefined}
            className="relative inline-flex items-center rounded-l-md px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <CaretLeft size={16} className="mr-2" /> Previous
          </button>
          <button
            onClick={onNext}
            disabled={(!hasMore || isPending) ? true : undefined}
            className="relative inline-flex items-center rounded-r-md px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Next <CaretRight size={16} className="ml-2" />
          </button>
        </nav>
      </div>
    </div>
  );
}