import { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { canDelete } from '../lib/permissions';
import type { Menu } from '../types';

interface Props {
  menus: Menu[];
  activeMenuId: string | null;
  menuName: string;
  onMenuNameChange: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  onCancel: () => void;
  onNew: () => void;
  isDirty: boolean;
}

export default function MenuBar({
  menus,
  activeMenuId,
  menuName,
  onMenuNameChange,
  onLoad,
  onDelete,
  onSave,
  onSaveAsNew,
  onCancel,
  onNew,
  isDirty,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const user = useUser();

  const activeMenu = activeMenuId
    ? menus.find((m) => m.id === activeMenuId)
    : null;

  return (
    <div className="menu-bar">
      <div className="menu-bar-header">
        <h3 className="menu-bar-title">Menus</h3>
        {activeMenu && !editingName && (
          <span
            className="menu-active-badge"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {activeMenu.name}
          </span>
        )}
        {editingName && (
          <input
            type="text"
            className="input menu-name-input"
            value={menuName}
            onChange={(e) => onMenuNameChange(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingName(false);
            }}
            autoFocus
          />
        )}
        <div className="menu-bar-actions">
          {activeMenuId && (
            <button
              className="btn btn-small btn-primary"
              onClick={onSave}
              disabled={!isDirty || !menuName.trim()}
            >
              Save
            </button>
          )}
          {activeMenuId && isDirty && (
            <button className="btn btn-small btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          {activeMenuId && (
            <button
              className="btn btn-small"
              onClick={onSaveAsNew}
              disabled={!menuName.trim()}
            >
              Save as New
            </button>
          )}
          <button className="btn btn-small" onClick={onNew}>
            + New
          </button>
        </div>
      </div>

      {menus.length > 0 && (
        <div className="menu-grid">
          {menus.map((m) => (
            <button
              key={m.id}
              className={`menu-card ${m.id === activeMenuId ? 'menu-card-active' : ''}`}
              onClick={() => onLoad(m.id)}
            >
              <span className="menu-card-name">{m.name}</span>
              <span className="menu-card-meta">
                {m.slots.length} slot{m.slots.length !== 1 ? 's' : ''}
              </span>
              {m.createdByName && (
                <span className="creator-badge">{m.createdByName}</span>
              )}
              {canDelete(user, m) && (
                <span
                  className="menu-card-delete"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(m.id);
                  }}
                >
                  &times;
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
