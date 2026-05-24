export type PartKind = "purchased" | "manufactured" | "assembly";

export type PartKindFlags = {
  isPurchased: boolean;
  isManufactured: boolean;
  isAssembly: boolean;
};

export function flagsFromKind(kind: PartKind): PartKindFlags {
  return {
    isPurchased: kind === "purchased",
    isManufactured: kind === "manufactured",
    isAssembly: kind === "assembly",
  };
}

export function kindFromFlags(flags: PartKindFlags): PartKind | null {
  const count = [flags.isPurchased, flags.isManufactured, flags.isAssembly].filter(Boolean).length;
  if (count !== 1) return null;
  if (flags.isPurchased) return "purchased";
  if (flags.isManufactured) return "manufactured";
  if (flags.isAssembly) return "assembly";
  return null;
}

export function partKindLabels(flags: PartKindFlags): string[] {
  if (flags.isManufactured) return ["Product"];
  if (flags.isAssembly) return ["Assembly", "Part"];
  return ["Part"];
}

/** Single-line label for messages (e.g. delete confirm). */
export function partKindLabel(flags: PartKindFlags): string {
  return partKindLabels(flags).join(" / ");
}

export function parsePartKind(raw: string | undefined): PartKind {
  if (raw === "manufactured" || raw === "assembly") return raw;
  return "purchased";
}

export function parseListView(raw: string | undefined): "all" | "parts" | "products" | "assemblies" {
  if (raw === "parts" || raw === "products" || raw === "assemblies") return raw;
  return "all";
}

export function listViewWhere(view: ReturnType<typeof parseListView>) {
  switch (view) {
    case "parts":
      return { isPurchased: true };
    case "products":
      return { isManufactured: true };
    case "assemblies":
      return { isAssembly: true };
    default:
      return {};
  }
}
