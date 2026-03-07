import { useState, useId } from 'react';
import { generateKeyword } from '../api';
import { useSystemFonts } from '../hooks/useSystemFonts';
import { isTextLayer, isShapeLayer, isImageLayer, LAYER_STYLE_DEFAULTS, SHAPE_LAYER_DEFAULTS, IMAGE_LAYER_DEFAULTS } from '../types';
import type { Layer, TextLayer, ShapeLayer, ShapeKind, SharedAsset } from '../types';

interface Props {
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
  reportContent: string;
  selectedLayerId: number | null;
  onSelectLayer: (id: number | null) => void;
  onDeleteLayer: (id: number) => void;
  sharedAssets?: SharedAsset[];
  onOpenAssetPicker?: (layerId: number) => void;
}

export default function KeywordLayers({
  layers,
  onLayersChange,
  reportContent,
  selectedLayerId,
  onSelectLayer,
  onDeleteLayer,
  onOpenAssetPicker,
}: Props) {
  const [generating, setGenerating] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { fonts, isLoaded } = useSystemFonts();
  const scopeId = useId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (id: number, patch: Record<string, any>) => {
    onLayersChange(
      layers.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l))
    );
  };

  const handleAddLayer = (type: 'text' | 'shape' | 'image') => {
    const maxId = layers.reduce((max, l) => Math.max(max, l.id), 0);
    let newLayer: Layer;

    if (type === 'text') {
      newLayer = {
        id: maxId + 1,
        type: 'text',
        text: '',
        xPercent: 50,
        yPercent: 50,
        orientation: 'horizontal',
        fontFamily: 'SimSun, serif',
        fontSize: 48,
        fontColor: '#ffffff',
        locked: false,
        aiGenerate: false,
        aiPrompt: '',
        ...LAYER_STYLE_DEFAULTS,
      } as TextLayer;
    } else if (type === 'shape') {
      newLayer = {
        ...SHAPE_LAYER_DEFAULTS,
        id: maxId + 1,
      } as ShapeLayer;
    } else {
      newLayer = {
        ...IMAGE_LAYER_DEFAULTS,
        id: maxId + 1,
        assetId: '',
        assetUrl: '',
      } as Layer;
    }

    onLayersChange([...layers, newLayer]);
    onSelectLayer(newLayer.id);
    setShowAddMenu(false);
  };

  const handleMoveLayer = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= layers.length) return;
    const updated = [...layers];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onLayersChange(updated);
  };

  const handleAiGenerate = async (layer: TextLayer) => {
    if (!reportContent) return;
    setGenerating(layer.id);
    try {
      const existing = layers
        .filter((l): l is TextLayer => isTextLayer(l) && !!l.text && l.id !== layer.id)
        .map((l) => l.text);
      const keyword = await generateKeyword(reportContent, existing, layer.aiPrompt, layer.minWords, layer.maxWords);
      update(layer.id, { text: keyword });
    } catch {
      // silently fail
    } finally {
      setGenerating(null);
    }
  };

  const getTypeBadge = (layer: Layer) => {
    if (isTextLayer(layer)) return 'T';
    if (isShapeLayer(layer)) return '\u25A0';
    if (isImageLayer(layer)) return '\uD83D\uDDBC';
    return '?';
  };

  const getTypeLabel = (layer: Layer) => {
    if (isTextLayer(layer)) return 'Text';
    if (isShapeLayer(layer)) return 'Shape';
    if (isImageLayer(layer)) return 'Image';
    return 'Unknown';
  };

  return (
    <div className="keyword-layers">
      {layers.map((layer, index) => (
        <div
          key={layer.id}
          className={`layer-card ${selectedLayerId === layer.id ? 'selected' : ''}`}
          onClick={() => onSelectLayer(layer.id)}
        >
          <div className="layer-header">
            <span className={`layer-type-badge layer-type-${layer.type}`}>
              {getTypeBadge(layer)}
            </span>
            <strong>Layer {layer.id}</strong>
            <span className="badge">{getTypeLabel(layer)}</span>

            {/* Z-order arrows */}
            <div className="layer-reorder-btns">
              <button
                className="btn-reorder"
                title="Move up (back)"
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); handleMoveLayer(index, -1); }}
              >
                &#9650;
              </button>
              <button
                className="btn-reorder"
                title="Move down (front)"
                disabled={index === layers.length - 1}
                onClick={(e) => { e.stopPropagation(); handleMoveLayer(index, 1); }}
              >
                &#9660;
              </button>
            </div>

            <button
              className="btn-delete"
              title="Delete layer"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLayer(layer.id);
              }}
            >
              &times;
            </button>
          </div>

          <div className="layer-fields">
            {/* ─── Shared controls: position + opacity ─── */}
            <div className="field-row">
              <label>X %</label>
              <input
                type="number"
                className="input input-small"
                min={0}
                max={100}
                value={layer.xPercent}
                onChange={(e) => update(layer.id, { xPercent: Number(e.target.value) })}
              />
              <label>Y %</label>
              <input
                type="number"
                className="input input-small"
                min={0}
                max={100}
                value={layer.yPercent}
                onChange={(e) => update(layer.id, { yPercent: Number(e.target.value) })}
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
                onChange={(e) => update(layer.id, { opacity: Number(e.target.value) })}
              />
              <span className="unit">{Math.round(layer.opacity * 100)}%</span>
            </div>

            {/* ─── TEXT LAYER CONTROLS ─── */}
            {isTextLayer(layer) && (
              <>
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
                  <textarea
                    className="input layer-text-area"
                    value={layer.text}
                    onChange={(e) => update(layer.id, { text: e.target.value })}
                    placeholder="Keyword text"
                    rows={1}
                  />
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAiGenerate(layer);
                    }}
                    disabled={!reportContent || generating === layer.id}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {generating === layer.id ? 'AI...' : 'AI Generate'}
                  </button>
                </div>

                <div className="field-row">
                  <label>Words</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={1}
                    value={layer.minWords ?? ''}
                    onChange={(e) =>
                      update(layer.id, { minWords: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="min"
                  />
                  <span className="unit">&ndash;</span>
                  <input
                    type="number"
                    className="input input-small"
                    min={1}
                    value={layer.maxWords ?? ''}
                    onChange={(e) =>
                      update(layer.id, { maxWords: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="max"
                  />
                  <span className="unit">{!layer.minWords && !layer.maxWords ? 'default 2-6 chars' : !layer.maxWords ? 'no max' : ''}</span>
                </div>

                <div className="field-row">
                  <label>{layer.orientation === 'vertical' ? 'Max Height' : 'Max Width'}</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={0}
                    max={100}
                    value={layer.maxWidth ?? ''}
                    onChange={(e) =>
                      update(layer.id, { maxWidth: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="—"
                  />
                  <span className="unit">% {layer.maxWidth ? `(auto-wrap at ${layer.maxWidth}%)` : '(no wrap)'}</span>
                </div>

                <div className="field-row">
                  <label>Orientation</label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`orient-${scopeId}-${layer.id}`}
                      checked={layer.orientation === 'horizontal'}
                      onChange={() => update(layer.id, { orientation: 'horizontal' })}
                    />
                    Horizontal
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`orient-${scopeId}-${layer.id}`}
                      checked={layer.orientation === 'vertical'}
                      onChange={() => update(layer.id, { orientation: 'vertical' })}
                    />
                    Vertical
                  </label>
                </div>

                <div className="field-row">
                  <label>Align</label>
                  <div className="biu-group">
                    <button
                      className={`biu-btn ${(layer.textAlign ?? 'center') === 'left' ? 'biu-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); update(layer.id, { textAlign: 'left' }); }}
                      title={layer.orientation === 'vertical' ? 'Top' : 'Left'}
                    >
                      {layer.orientation === 'vertical' ? '\u2B06' : '\u2B05'}
                    </button>
                    <button
                      className={`biu-btn ${(layer.textAlign ?? 'center') === 'center' ? 'biu-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); update(layer.id, { textAlign: 'center' }); }}
                      title={layer.orientation === 'vertical' ? 'Middle' : 'Center'}
                    >
                      {'\u2B0C'}
                    </button>
                    <button
                      className={`biu-btn ${(layer.textAlign ?? 'center') === 'right' ? 'biu-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); update(layer.id, { textAlign: 'right' }); }}
                      title={layer.orientation === 'vertical' ? 'Bottom' : 'Right'}
                    >
                      {layer.orientation === 'vertical' ? '\u2B07' : '\u27A1'}
                    </button>
                  </div>
                </div>

                <div className="field-row">
                  <label>Font</label>
                  <select
                    className="input"
                    value={layer.fontFamily}
                    onChange={(e) => update(layer.id, { fontFamily: e.target.value })}
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
                    onChange={(e) => update(layer.id, { fontSize: Number(e.target.value) })}
                  />
                  <label>Color</label>
                  <input
                    type="color"
                    value={layer.fontColor}
                    onChange={(e) => update(layer.id, { fontColor: e.target.value })}
                  />
                </div>

                <div className="biu-group">
                  <button
                    className={`biu-btn ${layer.fontWeight === 'bold' ? 'biu-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      update(layer.id, { fontWeight: layer.fontWeight === 'bold' ? 'normal' : 'bold' });
                    }}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    className={`biu-btn ${layer.fontStyle === 'italic' ? 'biu-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      update(layer.id, { fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' });
                    }}
                    title="Italic"
                  >
                    <em>I</em>
                  </button>
                  <button
                    className={`biu-btn ${layer.textDecoration === 'underline' ? 'biu-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      update(layer.id, { textDecoration: layer.textDecoration === 'underline' ? 'none' : 'underline' });
                    }}
                    title="Underline"
                  >
                    <u>U</u>
                  </button>
                </div>

                <details className="style-section">
                  <summary>Typography</summary>
                  <div className="style-fields">
                    <div className="field-row">
                      <label>Letter Spacing</label>
                      <input
                        type="number"
                        className="input input-small"
                        max={50}
                        step={1}
                        value={layer.letterSpacing}
                        onChange={(e) => update(layer.id, { letterSpacing: Number(e.target.value) })}
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
                        onChange={(e) => update(layer.id, { lineHeight: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </details>

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
                        onChange={(e) => update(layer.id, { strokeWidth: Number(e.target.value) })}
                      />
                      <span className="unit">px</span>
                      <input
                        type="color"
                        value={layer.strokeColor}
                        onChange={(e) => update(layer.id, { strokeColor: e.target.value })}
                      />
                    </div>
                    <div className="field-row">
                      <label>Shadow</label>
                      <input
                        type="color"
                        value={layer.shadowColor}
                        onChange={(e) => update(layer.id, { shadowColor: e.target.value })}
                      />
                      <label>Blur</label>
                      <input
                        type="number"
                        className="input input-small"
                        min={0}
                        max={50}
                        value={layer.shadowBlur}
                        onChange={(e) => update(layer.id, { shadowBlur: Number(e.target.value) })}
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
                        onChange={(e) => update(layer.id, { shadowOffsetX: Number(e.target.value) })}
                      />
                      <label>Y</label>
                      <input
                        type="number"
                        className="input input-small"
                        min={-20}
                        max={20}
                        value={layer.shadowOffsetY}
                        onChange={(e) => update(layer.id, { shadowOffsetY: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </details>
              </>
            )}

            {/* ─── SHAPE LAYER CONTROLS ─── */}
            {isShapeLayer(layer) && (
              <>
                <div className="field-row">
                  <label>Shape</label>
                  <select
                    className="input"
                    value={layer.shape}
                    onChange={(e) => update(layer.id, { shape: e.target.value as ShapeKind })}
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="rounded-rectangle">Rounded Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="line">Line</option>
                    <option value="dot">Dot</option>
                  </select>
                </div>

                <div className="field-row">
                  <label>W %</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={1}
                    max={100}
                    value={layer.widthPercent}
                    onChange={(e) => update(layer.id, { widthPercent: Number(e.target.value) })}
                  />
                  <label>H %</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={1}
                    max={100}
                    value={layer.heightPercent}
                    onChange={(e) => update(layer.id, { heightPercent: Number(e.target.value) })}
                  />
                </div>

                <div className="field-row">
                  <label>Fill</label>
                  <input
                    type="color"
                    value={layer.fillColor}
                    onChange={(e) => update(layer.id, { fillColor: e.target.value })}
                  />
                  <label>Stroke</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={0}
                    max={20}
                    value={layer.strokeWidth}
                    onChange={(e) => update(layer.id, { strokeWidth: Number(e.target.value) })}
                  />
                  <input
                    type="color"
                    value={layer.strokeColor}
                    onChange={(e) => update(layer.id, { strokeColor: e.target.value })}
                  />
                </div>

                {layer.shape === 'rounded-rectangle' && (
                  <div className="field-row">
                    <label>Border Radius</label>
                    <input
                      type="number"
                      className="input input-small"
                      min={0}
                      max={100}
                      value={layer.borderRadius ?? 10}
                      onChange={(e) => update(layer.id, { borderRadius: Number(e.target.value) })}
                    />
                    <span className="unit">px</span>
                  </div>
                )}

                {layer.shape === 'line' && (
                  <div className="field-row">
                    <label>Rotation</label>
                    <input
                      type="number"
                      className="input input-small"
                      min={-180}
                      max={180}
                      value={layer.rotation ?? 0}
                      onChange={(e) => update(layer.id, { rotation: Number(e.target.value) })}
                    />
                    <span className="unit">deg</span>
                  </div>
                )}
              </>
            )}

            {/* ─── IMAGE LAYER CONTROLS ─── */}
            {isImageLayer(layer) && (
              <>
                <div className="field-row">
                  <label>Asset</label>
                  {layer.assetUrl ? (
                    <img src={layer.assetUrl} alt="" className="layer-asset-thumb" />
                  ) : (
                    <span className="unit">No asset selected</span>
                  )}
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAssetPicker?.(layer.id);
                    }}
                  >
                    Choose Asset
                  </button>
                </div>

                <div className="field-row">
                  <label>W %</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={1}
                    max={100}
                    value={layer.widthPercent}
                    onChange={(e) => update(layer.id, { widthPercent: Number(e.target.value) })}
                  />
                  <label>H %</label>
                  <input
                    type="number"
                    className="input input-small"
                    min={0}
                    max={100}
                    value={layer.heightPercent ?? ''}
                    onChange={(e) =>
                      update(layer.id, { heightPercent: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="auto"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      <div className="add-layer-wrapper">
        <button
          className="btn-add-layer"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          + Add Layer
        </button>
        {showAddMenu && (
          <div className="add-layer-menu">
            <button onClick={() => handleAddLayer('text')}>Text Layer</button>
            <button onClick={() => handleAddLayer('shape')}>Shape Layer</button>
            <button onClick={() => handleAddLayer('image')}>Image Layer</button>
          </div>
        )}
      </div>
    </div>
  );
}
