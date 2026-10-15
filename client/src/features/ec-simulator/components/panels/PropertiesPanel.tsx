import { useState } from 'react';
import {
  AlertCircle,
  RotateCw,
  FlipHorizontal2,
  Trash2,
  X,
  Info,
  Activity,
  Cpu,
  Layers,
  ChevronDown,
  Gauge,
  Sliders,
} from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { COMPONENT_DEFS } from '../../data/componentDefs';
import { formatValue } from '../../lib/format';
import { ComponentIcon } from '../canvas/ComponentIcons';
import OscilloscopeView from './OscilloscopeView';
import type { HoleId, SimulationResult } from '../../types';

function describeHole(h?: HoleId): string {
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

// ─── Extended Component Metadata & Theory Database ───────────────────────────

interface ComponentInfo {
  realName: string;
  package: string;
  category: string;
  theory: string;
  formula?: string;
  presetChips?: { label: string; props: Record<string, number | string> }[];
}

const COMPONENT_DATABASE: Record<string, ComponentInfo> = {
  resistor: {
    realName: 'Carbon Film Resistor',
    package: 'Axial Lead Through-Hole (0.25W)',
    category: 'Passive Components',
    theory: "Ohm's Law: Limits electric current in a circuit. Dissipates electrical energy as thermal energy.",
    formula: 'V = I · R   |   P = I² · R',
    presetChips: [
      { label: '220 Ω', props: { resistance: 220 } },
      { label: '330 Ω', props: { resistance: 330 } },
      { label: '1 kΩ', props: { resistance: 1000 } },
      { label: '4.7 kΩ', props: { resistance: 4700 } },
      { label: '10 kΩ', props: { resistance: 10000 } },
      { label: '100 kΩ', props: { resistance: 100000 } },
    ],
  },
  capacitor: {
    realName: 'Electrolytic Capacitor',
    package: 'Radial Aluminum Can (Through-Hole)',
    category: 'Passive Components',
    theory: 'Stores electrical energy electrostatically. Acts as an open circuit in DC steady-state.',
    formula: 'Q = C · V   |   i(t) = C · (dv/dt)',
    presetChips: [
      { label: '10 µF', props: { capacitance: 10e-6 } },
      { label: '47 µF', props: { capacitance: 47e-6 } },
      { label: '100 µF', props: { capacitance: 100e-6 } },
      { label: '470 µF', props: { capacitance: 470e-6 } },
    ],
  },
  inductor: {
    realName: 'Toroid Core Inductor',
    package: 'Through-Hole Radial Coiled Wire',
    category: 'Passive Components',
    theory: 'Stores energy in a magnetic field. Opposes changes in current; acts as a short circuit in DC steady-state.',
    formula: 'v(t) = L · (di/dt)   |   E = ½ L · I²',
    presetChips: [
      { label: '1 mH', props: { inductance: 0.001 } },
      { label: '10 mH', props: { inductance: 0.01 } },
      { label: '100 mH', props: { inductance: 0.1 } },
    ],
  },
  diode: {
    realName: '1N4007 Silicon Rectifier Diode',
    package: 'DO-41 Glass-Passivated Plastic',
    category: 'Semiconductors',
    theory: 'P-N junction diode that allows current to flow easily in one direction (forward bias) while blocking it in reverse bias.',
    formula: 'V_forward ≈ 0.7 V   |   I = I_s · (e^(V/V_t) - 1)',
    presetChips: [
      { label: 'Si (0.7V)', props: { forwardVoltage: 0.7 } },
      { label: 'Schottky (0.3V)', props: { forwardVoltage: 0.3 } },
      { label: 'Ge (0.2V)', props: { forwardVoltage: 0.2 } },
    ],
  },
  led: {
    realName: '5mm Round Diffused LED',
    package: '5mm T-1 3/4 Radial Dome',
    category: 'Semiconductors',
    theory: 'Light Emitting Diode. Emits light when forward biased. Always use a series resistor to prevent thermal destruction.',
    formula: 'R_series = (V_supply - V_led) / I_rated',
    presetChips: [
      { label: 'Red (2.0V)', props: { color: 'red', forwardVoltage: 2.0 } },
      { label: 'Green (2.2V)', props: { color: 'green', forwardVoltage: 2.2 } },
      { label: 'Blue (3.2V)', props: { color: 'blue', forwardVoltage: 3.2 } },
      { label: 'Yellow (2.1V)', props: { color: 'yellow', forwardVoltage: 2.1 } },
      { label: 'White (3.3V)', props: { color: 'white', forwardVoltage: 3.3 } },
    ],
  },
  battery: {
    realName: 'DC Voltage Source / Battery',
    package: '9V Snap Block / Bench Power Supply',
    category: 'Sources & Power',
    theory: 'Chemical or regulated DC electromotive force (EMF) maintaining a constant potential difference across terminals.',
    formula: 'V_out = V_nominal   |   P_supplied = V · I',
    presetChips: [
      { label: '1.5 V (AA)', props: { voltage: 1.5 } },
      { label: '3.3 V (Logic)', props: { voltage: 3.3 } },
      { label: '5.0 V (TTL)', props: { voltage: 5.0 } },
      { label: '9.0 V (Block)', props: { voltage: 9.0 } },
      { label: '12.0 V (Supply)', props: { voltage: 12.0 } },
    ],
  },
  potentiometer: {
    realName: '10 kΩ Rotary Potentiometer',
    package: '3-Pin Cermet Trimmer with Screwdriver Slot',
    category: 'Passive Components',
    theory: 'Variable resistive voltage divider. As the wiper rotates, resistance splits proportionally between terminal A and terminal B.',
    formula: 'V_wiper = V_in · (wiper_ratio)',
  },
  pushbutton: {
    realName: 'Momentary Tactile Pushbutton',
    package: '6×6mm SPST Tactile Switch (4-Pin)',
    category: 'Switches & Controls',
    theory: 'Normally-open mechanical switch. Depressing the plunger bridges contacts; releasing opens circuit.',
  },
  ldr: {
    realName: 'CdS Photoresistor (LDR)',
    package: '5mm Epoxy-Coated Ceramic Disc',
    category: 'Sensors & Transducers',
    theory: 'Light Dependent Resistor. Incident photons liberate charge carriers, dropping resistance from ~1 MΩ in darkness down to ~1 kΩ under light.',
  },
  buzzer: {
    realName: 'DC Piezoelectric Buzzer',
    package: 'Round Molded Acoustic Cavity',
    category: 'Output Transducers',
    theory: 'Converts electrical oscillation into sound pressure waves when forward current exceeds the 5mA threshold.',
  },
  ammeter: {
    realName: 'Digital DC In-Line Ammeter',
    package: 'Precision Low-Burden Shunt Instrument',
    category: 'Instruments & Meters',
    theory: 'Current measurement instrument. Must be connected strictly in SERIES with the circuit branch to measure electron flow.',
    formula: 'I = V_shunt / R_shunt   (R_internal ≈ 0.05 Ω)',
  },
  multimeter: {
    realName: 'Digital Multimeter (DMM)',
    package: 'Handheld Protected Enclosure',
    category: 'Instruments & Meters',
    theory: 'Multi-function electrical meter capable of measuring potential difference in parallel or current in series.',
  },
  oscilloscope: {
    realName: 'Digital Storage Oscilloscope',
    package: 'High-Impedance Active Probe',
    category: 'Instruments & Meters',
    theory: 'Visualizes voltage waveforms across time. High input impedance (1 MΩ) prevents loading the measured circuit.',
  },
  clock: {
    realName: '5V Astable Pulse Generator',
    package: 'Integrated Square Wave Clock Oscillator',
    category: 'Digital & ICs',
    theory: 'Generates periodic digital square wave pulses between 0V and 5V to clock sequential circuits and flip-flops.',
    formula: 'f = 1 / T_period',
  },
  and_gate: {
    realName: '74LS08 Quad 2-Input AND Gate',
    package: 'DIP-14 Dual In-Line Plastic (300 mil)',
    category: 'Logic Gates',
    theory: 'Combinational logic gate. Output Y is HIGH (5V) if and only if both input A and input B are HIGH (>2.0V).',
    formula: 'Y = A · B',
  },
  or_gate: {
    realName: '74LS32 Quad 2-Input OR Gate',
    package: 'DIP-14 Dual In-Line Plastic (300 mil)',
    category: 'Logic Gates',
    theory: 'Combinational logic gate. Output Y is HIGH (5V) if either input A or input B is HIGH (>2.0V).',
    formula: 'Y = A + B',
  },
  not_gate: {
    realName: '74LS04 Hex Inverter Gate',
    package: 'DIP-14 Dual In-Line Plastic (300 mil)',
    category: 'Logic Gates',
    theory: 'Single-input logical NOT gate. Output Y is the Boolean inverse of input A.',
    formula: 'Y = Ā (NOT A)',
  },
  nand_gate: {
    realName: '74LS00 Quad 2-Input NAND Gate',
    package: 'DIP-14 Dual In-Line Plastic (300 mil)',
    category: 'Logic Gates',
    theory: 'Universal logic gate. Output Y is LOW (0V) only when both input A and input B are HIGH.',
    formula: 'Y = (A · B)̄',
  },
  nor_gate: {
    realName: '74LS02 Quad 2-Input NOR Gate',
    package: 'DIP-14 Dual In-Line Plastic (300 mil)',
    category: 'Logic Gates',
    theory: 'Universal logic gate. Output Y is HIGH (5V) only when both input A and input B are LOW.',
    formula: 'Y = (A + B)̄',
  },
  xor_gate: {
    realName: '74LS86 Quad 2-Input XOR Gate',
    package: 'DIP-14 Dual In-Line Plastic (300 mil)',
    category: 'Logic Gates',
    theory: 'Exclusive-OR gate. Output Y is HIGH when inputs differ. Core component of binary adders and parity checkers.',
    formula: 'Y = A ⊕ B = ĀB + AB̄',
  },
  mux: {
    realName: '74LS157 Quad 2:1 Multiplexer',
    package: 'DIP-16 Dual In-Line Package',
    category: 'Digital & ICs',
    theory: 'Data selector: routes data from channel D0 when select S=0, or channel D1 when select S=1.',
    formula: 'Y = (S̄ · D0) + (S · D1)',
  },
  decoder: {
    realName: '74LS139 Dual 2-to-4 Decoder',
    package: 'DIP-16 Dual In-Line Package',
    category: 'Digital & ICs',
    theory: 'Decodes a 2-bit binary code into one of four mutually exclusive active lines.',
  },
  flip_flop: {
    realName: '74LS74 Dual D-Type Flip-Flop',
    package: 'DIP-14 Dual In-Line Package',
    category: 'Sequential Circuits',
    theory: 'Positive-edge-triggered memory element. Latches data input D to output Q on the rising edge of clock CLK.',
  },
  seven_seg: {
    realName: '0.56" Common-Cathode 7-Segment LED',
    package: '10-Pin DIP LED Display Module',
    category: 'Displays & Opto',
    theory: 'Arrangement of 7 rectangular LED bars (a through g) plus decimal point (dp) sharing a common ground cathode.',
  },
  arduino: {
    realName: 'Arduino Uno R3 (ATmega328P)',
    package: '28-Pin DIP Microcontroller Development Board',
    category: 'Microcontrollers',
    theory: '16 MHz AVR RISC microcontroller providing 5V DC power rails, ground, digital I/O pins, and analog ADC inputs.',
  },
  ir_sensor: {
    realName: 'Infrared Proximity Sensor Module',
    package: '3-Pin Right-Angle Header Module',
    category: 'Sensors & Transducers',
    theory: 'Emits 950nm IR light and monitors reflected light using an LM393 comparator. Digital OUT goes LOW upon object detection.',
  },
  ground: {
    realName: 'Circuit Earth Reference (0 V)',
    package: 'Single Tie Point Reference Terminal',
    category: 'Sources & Power',
    theory: 'Zero-potential reference node (0V). All nodal voltages across the breadboard are measured relative to this reference.',
  },
};

// ─── Truth Tables for Logic Gates ─────────────────────────────────────────────

function getTruthTable(kind: string): { headers: string[]; rows: number[][] } | null {
  switch (kind) {
    case 'and_gate':
      return { headers: ['A', 'B', 'Y'], rows: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]] };
    case 'or_gate':
      return { headers: ['A', 'B', 'Y'], rows: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]] };
    case 'not_gate':
      return { headers: ['A', 'Y'], rows: [[0, 1], [1, 0]] };
    case 'nand_gate':
      return { headers: ['A', 'B', 'Y'], rows: [[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]] };
    case 'nor_gate':
      return { headers: ['A', 'B', 'Y'], rows: [[0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]] };
    case 'xor_gate':
      return { headers: ['A', 'B', 'Y'], rows: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]] };
    default:
      return null;
  }
}

// ─── Resistor Color Code Band Colors ──────────────────────────────────────────

const BAND_COLORS: Record<number, { name: string; hex: string }> = {
  0: { name: 'Black (0)', hex: '#0f172a' },
  1: { name: 'Brown (1)', hex: '#78350f' },
  2: { name: 'Red (2)', hex: '#dc2626' },
  3: { name: 'Orange (3)', hex: '#ea580c' },
  4: { name: 'Yellow (4)', hex: '#eab308' },
  5: { name: 'Green (5)', hex: '#16a34a' },
  6: { name: 'Blue (6)', hex: '#2563eb' },
  7: { name: 'Violet (7)', hex: '#9333ea' },
  8: { name: 'Grey (8)', hex: '#64748b' },
  9: { name: 'White (9)', hex: '#ffffff' },
};

function getResistorBands(ohms: number) {
  if (ohms <= 0) ohms = 1;
  const s = ohms.toExponential();
  const match = s.match(/^(\d)(?:\.(\d))?e([+-]?\d+)$/);
  if (!match) return null;
  const d1 = parseInt(match[1], 10);
  const d2 = match[2] ? parseInt(match[2], 10) : 0;
  const exp = parseInt(match[3], 10) - (match[2] ? 1 : 0);

  return [
    BAND_COLORS[Math.min(9, Math.max(0, d1))],
    BAND_COLORS[Math.min(9, Math.max(0, d2))],
    { name: `×10^${exp}`, hex: BAND_COLORS[Math.min(9, Math.max(0, exp))]?.hex ?? '#64748b' },
    { name: 'Gold (±5%)', hex: '#d97706' },
  ];
}

// ─── Node Voltages Section ────────────────────────────────────────────────────

const NodeVoltagesSection: React.FC<{ simResult: SimulationResult | null }> = ({ simResult }) => {
  const [open, setOpen] = useState(false);
  if (!simResult?.nodeVoltages?.length) return null;

  return (
    <div className="ecs-right-section">
      <button className="ecs-section-header" onClick={() => setOpen((p) => !p)}>
        <Cpu size={14} />
        <span>Nodal Potentials ({simResult.nodeVoltages.length})</span>
        <ChevronDown
          size={14}
          style={{
            marginLeft: 'auto',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>
      {open && (
        <div className="ecs-section-body">
          <table className="ecs-pinout-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Measured Potential</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="ecs-pin-pill neg">GND (Ref)</span></td>
                <td><span className="ecs-pin-volt">0.0000 V</span></td>
              </tr>
              {simResult.nodeVoltages.slice(0, 12).map((n, i) => (
                <tr key={i}>
                  <td><span className="ecs-pin-pill">Node {n.nodeId ?? i + 1}</span></td>
                  <td><span className="ecs-pin-volt">{formatValue(n.voltage, 'V')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Properties & Component Dossier Panel ────────────────────────────────

interface PropertiesPanelProps {
  onClose?: () => void;
}

export default function PropertiesPanel({ onClose }: PropertiesPanelProps) {
  const {
    components,
    wires,
    selectedIds,
    updateProps,
    updateWireColor,
    rotateSelected,
    flipSelected,
    deleteSelected,
    setSelected,
    simResult,
    isSimulating,
  } = useSimulatorStore();

  const selectedComp =
    selectedIds.length === 1 ? components.find((c) => c.id === selectedIds[0]) ?? null : null;
  const selectedWire =
    selectedIds.length === 1 ? wires.find((w) => w.id === selectedIds[0]) ?? null : null;

  const compResult = selectedComp
    ? simResult?.componentResults.find((r) => r.componentId === selectedComp.id)
    : null;

  const compDef = selectedComp ? COMPONENT_DEFS.find((d) => d.kind === selectedComp.kind) : null;
  const dbInfo = selectedComp ? COMPONENT_DATABASE[selectedComp.kind] : null;

  // Calculate live electrical stats
  const liveVoltage = compResult?.voltage ?? 0;
  const liveCurrent = compResult?.current ?? 0;
  const livePower = Math.abs(compResult?.power ?? 0);
  const isConduction = Boolean(compResult?.on || Math.abs(liveCurrent) > 0.0001);

  // Status banner styling and text
  let statusBadge = { label: 'STANDBY (0V)', class: 'idle' };
  if (!isSimulating) {
    statusBadge = { label: 'SIMULATION PAUSED', class: 'idle' };
  } else if (selectedComp?.kind === 'led') {
    statusBadge = isConduction
      ? { label: '● ILLUMINATED (FORWARD BIASED)', class: 'active' }
      : { label: '○ OFF (BELOW 2V THRESHOLD)', class: 'idle' };
  } else if (selectedComp?.kind === 'diode') {
    statusBadge = isConduction
      ? { label: '● FORWARD CONDUCTION (~0.7V)', class: 'active' }
      : { label: '○ REVERSE BIASED (CUTOFF)', class: 'idle' };
  } else if (selectedComp?.kind === 'pushbutton') {
    statusBadge = selectedComp.props.closed
      ? { label: '● CLOSED (CONDUCTING)', class: 'active' }
      : { label: '○ OPEN (ISOLATED)', class: 'idle' };
  } else if (selectedComp?.kind?.includes('gate')) {
    statusBadge = compResult?.on
      ? { label: '🟢 OUTPUT HIGH (+5.0 V)', class: 'active' }
      : { label: '⚫ OUTPUT LOW (0.0 V)', class: 'idle' };
  } else if (selectedComp?.kind === 'battery') {
    statusBadge = { label: `● DELIVERING ${selectedComp.props.voltage ?? 9}V DC`, class: 'active' };
  } else if (isConduction) {
    statusBadge = { label: '● ACTIVE IN CLOSED LOOP', class: 'active' };
  }

  // Warning check (e.g. LED overcurrent)
  const isLedOvercurrent =
    selectedComp?.kind === 'led' && isSimulating && Math.abs(liveCurrent) > 0.025;

  return (
    <div className="ecs-panel ecs-right-panel" aria-label="Component Inspector and Details Dossier">
      {/* Mobile Drawer Close */}
      {onClose && (
        <div className="ecs-panel-header ecs-mobile-only-header">
          <h2>Component Inspector</h2>
          <button type="button" className="ecs-panel-close-btn" onClick={onClose} aria-label="Close Inspector">
            <X size={16} />
          </button>
        </div>
      )}

      {selectedComp && compDef ? (
        <div className="ecs-dossier">
          {/* 1. HERO IDENTITY CARD */}
          <div className="ecs-dossier-hero">
            <div className="ecs-dossier-header-row">
              <div className="ecs-dossier-icon">
                <ComponentIcon
                  kind={selectedComp.kind}
                  size={32}
                  props={selectedComp.props}
                  simResult={compResult ?? undefined}
                />
              </div>
              <div className="ecs-dossier-meta">
                <div className="ecs-dossier-badges">
                  <span className="ecs-badge-id">{String(selectedComp.props.label || selectedComp.id)}</span>
                  <span className="ecs-badge-category">{dbInfo?.category || compDef.category}</span>
                </div>
                <h3 className="ecs-dossier-title">{dbInfo?.realName || compDef.label}</h3>
                <div className="ecs-dossier-footprint">
                  <Layers size={12} />
                  <span>{dbInfo?.package || 'Breadboard Through-Hole Component'}</span>
                </div>
              </div>
            </div>

            {/* Theory & Working Principle Note */}
            {dbInfo?.theory && (
              <div className="ecs-dossier-theory">
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, marginBottom: 2 }}>
                  <Info size={12} />
                  <span>Working Principle</span>
                </div>
                {dbInfo.theory}
                {dbInfo.formula && (
                  <div style={{ marginTop: 4, fontFamily: 'monospace', color: 'var(--ecs-accent)', fontWeight: 600 }}>
                    {dbInfo.formula}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. LIVE TELEMETRY & STATUS BANNER */}
          <div className={`ecs-telemetry-banner ${statusBadge.class}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Activity size={13} />
              <span>{statusBadge.label}</span>
            </div>
            <span>{isSimulating ? 'SIM ACTIVE' : 'STOPPED'}</span>
          </div>

          {/* Overcurrent Warning Alert */}
          {isLedOvercurrent && (
            <div
              style={{
                margin: '8px 14px 0',
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Warning:</strong> Current ({formatValue(liveCurrent, 'A')}) exceeds rated 20mA! Add or increase series resistor.
              </span>
            </div>
          )}

          {/* 3. 4-QUADRANT TELEMETRY METRICS */}
          <div className="ecs-telemetry-grid">
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Voltage Drop (ΔV)</span>
              <span className="ecs-tmetric-val">{isSimulating ? formatValue(liveVoltage, 'V') : '0.00 V'}</span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Branch Current (I)</span>
              <span className="ecs-tmetric-val">{isSimulating ? formatValue(liveCurrent, 'A') : '0.00 A'}</span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Power Dissipation</span>
              <span className="ecs-tmetric-val">{isSimulating ? formatValue(livePower, 'W') : '0.00 W'}</span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">
                {selectedComp.kind === 'ammeter' || selectedComp.kind === 'multimeter'
                  ? 'Meter Reading'
                  : selectedComp.kind === 'seven_seg'
                  ? 'Decoded Digit'
                  : 'Operating State'}
              </span>
              <span className="ecs-tmetric-val highlight">
                {compResult?.reading !== undefined
                  ? selectedComp.kind === 'ammeter'
                    ? formatValue(compResult.reading, 'A')
                    : selectedComp.kind === 'seven_seg'
                    ? `[ ${Math.round(compResult.reading)} ]`
                    : formatValue(compResult.reading, 'V')
                  : isConduction
                  ? 'ACTIVE'
                  : 'IDLE'}
              </span>
            </div>
          </div>

          {/* 4. INTERACTIVE SPECIFICATIONS & PRESET CHIPS */}
          <div className="ecs-right-section">
            <div className="ecs-section-header static">
              <Sliders size={13} />
              <span>Specifications &amp; Tuning</span>
            </div>
            <div className="ecs-section-body">
              {/* Quick Preset Buttons */}
              {dbInfo?.presetChips && dbInfo.presetChips.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ecs-text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Standard Values
                  </div>
                  <div className="ecs-preset-chips">
                    {dbInfo.presetChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="ecs-preset-chip"
                        onClick={() => updateProps(selectedComp.id, chip.props)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LDR Light Slider */}
              {selectedComp.kind === 'ldr' && (
                <div className="ecs-prop-row">
                  <label className="ecs-prop-label">Ambient Light</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Number(selectedComp.props.light ?? 50)}
                    style={{ flex: 1 }}
                    onChange={(e) => updateProps(selectedComp.id, { light: Number(e.target.value) }, false)}
                  />
                  <span className="ecs-prop-unit">{selectedComp.props.light ?? 50}%</span>
                </div>
              )}

              {/* Potentiometer Wiper Slider */}
              {selectedComp.kind === 'potentiometer' && (
                <div className="ecs-prop-row">
                  <label className="ecs-prop-label">Wiper Dial</label>
                  <input
                    type="range"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={Number(selectedComp.props.wiper ?? 0.5)}
                    style={{ flex: 1 }}
                    onChange={(e) => updateProps(selectedComp.id, { wiper: Number(e.target.value) }, false)}
                  />
                  <span className="ecs-prop-unit">{Math.round(Number(selectedComp.props.wiper ?? 0.5) * 100)}%</span>
                </div>
              )}

              {/* Label Designator Edit */}
              <div className="ecs-prop-row">
                <label className="ecs-prop-label">Designator</label>
                <input
                  className="ecs-prop-input"
                  value={String(selectedComp.props.label ?? selectedComp.id)}
                  onChange={(e) => updateProps(selectedComp.id, { label: e.target.value })}
                />
              </div>

              {/* Numerical Properties */}
              {Object.entries(selectedComp.props)
                .filter(([k]) => !['label', 'closed', 'light', 'wiper', 'detected'].includes(k))
                .map(([key, val]) => (
                  <div key={key} className="ecs-prop-row">
                    <label className="ecs-prop-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    <div className="ecs-prop-input-wrap">
                      <input
                        className="ecs-prop-input"
                        type={typeof val === 'number' ? 'number' : 'text'}
                        value={String(val)}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          updateProps(selectedComp.id, { [key]: isNaN(n) ? e.target.value : n });
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 5. RESISTOR 4-BAND COLOR CODE VISUALIZER */}
          {selectedComp.kind === 'resistor' && (
            <div className="ecs-right-section">
              <div className="ecs-section-header static">
                <Gauge size={13} />
                <span>4-Band EIA Color Code</span>
              </div>
              <div className="ecs-section-body">
                {(() => {
                  const bands = getResistorBands(Number(selectedComp.props.resistance ?? 1000));
                  if (!bands) return null;
                  return (
                    <div className="ecs-resistor-bands-wrap">
                      {bands.map((b, i) => (
                        <div key={i} className="ecs-band-indicator">
                          <div className="ecs-band-swatch" style={{ backgroundColor: b.hex }} />
                          <span className="ecs-band-name">{b.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. LOGIC GATE TRUTH TABLE */}
          {selectedComp.kind.includes('gate') && (
            <div className="ecs-right-section">
              <div className="ecs-section-header static">
                <Cpu size={13} />
                <span>Combinational Truth Table</span>
              </div>
              <div className="ecs-section-body">
                {(() => {
                  const tt = getTruthTable(selectedComp.kind);
                  if (!tt) return null;
                  const in1V = simResult?.pinVoltages[`${selectedComp.id}.in1`] ?? 0;
                  const in2V = simResult?.pinVoltages[`${selectedComp.id}.in2`] ?? 0;
                  const bitA = in1V > 2.0 ? 1 : 0;
                  const bitB = in2V > 2.0 ? 1 : 0;

                  return (
                    <table className="ecs-truth-table">
                      <thead>
                        <tr>
                          {tt.headers.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tt.rows.map((row, idx) => {
                          const isMatch =
                            row.length === 3 ? row[0] === bitA && row[1] === bitB : row[0] === bitA;
                          return (
                            <tr key={idx} className={isMatch && isSimulating ? 'active-row' : ''}>
                              {row.map((cell, cidx) => (
                                <td key={cidx}>{cell}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 7. COMPLETE PINOUT & BREADBOARD CONNECTION TABLE */}
          <div className="ecs-right-section">
            <div className="ecs-section-header static">
              <Layers size={13} />
              <span>Pinout &amp; Breadboard Mappings</span>
            </div>
            <div className="ecs-section-body">
              <table className="ecs-pinout-table">
                <thead>
                  <tr>
                    <th>Pin</th>
                    <th>Breadboard Hole</th>
                    <th>Node Potential</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedComp.leads).map(([pinId, hole]) => {
                    const pinVolt = simResult?.pinVoltages[`${selectedComp.id}.${pinId}`];
                    const isPos = pinId === '+' || pinId === 'vcc' || pinId === '5v';
                    const isNeg = pinId === '-' || pinId === 'gnd';
                    const isOut = pinId === 'out' || pinId === 'y' || pinId === 'q';

                    return (
                      <tr key={pinId}>
                        <td>
                          <span
                            className={`ecs-pin-pill${isPos ? ' pos' : isNeg ? ' neg' : isOut ? ' out' : ''}`}
                          >
                            {isPos ? '+ (VCC)' : isNeg ? '− (GND)' : pinId.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ecs-text-2)' }}>{describeHole(hole)}</td>
                        <td>
                          <span className="ecs-pin-volt">
                            {pinVolt !== undefined ? formatValue(pinVolt, 'V') : '0.00 V'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Oscilloscope Waveform View if applicable */}
          {selectedComp.kind === 'oscilloscope' && (
            <div className="ecs-right-section">
              <div className="ecs-section-header static">
                <span>Signal Waveform (Time Domain)</span>
              </div>
              <div className="ecs-section-body">
                <OscilloscopeView compId={selectedComp.id} />
              </div>
            </div>
          )}

          {/* 8. COMPONENT MANIPULATION ACTIONS BAR */}
          <div className="ecs-action-bar">
            <button
              type="button"
              className="ecs-action-btn"
              onClick={rotateSelected}
              title="Rotate Component 90° Clockwise"
            >
              <RotateCw size={13} />
              <span>Rotate 90°</span>
            </button>
            <button
              type="button"
              className="ecs-action-btn"
              onClick={flipSelected}
              title="Flip Horizontally"
            >
              <FlipHorizontal2 size={13} />
              <span>Flip</span>
            </button>
            <button
              type="button"
              className="ecs-action-btn danger"
              onClick={deleteSelected}
              title="Delete Component from Breadboard"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : selectedWire ? (
        /* ─── WIRE DETAILS DOSSIER ─────────────────────────────────────────── */
        <div className="ecs-dossier">
          <div className="ecs-dossier-hero">
            <div className="ecs-dossier-header-row">
              <div
                className="ecs-dossier-icon"
                style={{ backgroundColor: selectedWire.color || '#2563eb' }}
              >
                <span style={{ fontSize: 18 }}>〰️</span>
              </div>
              <div className="ecs-dossier-meta">
                <div className="ecs-dossier-badges">
                  <span className="ecs-badge-id">Wire</span>
                  <span className="ecs-badge-category">Solid Core Jumper</span>
                </div>
                <h3 className="ecs-dossier-title">Breadboard Jumper Wire</h3>
                <div className="ecs-dossier-footprint">
                  <span>22 AWG Tinned Copper</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ecs-telemetry-grid">
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Branch Current (I)</span>
              <span className="ecs-tmetric-val highlight">
                {(() => {
                  const cur = simResult?.wireCurrents.find((c) => c.wireId === selectedWire.id)?.current;
                  return cur !== undefined && isSimulating ? formatValue(Math.abs(cur), 'A') : '0.00 A';
                })()}
              </span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Resistance</span>
              <span className="ecs-tmetric-val">&lt; 0.01 Ω</span>
            </div>
          </div>

          <div className="ecs-right-section">
            <div className="ecs-section-header static">
              <Sliders size={13} />
              <span>Color &amp; Routing</span>
            </div>
            <div className="ecs-section-body">
              <div style={{ fontSize: 10, color: 'var(--ecs-text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                Select Wire Color
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { hex: '#ef4444', label: 'Red (+)' },
                  { hex: '#1e293b', label: 'Black (GND)' },
                  { hex: '#2563eb', label: 'Blue' },
                  { hex: '#16a34a', label: 'Green' },
                  { hex: '#eab308', label: 'Yellow' },
                  { hex: '#f97316', label: 'Orange' },
                  { hex: '#a855f7', label: 'Purple' },
                  { hex: '#f8fafc', label: 'White' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`ecs-wire-color-swatch${(selectedWire.color || '#2563eb') === c.hex ? ' active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    onClick={() => updateWireColor(selectedWire.id, c.hex)}
                  />
                ))}
              </div>

              <div className="ecs-prop-row">
                <label className="ecs-prop-label">Origin Hole</label>
                <span className="ecs-term-val">{describeHole(selectedWire.from)}</span>
              </div>
              <div className="ecs-prop-row">
                <label className="ecs-prop-label">Destination</label>
                <span className="ecs-term-val">{describeHole(selectedWire.to)}</span>
              </div>
            </div>
          </div>

          <div className="ecs-action-bar">
            <button
              type="button"
              className="ecs-action-btn danger"
              onClick={deleteSelected}
              title="Delete Wire"
            >
              <Trash2 size={13} />
              <span>Delete Wire</span>
            </button>
            <button
              type="button"
              className="ecs-action-btn"
              onClick={() => setSelected([])}
              title="Deselect"
            >
              <X size={13} />
              <span>Deselect</span>
            </button>
          </div>
        </div>
      ) : (
        /* ─── EMPTY STATE: BREADBOARD CIRCUIT OVERVIEW ─────────────────────── */
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 10,
              background: 'var(--ecs-surface-2)',
              border: '1px solid var(--ecs-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>⚡</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--ecs-text)' }}>
              Circuit Inspector
            </h3>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ecs-text-3)', lineHeight: 1.45 }}>
              Click any component or wire on the breadboard to inspect its full electrical telemetry, pinout, live measurements, and theory.
            </p>
          </div>

          <div className="ecs-telemetry-grid" style={{ borderRadius: 8, border: '1px solid var(--ecs-border)' }}>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Placed Components</span>
              <span className="ecs-tmetric-val">{components.length}</span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Jumper Wires</span>
              <span className="ecs-tmetric-val">{wires.length}</span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Power State</span>
              <span className="ecs-tmetric-val highlight">
                {isSimulating ? '● RUNNING' : '○ STOPPED'}
              </span>
            </div>
            <div className="ecs-tmetric-card">
              <span className="ecs-tmetric-lbl">Total Solved Nodes</span>
              <span className="ecs-tmetric-val">{simResult?.nodeVoltages?.length ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Node Voltages Section at the bottom */}
      <NodeVoltagesSection simResult={simResult} />
    </div>
  );
}
