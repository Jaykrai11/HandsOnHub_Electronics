import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { COMPONENT_DEFS } from '../../data/componentDefs';
import { ComponentIcon } from '../canvas/ComponentIcons';
import type { ComponentCategory, ComponentKind } from '../../types';

const KIND_MIME = 'application/x-ec-kind';

const CATEGORIES: ComponentCategory[] = [
  'Sources',
  'Passive',
  'Semiconductors',
  'Switches',
  'Instruments',
  'Logic Gates',
  'Digital & ICs',
  'Microcontrollers & Sensors',
];

const CategoryColors: Record<ComponentCategory, string> = {
  Sources: '#f59e0b',
  Passive: '#60a5fa',
  Semiconductors: '#a78bfa',
  Switches: '#34d399',
  Instruments: '#fb923c',
  'Logic Gates': '#ec4899',
  'Digital & ICs': '#8b5cf6',
  'Microcontrollers & Sensors': '#10b981',
};

interface ComponentLibraryPanelProps {
  onClose?: () => void;
}

const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<ComponentCategory>>(new Set());
  const { setTool, tool, pendingKind } = useSimulatorStore();


  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return COMPONENT_DEFS.filter(d =>
      d.label.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<ComponentCategory, typeof COMPONENT_DEFS>();
    CATEGORIES.forEach(cat => map.set(cat, []));
    filtered.forEach(d => map.get(d.category)?.push(d));
    return map;
  }, [filtered]);

  const toggleCollapse = (cat: ComponentCategory) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleSelect = (kind: ComponentKind) => {
    if (tool === 'place' && pendingKind === kind) {
      setTool('select');
    } else {
      setTool('place', kind);
    }
  };

  return (
    <div className="ecs-panel ecs-library-panel">
      <div className="ecs-panel-header">
        <h2>Components</h2>
        {onClose && (
          <button
            type="button"
            className="ecs-panel-close-btn"
            onClick={onClose}
            aria-label="Close component library"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search */}
      <div className="ecs-search-box">
        <Search size={14} className="ecs-search-icon" />
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ecs-search-input"
        />
        {search && (
          <button className="ecs-search-clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {/* Categories */}
      <div className="ecs-library-list">
        {CATEGORIES.map(cat => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          const isCollapsed = collapsed.has(cat);
          const color = CategoryColors[cat];

          return (
            <div key={cat} className="ecs-category">
              <button
                className="ecs-category-header"
                onClick={() => toggleCollapse(cat)}
                style={{ '--cat-color': color } as React.CSSProperties}
              >
                <span className="ecs-category-dot" style={{ background: color }} />
                <span className="ecs-category-name">{cat}</span>
                <span className="ecs-category-count">{items.length}</span>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>

              {!isCollapsed && (
                <div className="ecs-component-grid">
                  {items.map(def => {
                    const isActive = tool === 'place' && pendingKind === def.kind;
                    return (
                      <button
                        key={def.kind}
                        className={`ecs-comp-tile${isActive ? ' active' : ''}`}
                        onClick={() => handleSelect(def.kind)}
                        title={def.description}
                        style={{ '--cat-color': color } as React.CSSProperties}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData(KIND_MIME, def.kind);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        <div className="ecs-comp-tile-icon">
                          <ComponentIcon
                            kind={def.kind}
                            size={44}
                            color={isActive ? 'var(--ecs-accent)' : 'var(--ecs-component-stroke)'}
                          />
                        </div>
                        <span className="ecs-comp-tile-label">{def.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComponentLibraryPanel;
