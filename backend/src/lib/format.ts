export function formatDate(value?: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}
