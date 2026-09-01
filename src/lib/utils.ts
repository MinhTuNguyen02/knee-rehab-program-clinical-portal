export function parseUtcDate(dateStr: string | Date): Date {
  if (!dateStr) return new Date(NaN);
  if (dateStr instanceof Date) return dateStr;
  let str = dateStr.trim();
  // If string has ISO format like 2026-09-01T05:47:39 but no Z or offset (+/-), append Z to force UTC parsing
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }
  return new Date(str);
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "";
  const date = parseUtcDate(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatNotificationTime(dateStr: string | Date): string {
  if (!dateStr) return "";
  const date = parseUtcDate(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}


// Chat formats

// 1. Sidebar (Conversation List)
export const formatSidebarTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// 2. Date Divider
export const formatDateDivider = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 7) options.weekday = 'short';
  if (date.getFullYear() !== now.getFullYear()) options.year = 'numeric';

  return date.toLocaleDateString('en-US', options);
};

// 3. Message Bubble
export const formatBubbleTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};