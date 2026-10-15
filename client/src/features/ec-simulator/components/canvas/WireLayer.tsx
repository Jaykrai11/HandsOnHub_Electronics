import { Circle, Group, Line } from 'react-konva';
import { holeToPixel } from '../../lib/breadboard';
import type { HoleId, Wire, WireCurrent } from '../../types';

function elbow(from: HoleId, to: HoleId): number[] {
  const a = holeToPixel(from);
  const b = holeToPixel(to);
  if (a.x === b.x || a.y === b.y) return [a.x, a.y, b.x, b.y];
  return [a.x, a.y, b.x, a.y, b.x, b.y];
}

interface Props {
  wires: Wire[];
  currents: WireCurrent[];
  selectedIds: string[];
  preview: { from: HoleId; to: HoleId } | null;
  dashOffset: number;
  previewColor?: string;
  onSelect: (id: string) => void;
  onErase: (id: string) => void;
  eraseMode: boolean;
}

export default function WireLayer({
  wires,
  currents,
  selectedIds,
  preview,
  dashOffset,
  previewColor,
  onSelect,
  onErase,
  eraseMode,
}: Props) {
  return (
    <Group>
      {wires.map((w) => {
        const pts = elbow(w.from, w.to);
        const i = currents.find((c) => c.wireId === w.id)?.current ?? 0;
        const mag = Math.abs(i);
        const selected = selectedIds.includes(w.id);
        const flowing = mag > 5e-5;
        const wireColor = w.color || '#2563eb';
        return (
          <Group key={w.id}>
            <Line
              points={pts}
              stroke={selected ? '#a855f7' : wireColor}
              strokeWidth={selected ? 4.5 : 2.8}
              lineCap="round"
              lineJoin="round"
              hitStrokeWidth={12}
              onClick={(e) => {
                e.cancelBubble = true;
                if (eraseMode) onErase(w.id);
                else onSelect(w.id);
              }}
            />
            {flowing && (
              <Line
                points={pts}
                stroke="#fbbf24"
                strokeWidth={2}
                dash={[7, 10]}
                dashOffset={dashOffset * (i >= 0 ? -1 : 1)}
                lineCap="round"
                listening={false}
                opacity={Math.min(1, 0.35 + mag * 8)}
              />
            )}
          </Group>
        );
      })}
      {preview && (
        <Line points={elbow(preview.from, preview.to)} stroke={previewColor || '#3b82f6'} strokeWidth={2.5} dash={[6, 4]} listening={false} />
      )}
      {preview && (
        <Circle {...holeToPixel(preview.to)} radius={5} stroke={previewColor || '#3b82f6'} strokeWidth={1.5} listening={false} />
      )}
    </Group>
  );
}
