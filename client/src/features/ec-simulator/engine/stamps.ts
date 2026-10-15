/** MNA stamp helpers and device constants. */

export const GMIN = 1e-12;
export const GOPEN = 1e-12;
export const GSHORT = 1e6;
export const WIRE_R = 0.01;
export const DIODE_RON = 10;
export const R_VOLTMETER = 10e6;
export const R_AMMETER = 0.01;
export const R_SCOPE = 10e6;

export class MnaMatrix {
  readonly nNodes: number;
  readonly nVs: number;
  readonly size: number;
  readonly G: number[][];
  readonly I: number[];
  readonly ground: string;
  readonly index: Map<string, number>;

  constructor(nonground: string[], nVs: number, ground: string) {
    this.nNodes = nonground.length;
    this.nVs = nVs;
    this.size = this.nNodes + nVs;
    this.ground = ground;
    this.index = new Map(nonground.map((id, i) => [id, i]));
    this.G = Array.from({ length: this.size }, () => new Array<number>(this.size).fill(0));
    this.I = new Array<number>(this.size).fill(0);
    for (let i = 0; i < this.nNodes; i++) this.G[i][i] += GMIN;
  }

  nodeIndex(net: string | undefined): number {
    if (!net || net === this.ground) return -1;
    return this.index.get(net) ?? -1;
  }

  addConductance(na: string | undefined, nb: string | undefined, g: number): void {
    if (!Number.isFinite(g) || g === 0) return;
    const ia = this.nodeIndex(na);
    const ib = this.nodeIndex(nb);
    if (ia >= 0) this.G[ia][ia] += g;
    if (ib >= 0) this.G[ib][ib] += g;
    if (ia >= 0 && ib >= 0) {
      this.G[ia][ib] -= g;
      this.G[ib][ia] -= g;
    }
  }

  addCurrent(net: string | undefined, current: number): void {
    const i = this.nodeIndex(net);
    if (i >= 0) this.I[i] += current;
  }

  /**
   * Independent voltage source from pos → neg, Vpos - Vneg - I*seriesR = voltage.
   * `vsSlot` is 0-based among voltage sources.
   */
  stampVoltageSource(
    pos: string | undefined,
    neg: string | undefined,
    voltage: number,
    vsSlot: number,
    seriesR = 0,
  ): void {
    const col = this.nNodes + vsSlot;
    const ia = this.nodeIndex(pos);
    const ib = this.nodeIndex(neg);
    if (ia >= 0) {
      this.G[ia][col] += 1;
      this.G[col][ia] += 1;
    }
    if (ib >= 0) {
      this.G[ib][col] -= 1;
      this.G[col][ib] -= 1;
    }
    this.G[col][col] -= seriesR;
    this.I[col] += voltage;
  }
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function ldrResistance(props: Record<string, number | string | boolean>): number {
  const light = clamp(num(props.light, 50), 0, 100) / 100;
  const rDark = Math.max(num(props.rDark, 1e6), 1);
  const rLight = Math.max(num(props.rLight, 1e3), 1);
  return rDark * Math.pow(rLight / rDark, light);
}
