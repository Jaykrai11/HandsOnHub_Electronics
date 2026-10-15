import React, { memo } from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import {
  boardHeight,
  boardWidth,
  COL_COUNT,
  holeToPixel,
  iterateHoles,
  stripNetKey,
  HOLE_PITCH,
  BOARD_PAD_X,
  BOARD_PAD_Y,
  ROW_A,
  ROW_F,
  ROW_TOP_POS,
  ROW_TOP_NEG,
  ROW_BOT_NEG,
  ROW_BOT_POS,
} from '../../lib/breadboard';
import type { HoleId } from '../../types';

interface Props {
  dark: boolean;
  hover: HoleId | null;
}

const BreadboardLayer = memo(function BreadboardLayer({ dark, hover }: Props) {
  const w = boardWidth();
  const h = boardHeight();

  // Authentic breadboard color palette (Skeuomorphic white ABS hardware plastic in both light and dark mode)
  const colors = {
    body: '#fcfbfa',
    bodyBorder: dark ? '#474d5a' : '#ded9cb',
    sectionBg: '#f6f4ee',
    troughBg: '#e5e1d4',
    troughBorder: '#d4cebe',
    socketBezel: '#eeebe1',
    socketInner: '#1c1917',
    metalClip: '#8a8377',
    metalClipHighlight: '#d4cebe',
    label: '#45403a',
    labelDim: '#787166',
    posRailBg: 'rgba(239, 68, 68, 0.15)',
    posRailLine: '#ef4444',
    negRailBg: 'rgba(37, 99, 235, 0.15)',
    negRailLine: '#2563eb',
    screwHole: '#d4cebe',
    screwHead: '#b8b1a2',
    activeGlow: '#4f46e5',
    activeStroke: '#c7d2fe',
  };

  const strip = hover ? stripNetKey(hover) : null;

  // Collect all breadboard holes once
  const holes: HoleId[] = [];
  iterateHoles((x) => holes.push(x));

  // Rail bands
  const railBand = (row: number, fill: string) => {
    const y = BOARD_PAD_Y + row * HOLE_PITCH;
    return (
      <Rect
        x={BOARD_PAD_X - 14}
        y={y - 8}
        width={w - BOARD_PAD_X * 2 + 28}
        height={16}
        cornerRadius={8}
        fill={fill}
        listening={false}
      />
    );
  };

  // Rail continuous polarity line
  const railStripe = (row: number, color: string, isTop: boolean) => {
    const y = BOARD_PAD_Y + row * HOLE_PITCH + (isTop ? -10 : 10);
    return (
      <Line
        points={[BOARD_PAD_X - 10, y, w - BOARD_PAD_X + 10, y]}
        stroke={color}
        strokeWidth={1.8}
        opacity={0.85}
        listening={false}
      />
    );
  };

  // Dovetail interlocking tabs on left/right edges (authentic MB-102 breadboard hardware detail)
  const tabY1 = h * 0.28;
  const tabY2 = h * 0.72;
  const tabW = 7;
  const tabH = 18;

  return (
    <Group listening={false}>
      {/* Outer Interlocking Side Tabs */}
      <Rect x={-tabW + 2} y={tabY1 - tabH / 2} width={tabW} height={tabH} cornerRadius={[3, 0, 0, 3]} fill={colors.body} />
      <Rect x={-tabW + 2} y={tabY2 - tabH / 2} width={tabW} height={tabH} cornerRadius={[3, 0, 0, 3]} fill={colors.body} />
      <Rect x={w - 2} y={tabY1 - tabH / 2} width={tabW} height={tabH} cornerRadius={[0, 3, 3, 0]} fill={colors.body} />
      <Rect x={w - 2} y={tabY2 - tabH / 2} width={tabW} height={tabH} cornerRadius={[0, 3, 3, 0]} fill={colors.body} />

      {/* Main Breadboard ABS Plastic Chassis */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        cornerRadius={12}
        fill={colors.body}
        stroke={colors.bodyBorder}
        strokeWidth={1.5}
        shadowBlur={16}
        shadowColor={dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.14)'}
        shadowOffsetY={4}
      />

      {/* Perimeter Inset Bevel Groove */}
      <Rect
        x={6}
        y={6}
        width={w - 12}
        height={h - 12}
        cornerRadius={8}
        stroke={dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
        strokeWidth={1}
      />

      {/* Corner Mounting Screw Accents */}
      {[
        { x: 14, y: 14 },
        { x: w - 14, y: 14 },
        { x: 14, y: h - 14 },
        { x: w - 14, y: h - 14 },
      ].map((pos, idx) => (
        <Group key={idx}>
          <Circle x={pos.x} y={pos.y} radius={3.2} fill={colors.screwHole} />
          <Circle x={pos.x} y={pos.y} radius={2} fill={colors.screwHead} />
        </Group>
      ))}

      {/* ── TOP POWER BUS RAILS ────────────────────────────────────────────── */}
      {railBand(ROW_TOP_POS, colors.posRailBg)}
      {railStripe(ROW_TOP_POS, colors.posRailLine, true)}
      {railBand(ROW_TOP_NEG, colors.negRailBg)}
      {railStripe(ROW_TOP_NEG, colors.negRailLine, false)}

      {/* Top Rail Labels (+ and − on both Left and Right) */}
      <Text x={14} y={BOARD_PAD_Y + ROW_TOP_POS * HOLE_PITCH - 6} text="+" fontSize={13} fontStyle="bold" fill={colors.posRailLine} align="center" width={14} />
      <Text x={w - 28} y={BOARD_PAD_Y + ROW_TOP_POS * HOLE_PITCH - 6} text="+" fontSize={13} fontStyle="bold" fill={colors.posRailLine} align="center" width={14} />
      <Text x={14} y={BOARD_PAD_Y + ROW_TOP_NEG * HOLE_PITCH - 6} text="−" fontSize={14} fontStyle="bold" fill={colors.negRailLine} align="center" width={14} />
      <Text x={w - 28} y={BOARD_PAD_Y + ROW_TOP_NEG * HOLE_PITCH - 6} text="−" fontSize={14} fontStyle="bold" fill={colors.negRailLine} align="center" width={14} />

      {/* ── UPPER TERMINAL TIE-POINT SECTION (Rows A–E) ────────────────────── */}
      <Rect
        x={BOARD_PAD_X - 14}
        y={BOARD_PAD_Y + (ROW_A - 0.45) * HOLE_PITCH}
        width={w - BOARD_PAD_X * 2 + 28}
        height={4.9 * HOLE_PITCH}
        cornerRadius={5}
        fill={colors.sectionBg}
      />

      {/* ── CENTRAL RECESSED IC TROUGH (Between Rows E and F) ──────────────── */}
      {/* Authentic molded DIP socket channel */}
      <Rect
        x={BOARD_PAD_X - 16}
        y={BOARD_PAD_Y + 7.7 * HOLE_PITCH}
        width={w - BOARD_PAD_X * 2 + 32}
        height={1.9 * HOLE_PITCH}
        cornerRadius={3}
        fill={colors.troughBg}
        stroke={colors.troughBorder}
        strokeWidth={1}
      />
      {/* Central alignment notch groove */}
      <Line
        points={[BOARD_PAD_X - 10, BOARD_PAD_Y + 8.65 * HOLE_PITCH, w - BOARD_PAD_X + 10, BOARD_PAD_Y + 8.65 * HOLE_PITCH]}
        stroke={dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}
        strokeWidth={1}
        dash={[8, 6]}
      />

      {/* ── LOWER TERMINAL TIE-POINT SECTION (Rows F–J) ────────────────────── */}
      <Rect
        x={BOARD_PAD_X - 14}
        y={BOARD_PAD_Y + (ROW_F - 0.45) * HOLE_PITCH}
        width={w - BOARD_PAD_X * 2 + 28}
        height={4.9 * HOLE_PITCH}
        cornerRadius={5}
        fill={colors.sectionBg}
      />

      {/* ── BOTTOM POWER BUS RAILS ─────────────────────────────────────────── */}
      {railBand(ROW_BOT_NEG, colors.negRailBg)}
      {railStripe(ROW_BOT_NEG, colors.negRailLine, true)}
      {railBand(ROW_BOT_POS, colors.posRailBg)}
      {railStripe(ROW_BOT_POS, colors.posRailLine, false)}

      {/* Bottom Rail Labels (− and + on both Left and Right) */}
      <Text x={14} y={BOARD_PAD_Y + ROW_BOT_NEG * HOLE_PITCH - 6} text="−" fontSize={14} fontStyle="bold" fill={colors.negRailLine} align="center" width={14} />
      <Text x={w - 28} y={BOARD_PAD_Y + ROW_BOT_NEG * HOLE_PITCH - 6} text="−" fontSize={14} fontStyle="bold" fill={colors.negRailLine} align="center" width={14} />
      <Text x={14} y={BOARD_PAD_Y + ROW_BOT_POS * HOLE_PITCH - 6} text="+" fontSize={13} fontStyle="bold" fill={colors.posRailLine} align="center" width={14} />
      <Text x={w - 28} y={BOARD_PAD_Y + ROW_BOT_POS * HOLE_PITCH - 6} text="+" fontSize={13} fontStyle="bold" fill={colors.posRailLine} align="center" width={14} />

      {/* ── TOP COLUMN NUMBERS (Row index 2, cleanly above Row A) ───────────── */}
      {Array.from({ length: COL_COUNT }, (_, i) => i + 1).map((col) => {
        const isMajor = col === 1 || col % 5 === 0;
        return (
          <Text
            key={`top-col-${col}`}
            x={BOARD_PAD_X + (col - 1) * HOLE_PITCH - 8}
            y={BOARD_PAD_Y + 2 * HOLE_PITCH - 5}
            width={16}
            align="center"
            text={String(col)}
            fontSize={isMajor ? 8.5 : 7.5}
            fontStyle={isMajor ? 'bold' : 'normal'}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill={isMajor ? colors.label : colors.labelDim}
          />
        );
      })}

      {/* ── BOTTOM COLUMN NUMBERS (Row index 15, cleanly below Row J) ───────── */}
      {Array.from({ length: COL_COUNT }, (_, i) => i + 1).map((col) => {
        const isMajor = col === 1 || col % 5 === 0;
        return (
          <Text
            key={`bot-col-${col}`}
            x={BOARD_PAD_X + (col - 1) * HOLE_PITCH - 8}
            y={BOARD_PAD_Y + 15 * HOLE_PITCH - 5}
            width={16}
            align="center"
            text={String(col)}
            fontSize={isMajor ? 8.5 : 7.5}
            fontStyle={isMajor ? 'bold' : 'normal'}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill={isMajor ? colors.label : colors.labelDim}
          />
        );
      })}

      {/* ── ROW LETTERS (A–E on Left and Right) ────────────────────────────── */}
      {(['a', 'b', 'c', 'd', 'e'] as const).map((row, i) => {
        const y = BOARD_PAD_Y + (ROW_A + i) * HOLE_PITCH - 5.5;
        return (
          <Group key={`row-upper-${row}`}>
            <Text x={14} y={y} text={row} fontSize={9.5} fontStyle="bold" fontFamily="ui-monospace, monospace" fill={colors.label} align="center" width={12} />
            <Text x={w - 26} y={y} text={row} fontSize={9.5} fontStyle="bold" fontFamily="ui-monospace, monospace" fill={colors.label} align="center" width={12} />
          </Group>
        );
      })}

      {/* ── ROW LETTERS (F–J on Left and Right) ────────────────────────────── */}
      {(['f', 'g', 'h', 'i', 'j'] as const).map((row, i) => {
        const y = BOARD_PAD_Y + (ROW_F + i) * HOLE_PITCH - 5.5;
        return (
          <Group key={`row-lower-${row}`}>
            <Text x={14} y={y} text={row} fontSize={9.5} fontStyle="bold" fontFamily="ui-monospace, monospace" fill={colors.label} align="center" width={12} />
            <Text x={w - 26} y={y} text={row} fontSize={9.5} fontStyle="bold" fontFamily="ui-monospace, monospace" fill={colors.label} align="center" width={12} />
          </Group>
        );
      })}

      {/* ── REALISTIC CONTACT SOCKET HOLES ──────────────────────────────────── */}
      {holes.map((hh) => {
        const p = holeToPixel(hh);
        const active = strip !== null && stripNetKey(hh) === strip;

        return (
          <Group key={`${p.x},${p.y},${hh.kind}`}>
            {/* Outer socket bezel / chamfer */}
            <Rect
              x={p.x - 4}
              y={p.y - 4}
              width={8}
              height={8}
              cornerRadius={1.8}
              fill={active ? 'rgba(99, 102, 241, 0.25)' : colors.socketBezel}
              stroke={active ? colors.activeStroke : dark ? '#343842' : '#ded9cb'}
              strokeWidth={active ? 1.2 : 0.6}
            />

            {/* Inner dark aperture */}
            <Rect
              x={p.x - 2.5}
              y={p.y - 2.5}
              width={5}
              height={5}
              cornerRadius={1}
              fill={active ? colors.activeGlow : colors.socketInner}
            />

            {/* Metallic spring-leaf contact reflections inside socket */}
            {!active && (
              <>
                <Line
                  points={[p.x - 1.5, p.y - 1.2, p.x + 1.5, p.y - 1.2]}
                  stroke={colors.metalClip}
                  strokeWidth={0.8}
                  opacity={0.7}
                />
                <Line
                  points={[p.x - 1.5, p.y + 1.2, p.x + 1.5, p.y + 1.2]}
                  stroke={colors.metalClipHighlight}
                  strokeWidth={0.8}
                  opacity={0.8}
                />
              </>
            )}

            {/* Hovered / Active glow ring */}
            {active && (
              <Circle
                x={p.x}
                y={p.y}
                radius={5.5}
                stroke="#ffffff"
                strokeWidth={1.2}
                fill={colors.activeGlow}
                opacity={0.9}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
});

export default BreadboardLayer;
