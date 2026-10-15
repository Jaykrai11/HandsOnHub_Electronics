/** Electronics breadboard simulator — shared domain types. */

export type ComponentKind =
  | 'resistor'
  | 'capacitor'
  | 'inductor'
  | 'battery'
  | 'led'
  | 'diode'
  | 'pushbutton'
  | 'potentiometer'
  | 'ldr'
  | 'buzzer'
  | 'ammeter'
  | 'multimeter'
  | 'oscilloscope'
  | 'ground'
  | 'and_gate'
  | 'or_gate'
  | 'not_gate'
  | 'nand_gate'
  | 'nor_gate'
  | 'xor_gate'
  | 'mux'
  | 'decoder'
  | 'flip_flop'
  | 'seven_seg'
  | 'clock'
  | 'ir_sensor'
  | 'arduino';

export type ComponentCategory =
  | 'Sources'
  | 'Passive'
  | 'Semiconductors'
  | 'Switches'
  | 'Instruments'
  | 'Logic Gates'
  | 'Digital & ICs'
  | 'Microcontrollers & Sensors';

export type RailId = 'top+' | 'top-' | 'bot+' | 'bot-';

export type TerminalStrip = 'upper' | 'lower';

export type UpperRow = 'a' | 'b' | 'c' | 'd' | 'e';
export type LowerRow = 'f' | 'g' | 'h' | 'i' | 'j';
export type TerminalRow = UpperRow | LowerRow;

export type HoleId =
  | { kind: 'rail'; rail: RailId; col: number }
  | { kind: 'terminal'; strip: TerminalStrip; col: number; row: TerminalRow };

export interface PinDef {
  id: string;
  label: string;
  /** Offset from the first pin in unified board-row / column space. */
  dCol: number;
  dRow: number;
}

export interface ComponentDef {
  kind: ComponentKind;
  label: string;
  category: ComponentCategory;
  description: string;
  tooltip: string;
  defaultProps: Record<string, number | string | boolean>;
  pins: PinDef[];
}

export interface PlacedComponent {
  id: string;
  kind: ComponentKind;
  rotation: number;
  flipH: boolean;
  leads: Record<string, HoleId>;
  props: Record<string, number | string | boolean>;
}

export interface Wire {
  id: string;
  from: HoleId;
  to: HoleId;
  color?: string;
}

export interface Circuit {
  components: PlacedComponent[];
  wires: Wire[];
}

export type ToolMode = 'select' | 'wire' | 'erase' | 'place';

export type Theme = 'light' | 'dark';

export interface NodeVoltage {
  nodeId: string;
  voltage: number;
}

export interface ComponentResult {
  componentId: string;
  voltage: number;
  current: number;
  power: number;
  /** Extra instrument / LED fields */
  on?: boolean;
  brightness?: number;
  reading?: number;
}

export interface WireCurrent {
  wireId: string;
  /** Signed current from `from` toward `to` (amperes). */
  current: number;
}

export interface SimulationResult {
  ok: boolean;
  error?: string;
  warnings: string[];
  nodeVoltages: NodeVoltage[];
  pinVoltages: Record<string, number>;
  componentResults: ComponentResult[];
  wireCurrents: WireCurrent[];
}

export interface TransientState {
  time: number;
  capVoltage: Record<string, number>;
  indCurrent: Record<string, number>;
  scopeTraces: Record<string, { t: number; v: number }[]>;
}

export interface TransientOptions {
  dt: number;
  capVoltage: Record<string, number>;
  indCurrent: Record<string, number>;
}

export type LogCategory = 'step' | 'reading' | 'sim' | 'warning';

export interface LogEntry {
  id: string;
  type: LogCategory;
  title: string;
  details: string;
  timestamp: string;
  rawTime: number;
  readings?: {
    componentId: string;
    label: string;
    voltage: number;
    current: number;
    power: number;
    state?: string;
  }[];
}

export interface ReadingSnapshot {
  id: string;
  timestamp: string;
  note?: string;
  timeSec: number;
  components: {
    id: string;
    label: string;
    kind: string;
    voltage: number;
    current: number;
    power: number;
    reading?: number;
    state?: string;
  }[];
  totalCurrent: number;
  totalPower: number;
  nodeVoltages: { node: number; voltage: number }[];
}
