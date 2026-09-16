/** Calendar helpers: call in the browser so dates use the viewer's timezone. */
export function dateKeyLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number) {
  // Construct each boundary independently: some DST transitions skip midnight.
  // Carrying a normalized 01:00 into the next day would hide its first hour.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfWeekLocal(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}
