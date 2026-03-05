import { useState } from 'react';
import { generateKeyword } from '../api';
import { useSystemFonts } from '../hooks/useSystemFonts';
import type { KeywordLayer } from '../types';

interface Props {
  layers: KeywordLayer[];
  onLayersChange: (layers: KeywordLayer[]) => void;
  reportContent: string;
  selectedLayerId: number | null;
  onSelectLayer: (id: number | null) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: number) => void;
}

export default function KeywordLayers({
  layers,
  onLayersChange,
  reportContent,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
}: Props) {
  const [generating, setGenerating] = useState<number | null>(null);
  const { fonts, isLoaded } = useSystemFonts();

  const update = (id: number, patch: Partial<KeywordLayer>) => {
    onLayersChange(
      layers.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const handleAiGenerate = async (layer: KeywordLayer) => {
    if (!reportContent) return;
    setGenerating(layer.id);
    try {
      const existing = layers
        .filter((l) => l.text && l.id !== layer.id)
        .map((l) => l.text);
      const keyword = await generateKeyword(reportContent, existing, layer.aiPrompt);
      update(layer.id, { text: keyword });
    } catch {
      // silently fail — user can type manually
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="keyword-layers">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className={`layer-card ${selectedLayerId === layer.id ? 'selected' : ''}`}
          onClick={() => onSelectLayer(layer.id)}
        >
          <div className="layer-header">
            <strong>Layer {layer.id}</strong>
            <button
              className="btn-delete"
              title="Delete layer"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLayer(layer.id);
              }}
            >
              ×
            </button>
          </div>

          <div className="layer-fields">
            <div className="field-row">
              <label>AI Prompt</label>
              <input
                type="text"
                className="input"
                value={layer.aiPrompt}
                onChange={(e) => update(layer.id, { aiPrompt: e.target.value })}
                placeholder="e.g. focus on location, luxury, price..."
              />
            </div>

            <div className="field-row">
              <label>Text</label>
              <input
                type="text"
                className="input"
                value={layer.text}
                onChange={(e) => update(layer.id, { text: e.target.value })}
                placeholder="Keyword text"
              />
              <button
                className="btn btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAiGenerate(layer);
                }}
                disabled={!reportContent || generating === layer.id}
              >
                {generating === layer.id ? 'AI...' : 'AI Generate'}
              </button>
            </div>

            <div className="field-row">
              <label>X %</label>
              <input
                type="number"
                className="input input-small"
                min={0}
                max={100}
                value={layer.xPercent}
                onChange={(e) =>
                  update(layer.id, { xPercent: Number(e.target.value) })
                }
              />
              <label>Y %</label>
              <input
                type="number"
                className="input input-small"
                min={0}
                max={100}
                value={layer.yPercent}
                onChange={(e) =>
                  update(layer.id, { yPercent: Number(e.target.value) })
                }
              />
            </div>

            <div className="field-row">
              <label>Orientation</label>
              <label className="radio-label">
                <input
                  type="radio"
                  name={`orient-${layer.id}`}
                  checked={layer.orientation === 'horizontal'}
                  onChange={() => update(layer.id, { orientation: 'horizontal' })}
                />
                Horizontal
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name={`orient-${layer.id}`}
                  checked={layer.orientation === 'vertical'}
                  onChange={() => update(layer.id, { orientation: 'vertical' })}
                />
                Vertical
              </label>
            </div>

            <div className="field-row">
              <label>Font</label>
              <select
                className="input"
                value={layer.fontFamily}
                onChange={(e) =>
                  update(layer.id, { fontFamily: e.target.value })
                }
              >
                {fonts.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              {isLoaded && (
                <span className="unit">{fonts.length} fonts</span>
              )}
            </div>

            <div className="field-row">
              <label>Size</label>
              <input
                type="number"
                className="input input-small"
                min={12}
                max={200}
                value={layer.fontSize}
                onChange={(e) =>
                  update(layer.id, { fontSize: Number(e.target.value) })
                }
              />
              <label>Color</label>
              <input
                type="color"
                value={layer.fontColor}
                onChange={(e) =>
                  update(layer.id, { fontColor: e.target.value })
                }
              />
            </div>

            <div className="biu-group">
              <button
                className={`biu-btn ${layer.fontWeight === 'bold' ? 'biu-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  update(layer.id, {
                    fontWeight: layer.fontWeight === 'bold' ? 'normal' : 'bold',
                  });
                }}
                title="Bold"
              >
                B
              </button>
              <button
                className={`biu-btn ${layer.fontStyle === 'italic' ? 'biu-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  update(layer.id, {
                    fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic',
                  });
                }}
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                className={`biu-btn ${layer.textDecoration === 'underline' ? 'biu-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  update(layer.id, {
                    textDecoration: layer.textDecoration === 'underline' ? 'none' : 'underline',
                  });
                }}
                title="Underline"
              >
                <u>U</u>
              </button>
            </div>

            {/* Typography section */}
            <details className="style-section">
              <summary>Typography</summary>
              <div className="style-fields">
                <div className="field-row">
                  <label>Letter Spacing</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={-10}
                    max={50}
                    step={1}
                    value={layer.letterSpacing}
                    onChange={(e) =>
                      update(layer.id, { letterSpacing: Number(e.target.value) })
                    }
                  />
                  <span className="unit">px</span>
                </div>
                <div className="field-row">
                  <label>Line Height</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={layer.lineHeight}
                    onChange={(e) =>
                      update(layer.id, { lineHeight: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="field-row">
                  <label>Opacity</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layer.opacity}
                    onChange={(e) =>
                      update(layer.id, { opacity: Number(e.target.value) })
                    }
                  />
                  <span className="unit">{Math.round(layer.opacity * 100)}%</span>
                </div>
              </div>
            </details>

            {/* Effects section */}
            <details className="style-section">
              <summary>Effects</summary>
              <div className="style-fields">
                <div className="field-row">
                  <label>Stroke</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={0}
                    max={20}
                    value={layer.strokeWidth}
                    onChange={(e) =>
                      update(layer.id, { strokeWidth: Number(e.target.value) })
                    }
                  />
                  <span className="unit">px</span>
                  <input
                    type="color"
                    value={layer.strokeColor}
                    onChange={(e) =>
                      update(layer.id, { strokeColor: e.target.value })
                    }
                  />
                </div>
                <div className="field-row">
                  <label>Shadow</label>
                  <input
                    type="color"
                    value={layer.shadowColor}
                    onChange={(e) =>
                      update(layer.id, { shadowColor: e.target.value })
                    }
                  />
                  <label>Blur</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={0}
                    max={50}
                    value={layer.shadowBlur}
                    onChange={(e) =>
                      update(layer.id, { shadowBlur: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="field-row">
                  <label>Shadow X</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={-20}
                    max={20}
                    value={layer.shadowOffsetX}
                    onChange={(e) =>
                      update(layer.id, { shadowOffsetX: Number(e.target.value) })
                    }
                  />
                  <label>Y</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={-20}
                    max={20}
                    value={layer.shadowOffsetY}
                    onChange={(e) =>
                      update(layer.id, { shadowOffsetY: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </details>
          </div>
        </div>
      ))}

      <button className="btn-add-layer" onClick={onAddLayer}>
        + Add Layer
      </button>
    </div>
  );
}
