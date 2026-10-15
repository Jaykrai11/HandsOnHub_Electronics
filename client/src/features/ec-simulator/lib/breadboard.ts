import type { HoleId, LowerRow, RailId, TerminalRow, UpperRow } from '../types';

/** Columns on the v1 board (class-demo 830-style, shortened). */
export const COL_COUNT = 30;

/** Pixel pitch between adjacent holes (~0.1" scaled). */
export const HOLE_PITCH = 18;

export const BOARD_PAD_X = 36;
export const BOARD_PAD_Y = 28;

const UPPER_ROWS: UpperRow[] = ['a', 'b', 'c', 'd', 'e'];
const LOWER_ROWS: LowerRow[] = ['f', 'g', 'h', 'i', 'j'];

/**
 * Unified row index (top → bottom) used for placement offsets and rendering.
 * 0 top+  1 top-  2 (gap)  3–7 a–e  8–9 gap  10–14 f–j  15 gap  16 bot-  17 bot+
 */
export const ROW_TOP_POS = 0;
export const ROW_TOP_NEG = 1;
export const ROW_A = 3;
export const ROW_F = 10;
export const ROW_BOT_NEG = 16;
export const ROW_BOT_POS = 17;
export const UNIFIED_ROW_COUNT = 18;

export function isUpperRow(row: TerminalRow): row is UpperRow {
  return (UPPER_ROWS as string[]).includes(row);
}

export function holeKey(h: HoleId): string {
  if (h.kind === 'rail') return `rail:${h.rail}:${h.col}`;
  return `term:${h.strip}:${h.col}:${h.row}`;
}

export function holesEqual(a: HoleId, b: HoleId): boolean {
  return holeKey(a) === holeKey(b);
}

/** Breadboard internal conductor that this hole belongs to. */
export function stripNetKey(h: HoleId): string {
  if (h.kind === 'rail') return `rail:${h.rail}`;
  if (isUpperRow(h.row)) return `term:U:${h.col}`;
  return `term:L:${h.col}`;
}

export function holeToGrid(h: HoleId): { c: number; r: number } {
  if (h.kind === 'rail') {
    const r =
      h.rail === 'top+' ? ROW_TOP_POS
        : h.rail === 'top-' ? ROW_TOP_NEG
          : h.rail === 'bot-' ? ROW_BOT_NEG
            : ROW_BOT_POS;
    return { c: h.col, r };
  }
  if (isUpperRow(h.row)) {
    return { c: h.col, r: ROW_A + UPPER_ROWS.indexOf(h.row) };
  }
  return { c: h.col, r: ROW_F + LOWER_ROWS.indexOf(h.row as LowerRow) };
}

export function gridToHole(c: number, r: number): HoleId | null {
  if (c < 1 || c > COL_COUNT) return null;
  if (r === ROW_TOP_POS) return { kind: 'rail', rail: 'top+', col: c };
  if (r === ROW_TOP_NEG) return { kind: 'rail', rail: 'top-', col: c };
  if (r === ROW_BOT_NEG) return { kind: 'rail', rail: 'bot-', col: c };
  if (r === ROW_BOT_POS) return { kind: 'rail', rail: 'bot+', col: c };
  if (r >= ROW_A && r <= ROW_A + 4) {
    return { kind: 'terminal', strip: 'upper', col: c, row: UPPER_ROWS[r - ROW_A] };
  }
  if (r >= ROW_F && r <= ROW_F + 4) {
    return { kind: 'terminal', strip: 'lower', col: c, row: LOWER_ROWS[r - ROW_F] };
  }
  return null;
}

export function holeToPixel(h: HoleId): { x: number; y: number } {
  const { c, r } = holeToGrid(h);
  return {
    x: BOARD_PAD_X + (c - 1) * HOLE_PITCH,
    y: BOARD_PAD_Y + r * HOLE_PITCH,
  };
}

export function pixelToNearestHole(x: number, y: number): HoleId | null {
  const c = Math.round((x - BOARD_PAD_X) / HOLE_PITCH) + 1;
  const r = Math.round((y - BOARD_PAD_Y) / HOLE_PITCH);
  return gridToHole(c, r);
}

export function boardWidth(): number {
  return BOARD_PAD_X * 2 + (COL_COUNT - 1) * HOLE_PITCH;
}

export function boardHeight(): number {
  return BOARD_PAD_Y * 2 + (UNIFIED_ROW_COUNT - 1) * HOLE_PITCH;
}

export function iterateHoles(fn: (h: HoleId) => void): void {
  const rails: RailId[] = ['top+', 'top-', 'bot-', 'bot+'];
  for (let col = 1; col <= COL_COUNT; col++) {
    for (const rail of rails) fn({ kind: 'rail', rail, col });
    for (const row of UPPER_ROWS) fn({ kind: 'terminal', strip: 'upper', col, row });
    for (const row of LOWER_ROWS) fn({ kind: 'terminal', strip: 'lower', col, row });
  }
}

export function rotateOffset(dCol: number, dRow: number, rotation: number, flipH: boolean): { dCol: number; dRow: number } {
  let x = flipH ? -dCol : dCol;
  let y = dRow;
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90) [x, y] = [-y, x];
  else if (r === 180) [x, y] = [-x, -y];
  else if (r === 270) [x, y] = [y, -x];
  return { dCol: x, dRow: y };
}

export function stripLabel(h: HoleId): string {
  if (h.kind === 'rail') {
    const side = h.rail.startsWith('top') ? 'top' : 'bottom';
    const pol = h.rail.endsWith('+') ? '+' : '−';
    return `${side} ${pol} rail · col ${h.col}`;
  }
  return `${h.row}${h.col}`;
}

export function describeHole(h?: HoleId): string {
  if (!h) return 'Unconnected';
  if (h.kind === 'rail') {
    const rName =
      h.rail === 'top+' ? 'Top (+) Rail'
      : h.rail === 'top-' ? 'Top (−) Rail'
      : h.rail === 'bot+' ? 'Bottom (+) Rail'
      : 'Bottom (−) Rail';
    return `${rName} (Col ${h.col})`;
  }
  return `Col ${h.col}, Row ${h.row.toUpperCase()}`;
}
