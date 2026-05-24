import { parseLineCount } from "@/lib/form-lines";

export type ParsedBomLine = { partId: string; qtyPer: number; isOptional: boolean };

export function parseBomLinesFromForm(formData: FormData): ParsedBomLine[] {
  const lineCount = parseLineCount(formData);
  const lines: ParsedBomLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const partId = String(formData.get(`linePart_${i}`) ?? "");
    const qtyPer = Number(formData.get(`lineQty_${i}`) ?? 0);
    const isOptional = String(formData.get(`lineOptional_${i}`) ?? "") === "on";
    if (!partId || !Number.isFinite(qtyPer) || qtyPer <= 0) continue;
    lines.push({ partId, qtyPer, isOptional });
  }
  return lines;
}
