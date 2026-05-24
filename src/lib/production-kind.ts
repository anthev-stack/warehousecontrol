export type ProductionKind = "product" | "assembly";

export function parseProductionKind(raw: string): ProductionKind | null {
  if (raw === "product" || raw === "assembly") return raw;
  return null;
}

export function fgMatchesProductionKind(
  fg: { isManufactured: boolean; isAssembly: boolean },
  kind: ProductionKind,
): boolean {
  return kind === "product" ? fg.isManufactured : fg.isAssembly;
}

export function productionKindFromFg(fg: {
  isManufactured: boolean;
  isAssembly: boolean;
}): ProductionKind {
  return fg.isAssembly ? "assembly" : "product";
}

export function productionKindLabel(kind: ProductionKind): string {
  return kind === "product" ? "Product" : "Assembly";
}

export function productionListPath(_kind?: ProductionKind): string {
  return "/production";
}

export function productionTitle(_kind?: ProductionKind): string {
  return "Production";
}
