import { useRef, useEffect, useState, useCallback } from 'react';
import type { Layer, CanvasSize } from '../types';
import { isTextLayer } from '../types';
import { CANVAS_SIZES } from '../types';
import { renderToCanvas, preloadLayerImages } from '../lib/renderCanvas';
import type { LayerBounds } from '../lib/renderCanvas';

const HANDLE_SIZE = 10;

interface Props {
  image: string | null;
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
  selectedLayerId: number | null;
  onSelectLayer: (id: number | null) => void;
  canvasSize: CanvasSize;
  onCanvasSizeChange: (size: CanvasSize) => void;
  imageOffsetX: number;
  imageOffsetY: number;
  onImageOffsetChange: (x: number, y: number) => void;
}

export default function CanvasPreview({
  image,
  layers,
  onLayersChange,
  selectedLayerId,
  onSelectLayer,
  canvasSize,
  onCanvasSizeChange,
  imageOffsetX,
  imageOffsetY,
  onImageOffsetChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const boundsRef = useRef<LayerBounds[]>([]);
  const preloadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [dragState, setDragState] = useState<
    | {
        type: 'move' | 'resize';
        layerId: number;
        startX: number;
        startY: number;
        origXPct: number;
        origYPct: number;
        origFontSize: number;
        origWidthPct: number;
        origHeightPct: number;
      }
    | {
        type: 'image';
        startX: number;
        startY: number;
        origOffsetX: number;
        origOffsetY: number;
      }
    | null
  >(null);

  const W = canvasSize.width;
  const H = canvasSize.height;

  // Load image element
  useEffect(() => {
    if (!image) {
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = image;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  // Preload image layer assets
  useEffect(() => {
    preloadLayerImages(layers).then((map) => {
      preloadedImagesRef.current = map;
      draw();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const draw = useCallback((showSelection = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newBounds = renderToCanvas(ctx, {
      canvasSize,
      image: imgRef.current,
      layers,
      imageOffsetX,
      imageOffsetY,
      preloadedImages: preloadedImagesRef.current,
    });

    // Draw selection + resize handle (only in preview mode)
    if (showSelection && selectedLayerId !== null) {
      const bounds = newBounds.find((b) => b.id === selectedLayerId);
      if (bounds) {
        ctx.strokeStyle = '#00bfff';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.w + 12, bounds.h + 12);
        ctx.setLineDash([]);

        // Resize handle at bottom-right corner
        ctx.fillStyle = '#00bfff';
        ctx.fillRect(
          bounds.x + bounds.w + 6 - HANDLE_SIZE / 2,
          bounds.y + bounds.h + 6 - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
      }
    }

    boundsRef.current = newBounds;
  }, [layers, selectedLayerId, canvasSize, imageOffsetX, imageOffsetY]);

  // Redraw whenever layers or selection changes
  useEffect(() => {
    draw();
  }, [draw]);

  const canvasToLocal = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const rect = overlay.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = canvasToLocal(e.clientX, e.clientY);

    // Check resize handle first
    if (selectedLayerId !== null) {
      const bounds = boundsRef.current.find((b) => b.id === selectedLayerId);
      if (bounds) {
        const hx = bounds.x + bounds.w + 6;
        const hy = bounds.y + bounds.h + 6;
        if (
          Math.abs(pos.x - hx) < HANDLE_SIZE * 2 &&
          Math.abs(pos.y - hy) < HANDLE_SIZE * 2
        ) {
          const layer = layers.find((l) => l.id === selectedLayerId);
          if (layer) {
            setDragState({
              layerId: selectedLayerId,
              type: 'resize',
              startX: pos.x,
              startY: pos.y,
              origXPct: layer.xPercent,
              origYPct: layer.yPercent,
              origFontSize: isTextLayer(layer) ? layer.fontSize : 0,
              origWidthPct: 'widthPercent' in layer ? (layer.widthPercent ?? 0) : 0,
              origHeightPct: 'heightPercent' in layer ? (layer.heightPercent ?? 0) : 0,
            });
            return;
          }
        }
      }
    }

    // Check if clicking on a layer
    for (let i = boundsRef.current.length - 1; i >= 0; i--) {
      const b = boundsRef.current[i];
      if (
        pos.x >= b.x - 6 &&
        pos.x <= b.x + b.w + 6 &&
        pos.y >= b.y - 6 &&
        pos.y <= b.y + b.h + 6
      ) {
        onSelectLayer(b.id);
        const layer = layers.find((l) => l.id === b.id);
        if (layer) {
          setDragState({
            layerId: b.id,
            type: 'move',
            startX: pos.x,
            startY: pos.y,
            origXPct: layer.xPercent,
            origYPct: layer.yPercent,
            origFontSize: isTextLayer(layer) ? layer.fontSize : 0,
            origWidthPct: 'widthPercent' in layer ? (layer.widthPercent ?? 0) : 0,
            origHeightPct: 'heightPercent' in layer ? (layer.heightPercent ?? 0) : 0,
          });
        }
        return;
      }
    }

    // Clicked on empty space — start image drag
    setDragState({
      type: 'image',
      startX: pos.x,
      startY: pos.y,
      origOffsetX: imageOffsetX,
      origOffsetY: imageOffsetY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    const pos = canvasToLocal(e.clientX, e.clientY);

    if (dragState.type === 'image') {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      onImageOffsetChange(dragState.origOffsetX + dx, dragState.origOffsetY + dy);
      return;
    }

    if (dragState.type === 'move') {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const newXPct = Math.max(0, Math.min(100, dragState.origXPct + (dx / W) * 100));
      const newYPct = Math.max(0, Math.min(100, dragState.origYPct + (dy / H) * 100));

      onLayersChange(
        layers.map((l) =>
          l.id === dragState.layerId
            ? { ...l, xPercent: Math.round(newXPct), yPercent: Math.round(newYPct) }
            : l
        )
      );
    } else if (dragState.type === 'resize') {
      const dy = pos.y - dragState.startY;
      const scaleFactor = 1 + dy / 200;
      const layer = layers.find((l) => l.id === dragState.layerId);
      if (!layer) return;

      if (isTextLayer(layer)) {
        // Text: scale fontSize
        const newSize = Math.max(12, Math.min(200, Math.round(dragState.origFontSize * scaleFactor)));
        onLayersChange(
          layers.map((l) =>
            l.id === dragState.layerId ? { ...l, fontSize: newSize } : l
          )
        );
      } else {
        // Shape/Image: scale widthPercent + heightPercent proportionally
        const newW = Math.max(1, Math.min(100, Math.round(dragState.origWidthPct * scaleFactor)));
        const newH = Math.max(1, Math.min(100, Math.round(dragState.origHeightPct * scaleFactor)));
        onLayersChange(
          layers.map((l) =>
            l.id === dragState.layerId
              ? { ...l, widthPercent: newW, heightPercent: newH }
              : l
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    if (dragState?.type === 'image') {
      const dx = Math.abs(imageOffsetX - dragState.origOffsetX);
      const dy = Math.abs(imageOffsetY - dragState.origOffsetY);
      if (dx < 3 && dy < 3) {
        // Tiny movement = click -> deselect layer
        onImageOffsetChange(dragState.origOffsetX, dragState.origOffsetY);
        onSelectLayer(null);
      }
    }
    setDragState(null);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Redraw without selection indicators, export, then redraw with selection
    draw(false);
    const dataUrl = canvas.toDataURL('image/png');
    draw(true);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cover-art-${W}x${H}.png`;
    a.click();
  };

  return (
    <section className="section">
      <h2>3. Preview & Export</h2>

      <div className="field-row" style={{ marginBottom: 12 }}>
        <label>Canvas Size</label>
        <select
          className="input"
          value={`${W}x${H}`}
          onChange={(e) => {
            const size = CANVAS_SIZES.find(
              (s) => `${s.width}x${s.height}` === e.target.value
            );
            if (size) onCanvasSizeChange(size);
          }}
        >
          {CANVAS_SIZES.map((s) => (
            <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="preview-canvas"
        />
        <div
          ref={overlayRef}
          className="canvas-overlay"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <button className="btn btn-primary" onClick={handleExport}>
        Download {W}x{H} PNG
      </button>
    </section>
  );
}
