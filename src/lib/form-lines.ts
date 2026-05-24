/** Read how many indexed line rows the client sent (dynamic forms). */
export function parseLineCount(formData: FormData): number {
  const raw = Number(formData.get("lineCount") ?? 0);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);

  let max = 0;
  for (const key of formData.keys()) {
    const m = key.match(/^(?:partId|linePart)_(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]) + 1);
  }
  return max;
}
