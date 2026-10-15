import React, { useMemo } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';

interface OscilloscopeViewProps {
  compId: string;
}

const W = 260;
const H = 130;
const PAD = 16;

const OscilloscopeView: React.FC<OscilloscopeViewProps> = ({ compId }) => {
  const transient = useSimulatorStore((s) => s.transient);
  const trace = transient.scopeTraces[compId] ?? [];

  const { path, minV, maxV, tEnd } = useMemo(() => {
    if (trace.length < 2) return { path: '', minV: 0, maxV: 0, tEnd: 0 };
    const vvals = trace.map((pt) => pt.v);
    const mn = Math.min(...vvals);
    const mx = Math.max(...vvals);
    const range = mx - mn || 1;
    const tMax = trace[trace.length - 1].t;

    const pts = trace.map((pt, i) => {
      const x = PAD + ((pt.t / tMax) * (W - 2 * PAD));
      const y = PAD + ((1 - (pt.v - mn) / range) * (H - 2 * PAD));
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { path: pts.join(' '), minV: mn, maxV: mx, tEnd: tMax };
  }, [trace]);

  if (!path) {
    return (
      <div className="ecs-osc-empty">
        <p>Place in a circuit with a capacitor — simulation will plot voltage over time.</p>
      </div>
    );
  }

  return (
    <div className="ecs-osc-wrap">
      <svg width={W} height={H} className="ecs-osc-svg">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={`v${t}`}
            x1={PAD + t * (W - 2 * PAD)} y1={PAD}
            x2={PAD + t * (W - 2 * PAD)} y2={H - PAD}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1}
          />
        ))}
        {[0, 0.5, 1].map((t) => (
          <line
            key={`h${t}`}
            x1={PAD} y1={PAD + t * (H - 2 * PAD)}
            x2={W - PAD} y2={PAD + t * (H - 2 * PAD)}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1}
          />
        ))}
        {/* Zero line */}
        {minV < 0 && maxV > 0 && (() => {
          const y = PAD + ((1 - (0 - minV) / (maxV - minV)) * (H - 2 * PAD));
          return <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="4 2" />;
        })()}
        {/* Waveform */}
        <path d={path} stroke="#4ade80" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Labels */}
        <text x={PAD} y={PAD - 3} fontSize={9} fill="rgba(255,255,255,0.5)">{maxV.toFixed(2)}V</text>
        <text x={PAD} y={H - 3} fontSize={9} fill="rgba(255,255,255,0.5)">{minV.toFixed(2)}V</text>
        <text x={W - PAD} y={H - 3} fontSize={9} fill="rgba(255,255,255,0.5)" textAnchor="end">{tEnd.toFixed(3)}s</text>
      </svg>
    </div>
  );
};

export default OscilloscopeView;
