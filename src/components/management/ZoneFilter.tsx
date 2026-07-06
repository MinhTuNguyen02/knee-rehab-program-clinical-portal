"use client";

interface ZoneFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ZoneFilter({ value, onChange }: ZoneFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-40 rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6"
    >
      <option value="">All Zones</option>
      <option value="green">Green</option>
      <option value="amber">Amber</option>
      <option value="red">Red</option>
    </select>
  );
}
