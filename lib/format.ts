// Compact currency-ish formatting for auction amounts (no decimals).
export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-IN");
}

// Short form: 1,00,000 -> 1L, 50,000 -> 50K (Indian scale, display only)
export function fmtShort(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.00$/, "") + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(2).replace(/\.00$/, "") + "L";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
