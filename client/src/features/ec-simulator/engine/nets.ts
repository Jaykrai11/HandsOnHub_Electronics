import { holeKey, stripNetKey } from '../lib/breadboard';
import type { Circuit, HoleId, PlacedComponent } from '../types';

/**
 * Electrical nodes are breadboard strips (each power rail, each column group).
 * Jumpers are NOT unioned here — they are stamped as small resistances so
 * branch current on each wire can be computed.
 */
export interface Netlist {
  /** Pin key `componentId:pinId` → strip node id. */
  pinNode: Map<string, string>;
  /** Unique strip node ids touched by the circuit. */
  nodes: string[];
  holeNode(h: HoleId): string;
}

export function buildNets(circuit: Circuit): Netlist {
  const nodeSet = new Set<string>();

  const touch = (h: HoleId) => {
    nodeSet.add(stripNetKey(h));
  };

  for (const c of circuit.components) {
    for (const h of Object.values(c.leads)) touch(h);
  }
  for (const w of circuit.wires) {
    touch(w.from);
    touch(w.to);
  }

  const pinNode = new Map<string, string>();
  for (const c of circuit.components) {
    for (const [pinId, hole] of Object.entries(c.leads)) {
      pinNode.set(`${c.id}:${pinId}`, stripNetKey(hole));
    }
  }

  return {
    pinNode,
    nodes: [...nodeSet],
    holeNode: (h: HoleId) => stripNetKey(h),
  };
}

export function pinNodeOf(nets: Netlist, comp: PlacedComponent, pinId: string): string | undefined {
  return nets.pinNode.get(`${comp.id}:${pinId}`);
}

export function occupiedHoles(circuit: Circuit): Set<string> {
  const s = new Set<string>();
  for (const c of circuit.components) {
    for (const h of Object.values(c.leads)) s.add(holeKey(h));
  }
  return s;
}
