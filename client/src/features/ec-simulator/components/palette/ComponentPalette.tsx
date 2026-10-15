import { COMPONENT_DEFS } from '../../data/componentDefs';
import { useSimulatorStore } from '../../store/simulatorStore';
import type { ComponentKind } from '../../types';
import { KIND_MIME } from '../canvas/SimulatorCanvas';

const ORDER: ComponentKind[] = [
  'battery',
  'ground',
  'resistor',
  'capacitor',
  'inductor',
  'potentiometer',
  'ldr',
  'diode',
  'led',
  'buzzer',
  'pushbutton',
  'ammeter',
  'multimeter',
  'oscilloscope',
  'and_gate',
  'or_gate',
  'not_gate',
  'nand_gate',
  'nor_gate',
  'xor_gate',
  'seven_seg',
  'mux',
  'decoder',
  'flip_flop',
  'clock',
  'ir_sensor',
  'arduino',
];

export default function ComponentPalette() {
  const { tool, pendingKind, setTool } = useSimulatorStore();

  return (
    <aside className="ecs-palette">
      <div className="ecs-panel-head">
        <h2>Parts</h2>
        <p>Drag onto the board or click then click a hole.</p>
      </div>
      <div className="ecs-palette-grid">
        {ORDER.map((kind) => {
          const def = COMPONENT_DEFS.find((d) => d.kind === kind);
          if (!def) return null;
          const active = tool === 'place' && pendingKind === kind;
          return (
            <button
              key={kind}
              type="button"
              className={`ecs-part${active ? ' is-active' : ''}`}
              title={def.tooltip}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(KIND_MIME, kind);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => {
                if (active) setTool('select');
                else setTool('place', kind);
              }}
            >
              <span className={`ecs-part-icon kind-${kind}`} />
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
