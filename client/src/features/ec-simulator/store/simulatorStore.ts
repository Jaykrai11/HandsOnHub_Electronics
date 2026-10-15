import { create } from 'zustand';
import { temporal } from 'zundo';
import { EXAMPLES } from '../data/examples';
import { getComponentDef } from '../data/componentDefs';
import { circuitNeedsTransient, emptyTransient, solveDc, stepTransient, TRANSIENT_DT } from '../engine';
import { describeHole, holeKey, holeToGrid } from '../lib/breadboard';
import { computeLeads, firstLead, leadsCollide, occupiedKeys, translateLeads, tryPlace } from '../lib/placement';
import type {
  ComponentKind,
  HoleId,
  LogEntry,
  PlacedComponent,
  ReadingSnapshot,
  SimulationResult,
  Theme,
  ToolMode,
  TransientState,
  Wire,
} from '../types';

let seq = 1;
function nextId(prefix: string): string {
  return `${prefix}_${seq++}`;
}

function circuitSig(components: PlacedComponent[], wires: Wire[]): string {
  const c = components
    .map((x) => `${x.id}:${Object.values(x.leads).map(holeKey).join(',')}`)
    .join('|');
  const w = wires.map((x) => `${x.id}:${holeKey(x.from)}>${holeKey(x.to)}`).join('|');
  return `${c}::${w}`;
}

export interface SimulatorState {
  components: PlacedComponent[];
  wires: Wire[];
  tool: ToolMode;
  pendingKind: ComponentKind | null;
  selectedIds: string[];
  theme: Theme;
  simResult: SimulationResult | null;
  transient: TransientState;
  lastSig: string;
  wireStart: HoleId | null;
  hint: string;

  addComponentAt: (kind: ComponentKind, hole: HoleId) => boolean;
  moveComponent: (id: string, hole: HoleId) => boolean;
  rotateSelected: () => void;
  flipSelected: () => void;
  updateProps: (id: string, props: Record<string, number | string | boolean>, track?: boolean) => void;
  setButton: (id: string, closed: boolean) => void;

  wireColor: string;
  setWireColor: (color: string) => void;
  setSelectedWireColor: (color: string) => void;

  addWire: (from: HoleId, to: HoleId, color?: string) => void;
  setWireStart: (hole: HoleId | null) => void;
  removeWire: (id: string) => void;
  updateWireColor: (id: string, color: string) => void;

  setTool: (tool: ToolMode, kind?: ComponentKind) => void;
  setSelected: (ids: string[]) => void;
  deleteSelected: () => void;
  clearAll: () => void;
  loadExample: (name: string) => void;

  isSimulating: boolean;
  startSimulation: () => void;
  stopSimulation: () => void;
  toggleSimulation: () => void;

  logs: LogEntry[];
  readingSnapshots: ReadingSnapshot[];
  isLogOpen: boolean;
  toggleLog: () => void;
  setLogOpen: (open: boolean) => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp' | 'rawTime'>) => void;
  recordReadingSnapshot: (customNote?: string) => void;
  clearLogs: () => void;

  recompute: (stepTime?: boolean) => void;
  toggleTheme: () => void;
  setHint: (hint: string) => void;
}

const emptyResult = (): SimulationResult => ({
  ok: true,
  warnings: [],
  nodeVoltages: [],
  pinVoltages: {},
  componentResults: [],
  wireCurrents: [],
});

function formatTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export const useSimulatorStore = create<SimulatorState>()(
  temporal(
    (set, get) => ({
      components: [],
      wires: [],
      tool: 'select',
      pendingKind: null,
      selectedIds: [],
      theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      simResult: emptyResult(),
      transient: emptyTransient(),
      lastSig: '',
      wireStart: null,
      wireColor: '#2563eb',
      setWireColor: (color) => set({ wireColor: color }),
      setSelectedWireColor: (color) => {
        const ids = new Set(get().selectedIds);
        set((s) => ({
          wireColor: color,
          wires: s.wires.map((w) => (ids.has(w.id) ? { ...w, color } : w)),
        }));
        get().recompute();
      },
      hint: 'Drag a battery and a resistor onto the board, then draw a wire between holes.',

      logs: [
        {
          id: 'log_init',
          type: 'sim',
          title: 'Workbench Ready',
          details: 'HandsOnHub Virtual Breadboard Simulator initialized.',
          timestamp: formatTimestamp(),
          rawTime: Date.now(),
        },
      ],
      readingSnapshots: [],
      isLogOpen: false,
      toggleLog: () => set((s) => ({ isLogOpen: !s.isLogOpen })),
      setLogOpen: (open) => set({ isLogOpen: open }),

      addLog: (entry) => {
        const item: LogEntry = {
          ...entry,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          timestamp: formatTimestamp(),
          rawTime: Date.now(),
        };
        set((s) => ({
          logs: [item, ...s.logs].slice(0, 200),
        }));
      },

      recordReadingSnapshot: (customNote?: string) => {
        const { components, simResult, transient } = get();
        if (!simResult) return;
        const totalCurrent = simResult.componentResults.reduce((acc, c) => acc + Math.max(0, c.current), 0);
        const totalPower = simResult.componentResults.reduce((acc, c) => acc + Math.abs(c.power), 0);

        const snapshot: ReadingSnapshot = {
          id: `snap_${Date.now()}`,
          timestamp: formatTimestamp(),
          note: customNote,
          timeSec: transient.time,
          components: components.map((c) => {
            const cr = simResult.componentResults.find((r) => r.componentId === c.id);
            return {
              id: c.id,
              label: String(c.props.label || c.id),
              kind: c.kind,
              voltage: cr?.voltage ?? 0,
              current: cr?.current ?? 0,
              power: cr?.power ?? 0,
              reading: cr?.reading,
              state: cr?.on !== undefined ? (cr.on ? 'ON' : 'OFF') : undefined,
            };
          }),
          totalCurrent,
          totalPower,
          nodeVoltages: simResult.nodeVoltages.map((n, i) => ({
            node: parseInt(n.nodeId, 10) || i + 1,
            voltage: n.voltage,
          })),
        };

        set((s) => ({
          readingSnapshots: [snapshot, ...s.readingSnapshots].slice(0, 50),
        }));

        get().addLog({
          type: 'reading',
          title: customNote || 'Electrical Reading Snapshot',
          details: `Recorded ${snapshot.components.length} components | I_total = ${(totalCurrent * 1000).toFixed(2)} mA | P_total = ${(totalPower * 1000).toFixed(2)} mW`,
          readings: snapshot.components.map((c) => ({
            componentId: c.id,
            label: c.label,
            voltage: c.voltage,
            current: c.current,
            power: c.power,
            state: c.state,
          })),
        });
      },

      clearLogs: () => set({ logs: [], readingSnapshots: [] }),

      addComponentAt: (kind, hole) => {
        const placed = tryPlace(kind, hole, 0, false);
        if (!placed) return false;
        const occ = occupiedKeys(get().components);
        if (leadsCollide(placed.leads, occ)) return false;
        const def = getComponentDef(kind);
        const id = nextId(kind);
        const comp: PlacedComponent = {
          id,
          kind,
          rotation: placed.rotation,
          flipH: false,
          leads: placed.leads,
          props: { ...(def?.defaultProps ?? {}) },
        };
        set((s) => ({
          components: [...s.components, comp],
          selectedIds: [id],
          tool: 'select',
          pendingKind: null,
        }));
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Component Added',
          details: `Added ${comp.props.label || id} (${def?.label || kind}) at ${describeHole(firstLead(comp))}`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot(`Added ${comp.props.label || id}`);
        }
        return true;
      },

      moveComponent: (id, hole) => {
        const { components } = get();
        const comp = components.find((c) => c.id === id);
        if (!comp) return false;
        const from = holeToGrid(firstLead(comp));
        const to = holeToGrid(hole);
        const next = translateLeads(comp.leads, to.c - from.c, to.r - from.r);
        if (!next) return false;
        const occ = occupiedKeys(components, id);
        if (leadsCollide(next, occ)) return false;
        set({
          components: components.map((c) => (c.id === id ? { ...c, leads: next } : c)),
        });
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Component Repositioned',
          details: `Moved ${comp.props.label || id} to ${describeHole(hole)}`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot(`Moved ${comp.props.label || id}`);
        }
        return true;
      },

      rotateSelected: () => {
        const { components, selectedIds } = get();
        const id = selectedIds.find((x) => components.some((c) => c.id === x));
        if (!id) return;
        const comp = components.find((c) => c.id === id)!;
        const rot = (comp.rotation + 90) % 360;
        const leads = computeLeads(comp.kind, firstLead(comp), rot, comp.flipH);
        if (!leads) return;
        const occ = occupiedKeys(components, id);
        if (leadsCollide(leads, occ)) return;
        set({
          components: components.map((c) => (c.id === id ? { ...c, rotation: rot, leads } : c)),
        });
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Component Rotated',
          details: `Rotated ${comp.props.label || id} to ${rot}°`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot(`Rotated ${comp.props.label || id}`);
        }
      },

      flipSelected: () => {
        const { components, selectedIds } = get();
        const id = selectedIds.find((x) => components.some((c) => c.id === x));
        if (!id) return;
        const comp = components.find((c) => c.id === id)!;
        const flipH = !comp.flipH;
        const leads = computeLeads(comp.kind, firstLead(comp), comp.rotation, flipH);
        if (!leads) return;
        const occ = occupiedKeys(components, id);
        if (leadsCollide(leads, occ)) return;
        set({
          components: components.map((c) => (c.id === id ? { ...c, flipH, leads } : c)),
        });
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Component Flipped',
          details: `Flipped ${comp.props.label || id} horizontally`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot(`Flipped ${comp.props.label || id}`);
        }
      },

      updateProps: (id, props, track = true) => {
        const temporalApi = useSimulatorStore.temporal.getState();
        if (!track) temporalApi.pause();
        const target = get().components.find((c) => c.id === id);
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, props: { ...c.props, ...props } } : c,
          ),
        }));
        if (!track) temporalApi.resume();
        get().recompute();
        if (track && target) {
          const changedKeys = Object.keys(props).join(', ');
          get().addLog({
            type: 'step',
            title: 'Parameter Adjusted',
            details: `Updated ${target.props.label || id} (${changedKeys})`,
          });
          if (get().isSimulating) {
            get().recordReadingSnapshot(`Updated ${target.props.label || id}`);
          }
        }
      },

      setButton: (id, closed) => {
        const comp = get().components.find((c) => c.id === id);
        get().updateProps(id, { closed }, false);
        get().addLog({
          type: 'step',
          title: closed ? 'Switch Closed / Pressed' : 'Switch Opened / Released',
          details: `${comp?.props.label || id} is now ${closed ? 'CLOSED (Conducting)' : 'OPEN (Isolated)'}`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot(`Switch ${id} ${closed ? 'CLOSED' : 'OPEN'}`);
        }
      },

      addWire: (from, to, color) => {
        if (holeKey(from) === holeKey(to)) return;
        const id = nextId('wire');
        const wireColor = color ?? get().wireColor;
        set((s) => ({ wires: [...s.wires, { id, from, to, color: wireColor }], wireStart: null }));
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Jumper Wire Connected',
          details: `Connected ${describeHole(from)} -> ${describeHole(to)} [${wireColor}]`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot('Wire connected');
        }
      },

      setWireStart: (hole) => set({ wireStart: hole }),

      removeWire: (id) => {
        const wire = get().wires.find((w) => w.id === id);
        set((s) => ({
          wires: s.wires.filter((w) => w.id !== id),
          selectedIds: s.selectedIds.filter((x) => x !== id),
        }));
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Wire Removed',
          details: wire ? `Disconnected ${describeHole(wire.from)} - ${describeHole(wire.to)}` : `Removed wire ${id}`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot('Wire removed');
        }
      },

      updateWireColor: (id, color) => {
        set((s) => ({
          wires: s.wires.map((w) => (w.id === id ? { ...w, color } : w)),
        }));
        get().recompute();
      },

      setTool: (tool, kind) =>
        set({
          tool,
          pendingKind: kind ?? null,
          wireStart: null,
        }),

      setSelected: (ids) => set({ selectedIds: ids }),

      deleteSelected: () => {
        const ids = new Set(get().selectedIds);
        if (ids.size === 0) return;
        const numComps = get().components.filter((c) => ids.has(c.id)).length;
        const numWires = get().wires.filter((w) => ids.has(w.id)).length;
        set((s) => ({
          components: s.components.filter((c) => !ids.has(c.id)),
          wires: s.wires.filter((w) => !ids.has(w.id)),
          selectedIds: [],
        }));
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Elements Deleted',
          details: `Deleted ${numComps} component(s) and ${numWires} wire(s)`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot('Elements deleted');
        }
      },

      clearAll: () => {
        set({
          components: [],
          wires: [],
          simResult: emptyResult(),
          transient: emptyTransient(),
          selectedIds: [],
          wireStart: null,
          lastSig: '',
        });
        get().addLog({
          type: 'step',
          title: 'Breadboard Cleared',
          details: 'All components, wires, and circuit states were removed.',
        });
      },

      loadExample: (name) => {
        const ex = EXAMPLES[name];
        if (!ex) return;
        set({
          components: ex.components.map((c) => ({ ...c, leads: { ...c.leads }, props: { ...c.props } })),
          wires: ex.wires.map((w) => ({ ...w })),
          selectedIds: [],
          simResult: emptyResult(),
          transient: emptyTransient(),
          lastSig: '',
          tool: 'select',
        });
        get().recompute();
        get().addLog({
          type: 'step',
          title: 'Experiment Preset Loaded',
          details: `Loaded circuit: "${ex.name}" with ${ex.components.length} components and ${ex.wires.length} wires.`,
        });
        if (get().isSimulating) {
          get().recordReadingSnapshot(`Loaded: ${ex.name}`);
        }
      },

      isSimulating: true,
      startSimulation: () => {
        set({ isSimulating: true });
        get().recompute(true);
        get().addLog({
          type: 'sim',
          title: 'Simulation Started',
          details: 'Circuit powered ON. Real-time nodal analysis and transient engine running.',
        });
        get().recordReadingSnapshot('Simulation Started');
      },
      stopSimulation: () => {
        set({ isSimulating: false });
        get().recompute(false);
        get().addLog({
          type: 'sim',
          title: 'Simulation Stopped',
          details: 'Circuit de-energized. All node voltages and currents zeroed.',
        });
      },
      toggleSimulation: () => {
        const next = !get().isSimulating;
        if (next) {
          get().startSimulation();
        } else {
          get().stopSimulation();
        }
      },

      recompute: (stepTime = false) => {
        const { components, wires, lastSig, transient, isSimulating } = get();
        if (!isSimulating) {
          set({
            simResult: {
              ok: true,
              warnings: [],
              nodeVoltages: [],
              pinVoltages: {},
              componentResults: components.map((c) => ({
                componentId: c.id,
                voltage: 0,
                current: 0,
                power: 0,
                brightness: 0,
                on: false,
                reading: 0,
              })),
              wireCurrents: wires.map((w) => ({ wireId: w.id, current: 0 })),
            },
          });
          return;
        }

        const sig = circuitSig(components, wires);
        let state = transient;
        if (sig !== lastSig) {
          state = emptyTransient();
        }
        const circuit = { components, wires };
        if (stepTime && circuitNeedsTransient(circuit)) {
          const stepped = stepTransient(circuit, state, TRANSIENT_DT);
          set({ simResult: stepped.result, transient: stepped.state, lastSig: sig });
        } else {
          const result = solveDc(circuit);
          set({ simResult: result, lastSig: sig, transient: sig !== lastSig ? emptyTransient() : state });
        }
      },

      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setHint: (hint) => set({ hint }),
    }),
    {
      limit: 80,
      partialize: (s) => ({ components: s.components, wires: s.wires }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  ),
);

export function undoSim(): void {
  useSimulatorStore.temporal.getState().undo();
  useSimulatorStore.getState().recompute();
}

export function redoSim(): void {
  useSimulatorStore.temporal.getState().redo();
  useSimulatorStore.getState().recompute();
}
