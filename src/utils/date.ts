/** Format ISO date string (YYYY-MM-DD) to YYYY/M/D */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** Format ISO date string (YYYY-MM-DD) to YYYY/M/D（weekday） */
export function formatDateWithWeekday(
  dateStr: string,
  language = "zh-TW",
): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const zhWeekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const enWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

  if (language === "en") {
    return `${date} (${enWeekdays[d.getDay()]})`;
  }

  return `${date}（${zhWeekdays[d.getDay()]}）`;
}

/** Check if a date string (YYYY-MM-DD) is today */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}
