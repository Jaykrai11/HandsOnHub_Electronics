import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Layers, Sliders, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useSimulatorStore } from './store/simulatorStore';
import SimulatorToolbar from './components/toolbar/SimulatorToolbar';
import ComponentLibraryPanel from './components/panels/ComponentLibraryPanel';
import SimulatorCanvas from './components/canvas/SimulatorCanvas';
import PropertiesPanel from './components/panels/PropertiesPanel';
import LabLogPanel from './components/panels/LabLogPanel';
import './simulator.css';

const ECSimulator: React.FC = () => {
  const { theme, tool, hint } = useSimulatorStore();
  const [mobilePanel, setMobilePanel] = useState<'library' | 'properties' | null>(null);

  // Responsive panel widths with optional drag-resize override
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [rightWidth, setRightWidth] = useState<number | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // When selecting a component to place, close the mobile drawer so user can tap breadboard holes
  useEffect(() => {
    if (tool === 'place') {
      setMobilePanel(null);
    }
  }, [tool]);

  // Reset custom pixel widths on window resize so panels resume fluid device-width scaling
  useEffect(() => {
    const handleResize = () => {
      // If user had manually dragged, we keep it bounded to screen ratio
      setLeftWidth((w) => (w ? Math.min(w, Math.round(window.innerWidth * 0.35)) : null));
      setRightWidth((w) => (w ? Math.min(w, Math.round(window.innerWidth * 0.45)) : null));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Left panel resize drag handler
  const handleLeftResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const currentW = leftWidth ?? (workspaceRef.current?.querySelector('.library-wrapper')?.clientWidth || 220);

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const dx = clientX - startX;
      const maxW = Math.round(window.innerWidth * 0.4);
      const newW = Math.max(150, Math.min(maxW, currentW + dx));
      setLeftWidth(newW);
      if (leftCollapsed) setLeftCollapsed(false);
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      document.body.classList.remove('ecs-resizing');
    };

    document.body.classList.add('ecs-resizing');
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }, [leftWidth, leftCollapsed]);

  // Right panel resize drag handler
  const handleRightResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const currentW = rightWidth ?? (workspaceRef.current?.querySelector('.right-wrapper')?.clientWidth || 320);

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const dx = startX - clientX;
      const maxW = Math.round(window.innerWidth * 0.48);
      const newW = Math.max(220, Math.min(maxW, currentW + dx));
      setRightWidth(newW);
      if (rightCollapsed) setRightCollapsed(false);
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      document.body.classList.remove('ecs-resizing');
    };

    document.body.classList.add('ecs-resizing');
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }, [rightWidth, rightCollapsed]);

  return (
    <div className={`ecs-root${theme === 'dark' ? ' dark' : ''}`} data-theme={theme}>
      <SimulatorToolbar
        onOpenLibrary={() => setMobilePanel((p) => (p === 'library' ? null : 'library'))}
        onOpenProperties={() => setMobilePanel((p) => (p === 'properties' ? null : 'properties'))}
      />

      {/* Mobile Drawer Backdrop */}
      {mobilePanel && (
        <div
          className="ecs-mobile-backdrop"
          onClick={() => setMobilePanel(null)}
          aria-hidden="true"
        />
      )}

      <div className="ecs-workspace" ref={workspaceRef}>
        {/* Left Aside: Component Library Panel */}
        <aside
          className={`ecs-panel-wrapper library-wrapper${mobilePanel === 'library' ? ' mobile-open' : ''}${
            leftCollapsed ? ' collapsed' : ''
          }`}
          style={!leftCollapsed && leftWidth ? { width: `${leftWidth}px`, flex: `0 0 ${leftWidth}px` } : undefined}
          aria-label="Component library"
        >
          <ComponentLibraryPanel onClose={() => setMobilePanel(null)} />
        </aside>

        {/* Left Resizer Splitter Bar */}
        <div
          className={`ecs-splitter left-splitter${leftCollapsed ? ' is-collapsed' : ''}`}
          onMouseDown={handleLeftResizeStart}
          onTouchStart={handleLeftResizeStart}
          onDoubleClick={() => {
            setLeftWidth(null);
            setLeftCollapsed(false);
          }}
          title="Drag to resize component library · Double-click to reset"
          role="separator"
          aria-orientation="vertical"
        >
          <button
            type="button"
            className="ecs-splitter-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setLeftCollapsed((v) => !v);
            }}
            title={leftCollapsed ? 'Expand Components' : 'Collapse Components'}
            aria-label="Toggle Left Panel"
          >
            {leftCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
          <div className="ecs-splitter-grip">
            <GripVertical size={10} />
          </div>
        </div>

        {/* Center Main Canvas & Breadboard Workspace */}
        <main className="ecs-canvas-area">
          <SimulatorCanvas />
          <LabLogPanel />

          <div className="ecs-canvas-hint">
            <span className="ecs-hint-desktop">
              {hint || 'Double-click wire endpoint to finish · Scroll to zoom · Middle-click to pan · R rotate · Del delete'}
            </span>
            <span className="ecs-hint-mobile">
              {hint || 'Tap hole to wire/place · Pinch to zoom · Drag to pan'}
            </span>
          </div>

          {/* Mobile Bottom Quick Navigation Dock */}
          <nav className="ecs-mobile-dock" aria-label="Mobile Navigation">
            <button
              type="button"
              className={`ecs-dock-btn${mobilePanel === 'library' ? ' active' : ''}`}
              onClick={() => setMobilePanel((p) => (p === 'library' ? null : 'library'))}
              aria-label="Toggle Component Library"
            >
              <Layers size={18} />
              <span>Components</span>
            </button>
            <button
              type="button"
              className={`ecs-dock-btn${mobilePanel === 'properties' ? ' active' : ''}`}
              onClick={() => setMobilePanel((p) => (p === 'properties' ? null : 'properties'))}
              aria-label="Toggle Inspector and Simulation"
            >
              <Sliders size={18} />
              <span>Inspector</span>
            </button>
          </nav>
        </main>

        {/* Right Resizer Splitter Bar */}
        <div
          className={`ecs-splitter right-splitter${rightCollapsed ? ' is-collapsed' : ''}`}
          onMouseDown={handleRightResizeStart}
          onTouchStart={handleRightResizeStart}
          onDoubleClick={() => {
            setRightWidth(null);
            setRightCollapsed(false);
          }}
          title="Drag to resize inspector dossier · Double-click to reset"
          role="separator"
          aria-orientation="vertical"
        >
          <button
            type="button"
            className="ecs-splitter-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setRightCollapsed((v) => !v);
            }}
            title={rightCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
            aria-label="Toggle Right Panel"
          >
            {rightCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>
          <div className="ecs-splitter-grip">
            <GripVertical size={10} />
          </div>
        </div>

        {/* Right Aside: Component Inspector & Dossier */}
        <aside
          className={`ecs-panel-wrapper right-wrapper${mobilePanel === 'properties' ? ' mobile-open' : ''}${
            rightCollapsed ? ' collapsed' : ''
          }`}
          style={!rightCollapsed && rightWidth ? { width: `${rightWidth}px`, flex: `0 0 ${rightWidth}px` } : undefined}
          aria-label="Inspector and Properties"
        >
          <PropertiesPanel onClose={() => setMobilePanel(null)} />
        </aside>
      </div>
    </div>
  );
};

export default ECSimulator;
