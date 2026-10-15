import React from 'react';
import {
  MousePointer2,
  Spline,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  FlipHorizontal2,
  RotateCw as Rot,
  Sun,
  Moon,
  Zap,
  Layers,
  Sliders,
  Play,
  Square,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import { EXAMPLE_NAMES } from '../../data/examples';
import { redoSim, undoSim, useSimulatorStore } from '../../store/simulatorStore';
import type { ToolMode } from '../../types';

interface SimulatorToolbarProps {
  onOpenLibrary?: () => void;
  onOpenProperties?: () => void;
}

function Btn({
  icon,
  label,
  showLabel = true,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  showLabel?: boolean;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`ecs-tool-btn${active ? ' active' : ''}${danger ? ' danger' : ''}${!showLabel ? ' icon-only' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
      {showLabel && <span className="ecs-tool-label">{label}</span>}
    </button>
  );
}

const WIRE_COLORS = [
  { id: 'red', name: 'Red (+)', hex: '#ef4444' },
  { id: 'black', name: 'Black (GND)', hex: '#1e293b' },
  { id: 'blue', name: 'Blue', hex: '#2563eb' },
  { id: 'green', name: 'Green', hex: '#16a34a' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'purple', name: 'Purple', hex: '#a855f7' },
  { id: 'white', name: 'White', hex: '#f8fafc' },
];

export default function SimulatorToolbar({ onOpenLibrary, onOpenProperties }: SimulatorToolbarProps) {
  const {
    tool,
    setTool,
    theme,
    toggleTheme,
    selectedIds,
    deleteSelected,
    rotateSelected,
    flipSelected,
    clearAll,
    loadExample,
    wireColor,
    setSelectedWireColor,
    isSimulating,
    toggleSimulation,
    isLogOpen,
    toggleLog,
    logs,
  } = useSimulatorStore();

  const mode = (m: ToolMode) => setTool(m);

  return (
    <header className="ecs-toolbar">
      {/* Brand Header */}
      <div className="ecs-brand">
        <Zap size={18} className="ecs-brand-icon" />
        <span className="ecs-brand-title">HandsOnHub</span>
        <span className="ecs-brand-sub">Circuits</span>
      </div>

      <div className="ecs-toolbar-divider" />

      {/* Main Groups */}
      <div className="ecs-toolbar-groups">
        {/* Simulation Run / Stop Control Button */}
        <div className="ecs-toolbar-group">
          <button
            type="button"
            className={`ecs-sim-toggle-btn${isSimulating ? ' is-running' : ' is-stopped'}`}
            onClick={toggleSimulation}
            title={isSimulating ? 'Stop Simulation (Turn Power OFF)' : 'Start Simulation (Turn Power ON)'}
            aria-label={isSimulating ? 'Stop Simulation' : 'Start Simulation'}
          >
            {isSimulating ? (
              <>
                <span className="ecs-sim-live-dot" />
                <Square size={13} fill="currentColor" />
                <span>Stop Simulation</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Start Simulation</span>
              </>
            )}
          </button>

          {/* Lab Log & Readings Toggle */}
          <button
            type="button"
            className={`ecs-log-toggle-btn${isLogOpen ? ' active' : ''}`}
            onClick={toggleLog}
            title="Open Experiment Step Log and Readings Ledger"
            aria-label="Toggle Lab Log"
          >
            <ClipboardList size={14} />
            <span>Lab Log</span>
            {logs.length > 0 && <span className="ecs-log-count-tag">{logs.length}</span>}
          </button>
        </div>

        <div className="ecs-toolbar-divider" />

        {/* Mobile quick panel toggles */}
        {(onOpenLibrary || onOpenProperties) && (
          <div className="ecs-toolbar-group ecs-mobile-toggles">
            {onOpenLibrary && (
              <Btn icon={<Layers size={15} />} label="Parts" onClick={onOpenLibrary} />
            )}
            {onOpenProperties && (
              <Btn icon={<Sliders size={15} />} label="Props" onClick={onOpenProperties} />
            )}
          </div>
        )}

        {/* Tools: Select, Wire, Erase */}
        <div className="ecs-toolbar-group">
          <Btn icon={<MousePointer2 size={15} />} label="Select" active={tool === 'select'} onClick={() => mode('select')} />
          <Btn icon={<Spline size={15} />} label="Wire" active={tool === 'wire'} onClick={() => mode('wire')} />
          <Btn icon={<Eraser size={15} />} label="Erase" active={tool === 'erase'} onClick={() => mode('erase')} />
        </div>

        {/* Wire Color Palette */}
        <div className="ecs-toolbar-group ecs-wire-colors" title="Select Wire Color">
          {WIRE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ecs-wire-color-swatch${wireColor === c.hex ? ' active' : ''}`}
              style={{ backgroundColor: c.hex }}
              title={`Wire: ${c.name}`}
              onClick={() => {
                setSelectedWireColor(c.hex);
                if (tool !== 'wire' && selectedIds.length === 0) mode('wire');
              }}
            />
          ))}
        </div>

        <div className="ecs-toolbar-divider" />

        {/* Transforms */}
        <div className="ecs-toolbar-group">
          <Btn icon={<Rot size={15} />} label="Rotate 90° (R)" showLabel={false} onClick={rotateSelected} />
          <Btn icon={<FlipHorizontal2 size={15} />} label="Flip Horizontal" showLabel={false} onClick={flipSelected} />
          <Btn icon={<Trash2 size={15} />} label="Delete Selected (Del)" showLabel={false} danger onClick={deleteSelected} />
        </div>

        {/* History: Undo / Redo */}
        <div className="ecs-toolbar-group">
          <Btn icon={<RotateCcw size={15} />} label="Undo (Ctrl+Z)" showLabel={false} onClick={undoSim} />
          <Btn icon={<RotateCw size={15} />} label="Redo (Ctrl+Y)" showLabel={false} onClick={redoSim} />
        </div>

        <div className="ecs-toolbar-divider" />

        {/* Syllabus / Examples Circuit Loader */}
        <div className="ecs-example-select-wrap">
          <BookOpen size={14} />
          <select
            className="ecs-example-select-input"
            value=""
            onChange={(e) => {
              if (e.target.value) loadExample(e.target.value);
              e.target.value = '';
            }}
            aria-label="Load circuit preset"
          >
            <option value="">Load Preset…</option>
            {EXAMPLE_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Breadboard */}
        <div className="ecs-toolbar-group">
          <Btn
            icon={<Trash2 size={15} />}
            label="Clear Breadboard"
            showLabel={false}
            danger
            onClick={() => {
              if (confirm('Clear the breadboard?')) clearAll();
            }}
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="ecs-toolbar-right">
        {selectedIds.length > 0 && <span className="ecs-sel-count">{selectedIds.length} Selected</span>}
        <button
          type="button"
          className="ecs-tool-btn ecs-theme-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
