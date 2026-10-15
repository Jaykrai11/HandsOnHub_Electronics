import type { Circuit, SimulationResult, TransientState } from '../types';
import { solveDc } from './dc';
import { num } from './stamps';

export const TRANSIENT_DT = 1 / 60;
const SCOPE_MAX = 400;

export function emptyTransient(): TransientState {
  return { time: 0, capVoltage: {}, indCurrent: {}, scopeTraces: {} };
}

export function circuitNeedsTransient(circuit: Circuit): boolean {
  return circuit.components.some(
    (c) => c.kind === 'capacitor' || c.kind === 'inductor' || c.kind === 'oscilloscope',
  );
}

export function stepTransient(circuit: Circuit, prev: TransientState, dt = TRANSIENT_DT): {
  result: SimulationResult;
  state: TransientState;
} {
  const result = solveDc(circuit, {
    dt,
    capVoltage: prev.capVoltage,
    indCurrent: prev.indCurrent,
  });

  const capVoltage: Record<string, number> = { ...prev.capVoltage };
  const indCurrent: Record<string, number> = { ...prev.indCurrent };
  const scopeTraces: Record<string, { t: number; v: number }[]> = { ...prev.scopeTraces };
  const t = prev.time + dt;

  if (result.ok) {
    for (const c of circuit.components) {
      const cr = result.componentResults.find((r) => r.componentId === c.id);
      if (!cr) continue;
      if (c.kind === 'capacitor') capVoltage[c.id] = cr.voltage;
      if (c.kind === 'inductor') indCurrent[c.id] = cr.current;
      if (c.kind === 'oscilloscope') {
        const series = (scopeTraces[c.id] ?? []).slice();
        series.push({ t, v: cr.voltage });
        if (series.length > SCOPE_MAX) series.splice(0, series.length - SCOPE_MAX);
        scopeTraces[c.id] = series;
      }
    }
    // Drop traces for removed scopes
    for (const id of Object.keys(scopeTraces)) {
      if (!circuit.components.some((c) => c.id === id && c.kind === 'oscilloscope')) {
        delete scopeTraces[id];
      }
    }
  }

  return { result, state: { time: t, capVoltage, indCurrent, scopeTraces } };
}

export function resetCapacitorGuess(circuit: Circuit): Record<string, number> {
  const capVoltage: Record<string, number> = {};
  for (const c of circuit.components) {
    if (c.kind === 'capacitor') capVoltage[c.id] = 0;
  }
  return capVoltage;
}

export { num };
