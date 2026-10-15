import { holeToPixel } from '../../lib/breadboard';
import { firstLead } from '../../lib/placement';
import { formatValue } from '../../lib/format';
import type { HoleId, PlacedComponent, SimulationResult } from '../../types';
import { ComponentSprite } from './sprites';
import { Group } from 'react-konva';

interface Props {
  components: PlacedComponent[];
  selectedIds: string[];
  simResult: SimulationResult | null;
  labelColor: string;
  eraseMode: boolean;
  onSelect: (id: string) => void;
  onErase: (id: string) => void;
  onDragEnd: (id: string, hole: HoleId) => void;
  holeAt: (x: number, y: number) => HoleId | null;
  onButton: (id: string, closed: boolean) => void;
}

export default function ComponentLayer({
  components,
  selectedIds,
  simResult,
  labelColor,
  eraseMode,
  onSelect,
  onErase,
  onDragEnd,
  holeAt,
  onButton,
}: Props) {
  return (
    <Group>
      {components.map((comp) => {
        const cr = simResult?.componentResults.find((r) => r.componentId === comp.id);
        let reading: string | undefined;
        if (comp.kind === 'ammeter' && cr) {
          reading = formatValue(cr.reading ?? 0, 'A');
        }
        if (comp.kind === 'multimeter' && cr) {
          const mode = String(comp.props.mode ?? 'voltage');
          reading = formatValue(cr.reading ?? 0, mode === 'current' ? 'A' : 'V');
        }
        if (comp.kind === 'oscilloscope' && cr) {
          reading = formatValue(cr.voltage, 'V');
        }
        const origin = holeToPixel(firstLead(comp));
        return (
          <Group
            key={comp.id}
            draggable={!eraseMode}
            onClick={(e) => {
              e.cancelBubble = true;
              if (eraseMode) onErase(comp.id);
              else onSelect(comp.id);
            }}
            onMouseDown={() => {
              if (comp.kind === 'pushbutton') onButton(comp.id, true);
            }}
            onMouseUp={() => {
              if (comp.kind === 'pushbutton') onButton(comp.id, false);
            }}
            onMouseLeave={() => {
              if (comp.kind === 'pushbutton') onButton(comp.id, false);
            }}
            onDragEnd={(e) => {
              const hole = holeAt(origin.x + e.target.x(), origin.y + e.target.y());
              e.target.position({ x: 0, y: 0 });
              if (hole) onDragEnd(comp.id, hole);
            }}
          >
            <ComponentSprite
              comp={comp}
              selected={selectedIds.includes(comp.id)}
              labelColor={labelColor}
              brightness={cr?.brightness ?? 0}
              reading={reading}
              on={Boolean(cr?.on) || Boolean(comp.props.closed)}
            />
          </Group>
        );
      })}
    </Group>
  );
}
