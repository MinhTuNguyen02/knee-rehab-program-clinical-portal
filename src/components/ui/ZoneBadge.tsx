export type ZoneColor = "green" | "amber" | "red" | "unknown";

export function ZoneBadge({ zone }: { zone: ZoneColor | string }) {
  const normalizedZone = (zone?.toLowerCase() as ZoneColor) || "unknown";

  const colorMap: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 ring-emerald-600/20",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 ring-amber-600/20",
    red: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 ring-red-600/20",
    unknown: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 ring-slate-600/20"
  };

  const style = colorMap[normalizedZone] || colorMap.unknown;
  const label = normalizedZone === "unknown" ? "N/A" : normalizedZone.charAt(0).toUpperCase() + normalizedZone.slice(1);

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {label}
    </span>
  );
}
