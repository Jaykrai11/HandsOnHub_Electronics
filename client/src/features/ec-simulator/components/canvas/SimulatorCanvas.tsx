import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import { ZoomIn, ZoomOut, Maximize2, Hand } from 'lucide-react';
import { boardHeight, boardWidth, pixelToNearestHole } from '../../lib/breadboard';
import { useSimulatorStore } from '../../store/simulatorStore';
import type { HoleId } from '../../types';
import BreadboardLayer from './BreadboardLayer';
import ComponentLayer from './ComponentLayer';
import WireLayer from './WireLayer';

const KIND_MIME = 'application/x-ec-kind';

export default function SimulatorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [transform, setTransform] = useState({ x: 24, y: 16, scale: 1 });
  const [hover, setHover] = useState<HoleId | null>(null);
  const [dash, setDash] = useState(0);
  const [panMode, setPanMode] = useState(false);
  const pan = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;

  const {
    components,
    wires,
    tool,
    pendingKind,
    selectedIds,
    theme,
    simResult,
    wireStart,
    wireColor,
    isSimulating,
    addComponentAt,
    moveComponent,
    setSelected,
    deleteSelected,
    addWire,
    setWireStart,
    removeWire,
    setButton,
    setHint,
  } = useSimulatorStore();

  // Track whether user has manually panned or zoomed
  const hasManualTransform = useRef(false);
  const initialFitDone = useRef(false);

  // Auto-fit breadboard to the container dimensions with uniform responsive scaling
  const fitToScreen = useCallback(
    (w = size.w, h = size.h) => {
      if (w <= 0 || h <= 0) return;
      const bw = boardWidth();
      const bh = boardHeight();
      const padX = w < 640 ? 12 : w < 1024 ? 20 : 36;
      const padY = h < 500 ? 12 : h < 800 ? 20 : 36;
      const availW = Math.max(80, w - padX * 2);
      const availH = Math.max(80, h - padY * 2);

      // Optimal scale: uniform across devices, never excessively bloated on 4K nor microscopic on phones
      const s = Math.min(availW / bw, availH / bh, 1.2);
      const clampedScale = Math.max(0.4, Math.min(1.8, Number(s.toFixed(3))));
      const x = Math.round((w - bw * clampedScale) / 2);
      const y = Math.round((h - bh * clampedScale) / 2);

      setTransform({ x, y, scale: clampedScale });
    },
    [size.w, size.h],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const nw = Math.round(e.contentRect.width);
      const nh = Math.round(e.contentRect.height);
      setSize({ w: nw, h: nh });
      if ((!hasManualTransform.current || !initialFitDone.current) && nw > 50 && nh > 50) {
        initialFitDone.current = true;
        fitToScreen(nw, nh);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitToScreen]);

  useEffect(() => {
    let raf = 0;
    if (!isSimulating) return;
    const loop = () => {
      setDash((d) => d + 1.4);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isSimulating]);

  const toBoard = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: (clientX - r.left - transform.x) / transform.scale,
        y: (clientY - r.top - transform.y) / transform.scale,
      };
    },
    [transform],
  );

  const holeFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const p = toBoard(clientX, clientY);
      return pixelToNearestHole(p.x, p.y);
    },
    [toBoard],
  );

  const zoomAround = (factor: number, cx: number, cy: number) => {
    hasManualTransform.current = true;
    setTransform((t) => {
      const ns = Math.min(2.6, Math.max(0.35, Number((t.scale * factor).toFixed(3))));
      return {
        scale: ns,
        x: cx - ((cx - t.x) / t.scale) * ns,
        y: cy - ((cy - t.y) / t.scale) * ns,
      };
    });
  };

  const zoomIn = () => zoomAround(1.15, size.w / 2, size.h / 2);
  const zoomOut = () => zoomAround(0.87, size.w / 2, size.h / 2);
  const resetZoom = () => {
    hasManualTransform.current = true;
    setTransform({
      scale: 1,
      x: Math.round((size.w - boardWidth()) / 2),
      y: Math.round((size.h - boardHeight()) / 2),
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    zoomAround(factor, mx, my);
  };

  const handleInteractionAt = (clientX: number, clientY: number, isDirectTap = false) => {
    const hole = holeFromEvent(clientX, clientY);

    if (tool === 'place' && pendingKind && hole) {
      const ok = addComponentAt(pendingKind, hole);
      if (!ok) setHint('That footprint does not fit here — try another hole or rotate after placing.');
      return;
    }
    if (tool === 'wire' && hole) {
      if (!wireStart) {
        setWireStart(hole);
        setHint('Tap or click a second hole to finish the jumper wire.');
      } else {
        addWire(wireStart, hole);
        setHint('Jumper added. Tap another hole to start a new wire.');
      }
      return;
    }
    if (tool === 'select' && isDirectTap) {
      // If tapped empty space
      if (!hole) {
        setSelected([]);
      }
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (panMode || e.button === 1 || e.button === 2) {
      pan.current = { ox: transform.x, oy: transform.y, sx: e.clientX, sy: e.clientY };
      return;
    }
    if (e.button !== 0) return;

    // Check if clicking on background stage directly
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    const isCanvas = targetTag === 'canvas';

    const hole = holeFromEvent(e.clientX, e.clientY);
    if (!hole && isCanvas && tool === 'select') {
      pan.current = { ox: transform.x, oy: transform.y, sx: e.clientX, sy: e.clientY };
      setSelected([]);
      return;
    }

    handleInteractionAt(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (pan.current) {
      const dx = e.clientX - pan.current.sx;
      const dy = e.clientY - pan.current.sy;
      setTransform((t) => ({ ...t, x: pan.current!.ox + dx, y: pan.current!.oy + dy }));
      return;
    }
    setHover(holeFromEvent(e.clientX, e.clientY));
  };

  const onMouseUp = () => {
    pan.current = null;
  };

  // ── Touch Gesture Support (Device-friendly Pinch & Pan) ──
  const touchInfo = useRef<{
    startX: number;
    startY: number;
    startTransform: { x: number; y: number; scale: number };
    startDist: number;
    startMidX: number;
    startMidY: number;
    isPinch: boolean;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    startTransform: { x: 0, y: 0, scale: 1 },
    startDist: 0,
    startMidX: 0,
    startMidY: 0,
    isPinch: false,
    moved: false,
  });

  const onTouchStart = (e: React.TouchEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchInfo.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTransform: { ...transform },
        startDist: 0,
        startMidX: t.clientX - r.left,
        startMidY: t.clientY - r.top,
        isPinch: false,
        moved: false,
      };
      setHover(holeFromEvent(t.clientX, t.clientY));
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2 - r.left;
      const midY = (t1.clientY + t2.clientY) / 2 - r.top;
      touchInfo.current = {
        startX: 0,
        startY: 0,
        startTransform: { ...transform },
        startDist: dist,
        startMidX: midX,
        startMidY: midY,
        isPinch: true,
        moved: true,
      };
      setHover(null);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    if (e.touches.length === 1 && !touchInfo.current.isPinch) {
      const t = e.touches[0];
      const dx = t.clientX - touchInfo.current.startX;
      const dy = t.clientY - touchInfo.current.startY;
      if (Math.hypot(dx, dy) > 6) {
        touchInfo.current.moved = true;
      }

      // Pan if panMode is on, or in select/erase mode dragging empty background
      if (panMode || touchInfo.current.moved) {
        const { startTransform } = touchInfo.current;
        setTransform((prev) => ({
          ...prev,
          x: startTransform.x + dx,
          y: startTransform.y + dy,
        }));
      } else {
        setHover(holeFromEvent(t.clientX, t.clientY));
      }
    } else if (e.touches.length === 2 && touchInfo.current.isPinch) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const curMidX = (t1.clientX + t2.clientX) / 2 - r.left;
      const curMidY = (t1.clientY + t2.clientY) / 2 - r.top;

      if (touchInfo.current.startDist > 0) {
        const ratio = dist / touchInfo.current.startDist;
        const initScale = touchInfo.current.startTransform.scale;
        const newScale = Math.min(2.6, Math.max(0.35, initScale * ratio));

        // Pivot around initial midpoint + translation from moving fingers
        const initX = touchInfo.current.startTransform.x;
        const initY = touchInfo.current.startTransform.y;
        const midX = touchInfo.current.startMidX;
        const midY = touchInfo.current.startMidY;

        const nx = curMidX - ((midX - initX) / initScale) * newScale;
        const ny = curMidY - ((midY - initY) / initScale) * newScale;

        setTransform({ x: nx, y: ny, scale: newScale });
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchInfo.current.moved && !touchInfo.current.isPinch) {
      // It was a tap!
      handleInteractionAt(touchInfo.current.startX, touchInfo.current.startY, true);
    }
    if (e.touches.length === 0) {
      touchInfo.current.isPinch = false;
      touchInfo.current.moved = false;
      setHover(null);
    }
  };

  const onDoubleClick = () => {
    if (tool === 'wire') setWireStart(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData(KIND_MIME) as typeof pendingKind;
    const hole = holeFromEvent(e.clientX, e.clientY);
    if (kind && hole) {
      const ok = addComponentAt(kind, hole);
      if (!ok) setHint('Cannot place there — holes are occupied or off the board.');
    }
  };

  const dark = theme === 'dark';

  return (
    <div
      ref={wrapRef}
      className={`ecs-canvas${panMode ? ' pan-active' : ''}`}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        pan.current = null;
        setHover(null);
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        touchInfo.current.isPinch = false;
        touchInfo.current.moved = false;
      }}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Stage width={size.w} height={size.h} pixelRatio={dpr} listening>
        <Layer x={transform.x} y={transform.y} scaleX={transform.scale} scaleY={transform.scale}>
          <BreadboardLayer dark={dark} hover={hover} />
          <WireLayer
            wires={wires}
            currents={simResult?.wireCurrents ?? []}
            selectedIds={selectedIds}
            preview={wireStart && hover ? { from: wireStart, to: hover } : null}
            previewColor={wireColor}
            dashOffset={dash}
            eraseMode={tool === 'erase'}
            onSelect={(id) => setSelected([id])}
            onErase={removeWire}
          />
          <ComponentLayer
            components={components}
            selectedIds={selectedIds}
            simResult={simResult}
            labelColor="#1e293b"
            eraseMode={tool === 'erase'}
            onSelect={(id) => setSelected([id])}
            onErase={(id) => {
              setSelected([id]);
              deleteSelected();
            }}
            onDragEnd={(id, hole) => moveComponent(id, hole)}
            holeAt={pixelToNearestHole}
            onButton={setButton}
          />
        </Layer>
      </Stage>

      {/* Floating Canvas Viewport Controls */}
      <div className="ecs-canvas-controls" role="toolbar" aria-label="Canvas Zoom and Viewport Controls">
        <button
          type="button"
          className="ecs-ctrl-btn"
          onClick={zoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          className="ecs-ctrl-btn"
          onClick={zoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          className="ecs-ctrl-btn"
          onClick={() => {
            hasManualTransform.current = false;
            fitToScreen();
          }}
          title="Fit board to screen"
          aria-label="Fit board to screen"
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          className="ecs-ctrl-btn ecs-ctrl-pct"
          onClick={resetZoom}
          title="Reset to 100%"
          aria-label="Reset zoom to 100%"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <button
          type="button"
          className={`ecs-ctrl-btn${panMode ? ' active' : ''}`}
          onClick={() => setPanMode(!panMode)}
          title={panMode ? 'Pan mode active (tap to turn off)' : 'Hand / Pan tool'}
          aria-label="Toggle Pan Tool"
        >
          <Hand size={14} />
        </button>
      </div>
    </div>
  );
}

export { KIND_MIME };
