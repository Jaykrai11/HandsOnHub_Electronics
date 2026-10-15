export function formatValue(val: number, unit: string): string {
  if (!Number.isFinite(val)) return `— ${unit}`;
  const abs = Math.abs(val);
  if (abs === 0) return `0 ${unit}`;
  if (abs >= 1e9) return `${(val / 1e9).toPrecision(3)} G${unit}`;
  if (abs >= 1e6) return `${(val / 1e6).toPrecision(3)} M${unit}`;
  if (abs >= 1e3) return `${(val / 1e3).toPrecision(3)} k${unit}`;
  if (abs >= 1) return `${val.toPrecision(3)} ${unit}`;
  if (abs >= 1e-3) return `${(val * 1e3).toPrecision(3)} m${unit}`;
  if (abs >= 1e-6) return `${(val * 1e6).toPrecision(3)} μ${unit}`;
  if (abs >= 1e-9) return `${(val * 1e9).toPrecision(3)} n${unit}`;
  return `${(val * 1e12).toPrecision(3)} p${unit}`;
}

export function parseValue(input: string): number {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^([+-]?\d*\.?\d+(e[+-]?\d+)?)(g|meg|k|m|u|μ|n|p)?$/);
  if (!m) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  const num = parseFloat(m[1]);
  const suf = m[3];
  if (suf === 'g') return num * 1e9;
  if (suf === 'meg') return num * 1e6;
  if (suf === 'k') return num * 1e3;
  if (suf === 'm') return num * 1e-3;
  if (suf === 'u' || suf === 'μ') return num * 1e-6;
  if (suf === 'n') return num * 1e-9;
  if (suf === 'p') return num * 1e-12;
  return num;
}
