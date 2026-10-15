import { getComponentDef } from '../data/componentDefs';
import {
  COL_COUNT,
  gridToHole,
  holeKey,
  holeToGrid,
  rotateOffset,
  ROW_BOT_NEG,
  ROW_BOT_POS,
  ROW_TOP_NEG,
  ROW_TOP_POS,
} from './breadboard';
import type { ComponentKind, HoleId, PlacedComponent } from '../types';

export function computeLeads(
  kind: ComponentKind,
  anchor: HoleId,
  rotation: number,
  flipH: boolean,
): Record<string, HoleId> | null {
  const def = getComponentDef(kind);
  if (!def) return null;
  const origin = holeToGrid(anchor);

  if (kind === 'battery' && anchor.kind === 'rail') {
    const col2 = origin.c + 2 <= COL_COUNT ? origin.c + 2 : Math.max(1, origin.c - 2);
    if (anchor.rail === 'top+' || anchor.rail === 'top-') {
      const posHole = gridToHole(origin.c, ROW_TOP_POS);
      const negHole = gridToHole(col2, ROW_TOP_NEG);
      if (posHole && negHole) {
        return { '+': posHole, '-': negHole };
      }
    } else if (anchor.rail === 'bot+' || anchor.rail === 'bot-') {
      const negHole = gridToHole(origin.c, ROW_BOT_NEG);
      const posHole = gridToHole(col2, ROW_BOT_POS);
      if (posHole && negHole) {
        return { '+': posHole, '-': negHole };
      }
    }
  }

  const leads: Record<string, HoleId> = {};
  for (const pin of def.pins) {
    const off = rotateOffset(pin.dCol, pin.dRow, rotation, flipH);
    const hole = gridToHole(origin.c + off.dCol, origin.r + off.dRow);
    if (!hole) return null;
    leads[pin.id] = hole;
  }
  return leads;
}

export function translateLeads(
  leads: Record<string, HoleId>,
  dCol: number,
  dRow: number,
): Record<string, HoleId> | null {
  const next: Record<string, HoleId> = {};
  for (const [id, h] of Object.entries(leads)) {
    const g = holeToGrid(h);
    const hole = gridToHole(g.c + dCol, g.r + dRow);
    if (!hole) return null;
    next[id] = hole;
  }
  return next;
}

export function tryPlace(
  kind: ComponentKind,
  anchor: HoleId,
  rotation = 0,
  flipH = false,
): { leads: Record<string, HoleId>; rotation: number } | null {
  for (const extra of [0, 90, 180, 270]) {
    const r = (rotation + extra) % 360;
    const leads = computeLeads(kind, anchor, r, flipH);
    if (leads) return { leads, rotation: r };
  }
  return null;
}

export function occupiedKeys(components: PlacedComponent[], exceptId?: string): Set<string> {
  const s = new Set<string>();
  for (const c of components) {
    if (c.id === exceptId) continue;
    for (const h of Object.values(c.leads)) s.add(holeKey(h));
  }
  return s;
}

export function leadsCollide(leads: Record<string, HoleId>, occupied: Set<string>): boolean {
  const seen = new Set<string>();
  for (const h of Object.values(leads)) {
    const k = holeKey(h);
    if (occupied.has(k) || seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

export function firstLead(comp: PlacedComponent): HoleId {
  const def = getComponentDef(comp.kind);
  const id = def?.pins[0]?.id ?? Object.keys(comp.leads)[0];
  return comp.leads[id];
}
