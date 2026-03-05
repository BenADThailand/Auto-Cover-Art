import { useState } from 'react';
import type { Recipe } from '../types';

interface Props {
  recipes: Recipe[];
  activeRecipeId: string | null;
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  onSaveAsNew: (name: string) => void;
  onResetToDefault: () => void;
}

export default function RecipeBar({
  recipes,
  activeRecipeId,
  onSave,
  onLoad,
  onDelete,
  onUpdate,
  onSaveAsNew,
  onResetToDefault,
}: Props) {
  const [savingNew, setSavingNew] = useState(false);
  const [name, setName] = useState('');

  const activeRecipe = activeRecipeId
    ? recipes.find((r) => r.id === activeRecipeId)
    : null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (activeRecipeId) {
      onSaveAsNew(trimmed);
    } else {
      onSave(trimmed);
    }
    setName('');
    setSavingNew(false);
  };

  return (
    <div className="recipe-bar">
      <div className="field-row">
        <label>Recipes</label>
        {activeRecipe && (
          <span className="badge">{activeRecipe.name}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {activeRecipeId && (
            <button className="btn btn-small btn-primary" onClick={onUpdate}>
              Save
            </button>
          )}
          {!savingNew ? (
            <button className="btn btn-small" onClick={() => setSavingNew(true)}>
              Save as New
            </button>
          ) : (
            <>
              <input
                type="text"
                className="input"
                placeholder="Recipe name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
                style={{ width: 130 }}
              />
              <button className="btn btn-small btn-primary" onClick={handleSave}>
                Save
              </button>
              <button
                className="btn btn-small"
                onClick={() => {
                  setSavingNew(false);
                  setName('');
                }}
              >
                Cancel
              </button>
            </>
          )}
          {activeRecipeId && (
            <button className="btn btn-small" onClick={onResetToDefault}>
              Reset
            </button>
          )}
        </div>
      </div>

      {recipes.length > 0 && (
        <div className="recipe-list">
          {recipes.map((r) => (
            <div
              key={r.id}
              className={`recipe-item ${r.id === activeRecipeId ? 'recipe-active' : ''}`}
            >
              <span className="recipe-name">{r.name}</span>
              <span className="recipe-meta">
                {r.canvasSize.width}x{r.canvasSize.height} · {r.layers.length} layers
              </span>
              <button className="btn btn-small" onClick={() => onLoad(r.id)}>
                Load
              </button>
              <button
                className="btn-delete"
                title="Delete recipe"
                onClick={() => onDelete(r.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
