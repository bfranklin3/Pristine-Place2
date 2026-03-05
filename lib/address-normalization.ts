export function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function normalizeStreetSuffix(street: string): string {
  const map: Record<string, string> = {
    SAINT: "ST",
    AVENUE: "AVE",
    STREET: "ST",
    BOULEVARD: "BLVD",
    COURT: "CT",
    LANE: "LN",
    LOOP: "LOOP",
    DRIVE: "DR",
    ROAD: "RD",
    PLACE: "PL",
    CIRCLE: "CIR",
    TERRACE: "TER",
    PARKWAY: "PKWY",
    TRAIL: "TRL",
  }
  return street
    .split(" ")
    .map((part) => map[part] ?? part)
    .join(" ")
}

export function applyAddressCanonicalOverrides(canonical: string): string {
  const upper = normalizeSpace(canonical.toUpperCase())
  if (upper === "14216 PULLMAN AVE") return "14216 PULLMAN DR"
  return upper
}

export function canonicalizeAddressParts(raw: string | null | undefined): {
  number: string
  street: string
  canonical: string
} {
  const cleaned = normalizeSpace((raw || "").toUpperCase().replace(/[.,]/g, ""))
  const m = cleaned.match(/^(\d+)\s+(.+)$/)
  if (!m) {
    const canonical = applyAddressCanonicalOverrides(cleaned)
    const parts = canonical.match(/^(\d+)\s+(.+)$/)
    return parts
      ? { number: parts[1], street: parts[2], canonical }
      : { number: "", street: "", canonical }
  }
  const number = m[1]
  const street = normalizeStreetSuffix(normalizeSpace(m[2]))
  const canonical = applyAddressCanonicalOverrides(`${number} ${street}`.trim())
  const parsed = canonical.match(/^(\d+)\s+(.+)$/)
  if (!parsed) return { number, street, canonical }
  return { number: parsed[1], street: parsed[2], canonical }
}
