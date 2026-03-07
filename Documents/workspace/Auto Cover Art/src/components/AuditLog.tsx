import { useState, useMemo } from 'react';
import type { Recipe, Menu, SharedAsset, EditHistoryEntry } from '../types';

interface AuditRow {
  itemType: 'Recipe' | 'Menu' | 'Asset';
  itemName: string;
  entry: EditHistoryEntry;
}

interface Props {
  recipes: Recipe[];
  menus: Menu[];
  assets: SharedAsset[];
}

export default function AuditLog({ recipes, menus, assets }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEditor, setFilterEditor] = useState('');

  const rows = useMemo(() => {
    const all: AuditRow[] = [];

    for (const r of recipes) {
      for (const entry of r.editHistory ?? []) {
        all.push({ itemType: 'Recipe', itemName: r.name, entry });
      }
    }
    for (const m of menus) {
      for (const entry of m.editHistory ?? []) {
        all.push({ itemType: 'Menu', itemName: m.name, entry });
      }
    }
    for (const a of assets) {
      for (const entry of a.editHistory ?? []) {
        all.push({ itemType: 'Asset', itemName: a.name, entry });
      }
    }

    all.sort((a, b) => b.entry.editedAt - a.entry.editedAt);
    return all;
  }, [recipes, menus, assets]);

  const filtered = rows.filter((row) => {
    if (filterType !== 'all' && row.itemType !== filterType) return false;
    if (filterEditor && !row.entry.editedByName.toLowerCase().includes(filterEditor.toLowerCase())) return false;
    return true;
  });

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatValue = (val: unknown): string => {
    if (val === undefined || val === null) return '(empty)';
    if (typeof val === 'string') return val.length > 80 ? val.slice(0, 80) + '...' : val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    const json = JSON.stringify(val);
    return json.length > 80 ? json.slice(0, 80) + '...' : json;
  };

  return (
    <div className="audit-log">
      <div className="audit-header">
        <h2>Audit Log</h2>
        <div className="audit-filters">
          <select
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: 'auto', minWidth: 120 }}
          >
            <option value="all">All Types</option>
            <option value="Recipe">Recipes</option>
            <option value="Menu">Menus</option>
            <option value="Asset">Assets</option>
          </select>
          <input
            className="input"
            placeholder="Filter by editor..."
            value={filterEditor}
            onChange={(e) => setFilterEditor(e.target.value)}
            style={{ maxWidth: 200 }}
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          No edit history yet.
        </p>
      )}

      <div className="audit-table">
        {filtered.map((row, idx) => (
          <div key={idx} className="audit-row">
            <div
              className="audit-row-summary"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <span className="audit-date">{formatDate(row.entry.editedAt)}</span>
              <span className={`audit-type-badge audit-type-${row.itemType.toLowerCase()}`}>
                {row.itemType}
              </span>
              <span className="audit-item-name">{row.itemName}</span>
              <span className="audit-editor">{row.entry.editedByName}</span>
              <span className="audit-change-count">
                {row.entry.changes.length} change{row.entry.changes.length !== 1 ? 's' : ''}
              </span>
              <span className="audit-expand">{expandedIdx === idx ? '\u25B2' : '\u25BC'}</span>
            </div>
            {expandedIdx === idx && (
              <div className="audit-diff">
                {row.entry.changes.map((change, ci) => (
                  <div key={ci} className="field-change">
                    <span className="field-change-name">{change.field}</span>
                    <span className="field-change-old">{formatValue(change.oldValue)}</span>
                    <span className="field-change-arrow">&rarr;</span>
                    <span className="field-change-new">{formatValue(change.newValue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
