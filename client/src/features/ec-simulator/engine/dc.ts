import type { Circuit, ComponentResult, PlacedComponent, SimulationResult, TransientOptions, WireCurrent } from '../types';
import { buildNets, pinNodeOf, type Netlist } from './nets';
import { solveReal } from './solveLinear';
import {
  DIODE_RON,
  GOPEN,
  GSHORT,
  MnaMatrix,
  R_AMMETER,
  R_SCOPE,
  R_VOLTMETER,
  WIRE_R,
  clamp,
  ldrResistance,
  num,
} from './stamps';

interface VsStamp {
  id: string;
  pos: string;
  neg: string;
  voltage: number;
  seriesR: number;
}

const GMIN_OPEN = GOPEN;

function pickGround(circuit: Circuit, nets: Netlist): string | null {
  for (const c of circuit.components) {
    if (c.kind === 'ground') {
      const n = pinNodeOf(nets, c, 'a');
      if (n) return n;
    }
  }
  for (const c of circuit.components) {
    if (c.kind === 'battery') {
      const n = pinNodeOf(nets, c, '-');
      if (n) return n;
    }
  }
  return nets.nodes[0] ?? null;
}

function diodeOn(comp: PlacedComponent, onSet: Set<string>): boolean {
  return onSet.has(comp.id);
}

function collectVoltageSources(circuit: Circuit, nets: Netlist, onSet: Set<string>): VsStamp[] {
  const list: VsStamp[] = [];
  for (const c of circuit.components) {
    if (c.kind === 'battery') {
      const pos = pinNodeOf(nets, c, '+');
      const neg = pinNodeOf(nets, c, '-');
      if (!pos || !neg || pos === neg) continue;
      list.push({ id: c.id, pos, neg, voltage: num(c.props.voltage, 9), seriesR: 0.05 });
    }
    if ((c.kind === 'led' || c.kind === 'diode') && diodeOn(c, onSet)) {
      const pos = pinNodeOf(nets, c, '+');
      const neg = pinNodeOf(nets, c, '-');
      if (!pos || !neg) continue;
      const vf = num(c.props.forwardVoltage, c.kind === 'led' ? 2 : 0.7);
      const isRev = onSet.has(`${c.id}:rev`);
      if (isRev) {
        list.push({ id: c.id, pos: neg, neg: pos, voltage: vf, seriesR: DIODE_RON });
      } else {
        list.push({ id: c.id, pos, neg, voltage: vf, seriesR: DIODE_RON });
      }
    }
    if (['and_gate', 'or_gate', 'not_gate', 'nand_gate', 'nor_gate', 'xor_gate'].includes(c.kind)) {
      const out = pinNodeOf(nets, c, 'out');
      if (out) {
        const isHigh = onSet.has(`${c.id}:high`);
        list.push({ id: c.id, pos: out, neg: '0', voltage: isHigh ? 5 : 0, seriesR: 50 });
      }
    }
    if (c.kind === 'clock') {
      const out = pinNodeOf(nets, c, 'out');
      const gnd = pinNodeOf(nets, c, 'gnd') || '0';
      if (out) list.push({ id: c.id, pos: out, neg: gnd, voltage: 5, seriesR: 10 });
    }
    if (c.kind === 'arduino') {
      const p5v = pinNodeOf(nets, c, '5v');
      const gnd = pinNodeOf(nets, c, 'gnd') || '0';
      const d13 = pinNodeOf(nets, c, 'd13');
      if (p5v) list.push({ id: `${c.id}:5v`, pos: p5v, neg: gnd, voltage: 5, seriesR: 2 });
      if (d13) list.push({ id: `${c.id}:d13`, pos: d13, neg: gnd, voltage: 5, seriesR: 30 });
    }
    if (c.kind === 'ir_sensor') {
      const out = pinNodeOf(nets, c, 'out');
      const gnd = pinNodeOf(nets, c, 'gnd') || '0';
      if (out) {
        const det = Boolean(c.props.detected);
        list.push({ id: c.id, pos: out, neg: gnd, voltage: det ? 0 : 5, seriesR: 50 });
      }
    }
    if (c.kind === 'mux') {
      const out = pinNodeOf(nets, c, 'out');
      if (out) {
        const isHigh = onSet.has(`${c.id}:high`);
        list.push({ id: c.id, pos: out, neg: '0', voltage: isHigh ? 5 : 0, seriesR: 50 });
      }
    }
    if (c.kind === 'flip_flop') {
      const q = pinNodeOf(nets, c, 'q');
      const qbar = pinNodeOf(nets, c, 'qbar');
      const isHigh = onSet.has(`${c.id}:high`);
      if (q) list.push({ id: `${c.id}:q`, pos: q, neg: '0', voltage: isHigh ? 5 : 0, seriesR: 50 });
      if (qbar) list.push({ id: `${c.id}:qbar`, pos: qbar, neg: '0', voltage: isHigh ? 0 : 5, seriesR: 50 });
    }
  }
  return list;
}

function stampPassives(
  mna: MnaMatrix,
  circuit: Circuit,
  nets: Netlist,
  onSet: Set<string>,
  transient?: TransientOptions,
): void {
  for (const w of circuit.wires) {
    const a = nets.holeNode(w.from);
    const b = nets.holeNode(w.to);
    if (a === b) continue;
    mna.addConductance(a, b, 1 / WIRE_R);
  }

  for (const c of circuit.components) {
    if (c.kind === 'resistor') {
      const a = pinNodeOf(nets, c, 'a');
      const b = pinNodeOf(nets, c, 'b');
      const R = Math.max(num(c.props.resistance, 1000), 1e-6);
      mna.addConductance(a, b, 1 / R);
    } else if (c.kind === 'ldr') {
      const a = pinNodeOf(nets, c, 'a');
      const b = pinNodeOf(nets, c, 'b');
      mna.addConductance(a, b, 1 / Math.max(ldrResistance(c.props), 1e-6));
    } else if (c.kind === 'buzzer') {
      const a = pinNodeOf(nets, c, '+');
      const b = pinNodeOf(nets, c, '-');
      const R = Math.max(num(c.props.resistance, 100), 1);
      mna.addConductance(a, b, 1 / R);
    } else if (c.kind === 'potentiometer') {
      const a = pinNodeOf(nets, c, 'a');
      const w = pinNodeOf(nets, c, 'w');
      const b = pinNodeOf(nets, c, 'b');
      const R = Math.max(num(c.props.resistance, 10000), 2);
      const alpha = clamp(num(c.props.wiper, 0.5), 0.01, 0.99);
      mna.addConductance(a, w, 1 / (R * alpha));
      mna.addConductance(w, b, 1 / (R * (1 - alpha)));
    } else if (c.kind === 'pushbutton') {
      const a = pinNodeOf(nets, c, 'a');
      const b = pinNodeOf(nets, c, 'b');
      const closed = Boolean(c.props.closed);
      mna.addConductance(a, b, closed ? GSHORT : GMIN_OPEN);
    } else if (c.kind === 'capacitor') {
      const a = pinNodeOf(nets, c, '+');
      const b = pinNodeOf(nets, c, '-');
      const C = Math.max(num(c.props.capacitance, 100e-6), 1e-15);
      if (transient) {
        const g = C / transient.dt;
        const vOld = transient.capVoltage[c.id] ?? 0;
        mna.addConductance(a, b, g);
        mna.addCurrent(a, g * vOld);
        mna.addCurrent(b, -g * vOld);
      } else {
        mna.addConductance(a, b, GMIN_OPEN);
      }
    } else if (c.kind === 'inductor') {
      const a = pinNodeOf(nets, c, 'a');
      const b = pinNodeOf(nets, c, 'b');
      const L = Math.max(num(c.props.inductance, 0.01), 1e-12);
      if (transient) {
        const g = transient.dt / L;
        const iOld = transient.indCurrent[c.id] ?? 0;
        mna.addConductance(a, b, g);
        mna.addCurrent(a, -iOld);
        mna.addCurrent(b, iOld);
      } else {
        mna.addConductance(a, b, GSHORT);
      }
    } else if (c.kind === 'ammeter') {
      const a = pinNodeOf(nets, c, '+');
      const b = pinNodeOf(nets, c, '-');
      mna.addConductance(a, b, 1 / R_AMMETER);
    } else if (c.kind === 'multimeter') {
      const a = pinNodeOf(nets, c, '+');
      const b = pinNodeOf(nets, c, '-');
      const mode = String(c.props.mode ?? 'voltage');
      mna.addConductance(a, b, 1 / (mode === 'current' ? R_AMMETER : R_VOLTMETER));
    } else if (c.kind === 'oscilloscope') {
      const a = pinNodeOf(nets, c, '+');
      const b = pinNodeOf(nets, c, '-');
      mna.addConductance(a, b, 1 / R_SCOPE);
    } else if ((c.kind === 'led' || c.kind === 'diode') && !diodeOn(c, onSet)) {
      const a = pinNodeOf(nets, c, '+');
      const b = pinNodeOf(nets, c, '-');
      mna.addConductance(a, b, GMIN_OPEN);
    } else if (c.kind === 'seven_seg') {
      const gnd = pinNodeOf(nets, c, 'gnd') || '0';
      for (const pin of ['a', 'b', 'c', 'd']) {
        const node = pinNodeOf(nets, c, pin);
        if (node) mna.addConductance(node, gnd, 1 / 330);
      }
    }
  }
}

interface LinearSolve {
  ok: boolean;
  error?: string;
  getV: (net: string | undefined) => number;
  vsCurrent: Map<string, number>;
  ground: string;
  nets: Netlist;
}

function solveLinearOnce(circuit: Circuit, onSet: Set<string>, transient?: TransientOptions): LinearSolve {
  const nets = buildNets(circuit);
  const emptyGet = () => 0;
  if (nets.nodes.length === 0) {
    return {
      ok: true,
      getV: emptyGet,
      vsCurrent: new Map(),
      ground: '',
      nets,
    };
  }
  const ground = pickGround(circuit, nets);
  if (!ground) {
    return { ok: false, error: 'No ground reference found.', getV: emptyGet, vsCurrent: new Map(), ground: '', nets };
  }

  const vs = collectVoltageSources(circuit, nets, onSet);
  const unknown = nets.nodes.filter((n) => n !== ground);
  const mna = new MnaMatrix(unknown, vs.length, ground);
  stampPassives(mna, circuit, nets, onSet, transient);
  vs.forEach((s, i) => mna.stampVoltageSource(s.pos, s.neg, s.voltage, i, s.seriesR));

  if (mna.size === 0) {
    return { ok: true, getV: emptyGet, vsCurrent: new Map(), ground, nets };
  }

  const sol = solveReal(mna.G, mna.I);
  if (!sol) {
    return {
      ok: false,
      error: 'Circuit has no unique solution. Check for shorted batteries or missing connections.',
      getV: emptyGet,
      vsCurrent: new Map(),
      ground,
      nets,
    };
  }

  const getV = (net: string | undefined) => {
    if (!net || net === ground) return 0;
    const i = mna.nodeIndex(net);
    return i >= 0 ? sol[i] : 0;
  };

  const vsCurrent = new Map<string, number>();
  vs.forEach((s, i) => {
    vsCurrent.set(s.id, sol[mna.nNodes + i] ?? 0);
  });

  return { ok: true, getV, vsCurrent, ground, nets };
}

function nextDiodeState(circuit: Circuit, lin: LinearSolve, onSet: Set<string>): Set<string> {
  const next = new Set<string>();
  for (const c of circuit.components) {
    if (c.kind !== 'led' && c.kind !== 'diode') continue;
    const pos = pinNodeOf(lin.nets, c, '+');
    const neg = pinNodeOf(lin.nets, c, '-');
    const vf = num(c.props.forwardVoltage, c.kind === 'led' ? 2 : 0.7);
    const vac = lin.getV(pos) - lin.getV(neg);

    if (c.kind === 'led') {
      if (onSet.has(c.id)) {
        const i = lin.vsCurrent.get(c.id) ?? 0;
        if (i > -1e-8) {
          next.add(c.id);
          if (onSet.has(`${c.id}:rev`)) next.add(`${c.id}:rev`);
        }
      } else {
        if (vac > vf - 0.02) {
          next.add(c.id);
        } else if (-vac > vf - 0.02) {
          next.add(c.id);
          next.add(`${c.id}:rev`);
        }
      }
    } else {
      if (onSet.has(c.id)) {
        const i = lin.vsCurrent.get(c.id) ?? 0;
        if (i > -1e-8) next.add(c.id);
      } else if (vac > vf - 0.02) {
        next.add(c.id);
      }
    }
  }
  for (const c of circuit.components) {
    if (['and_gate', 'or_gate', 'not_gate', 'nand_gate', 'nor_gate', 'xor_gate'].includes(c.kind)) {
      const in1 = pinNodeOf(lin.nets, c, 'in1') || pinNodeOf(lin.nets, c, 'in');
      const in2 = pinNodeOf(lin.nets, c, 'in2');
      const a = in1 ? lin.getV(in1) >= 2.0 : false;
      const b = in2 ? lin.getV(in2) >= 2.0 : false;
      let high = false;
      if (c.kind === 'and_gate') high = a && b;
      else if (c.kind === 'or_gate') high = a || b;
      else if (c.kind === 'not_gate') high = !a;
      else if (c.kind === 'nand_gate') high = !(a && b);
      else if (c.kind === 'nor_gate') high = !(a || b);
      else if (c.kind === 'xor_gate') high = (a || b) && !(a && b);
      if (high) next.add(`${c.id}:high`);
    } else if (c.kind === 'mux') {
      const s = lin.getV(pinNodeOf(lin.nets, c, 's')) >= 2.0;
      const d0 = lin.getV(pinNodeOf(lin.nets, c, 'd0')) >= 2.0;
      const d1 = lin.getV(pinNodeOf(lin.nets, c, 'd1')) >= 2.0;
      if (s ? d1 : d0) next.add(`${c.id}:high`);
    } else if (c.kind === 'flip_flop') {
      const d = lin.getV(pinNodeOf(lin.nets, c, 'd')) >= 2.0;
      if (d) next.add(`${c.id}:high`);
    }
  }
  return next;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function twoPinCurrent(c: PlacedComponent, lin: LinearSolve): { v: number; i: number } {
  const pins = Object.keys(c.leads);
  const a = pinNodeOf(lin.nets, c, pins[0] ?? 'a');
  const b = pinNodeOf(lin.nets, c, pins[1] ?? 'b');
  const v = lin.getV(a) - lin.getV(b);
  return { v, i: 0 };
}

function extractResults(circuit: Circuit, lin: LinearSolve, onSet: Set<string>, transient?: TransientOptions): SimulationResult {
  const warnings: string[] = [];
  const nodeVoltages = lin.nets.nodes.map((nodeId) => ({ nodeId, voltage: lin.getV(nodeId) }));

  const pinVoltages: Record<string, number> = {};
  for (const [k, n] of lin.nets.pinNode) pinVoltages[k] = lin.getV(n);

  const wireCurrents: WireCurrent[] = circuit.wires.map((w) => {
    const a = lin.nets.holeNode(w.from);
    const b = lin.nets.holeNode(w.to);
    const v = lin.getV(a) - lin.getV(b);
    const i = a === b ? 0 : v / WIRE_R;
    return { wireId: w.id, current: i };
  });

  const componentResults: ComponentResult[] = [];

  for (const c of circuit.components) {
    let voltage = 0;
    let current = 0;
    let on: boolean | undefined;
    let brightness: number | undefined;
    let reading: number | undefined;

    if (c.kind === 'resistor') {
      const va = lin.getV(pinNodeOf(lin.nets, c, 'a'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, 'b'));
      voltage = va - vb;
      current = voltage / Math.max(num(c.props.resistance, 1000), 1e-6);
    } else if (c.kind === 'ldr') {
      const va = lin.getV(pinNodeOf(lin.nets, c, 'a'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, 'b'));
      voltage = va - vb;
      current = voltage / Math.max(ldrResistance(c.props), 1e-6);
    } else if (c.kind === 'buzzer') {
      const va = lin.getV(pinNodeOf(lin.nets, c, '+'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, '-'));
      voltage = va - vb;
      current = voltage / Math.max(num(c.props.resistance, 100), 1);
      on = Math.abs(current) >= num(c.props.threshold, 0.005);
    } else if (c.kind === 'potentiometer') {
      const va = lin.getV(pinNodeOf(lin.nets, c, 'a'));
      const vw = lin.getV(pinNodeOf(lin.nets, c, 'w'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, 'b'));
      voltage = va - vb;
      const R = Math.max(num(c.props.resistance, 10000), 2);
      const alpha = clamp(num(c.props.wiper, 0.5), 0.01, 0.99);
      const iaw = (va - vw) / (R * alpha);
      current = iaw;
    } else if (c.kind === 'pushbutton') {
      const va = lin.getV(pinNodeOf(lin.nets, c, 'a'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, 'b'));
      voltage = va - vb;
      current = Boolean(c.props.closed) ? voltage * GSHORT : voltage * GMIN_OPEN;
    } else if (c.kind === 'capacitor') {
      const va = lin.getV(pinNodeOf(lin.nets, c, '+'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, '-'));
      voltage = va - vb;
      if (transient) {
        const C = Math.max(num(c.props.capacitance, 100e-6), 1e-15);
        const g = C / transient.dt;
        const vOld = transient.capVoltage[c.id] ?? 0;
        current = g * voltage - g * vOld;
      } else {
        current = voltage * GMIN_OPEN;
      }
    } else if (c.kind === 'inductor') {
      const va = lin.getV(pinNodeOf(lin.nets, c, 'a'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, 'b'));
      voltage = va - vb;
      if (transient) {
        const L = Math.max(num(c.props.inductance, 0.01), 1e-12);
        const g = transient.dt / L;
        const iOld = transient.indCurrent[c.id] ?? 0;
        current = g * voltage + iOld;
      } else {
        current = voltage * GSHORT;
      }
    } else if (c.kind === 'battery') {
      voltage = num(c.props.voltage, 9);
      current = lin.vsCurrent.get(c.id) ?? 0;
    } else if (c.kind === 'led' || c.kind === 'diode') {
      const va = lin.getV(pinNodeOf(lin.nets, c, '+'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, '-'));
      on = onSet.has(c.id);
      if (on) {
        current = lin.vsCurrent.get(c.id) ?? 0;
        voltage = Math.abs(va - vb);
      } else {
        voltage = va - vb;
        current = voltage * GMIN_OPEN;
      }
      if (c.kind === 'led') {
        const rated = Math.max(num(c.props.iRated, 0.02), 1e-6);
        const absI = Math.abs(current);
        brightness = on ? clamp(absI / rated, 0, 1.5) : 0;
        if (absI > rated * 1.5) warnings.push(`${String(c.props.label ?? 'LED')} is overcurrent — add a series resistor.`);
      }
    } else if (c.kind === 'ammeter') {
      const va = lin.getV(pinNodeOf(lin.nets, c, '+'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, '-'));
      voltage = va - vb;
      current = voltage / R_AMMETER;
      reading = current;
    } else if (c.kind === 'multimeter') {
      const va = lin.getV(pinNodeOf(lin.nets, c, '+'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, '-'));
      voltage = va - vb;
      const mode = String(c.props.mode ?? 'voltage');
      if (mode === 'current') {
        current = voltage / R_AMMETER;
        reading = current;
      } else {
        current = voltage / R_VOLTMETER;
        reading = voltage;
      }
    } else if (c.kind === 'oscilloscope') {
      const va = lin.getV(pinNodeOf(lin.nets, c, '+'));
      const vb = lin.getV(pinNodeOf(lin.nets, c, '-'));
      voltage = va - vb;
      current = voltage / R_SCOPE;
      reading = voltage;
    } else if (c.kind === 'ground') {
      voltage = 0;
      current = 0;
    } else if (['and_gate', 'or_gate', 'not_gate', 'nand_gate', 'nor_gate', 'xor_gate', 'mux', 'flip_flop'].includes(c.kind)) {
      on = onSet.has(`${c.id}:high`);
      voltage = on ? 5.0 : 0.0;
      current = 0.005;
      reading = on ? 1 : 0;
    } else if (c.kind === 'seven_seg') {
      const va = lin.getV(pinNodeOf(lin.nets, c, 'a')) >= 2.0 ? 1 : 0;
      const vb = lin.getV(pinNodeOf(lin.nets, c, 'b')) >= 2.0 ? 1 : 0;
      const vc = lin.getV(pinNodeOf(lin.nets, c, 'c')) >= 2.0 ? 1 : 0;
      const vd = lin.getV(pinNodeOf(lin.nets, c, 'd')) >= 2.0 ? 1 : 0;
      const val = va + vb * 2 + vc * 4 + vd * 8;
      reading = val;
      on = (va + vb + vc + vd) > 0;
      voltage = 5.0;
      current = 0.015 * (va + vb + vc + vd);
    } else if (c.kind === 'arduino') {
      voltage = 5.0;
      current = 0.045;
      on = true;
    } else if (c.kind === 'ir_sensor') {
      on = Boolean(c.props.detected);
      voltage = on ? 0.0 : 5.0;
      current = 0.01;
      reading = on ? 0 : 1;
    } else if (c.kind === 'clock') {
      voltage = 5.0;
      current = 0.01;
      on = true;
    } else {
      const t = twoPinCurrent(c, lin);
      voltage = t.v;
    }

    componentResults.push({
      componentId: c.id,
      voltage,
      current,
      power: voltage * current,
      on,
      brightness,
      reading,
    });
  }

  return {
    ok: true,
    warnings,
    nodeVoltages,
    pinVoltages,
    componentResults,
    wireCurrents,
  };
}

/**
 * DC operating point. If `transient` is set, capacitors/inductors use companion models.
 */
export function solveDc(circuit: Circuit, transient?: TransientOptions): SimulationResult {
  let onSet = new Set<string>();
  let lin = solveLinearOnce(circuit, onSet, transient);
  if (!lin.ok) {
    return {
      ok: false,
      error: lin.error,
      warnings: [],
      nodeVoltages: [],
      pinVoltages: {},
      componentResults: [],
      wireCurrents: [],
    };
  }

  for (let iter = 0; iter < 16; iter++) {
    const next = nextDiodeState(circuit, lin, onSet);
    if (sameSet(next, onSet)) break;
    onSet = next;
    lin = solveLinearOnce(circuit, onSet, transient);
    if (!lin.ok) {
      return {
        ok: false,
        error: lin.error,
        warnings: [],
        nodeVoltages: [],
        pinVoltages: {},
        componentResults: [],
        wireCurrents: [],
      };
    }
  }

  return extractResults(circuit, lin, onSet, transient);
}
