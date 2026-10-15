import React from 'react';
import type { ComponentKind } from '../../types';

const STROKE = 2;
const SIZE = 60; // viewBox size

interface IconProps { size?: number; color?: string; glowing?: boolean }

// ─── Individual SVG component drawings ───────────────────────────────────────

export const ResistorIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="5" y1="30" x2="12" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <rect x="12" y="22" width="36" height="16" rx="3" stroke={color} strokeWidth={STROKE} fill="none" />
    <line x1="48" y1="30" x2="55" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const CapacitorIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="5" y1="30" x2="26" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="26" y1="18" x2="26" y2="42" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="34" y1="18" x2="34" y2="42" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="34" y1="30" x2="55" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const InductorIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="5" y1="30" x2="12" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <path d="M12 30 Q15 20 19 30 Q22 20 26 30 Q29 20 33 30 Q36 20 40 30 Q43 20 48 30"
          stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
    <line x1="48" y1="30" x2="55" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const BatteryIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    {/* (+) Node */}
    <circle cx="30" cy="6" r="3.5" fill="#ef4444" />
    <line x1="30" y1="9" x2="30" y2="18" stroke="#ef4444" strokeWidth={STROKE} strokeLinecap="round" />
    <text x="40" y="14" fontSize="9" fill="#ef4444" fontWeight="bold">+</text>

    {/* Battery Plates */}
    <line x1="18" y1="18" x2="42" y2="18" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="24" y1="26" x2="36" y2="26" stroke={color} strokeWidth={STROKE - 0.5} strokeLinecap="round" />
    <line x1="18" y1="34" x2="42" y2="34" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="24" y1="42" x2="36" y2="42" stroke={color} strokeWidth={STROKE - 0.5} strokeLinecap="round" />

    {/* (−) Node */}
    <line x1="30" y1="42" x2="30" y2="51" stroke="#3b82f6" strokeWidth={STROKE} strokeLinecap="round" />
    <circle cx="30" cy="54" r="3.5" fill="#3b82f6" />
    <text x="40" y="52" fontSize="10" fill="#3b82f6" fontWeight="bold">−</text>
  </svg>
);

export const AcSourceIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="30" y1="5" x2="30" y2="18" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <circle cx="30" cy="30" r="12" stroke={color} strokeWidth={STROKE} />
    <path d="M22 30 Q25 22 30 30 Q35 38 38 30" stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
    <line x1="30" y1="42" x2="30" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const LedIcon: React.FC<IconProps & { ledColor?: string; glowing?: boolean }> = ({
  size = SIZE, color = 'currentColor', ledColor = '#ff4444', glowing = false,
}) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    {glowing && <circle cx="32" cy="30" r="18" fill={ledColor} opacity="0.15" />}
    <line x1="5" y1="30" x2="18" y2="30" stroke="#ef4444" strokeWidth={STROKE} strokeLinecap="round" />
    <polygon points="18,20 18,40 38,30" stroke={color} strokeWidth={STROKE} fill={glowing ? ledColor : 'none'} strokeLinejoin="round" />
    <line x1="38" y1="20" x2="38" y2="40" stroke="#3b82f6" strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="38" y1="30" x2="55" y2="30" stroke="#3b82f6" strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="40" y1="16" x2="46" y2="10" stroke={ledColor} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="44" y1="20" x2="52" y2="14" stroke={ledColor} strokeWidth={STROKE} strokeLinecap="round" />
    <text x="6" y="24" fontSize="8" fill="#ef4444" fontWeight="bold">+</text>
    <text x="50" y="24" fontSize="9" fill="#3b82f6" fontWeight="bold">−</text>
  </svg>
);

export const DiodeIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="5" y1="30" x2="18" y2="30" stroke="#ef4444" strokeWidth={STROKE} strokeLinecap="round" />
    <polygon points="18,20 18,40 38,30" stroke={color} strokeWidth={STROKE} fill="none" strokeLinejoin="round" />
    <line x1="38" y1="20" x2="38" y2="40" stroke="#3b82f6" strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="38" y1="30" x2="55" y2="30" stroke="#3b82f6" strokeWidth={STROKE} strokeLinecap="round" />
    <text x="6" y="24" fontSize="8" fill="#ef4444" fontWeight="bold">+</text>
    <text x="50" y="24" fontSize="9" fill="#3b82f6" fontWeight="bold">−</text>
  </svg>
);

export const SwitchIcon: React.FC<IconProps & { closed?: boolean }> = ({
  size = SIZE, color = 'currentColor', closed = false,
}) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="5" y1="30" x2="18" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <circle cx="20" cy="30" r="2.5" fill={color} />
    <circle cx="40" cy="30" r="2.5" fill={color} />
    <line x1="20" y1="30" x2="40" y2={closed ? "30" : "20"} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="40" y1="30" x2="55" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const GroundIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="30" y1="5" x2="30" y2="28" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="14" y1="28" x2="46" y2="28" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="20" y1="36" x2="40" y2="36" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="26" y1="44" x2="34" y2="44" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const AmmeterIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="10" y="8" width="40" height="44" rx="5" stroke={color} strokeWidth={STROKE} fill="none" />
    <rect x="16" y="14" width="28" height="16" rx="2" stroke={color} strokeWidth={1.5} fill="none" />
    <text x="25" y="27" fontSize="11" fontWeight="bold" fill={color} fontFamily="monospace">A</text>
    <circle cx="22" cy="42" r="3" stroke={color} strokeWidth={1.5} fill="none" />
    <circle cx="38" cy="42" r="3" stroke={color} strokeWidth={1.5} fill="none" />
    <line x1="22" y1="45" x2="22" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="38" y1="45" x2="38" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const MultimeterIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="10" y="8" width="40" height="44" rx="5" stroke={color} strokeWidth={STROKE} fill="none" />
    <rect x="16" y="14" width="28" height="16" rx="2" stroke={color} strokeWidth={1.5} fill="none" />
    <text x="24" y="27" fontSize="10" fill={color} fontFamily="monospace">V</text>
    <circle cx="22" cy="42" r="3" stroke={color} strokeWidth={1.5} fill="none" />
    <circle cx="38" cy="42" r="3" stroke={color} strokeWidth={1.5} fill="none" />
    <line x1="22" y1="45" x2="22" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="38" y1="45" x2="38" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const OscilloscopeIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="6" y="10" width="48" height="36" rx="4" stroke={color} strokeWidth={STROKE} fill="none" />
    <path d="M12 28 L19 28 L22 20 L27 36 L32 20 L37 36 L40 28 L48 28"
          stroke="#4ade80" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="22" y1="48" x2="22" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="38" y1="48" x2="38" y2="55" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const NmosIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <line x1="5" y1="30" x2="22" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="22" y1="20" x2="22" y2="40" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" />
    <line x1="26" y1="22" x2="26" y2="38" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="26" y1="22" x2="40" y2="22" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="26" y1="38" x2="40" y2="38" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="40" y1="22" x2="40" y2="10" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="40" y1="38" x2="40" y2="50" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="40" y1="10" x2="55" y2="10" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="40" y1="50" x2="55" y2="50" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <polygon points="40,38 46,38 43,44" fill={color} />
  </svg>
);

export const LogicGateIcon: React.FC<IconProps & { label: string }> = ({ size = SIZE, color = 'currentColor', label }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="8" y="14" width="44" height="32" rx="4" stroke={color} strokeWidth={STROKE} fill="none" />
    <text x="30" y="34" fontSize="11" fontWeight="bold" textAnchor="middle" fill={color} fontFamily="monospace">{label}</text>
    <line x1="2" y1="22" x2="8" y2="22" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="2" y1="38" x2="8" y2="38" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    <line x1="52" y1="30" x2="58" y2="30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const SevenSegIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="14" y="8" width="32" height="44" rx="4" stroke={color} strokeWidth={STROKE} fill="none" />
    <text x="30" y="38" fontSize="26" fontWeight="bold" textAnchor="middle" fill="#ef4444" fontFamily="monospace">8</text>
  </svg>
);

export const ArduinoIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="8" y="10" width="44" height="40" rx="3" fill="#008184" stroke={color} strokeWidth={1.5} />
    <rect x="12" y="14" width="10" height="8" fill="#e2e8f0" rx="1" />
    <circle cx="36" cy="30" r="8" stroke="#ffffff" strokeWidth={1.5} fill="none" />
    <text x="33" y="34" fontSize="10" fontWeight="bold" fill="#ffffff" fontFamily="sans-serif">∞</text>
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="30" r="20" stroke={color} strokeWidth={STROKE} fill="none" />
    <polyline points="30,18 30,30 38,30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const SensorIcon: React.FC<IconProps> = ({ size = SIZE, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <rect x="10" y="14" width="40" height="32" rx="4" stroke={color} strokeWidth={STROKE} fill="none" />
    <circle cx="24" cy="30" r="5" fill="#3b82f6" />
    <circle cx="36" cy="30" r="5" fill="#1e293b" />
  </svg>
);

// ─── Generic icon dispatcher ─────────────────────────────────────────────────

interface ComponentIconProps {
  kind: ComponentKind;
  size?: number;
  color?: string;
  props?: Record<string, number | string | boolean>;
  simResult?: { voltage?: number; current?: number };
}

export const ComponentIcon: React.FC<ComponentIconProps> = ({ kind, size, color, props, simResult }) => {
  const glowing = (simResult?.current ?? 0) > 0.001;
  const ledColor = props?.color === 'green' ? '#4ade80' : props?.color === 'blue' ? '#60a5fa' : props?.color === 'yellow' ? '#facc15' : '#f87171';

  switch (kind) {
    case 'resistor': return <ResistorIcon size={size} color={color} />;
    case 'capacitor': return <CapacitorIcon size={size} color={color} />;
    case 'inductor': return <InductorIcon size={size} color={color} />;
    case 'battery': return <BatteryIcon size={size} color={color} />;
    case 'led': return <LedIcon size={size} color={color} ledColor={ledColor} glowing={glowing} />;
    case 'diode': return <DiodeIcon size={size} color={color} />;
    case 'pushbutton': return <SwitchIcon size={size} color={color} closed={Boolean(props?.closed)} />;
    case 'ground': return <GroundIcon size={size} color={color} />;
    case 'ammeter': return <AmmeterIcon size={size} color={color} />;
    case 'multimeter': return <MultimeterIcon size={size} color={color} />;
    case 'oscilloscope': return <OscilloscopeIcon size={size} color={color} />;
    case 'ldr': return <ResistorIcon size={size} color={color} />;
    case 'and_gate': return <LogicGateIcon size={size} color={color} label="AND" />;
    case 'or_gate': return <LogicGateIcon size={size} color={color} label="OR" />;
    case 'not_gate': return <LogicGateIcon size={size} color={color} label="NOT" />;
    case 'nand_gate': return <LogicGateIcon size={size} color={color} label="NAND" />;
    case 'nor_gate': return <LogicGateIcon size={size} color={color} label="NOR" />;
    case 'xor_gate': return <LogicGateIcon size={size} color={color} label="XOR" />;
    case 'mux': return <LogicGateIcon size={size} color={color} label="MUX" />;
    case 'decoder': return <LogicGateIcon size={size} color={color} label="DEC" />;
    case 'flip_flop': return <LogicGateIcon size={size} color={color} label="D-FF" />;
    case 'seven_seg': return <SevenSegIcon size={size} color={color} />;
    case 'clock': return <ClockIcon size={size} color={color} />;
    case 'ir_sensor': return <SensorIcon size={size} color={color} />;
    case 'arduino': return <ArduinoIcon size={size} color={color} />;
    case 'buzzer':
    case 'potentiometer':
    default: return (
      <svg width={size ?? SIZE} height={size ?? SIZE} viewBox="0 0 60 60">
        <rect x="15" y="15" width="30" height="30" rx="4" stroke={color ?? 'currentColor'} strokeWidth={2} fill="none" />
        <text x="20" y="35" fontSize="12" fill={color ?? 'currentColor'}>{String(kind).slice(0, 3).toUpperCase()}</text>
      </svg>
    );
  }
};
