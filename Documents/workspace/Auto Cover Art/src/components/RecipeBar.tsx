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
      <div className="recipe-bar-header">
        <h3 className="recipe-bar-title">Recipes</h3>
        {activeRecipe && (
          <span className="recipe-active-badge">{activeRecipe.name}</span>
        )}
        <div className="recipe-bar-actions">
          {activeRecipeId && (
            <>
              <button className="btn btn-small btn-primary" onClick={onUpdate}>Save</button>
              <button className="btn btn-small" onClick={onResetToDefault}>Reset</button>
            </>
          )}
          {!savingNew ? (
            <button className="btn btn-small" onClick={() => setSavingNew(true)}>
              + New
            </button>
          ) : (
            <>
              <input
                type="text"
                className="input recipe-name-input"
                placeholder="Recipe name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button className="btn btn-small btn-primary" onClick={handleSave}>Save</button>
              <button className="btn btn-small" onClick={() => { setSavingNew(false); setName(''); }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {recipes.length > 0 && (
        <div className="recipe-grid">
          {recipes.map((r) => (
            <button
              key={r.id}
              className={`recipe-card ${r.id === activeRecipeId ? 'recipe-card-active' : ''}`}
              onClick={() => onLoad(r.id)}
            >
              <span className="recipe-card-name">{r.name}</span>
              <span className="recipe-card-meta">
                {r.canvasSize.width}&times;{r.canvasSize.height} &middot; {r.layers.length} layers
              </span>
              <span
                className="recipe-card-delete"
                title="Delete"
                onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
              >
                &times;
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
