export const GRID_SIZE = 40; // px per grid cell

export function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

export function gridToCanvas(gx: number, gy: number, ox: number, oy: number, scale: number) {
  return { x: ox + gx * GRID_SIZE * scale, y: oy + gy * GRID_SIZE * scale };
}

export function canvasToGrid(cx: number, cy: number, ox: number, oy: number, scale: number) {
  return {
    x: Math.round((cx - ox) / (GRID_SIZE * scale)),
    y: Math.round((cy - oy) / (GRID_SIZE * scale)),
  };
}

export function formatValue(val: number, unit: string): string {
  const abs = Math.abs(val);
  if (abs === 0) return `0 ${unit}`;
  if (abs >= 1e9) return `${(val / 1e9).toPrecision(4)} G${unit}`;
  if (abs >= 1e6) return `${(val / 1e6).toPrecision(4)} M${unit}`;
  if (abs >= 1e3) return `${(val / 1e3).toPrecision(4)} k${unit}`;
  if (abs >= 1) return `${val.toPrecision(4)} ${unit}`;
  if (abs >= 1e-3) return `${(val * 1e3).toPrecision(4)} m${unit}`;
  if (abs >= 1e-6) return `${(val * 1e6).toPrecision(4)} μ${unit}`;
  if (abs >= 1e-9) return `${(val * 1e9).toPrecision(4)} n${unit}`;
  return `${(val * 1e12).toPrecision(4)} p${unit}`;
}

export function parseValue(input: string): number {
  const s = input.trim().toLowerCase();
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  if (s.endsWith('g')) return num * 1e9;
  if (s.endsWith('meg') || s.endsWith('m') && !s.endsWith('m')) return num * 1e6;
  if (s.endsWith('k')) return num * 1e3;
  if (s.endsWith('m')) return num * 1e-3;
  if (s.endsWith('u') || s.endsWith('μ')) return num * 1e-6;
  if (s.endsWith('n')) return num * 1e-9;
  if (s.endsWith('p')) return num * 1e-12;
  return num;
}
