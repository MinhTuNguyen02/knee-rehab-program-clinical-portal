"use client";

import { useEffect, useTransition } from "react";
import { WarningCircle, CircleNotch } from "@phosphor-icons/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
          <WarningCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Page Error
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We couldn't load this page. {error.message || "Something went wrong."}
          </p>
        </div>

        <button
          onClick={() => startTransition(() => reset())}
          disabled={isPending}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <CircleNotch className="h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            "Try again"
          )}
        </button>
      </div>
    </div>
  );
}
