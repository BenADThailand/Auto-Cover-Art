import type { Layer, TextLayer, CanvasSize } from '../types';
import { isTextLayer, isShapeLayer, isImageLayer } from '../types';

export interface LayerBounds {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RenderOptions {
  canvasSize: CanvasSize;
  image: HTMLImageElement | null;
  layers: Layer[];
  imageOffsetX?: number;
  imageOffsetY?: number;
  preloadedImages?: Map<string, HTMLImageElement>;
}

export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  { canvasSize, image, layers, imageOffsetX, imageOffsetY, preloadedImages }: RenderOptions
): LayerBounds[] {
  const W = canvasSize.width;
  const H = canvasSize.height;

  ctx.clearRect(0, 0, W, H);

  // Draw image scaled to fill
  if (image) {
    const scale = Math.max(W / image.width, H / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (W - w) / 2 + (imageOffsetX ?? 0);
    const y = (H - h) / 2 + (imageOffsetY ?? 0);
    ctx.drawImage(image, x, y, w, h);
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#666';
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload an image to begin', W / 2, H / 2);
  }

  // Draw layers
  const newBounds: LayerBounds[] = [];

  for (const layer of layers) {
    if (isTextLayer(layer)) {
      const bounds = renderTextLayer(ctx, layer, W, H);
      if (bounds) newBounds.push(bounds);
    } else if (isShapeLayer(layer)) {
      const px = (layer.xPercent / 100) * W;
      const py = (layer.yPercent / 100) * H;
      const w = (layer.widthPercent / 100) * W;
      const h = (layer.heightPercent / 100) * H;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      if (layer.rotation) {
        ctx.translate(px, py);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-px, -py);
      }

      ctx.fillStyle = layer.fillColor;
      if (layer.strokeWidth > 0) {
        ctx.strokeStyle = layer.strokeColor;
        ctx.lineWidth = layer.strokeWidth;
      }

      switch (layer.shape) {
        case 'rectangle':
          ctx.fillRect(px - w / 2, py - h / 2, w, h);
          if (layer.strokeWidth > 0) ctx.strokeRect(px - w / 2, py - h / 2, w, h);
          break;
        case 'rounded-rectangle': {
          const r = layer.borderRadius ?? 10;
          ctx.beginPath();
          ctx.roundRect(px - w / 2, py - h / 2, w, h, r);
          ctx.fill();
          if (layer.strokeWidth > 0) ctx.stroke();
          break;
        }
        case 'circle': {
          ctx.beginPath();
          ctx.ellipse(px, py, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (layer.strokeWidth > 0) ctx.stroke();
          break;
        }
        case 'line': {
          ctx.beginPath();
          ctx.moveTo(px - w / 2, py);
          ctx.lineTo(px + w / 2, py);
          ctx.strokeStyle = layer.fillColor;
          ctx.lineWidth = layer.strokeWidth || 2;
          ctx.stroke();
          break;
        }
        case 'dot': {
          const radius = w / 2;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          if (layer.strokeWidth > 0) ctx.stroke();
          break;
        }
      }

      ctx.restore();

      newBounds.push({
        id: layer.id,
        x: px - w / 2,
        y: py - h / 2,
        w,
        h,
      });
    } else if (isImageLayer(layer)) {
      const img = preloadedImages?.get(layer.assetId);
      if (img) {
        const px = (layer.xPercent / 100) * W;
        const py = (layer.yPercent / 100) * H;
        const w = (layer.widthPercent / 100) * W;
        const h = layer.heightPercent
          ? (layer.heightPercent / 100) * H
          : w * (img.naturalHeight / img.naturalWidth);

        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(img, px - w / 2, py - h / 2, w, h);
        ctx.restore();

        newBounds.push({
          id: layer.id,
          x: px - w / 2,
          y: py - h / 2,
          w,
          h,
        });
      } else {
        // Placeholder for unloaded image
        const px = (layer.xPercent / 100) * W;
        const py = (layer.yPercent / 100) * H;
        const w = (layer.widthPercent / 100) * W;
        const h = layer.heightPercent ? (layer.heightPercent / 100) * H : w;

        ctx.save();
        ctx.globalAlpha = layer.opacity * 0.3;
        ctx.fillStyle = '#666';
        ctx.fillRect(px - w / 2, py - h / 2, w, h);
        ctx.restore();

        newBounds.push({ id: layer.id, x: px - w / 2, y: py - h / 2, w, h });
      }
    }
  }

  return newBounds;
}

function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  W: number,
  H: number
): LayerBounds | null {
  if (!layer.text) return null;

  const px = (layer.xPercent / 100) * W;
  const py = (layer.yPercent / 100) * H;

  ctx.save();
  ctx.globalAlpha = layer.opacity;

  ctx.fillStyle = layer.fontColor;
  const weight = layer.fontWeight ?? 'normal';
  const style = layer.fontStyle ?? 'normal';
  ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Configurable shadow
  ctx.shadowColor = layer.shadowColor;
  ctx.shadowBlur = layer.shadowBlur;
  ctx.shadowOffsetX = layer.shadowOffsetX;
  ctx.shadowOffsetY = layer.shadowOffsetY;

  const drawText = (text: string, x: number, y: number) => {
    // Stroke (outline) behind fill
    if (layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth;
      ctx.lineJoin = 'round';

      if (layer.letterSpacing !== 0) {
        const chars = [...text];
        let totalW = 0;
        const widths: number[] = [];
        for (const ch of chars) {
          const w = ctx.measureText(ch).width;
          widths.push(w);
          totalW += w;
        }
        totalW += layer.letterSpacing * (chars.length - 1);
        let cx = x - totalW / 2;
        for (let i = 0; i < chars.length; i++) {
          ctx.strokeText(chars[i], cx + widths[i] / 2, y);
          cx += widths[i] + layer.letterSpacing;
        }
      } else {
        ctx.strokeText(text, x, y);
      }
      // Disable shadow for fill pass to avoid double shadow
      ctx.shadowColor = 'transparent';
    }

    // Fill text
    if (layer.letterSpacing !== 0) {
      const chars = [...text];
      let totalW = 0;
      const widths: number[] = [];
      for (const ch of chars) {
        const w = ctx.measureText(ch).width;
        widths.push(w);
        totalW += w;
      }
      totalW += layer.letterSpacing * (chars.length - 1);
      let cx = x - totalW / 2;
      for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], cx + widths[i] / 2, y);
        cx += widths[i] + layer.letterSpacing;
      }
    } else {
      ctx.fillText(text, x, y);
    }
  };

  // Measure total width accounting for letter-spacing
  const measureText = (text: string): number => {
    if (layer.letterSpacing !== 0) {
      const chars = [...text];
      let totalW = 0;
      for (const ch of chars) {
        totalW += ctx.measureText(ch).width;
      }
      totalW += layer.letterSpacing * (chars.length - 1);
      return totalW;
    }
    return ctx.measureText(text).width;
  };

  const align = layer.textAlign ?? 'center';

  // Helper to reset shadow between draw calls when stroke is used
  const resetShadow = () => {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  };

  let bounds: LayerBounds;

  if (layer.orientation === 'vertical') {
    // Filter out newlines for vertical text (char-by-char anyway)
    const chars = [...layer.text.replace(/\n/g, '')];
    const charH = layer.fontSize * layer.lineHeight;
    const step = charH + layer.letterSpacing;
    const charW = ctx.measureText(chars[0] || 'M').width;

    // maxWidth on vertical = max height as % of canvas height
    const maxHeightPx = layer.maxWidth ? (layer.maxWidth / 100) * H : 0;

    // Split chars into columns
    const columns: string[][] = [[]];
    if (maxHeightPx) {
      let colHeight = charH; // first char
      for (let i = 0; i < chars.length; i++) {
        if (i === 0) {
          columns[0].push(chars[i]);
          continue;
        }
        const nextHeight = colHeight + step;
        if (nextHeight > maxHeightPx) {
          columns.push([chars[i]]);
          colHeight = charH;
        } else {
          columns[columns.length - 1].push(chars[i]);
          colHeight = nextHeight;
        }
      }
    } else {
      columns[0] = chars;
    }

    const colSpacing = charW * 1.6;
    const totalW = columns.length === 1 ? charW : charW + (columns.length - 1) * colSpacing;

    // CJK vertical: columns go right-to-left
    const startX = px + totalW / 2 - charW / 2;

    let tallestColH = 0;
    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const colH = charH + (col.length - 1) * step;
      if (colH > tallestColH) tallestColH = colH;

      // Vertical align: left=top, center=middle, right=bottom
      let colStartY: number;
      if (align === 'left') colStartY = py + charH / 2;
      else if (align === 'right') colStartY = py - colH + charH / 2;
      else colStartY = py - colH / 2 + charH / 2;

      const colX = startX - ci * colSpacing;

      for (let i = 0; i < col.length; i++) {
        drawText(col[i], colX, colStartY + i * step);
        if (layer.strokeWidth > 0 && i < col.length - 1) resetShadow();
      }
      if (layer.strokeWidth > 0 && ci < columns.length - 1) resetShadow();
    }

    // Compute bounds top based on alignment
    let boundsY: number;
    if (align === 'left') boundsY = py;
    else if (align === 'right') boundsY = py - tallestColH;
    else boundsY = py - tallestColH / 2;

    // Underline for vertical text — vertical line to the right of rightmost column
    if ((layer.textDecoration ?? 'none') === 'underline') {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = layer.fontColor;
      ctx.lineWidth = Math.max(1, layer.fontSize / 20);
      const lineX = startX + charW / 2 + layer.fontSize * 0.15;
      ctx.beginPath();
      ctx.moveTo(lineX, boundsY);
      ctx.lineTo(lineX, boundsY + tallestColH);
      ctx.stroke();
      ctx.restore();
    }

    bounds = {
      id: layer.id,
      x: startX - (columns.length - 1) * colSpacing - charW / 2,
      y: boundsY,
      w: totalW,
      h: tallestColH,
    };
  } else {
    // --- Horizontal text with optional auto-wrap ---
    const maxWidthPx = layer.maxWidth ? (layer.maxWidth / 100) * W : 0;
    const lineSpacing = layer.fontSize * layer.lineHeight;

    // Word-wrap logic: split text into lines
    const wrapText = (text: string): string[] => {
      const paragraphs = text.split('\n');
      if (!maxWidthPx) return paragraphs;

      const lines: string[] = [];
      for (const para of paragraphs) {
        if (!para) { lines.push(''); continue; }

        const hasSpaces = /\s/.test(para);
        if (hasSpaces) {
          const words = para.split(/(\s+)/);
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine + word;
            if (currentLine && measureText(testLine) > maxWidthPx) {
              lines.push(currentLine);
              currentLine = word.trimStart();
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
        } else {
          let currentLine = '';
          for (const ch of [...para]) {
            const testLine = currentLine + ch;
            if (currentLine && measureText(testLine) > maxWidthPx) {
              lines.push(currentLine);
              currentLine = ch;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
        }
      }
      return lines;
    };

    const lines = wrapText(layer.text);

    // Pre-measure all line widths
    const lineWidths = lines.map((l) => measureText(l));
    let widestLine = 0;
    for (const lw of lineWidths) { if (lw > widestLine) widestLine = lw; }

    const totalBlockH = lines.length === 1
      ? layer.fontSize
      : layer.fontSize + (lines.length - 1) * lineSpacing;
    const startY = py - totalBlockH / 2 + layer.fontSize / 2;

    for (let i = 0; i < lines.length; i++) {
      const ly = startY + i * lineSpacing;
      // drawText expects center x; offset per line based on alignment
      let lx = px;
      if (align === 'left') lx = px + lineWidths[i] / 2;
      else if (align === 'right') lx = px - lineWidths[i] / 2;
      drawText(lines[i], lx, ly);
      if (layer.strokeWidth > 0 && i < lines.length - 1) resetShadow();
    }

    // Compute bounds x based on alignment
    let boundsX: number;
    if (align === 'left') boundsX = px;
    else if (align === 'right') boundsX = px - widestLine;
    else boundsX = px - widestLine / 2;

    // Underline for horizontal text — spans entire block
    if ((layer.textDecoration ?? 'none') === 'underline') {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = layer.fontColor;
      ctx.lineWidth = Math.max(1, layer.fontSize / 20);
      const lineY = startY + (lines.length - 1) * lineSpacing + layer.fontSize / 2 + layer.fontSize * 0.1;
      ctx.beginPath();
      ctx.moveTo(boundsX, lineY);
      ctx.lineTo(boundsX + widestLine, lineY);
      ctx.stroke();
      ctx.restore();
    }

    bounds = {
      id: layer.id,
      x: boundsX,
      y: py - totalBlockH / 2,
      w: widestLine,
      h: totalBlockH,
    };
  }

  ctx.restore();
  return bounds;
}

// ── Image Preloading ────────────────────────────────────

export function preloadLayerImages(layers: Layer[]): Promise<Map<string, HTMLImageElement>> {
  const imageMap = new Map<string, HTMLImageElement>();
  const imageLayers = layers.filter(isImageLayer);

  if (imageLayers.length === 0) return Promise.resolve(imageMap);

  const promises = imageLayers.map(
    (layer) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        if (!layer.assetUrl.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          imageMap.set(layer.assetId, img);
          resolve();
        };
        img.onerror = () => resolve(); // skip failed loads
        img.src = layer.assetUrl;
      })
  );

  return Promise.all(promises).then(() => imageMap);
}

export async function renderOffScreen(
  imageDataUrl: string,
  layers: Layer[],
  canvasSize: CanvasSize,
  imageOffsetX?: number,
  imageOffsetY?: number
): Promise<string> {
  // Preload any image layer assets
  const preloadedImages = await preloadLayerImages(layers);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }
      renderToCanvas(ctx, { canvasSize, image: img, layers, imageOffsetX, imageOffsetY, preloadedImages });
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}
