import { Circle, Group, Line, Rect, Text, Arc } from 'react-konva';
import { holeToPixel } from '../../lib/breadboard';
import { getComponentDef } from '../../data/componentDefs';
import type { PlacedComponent } from '../../types';

interface ComponentPin {
  id: string;
  label: string;
  x: number;
  y: number;
  badgeColor: string;
  textColor: string;
}

/** Extract all pins with their breadboard pixel positions and clear color-coded badges */
function getVisiblePins(comp: PlacedComponent): ComponentPin[] {
  const def = getComponentDef(comp.kind);
  const pins: ComponentPin[] = [];

  for (const [pinId, hole] of Object.entries(comp.leads)) {
    const pt = holeToPixel(hole);
    const pinDef = def?.pins.find((p) => p.id === pinId);
    let label = pinDef?.label ?? pinId;
    if (label.toLowerCase() === 'anode') label = 'A';
    if (label.toLowerCase() === 'cathode') label = 'K';

    // Color theme for pin badge
    let badgeColor = '#334155'; // default slate
    let textColor = '#ffffff';

    const l = label.toLowerCase();
    if (l === '+' || l === 'vcc' || l === '5v' || l === 'pos') {
      badgeColor = '#dc2626'; // Red for Positive / VCC / 5V
    } else if (l === '-' || l === '−' || l === 'gnd' || l === 'neg') {
      badgeColor = '#1d4ed8'; // Blue for Ground / Negative
    } else if (l === 'k') {
      badgeColor = '#2563eb'; // Blue for Cathode
    } else if (l === 'a' && (comp.kind === 'led' || comp.kind === 'diode')) {
      badgeColor = '#dc2626'; // Red for Anode
    } else if (l === 'y' || l === 'out' || l === 'q' || l === 'd13' || l === 'y0' || l === 'y1') {
      badgeColor = '#059669'; // Emerald for Outputs
    } else if (l === 'clk' || l === 'd2') {
      badgeColor = '#d97706'; // Amber for Clock / Signals
    } else if (l === 'wiper' || l === 'w') {
      badgeColor = '#7c3aed'; // Purple for Potentiometer Wiper
    } else if (l === 'a0') {
      badgeColor = '#0284c7'; // Sky Blue for Analog Input
    }

    pins.push({
      id: pinId,
      label,
      x: pt.x,
      y: pt.y,
      badgeColor,
      textColor,
    });
  }

  return pins;
}

/** Renders high-visibility, photorealistic pins inserted into breadboard holes with crisp badges */
function renderVisiblePins(comp: PlacedComponent, selected?: boolean) {
  const pins = getVisiblePins(comp);
  const pts = Object.values(comp.leads).map(holeToPixel);
  const c = centroid(pts);

  return (
    <Group listening={false}>
      {pins.map((pin) => {
        // Position badge above or below depending on component centroid
        const isAboveCentroid = pin.y < c.y;
        const badgeY = isAboveCentroid ? pin.y - 17 : pin.y + 7;
        const badgeW = Math.max(pin.label.length * 6.5 + 8, 14);
        const badgeX = pin.x - badgeW / 2;

        return (
          <Group key={pin.id}>
            {/* Outer dark breadboard hole shadow */}
            <Circle x={pin.x} y={pin.y} radius={4.6} fill="#020617" stroke="#1e293b" strokeWidth={0.8} />

            {/* Silver-plated metallic eyelet / contact pad */}
            <Circle
              x={pin.x}
              y={pin.y}
              radius={3.4}
              fill="#cbd5e1"
              stroke={selected ? '#38bdf8' : '#64748b'}
              strokeWidth={selected ? 1.2 : 0.8}
            />

            {/* Inner metallic pin tip */}
            <Circle x={pin.x} y={pin.y} radius={2.0} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.5} />

            {/* Specular glint */}
            <Circle x={pin.x - 0.7} y={pin.y - 0.7} radius={0.8} fill="#ffffff" />

            {/* Pin Identification Badge */}
            <Rect
              x={badgeX}
              y={badgeY}
              width={badgeW}
              height={11}
              cornerRadius={2.5}
              fill={pin.badgeColor}
              stroke="#ffffff"
              strokeWidth={0.7}
              shadowBlur={3}
              shadowColor="rgba(0,0,0,0.5)"
            />
            <Text
              x={badgeX}
              y={badgeY + 1.5}
              width={badgeW}
              align="center"
              text={pin.label}
              fontSize={7}
              fontStyle="bold"
              fill={pin.textColor}
              fontFamily="monospace"
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
}

function leadPixels(comp: PlacedComponent): { x: number; y: number }[] {
  return Object.values(comp.leads).map(holeToPixel);
}

function centroid(pts: { x: number; y: number }[]): { x: number; y: number } {
  if (pts.length === 0) return { x: 0, y: 0 };
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x, y };
}

function bodyRect(
  pts: { x: number; y: number }[],
  extra = 10,
): { x: number; y: number; w: number; h: number } {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 28) + extra;
  const h = Math.max(maxY - minY, 16) + 10;
  return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2 - 16, w, h };
}

/** Standard 4-band resistor color codes based on resistance in Ohms */
function resistorColorBands(ohms: number): string[] {
  const colors = [
    '#0f172a', // 0 Black
    '#78350f', // 1 Brown
    '#dc2626', // 2 Red
    '#ea580c', // 3 Orange
    '#eab308', // 4 Yellow
    '#16a34a', // 5 Green
    '#2563eb', // 6 Blue
    '#9333ea', // 7 Violet
    '#64748b', // 8 Grey
    '#ffffff', // 9 White
  ];
  if (ohms <= 0) return [colors[0], colors[0], colors[0], '#d97706'];
  const s = ohms.toExponential();
  const match = s.match(/^(\d)(?:\.(\d))?e([+-]?\d+)$/);
  if (!match) return [colors[1], colors[0], colors[2], '#d97706'];

  const digit1 = parseInt(match[1], 10);
  const digit2 = match[2] ? parseInt(match[2], 10) : 0;
  const exp = parseInt(match[3], 10) - (match[2] ? 1 : 0);

  const b1 = colors[Math.min(9, Math.max(0, digit1))];
  const b2 = colors[Math.min(9, Math.max(0, digit2))];
  const b3 = colors[Math.min(9, Math.max(0, exp))];
  const b4 = '#d97706'; // 5% Gold tolerance

  return [b1, b2, b3, b4];
}

const SEGMENT_MAP: Record<number, number[]> = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
};

interface SpriteProps {
  comp: PlacedComponent;
  selected?: boolean;
  on?: boolean;
  reading?: string;
  dark?: boolean;
  labelColor?: string;
  brightness?: number;
}

export function ComponentSprite({ comp, selected, on, reading, dark, labelColor: propLabelColor }: SpriteProps) {
  const pts = leadPixels(comp);
  const c = centroid(pts);
  const sel = selected ? '#38bdf8' : '#475569';
  const label = String(comp.props.label ?? comp.kind);
  const labelColor = propLabelColor ?? (dark ? '#e2e8f0' : '#1e293b');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. LED (Real 5mm Diffused / Water-Clear Epoxy Dome with Specular & Glowing Halo)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'led') {
    const rawColor = String(comp.props.color ?? 'red').toLowerCase();
    const isLit = Boolean(on);

    const ledColors: Record<string, { body: string; lit: string; halo: string }> = {
      red: { body: '#dc2626', lit: '#ef4444', halo: 'rgba(239, 68, 68, 0.45)' },
      green: { body: '#16a34a', lit: '#22c55e', halo: 'rgba(34, 197, 94, 0.45)' },
      blue: { body: '#2563eb', lit: '#3b82f6', halo: 'rgba(59, 130, 246, 0.45)' },
      yellow: { body: '#ca8a04', lit: '#eab308', halo: 'rgba(234, 179, 8, 0.45)' },
      white: { body: '#cbd5e1', lit: '#ffffff', halo: 'rgba(255, 255, 255, 0.5)' },
    };

    const cfg = ledColors[rawColor] ?? ledColors.red;
    const p1 = pts[0];
    const p2 = pts[1] ?? pts[0];

    return (
      <Group>
        {/* Silver Leads bending into breadboard holes */}
        <Line points={[p1.x, p1.y, c.x - 4, c.y - 12]} stroke="#94a3b8" strokeWidth={2} lineCap="round" />
        <Line points={[p2.x, p2.y, c.x + 4, c.y - 12]} stroke="#94a3b8" strokeWidth={2} lineCap="round" />

        {/* Outer Glow Halo when illuminated */}
        {isLit && (
          <Circle
            x={c.x}
            y={c.y - 16}
            radius={22}
            fill={cfg.halo}
            shadowBlur={16}
            shadowColor={cfg.lit}
            listening={false}
          />
        )}

        {/* LED Plastic Rim Collar (Base Ring) */}
        <Rect
          x={c.x - 9}
          y={c.y - 10}
          width={18}
          height={3}
          cornerRadius={1}
          fill={cfg.body}
          stroke={sel}
          strokeWidth={selected ? 2 : 0.6}
        />

        {/* LED Epoxy Dome Head (5mm) */}
        <Circle
          x={c.x}
          y={c.y - 18}
          radius={9}
          fill={isLit ? cfg.lit : cfg.body}
          stroke={sel}
          strokeWidth={selected ? 2 : 0.8}
          shadowBlur={isLit ? 12 : 2}
          shadowColor={isLit ? cfg.lit : 'rgba(0,0,0,0.3)'}
        />

        {/* Internal Anode Post / Cathode Anvil Cup */}
        <Line points={[c.x - 2, c.y - 14, c.x - 2, c.y - 18, c.x + 3, c.y - 18]} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />

        {/* Realistic Glossy Specular Highlight Curve */}
        <Arc
          x={c.x - 2}
          y={c.y - 20}
          innerRadius={4}
          outerRadius={6}
          angle={90}
          rotation={200}
          fill="rgba(255,255,255,0.75)"
        />

        {/* Component Label */}
        <Text x={c.x - 25} y={c.y + 12} width={50} align="center" text={label} fontSize={8.5} fill={labelColor} fontStyle="bold" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Battery (Real 9V Block / DC Power Supply with Snap Terminals)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'battery') {
    const b = bodyRect(pts, 18);
    const posP = pts[0];
    const negP = pts[1] ?? pts[0];

    return (
      <Group>
        {/* Heavy Gauge Copper Wire Leads from Snap to Breadboard Pins */}
        <Line points={[b.x + 10, b.y + b.h, posP.x, posP.y]} stroke="#ef4444" strokeWidth={2.4} lineCap="round" />
        <Line points={[b.x + b.w - 10, b.y + b.h, negP.x, negP.y]} stroke="#1e293b" strokeWidth={2.4} lineCap="round" />

        {/* Battery Main Body */}
        <Rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          cornerRadius={6}
          fill="#090d16"
          stroke={sel}
          strokeWidth={selected ? 2.5 : 1}
          shadowBlur={selected ? 10 : 5}
          shadowColor="rgba(0,0,0,0.4)"
        />

        {/* Golden Metallic Header Foil */}
        <Rect x={b.x} y={b.y} width={b.w} height={5} cornerRadius={[6, 6, 0, 0]} fill="#d97706" opacity={0.9} />

        {/* (+) Circular Terminal Stud */}
        <Circle x={b.x + 8} y={b.y + b.h / 2} radius={4} fill="#ef4444" stroke="#fca5a5" strokeWidth={0.8} />
        <Text x={b.x + 4} y={b.y + b.h / 2 - 4} width={8} align="center" text="+" fontSize={7} fontStyle="bold" fill="#ffffff" />

        {/* (−) Hexagonal/Octagonal Socket Terminal */}
        <Circle x={b.x + b.w - 8} y={b.y + b.h / 2} radius={4.5} fill="#1e293b" stroke="#94a3b8" strokeWidth={1} />
        <Text x={b.x + b.w - 12} y={b.y + b.h / 2 - 4} width={8} align="center" text="−" fontSize={7} fontStyle="bold" fill="#ffffff" />

        {/* Label and Voltage */}
        <Text x={b.x} y={b.y + 6} width={b.w} align="center" text={label || 'DC SOURCE'} fontSize={7.5} fontStyle="bold" fill="#fbbf24" letterSpacing={0.5} />
        <Text x={b.x} y={b.y + b.h - 13} width={b.w} align="center" text={`${comp.props.voltage ?? 9}V DC`} fontSize={9.5} fontStyle="bold" fill="#ffffff" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Resistor (Real Carbon Film Cylinder with Bulged Ends & Accurate Color Bands)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'resistor') {
    const rVal = Number(comp.props.resistance ?? 1000);
    const bands = resistorColorBands(rVal);
    const p1 = pts[0];
    const p2 = pts[1] ?? pts[0];
    const bw = Math.max(Math.hypot(p2.x - p1.x, p2.y - p1.y) - 22, 28);
    const bh = 14;
    const bx = c.x - bw / 2;
    const by = c.y - bh / 2 - 12;

    return (
      <Group>
        {/* Silver Tinned Metal Leads */}
        <Line points={[p1.x, p1.y, bx, by + bh / 2]} stroke="#94a3b8" strokeWidth={2.2} lineCap="round" />
        <Line points={[p2.x, p2.y, bx + bw, by + bh / 2]} stroke="#94a3b8" strokeWidth={2.2} lineCap="round" />

        {/* Drop Shadow beneath body */}
        <Rect x={bx + 2} y={by + bh} width={bw - 4} height={3} fill="rgba(0,0,0,0.2)" cornerRadius={2} />

        {/* Resistor Body - Ceramic Tan Cylinder */}
        <Rect x={bx} y={by} width={bw} height={bh} cornerRadius={4} fill="#d4a373" stroke={sel} strokeWidth={selected ? 2 : 0.8} />

        {/* Left Bulged Bell End */}
        <Rect x={bx} y={by - 1} width={6} height={bh + 2} cornerRadius={3} fill="#c6905d" />
        {/* Right Bulged Bell End */}
        <Rect x={bx + bw - 6} y={by - 1} width={6} height={bh + 2} cornerRadius={3} fill="#c6905d" />

        {/* 4 Standard Color Bands */}
        <Rect x={bx + 8} y={by - 1} width={3.5} height={bh + 2} fill={bands[0]} />
        <Rect x={bx + 14} y={by} width={3.5} height={bh} fill={bands[1]} />
        <Rect x={bx + 20} y={by} width={3.5} height={bh} fill={bands[2]} />
        <Rect x={bx + bw - 11} y={by - 1} width={3} height={bh + 2} fill={bands[3]} stroke="#fef08a" strokeWidth={0.3} />

        {/* Glossy Lacquered Highlight Strip */}
        <Line points={[bx + 3, by + 2.5, bx + bw - 3, by + 2.5]} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} lineCap="round" />

        {/* Label */}
        <Text x={c.x - 25} y={by + bh + 4} width={50} align="center" text={label} fontSize={8.5} fontStyle="bold" fill={labelColor} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Capacitor (Electrolytic Aluminum Can with Negative Stripe & Vent Lines)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'capacitor') {
    const p1 = pts[0];
    const p2 = pts[1] ?? pts[0];
    const rad = 13;

    return (
      <Group>
        {/* Silver Leads */}
        <Line points={[p1.x, p1.y, c.x - 5, c.y - 12]} stroke="#94a3b8" strokeWidth={1.8} />
        <Line points={[p2.x, p2.y, c.x + 5, c.y - 12]} stroke="#94a3b8" strokeWidth={1.8} />

        {/* Electrolytic Can Body (Deep Blue Metallic Cylinder) */}
        <Circle x={c.x} y={c.y - 18} radius={rad} fill="#1e3a8a" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={4} shadowColor="rgba(0,0,0,0.3)" />

        {/* Metallic Top Scribe Circle */}
        <Circle x={c.x} y={c.y - 18} radius={rad - 2.5} fill="#3b82f6" opacity={0.6} />

        {/* Aluminum Top Cross Safety Vent */}
        <Line points={[c.x - 6, c.y - 18, c.x + 6, c.y - 18]} stroke="#cbd5e1" strokeWidth={1.2} />
        <Line points={[c.x, c.y - 24, c.x, c.y - 12]} stroke="#cbd5e1" strokeWidth={1.2} />

        {/* White Negative Stripe on Side */}
        <Rect x={c.x - 12} y={c.y - 22} width={4} height={8} fill="#ffffff" cornerRadius={1} />
        <Text x={c.x - 12} y={c.y - 22} text="−" fontSize={7} fontStyle="bold" fill="#0f172a" />

        {/* Label */}
        <Text x={c.x - 20} y={c.y - 2} width={40} align="center" text={label} fontSize={8.5} fill={labelColor} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Diode (Standard DO-41 Black Plastic Package with Silver Cathode Band)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'diode') {
    const p1 = pts[0];
    const p2 = pts[1] ?? pts[0];
    const bw = Math.max(Math.hypot(p2.x - p1.x, p2.y - p1.y) - 20, 24);
    const bh = 11;
    const bx = c.x - bw / 2;
    const by = c.y - bh / 2 - 10;

    return (
      <Group>
        {/* Silver Leads */}
        <Line points={[p1.x, p1.y, bx, by + bh / 2]} stroke="#94a3b8" strokeWidth={2} lineCap="round" />
        <Line points={[p2.x, p2.y, bx + bw, by + bh / 2]} stroke="#94a3b8" strokeWidth={2} lineCap="round" />

        {/* DO-41 Cylindrical Black Package Body */}
        <Rect x={bx} y={by} width={bw} height={bh} cornerRadius={3} fill="#090d16" stroke={sel} strokeWidth={selected ? 2 : 0.8} />

        {/* Silver / White Cathode Band near Pin 2 */}
        <Rect x={bx + bw - 7} y={by} width={4} height={bh} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.5} />

        {/* Laser Part Marking */}
        <Text x={bx + 2} y={by + 2} width={bw - 10} align="center" text="1N4007" fontSize={6.5} fontStyle="bold" fill="#64748b" fontFamily="monospace" />

        {/* Glossy Cylindrical Reflection */}
        <Line points={[bx + 2, by + 1.5, bx + bw - 2, by + 1.5]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />

        {/* Label */}
        <Text x={c.x - 20} y={by + bh + 4} width={40} align="center" text={label} fontSize={8.5} fill={labelColor} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Pushbutton (6x6mm Stainless Steel Tactile Switch with Plunger)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'pushbutton') {
    const isClosed = Boolean(on || comp.props.closed);
    return (
      <Group>
        {/* 4 Corner Silver Legs */}
        {pts.map((p, i) => (
          <Line key={i} points={[p.x, p.y, c.x, c.y - 18]} stroke="#94a3b8" strokeWidth={1.8} />
        ))}

        {/* Stainless Steel Outer Plate */}
        <Rect x={c.x - 14} y={c.y - 29} width={28} height={22} cornerRadius={3} fill="#e2e8f0" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={3} shadowColor="rgba(0,0,0,0.25)" />

        {/* 4 Corner Rivets */}
        <Circle x={c.x - 10} y={c.y - 25} radius={1.2} fill="#64748b" />
        <Circle x={c.x + 10} y={c.y - 25} radius={1.2} fill="#64748b" />
        <Circle x={c.x - 10} y={c.y - 11} radius={1.2} fill="#64748b" />
        <Circle x={c.x + 10} y={c.y - 11} radius={1.2} fill="#64748b" />

        {/* Circular Bezel Collar */}
        <Circle x={c.x} y={c.y - 18} radius={7.5} fill="#475569" stroke="#1e293b" strokeWidth={0.8} />

        {/* Central Tactile Plunger Button */}
        <Circle
          x={c.x}
          y={c.y - 18}
          radius={isClosed ? 5 : 6}
          fill={isClosed ? '#22c55e' : '#ef4444'}
          stroke="#ffffff"
          strokeWidth={0.8}
          shadowBlur={isClosed ? 8 : 2}
          shadowColor={isClosed ? '#22c55e' : 'rgba(0,0,0,0.4)'}
        />

        <Text x={c.x - 20} y={c.y - 2} width={40} align="center" text={label} fontSize={8.5} fill={labelColor} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Potentiometer (Blue Rotary Trim Pot with Dial Slot)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'potentiometer') {
    const b = bodyRect(pts, 10);
    const wiperVal = Number(comp.props.wiper ?? 0.5);
    const angle = -135 + wiperVal * 270; // Sweep angle from -135° to +135°
    const rad = 8;
    const bodyY = b.y - 10;
    const slotX = c.x + Math.cos((angle * Math.PI) / 180) * 4.5;
    const slotY = bodyY + 10 + Math.sin((angle * Math.PI) / 180) * 4.5;

    return (
      <Group>
        {/* 3 Vertical Metallic Leads extending from trimmer body to pins */}
        {pts.map((p, i) => (
          <Line key={i} points={[p.x, p.y, p.x, bodyY + 20]} stroke="#cbd5e1" strokeWidth={2.2} lineCap="square" />
        ))}

        {/* Trimmer Body (Blue Molded Plastic) */}
        <Rect x={b.x} y={bodyY} width={b.w} height={20} cornerRadius={4} fill="#2563eb" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={4} shadowColor="rgba(0,0,0,0.25)" />

        {/* Metallic Knob Base */}
        <Circle x={c.x} y={bodyY + 10} radius={rad} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />

        {/* Screwdriver / Finger Slot Indicator */}
        <Line points={[c.x - Math.cos((angle * Math.PI) / 180) * 5, bodyY + 10 - Math.sin((angle * Math.PI) / 180) * 5, slotX, slotY]} stroke="#1e293b" strokeWidth={2} lineCap="round" />

        <Text x={c.x - 25} y={bodyY + 24} width={50} align="center" text={label} fontSize={8.5} fill={labelColor} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. LDR (Real Ceramic Disc with Red-Orange Serpentine Photocell Track)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'ldr') {
    const p1 = pts[0];
    const p2 = pts[1] ?? pts[0];
    return (
      <Group>
        <Line points={[p1.x, p1.y, c.x - 4, c.y - 14]} stroke="#94a3b8" strokeWidth={1.8} />
        <Line points={[p2.x, p2.y, c.x + 4, c.y - 14]} stroke="#94a3b8" strokeWidth={1.8} />

        {/* Ceramic Disc Substrate */}
        <Circle x={c.x} y={c.y - 18} radius={11} fill="#fed7aa" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={4} shadowColor="rgba(0,0,0,0.2)" />

        {/* Serpentine CdS Photoresistor Wave Track */}
        <Line
          points={[
            c.x - 6, c.y - 22,
            c.x + 6, c.y - 22,
            c.x + 6, c.y - 19,
            c.x - 6, c.y - 19,
            c.x - 6, c.y - 16,
            c.x + 6, c.y - 16,
            c.x + 6, c.y - 13,
            c.x - 6, c.y - 13,
          ]}
          stroke="#c2410c"
          strokeWidth={1.4}
          lineCap="round"
          lineJoin="round"
        />

        {/* Clear Epoxy Gloss Highlight */}
        <Circle x={c.x - 4} y={c.y - 22} radius={2} fill="rgba(255,255,255,0.75)" />

        <Text x={c.x - 25} y={c.y - 3} width={50} align="center" text={label} fontSize={8.5} fill={labelColor} fontStyle="bold" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Buzzer (Matte Black Round Piezo Chamber with Central Acoustic Hole)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'buzzer') {
    return (
      <Group>
        {pts.map((p, i) => (
          <Line key={i} points={[p.x, p.y, c.x, c.y - 14]} stroke="#94a3b8" strokeWidth={1.8} />
        ))}

        {/* Sound Waves Animation when Sounding */}
        {on && (
          <>
            <Circle x={c.x} y={c.y - 18} radius={20} stroke="#facc15" strokeWidth={1.2} opacity={0.4} />
            <Circle x={c.x} y={c.y - 18} radius={16} stroke="#facc15" strokeWidth={1.4} opacity={0.7} />
          </>
        )}

        {/* Piezo Casing */}
        <Circle x={c.x} y={c.y - 18} radius={12} fill="#090d16" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={5} shadowColor="rgba(0,0,0,0.3)" />

        {/* Central Acoustic Sound Hole */}
        <Circle x={c.x} y={c.y - 18} radius={4.5} fill="#020617" stroke="#334155" strokeWidth={0.8} />

        {/* Polarity Sign */}
        <Text x={c.x - 10} y={c.y - 26} text="+" fontSize={9} fontStyle="bold" fill="#ef4444" />

        <Text x={c.x - 20} y={c.y - 2} width={40} align="center" text={on ? '🔊 BEEP' : label} fontSize={8} fontStyle="bold" fill={on ? '#facc15' : labelColor} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Ammeter & Multimeter (Realistic Handheld / Panel Meter with LCD Display)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'ammeter' || comp.kind === 'multimeter' || comp.kind === 'oscilloscope') {
    const b = bodyRect(pts, 22);
    const isAmmeter = comp.kind === 'ammeter';
    const isScope = comp.kind === 'oscilloscope';
    const title = isAmmeter ? 'AMMETER' : isScope ? 'OSCILLOSCOPE' : 'MULTIMETER';
    const holsterColor = isAmmeter ? '#0284c7' : isScope ? '#6366f1' : '#f59e0b';
    const displayColor = isAmmeter ? '#38bdf8' : '#4ade80';

    return (
      <Group>
        {/* Shrouded Probe Wires */}
        <Line points={[pts[0].x, pts[0].y, b.x + 10, b.y + b.h]} stroke="#ef4444" strokeWidth={2.4} lineCap="round" />
        <Line points={[pts[1].x, pts[1].y, b.x + b.w - 10, b.y + b.h]} stroke="#1e293b" strokeWidth={2.4} lineCap="round" />

        {/* Protective Rubber Holster */}
        <Rect x={b.x} y={b.y - 8} width={b.w} height={36} cornerRadius={6} fill={holsterColor} stroke={sel} strokeWidth={selected ? 2.5 : 1} shadowBlur={6} shadowColor="rgba(0,0,0,0.3)" />

        {/* Inner Dark Instrument Bezel */}
        <Rect x={b.x + 3} y={b.y - 5} width={b.w - 6} height={30} cornerRadius={4} fill="#0f172a" />

        {/* Backlit Digital LCD Screen */}
        <Rect x={b.x + 6} y={b.y - 2} width={b.w - 12} height={17} cornerRadius={2} fill="#020617" stroke="#334155" strokeWidth={0.8} />

        {/* Model & Title */}
        <Text x={b.x + 7} y={b.y - 1} width={b.w - 14} text={title} fontSize={6.5} fontStyle="bold" fill="#94a3b8" letterSpacing={0.5} />

        {/* High-Contrast Monospace Readout */}
        <Text
          x={b.x + 7}
          y={b.y + 6}
          width={b.w - 14}
          align="right"
          text={reading ?? '0.00'}
          fontSize={10.5}
          fontStyle="bold"
          fill={displayColor}
          fontFamily="ui-monospace, monospace"
        />

        {/* Rotary Range Selector Knob */}
        <Circle x={c.x} y={b.y + 20} radius={4} fill="#334155" stroke="#64748b" strokeWidth={0.8} />
        <Line points={[c.x, b.y + 18, c.x, b.y + 22]} stroke="#ffffff" strokeWidth={1} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Logic Gates & ICs (Realistic DIP-14 Package with Alignment Notch & Pin Legs)
  // ─────────────────────────────────────────────────────────────────────────────
  if (['and_gate', 'or_gate', 'not_gate', 'nand_gate', 'nor_gate', 'xor_gate', 'mux', 'decoder', 'flip_flop'].includes(comp.kind)) {
    const b = bodyRect(pts, 20);
    const gateName =
      comp.kind === 'and_gate' ? '74LS08'
      : comp.kind === 'or_gate' ? '74LS32'
      : comp.kind === 'not_gate' ? '74LS04'
      : comp.kind === 'nand_gate' ? '74LS00'
      : comp.kind === 'nor_gate' ? '74LS02'
      : comp.kind === 'xor_gate' ? '74LS86'
      : comp.kind === 'mux' ? '74LS157'
      : comp.kind === 'decoder' ? '74LS139'
      : '74LS74';

    const isHigh = Boolean(on);
    const icBodyY = b.y - 10;

    return (
      <Group>
        {/* Silver DIP Pins entering breadboard holes */}
        {pts.map((p, i) => (
          <Group key={i}>
            <Line points={[p.x, p.y, p.x, icBodyY + 26]} stroke="#cbd5e1" strokeWidth={2.4} lineCap="square" />
            <Line points={[p.x - 0.5, p.y, p.x - 0.5, icBodyY + 26]} stroke="#94a3b8" strokeWidth={0.8} />
          </Group>
        ))}

        {/* DIP IC Molded Matte Black Epoxy Body */}
        <Rect x={b.x} y={icBodyY} width={b.w} height={26} cornerRadius={3} fill="#18181b" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={4} shadowColor="rgba(0,0,0,0.35)" />

        {/* Semi-Circular Orientation Notch on Left Edge */}
        <Arc x={b.x} y={icBodyY + 13} innerRadius={0} outerRadius={3.5} angle={180} rotation={270} fill="#27272a" />

        {/* Pin 1 Dot Indentation */}
        <Circle x={b.x + 6} y={icBodyY + 19} radius={1.4} fill="#3f3f46" />

        {/* Laser-Etched IC Part Number */}
        <Text x={b.x + 8} y={icBodyY + 4} width={b.w - 22} text={gateName} fontSize={8} fontStyle="bold" fill="#e4e4e7" fontFamily="monospace" letterSpacing={0.5} />
        <Text x={b.x + 8} y={icBodyY + 14} width={b.w - 22} text={comp.kind.replace('_gate', '').toUpperCase()} fontSize={7} fill="#a1a1aa" fontFamily="monospace" />

        {/* Output Logic State Glow Indicator */}
        <Circle x={b.x + b.w - 8} y={icBodyY + 13} radius={3.5} fill={isHigh ? '#22c55e' : '#27272a'} stroke={isHigh ? '#86efac' : '#3f3f46'} strokeWidth={0.8} shadowBlur={isHigh ? 6 : 0} shadowColor="#22c55e" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. 7-Segment Display (Real 0.56" 7-Segment LED with Illuminated Bars)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'seven_seg') {
    const b = bodyRect(pts, 20);
    const digit = Math.min(9, Math.max(0, Math.floor(Number(reading ?? 0))));
    const segs = SEGMENT_MAP[digit] ?? [0, 0, 0, 0, 0, 0, 0];
    const dw = 14;
    const dh = 24;
    const dx = c.x - dw / 2;
    const dispY = b.y - 20;
    const dy = dispY + 8;

    const litSeg = '#ef4444';
    const darkSeg = '#270808';

    return (
      <Group>
        {/* Silver Leads extending from display bottom to breadboard holes */}
        {pts.map((p, i) => (
          <Line key={i} points={[p.x, p.y, p.x, dispY + 42]} stroke="#cbd5e1" strokeWidth={2.4} lineCap="square" />
        ))}

        {/* Display Dark Bezel */}
        <Rect x={b.x} y={dispY} width={b.w} height={42} cornerRadius={3} fill="#090d16" stroke={sel} strokeWidth={selected ? 2.5 : 1} shadowBlur={6} shadowColor="rgba(0,0,0,0.4)" />

        {/* Segment a (top) */}
        <Line points={[dx + 2, dy, dx + dw - 2, dy]} stroke={segs[0] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Segment b (top-right) */}
        <Line points={[dx + dw, dy + 2, dx + dw, dy + dh / 2 - 1]} stroke={segs[1] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Segment c (bottom-right) */}
        <Line points={[dx + dw, dy + dh / 2 + 1, dx + dw, dy + dh - 2]} stroke={segs[2] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Segment d (bottom) */}
        <Line points={[dx + 2, dy + dh, dx + dw - 2, dy + dh]} stroke={segs[3] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Segment e (bottom-left) */}
        <Line points={[dx, dy + dh / 2 + 1, dx, dy + dh - 2]} stroke={segs[4] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Segment f (top-left) */}
        <Line points={[dx, dy + 2, dx, dy + dh / 2 - 1]} stroke={segs[5] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Segment g (middle) */}
        <Line points={[dx + 2, dy + dh / 2, dx + dw - 2, dy + dh / 2]} stroke={segs[6] ? litSeg : darkSeg} strokeWidth={2.8} lineCap="round" />
        {/* Decimal Point (DP) */}
        <Circle x={dx + dw + 3} y={dy + dh} radius={1.4} fill={darkSeg} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. Arduino Uno (Real PCB with USB Connector, ATmega328P Chip & LEDs)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'arduino') {
    const b = bodyRect(pts, 24);
    const ardY = b.y - 18;
    return (
      <Group>
        {/* Silver / Gold Header Pins extending from PCB into breadboard holes */}
        {pts.map((p, i) => (
          <Group key={i}>
            <Line points={[p.x, p.y, p.x, ardY + 38]} stroke="#fbbf24" strokeWidth={2.4} lineCap="round" />
            <Circle x={p.x} y={ardY + 36} radius={2} fill="#1e293b" />
          </Group>
        ))}

        {/* Arduino Teal FR-4 PCB */}
        <Rect x={b.x} y={ardY} width={b.w} height={38} cornerRadius={5} fill="#008184" stroke={sel} strokeWidth={selected ? 2.5 : 1} shadowBlur={8} shadowColor="rgba(0,0,0,0.35)" />

        {/* Metallic USB-B Socket */}
        <Rect x={b.x + 3} y={ardY + 4} width={12} height={14} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={0.8} cornerRadius={1} />
        {/* Black DC Barrel Jack */}
        <Rect x={b.x + 3} y={ardY + 22} width={10} height={10} fill="#090d16" cornerRadius={1} />

        {/* ATmega328P DIP-28 Chip */}
        <Rect x={b.x + 22} y={ardY + 8} width={26} height={12} fill="#18181b" stroke="#3f3f46" strokeWidth={0.8} cornerRadius={1} />
        <Text x={b.x + 23} y={ardY + 10} text="MEGA328P" fontSize={5} fill="#a1a1aa" fontFamily="monospace" />

        {/* 16 MHz Crystal Oscillator */}
        <Rect x={b.x + 18} y={ardY + 3} width={7} height={4} fill="#94a3b8" cornerRadius={1} />

        {/* Silk-screen Brand Typography */}
        <Text x={b.x + 22} y={ardY + 24} text="ARDUINO UNO" fontSize={6.5} fontStyle="bold" fill="#ffffff" />

        {/* ON LED & L (D13) LED */}
        <Circle x={b.x + b.w - 8} y={ardY + 7} radius={2.2} fill="#22c55e" shadowBlur={4} shadowColor="#22c55e" />
        <Circle x={b.x + b.w - 8} y={ardY + 15} radius={2.2} fill="#f59e0b" shadowBlur={3} shadowColor="#f59e0b" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. IR Sensor (Realistic Proximity Module with Dual IR LEDs & Trimmer)
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'ir_sensor') {
    const b = bodyRect(pts, 18);
    const det = Boolean(comp.props.detected);
    const irY = b.y - 16;
    return (
      <Group>
        {/* 3 Right-angle Silver Pins connecting PCB to breadboard holes */}
        {pts.map((p, i) => (
          <Line key={i} points={[p.x, p.y, p.x, irY + 32]} stroke="#cbd5e1" strokeWidth={2.2} lineCap="round" />
        ))}

        {/* Sensor Module Blue PCB */}
        <Rect x={b.x} y={irY} width={b.w} height={32} cornerRadius={4} fill="#1e40af" stroke={sel} strokeWidth={selected ? 2 : 1} shadowBlur={4} shadowColor="rgba(0,0,0,0.3)" />

        {/* Clear 5mm IR Emitter Tube */}
        <Circle x={b.x + 10} y={irY + 8} radius={5.5} fill="rgba(255,255,255,0.85)" stroke="#38bdf8" strokeWidth={1} />
        {/* Dark Purple Photodiode Receiver Tube */}
        <Circle x={b.x + 22} y={irY + 8} radius={5.5} fill="#090d16" stroke="#1e293b" strokeWidth={1} />

        {/* LM393 Comparator IC */}
        <Rect x={b.x + 32} y={irY + 5} width={12} height={8} fill="#18181b" />

        {/* Obstacle Detect Status LED */}
        <Circle x={b.x + b.w - 7} y={irY + 22} radius={2.5} fill={det ? '#ef4444' : '#1e293b'} stroke={det ? '#fca5a5' : '#475569'} strokeWidth={0.6} shadowBlur={det ? 6 : 0} shadowColor="#ef4444" />

        <Text x={b.x} y={irY + 24} width={b.w} align="center" text={det ? 'DETECTED' : label} fontSize={6.5} fontStyle="bold" fill={det ? '#fca5a5' : '#93c5fd'} />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. Clock Source & Ground
  // ─────────────────────────────────────────────────────────────────────────────
  if (comp.kind === 'clock') {
    const b = bodyRect(pts, 18);
    const clkY = b.y - 14;
    return (
      <Group>
        {pts.map((p, i) => (
          <Line key={i} points={[p.x, p.y, p.x, clkY + 28]} stroke="#cbd5e1" strokeWidth={2.2} lineCap="round" />
        ))}
        <Rect x={b.x} y={clkY} width={Math.max(b.w, 44)} height={28} cornerRadius={5} fill="#312e81" stroke={sel} strokeWidth={selected ? 2 : 1} />
        <Text x={b.x} y={clkY + 4} width={Math.max(b.w, 44)} align="center" text="PULSE GEN" fontSize={6.5} fontStyle="bold" fill="#c7d2fe" />
        <Line points={[b.x + 10, clkY + 20, b.x + 16, clkY + 20, b.x + 16, clkY + 14, b.x + 24, clkY + 14, b.x + 24, clkY + 20, b.x + 30, clkY + 20]} stroke="#38bdf8" strokeWidth={1.8} lineCap="round" lineJoin="round" />
        <Text x={b.x} y={clkY + 22} width={Math.max(b.w, 44)} align="center" text="5V CLK" fontSize={6.5} fill="#a5b4fc" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  if (comp.kind === 'ground') {
    return (
      <Group>
        <Line points={[c.x, c.y, c.x, c.y + 8, c.x - 8, c.y + 8, c.x + 8, c.y + 8]} stroke={sel} strokeWidth={2} lineCap="round" />
        <Line points={[c.x - 5, c.y + 11, c.x + 5, c.y + 11]} stroke={sel} strokeWidth={1.6} lineCap="round" />
        <Line points={[c.x - 2, c.y + 14, c.x + 2, c.y + 14]} stroke={sel} strokeWidth={1.2} lineCap="round" />

        {/* High-Visibility Pin Contacts & Badges on Top */}
        {renderVisiblePins(comp, selected)}
      </Group>
    );
  }

  return (
    <Group>
      <Rect x={c.x - 12} y={c.y - 16} width={24} height={14} fill="#e2e8f0" stroke={sel} />
      <Text x={c.x - 16} y={c.y + 2} width={32} align="center" text={label} fontSize={9} fill={labelColor} />
      {renderVisiblePins(comp, selected)}
    </Group>
  );
}
