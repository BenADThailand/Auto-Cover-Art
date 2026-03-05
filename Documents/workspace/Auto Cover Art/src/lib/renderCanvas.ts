import type { KeywordLayer, CanvasSize } from '../types';

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
  layers: KeywordLayer[];
  imageOffsetX?: number;
  imageOffsetY?: number;
}

export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  { canvasSize, image, layers, imageOffsetX, imageOffsetY }: RenderOptions
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

  // Draw text layers
  const newBounds: LayerBounds[] = [];

  for (const layer of layers) {
    if (!layer.text) continue;

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

    if (layer.orientation === 'vertical') {
      const chars = [...layer.text];
      const charH = layer.fontSize * layer.lineHeight;
      const step = charH + layer.letterSpacing;
      const totalH = charH + (chars.length - 1) * step;
      const startY = py - totalH / 2 + charH / 2;

      for (let i = 0; i < chars.length; i++) {
        drawText(chars[i], px, startY + i * step);
        // Reset shadow for subsequent chars if stroke was drawn
        if (layer.strokeWidth > 0 && i < chars.length - 1) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = layer.shadowOffsetX;
          ctx.shadowOffsetY = layer.shadowOffsetY;
        }
      }

      const charW = ctx.measureText(layer.text[0] || 'M').width;

      // Underline for vertical text — vertical line to the right (CJK convention)
      if ((layer.textDecoration ?? 'none') === 'underline') {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = layer.fontColor;
        ctx.lineWidth = Math.max(1, layer.fontSize / 20);
        const lineX = px + charW / 2 + layer.fontSize * 0.15;
        ctx.beginPath();
        ctx.moveTo(lineX, py - totalH / 2);
        ctx.lineTo(lineX, py + totalH / 2);
        ctx.stroke();
        ctx.restore();
      }

      newBounds.push({
        id: layer.id,
        x: px - charW / 2,
        y: py - totalH / 2,
        w: charW,
        h: totalH,
      });
    } else {
      drawText(layer.text, px, py);
      const textW = measureText(layer.text);
      const textH = layer.fontSize;

      // Underline for horizontal text — horizontal line below text
      if ((layer.textDecoration ?? 'none') === 'underline') {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = layer.fontColor;
        ctx.lineWidth = Math.max(1, layer.fontSize / 20);
        const lineY = py + textH / 2 + layer.fontSize * 0.1;
        ctx.beginPath();
        ctx.moveTo(px - textW / 2, lineY);
        ctx.lineTo(px + textW / 2, lineY);
        ctx.stroke();
        ctx.restore();
      }

      newBounds.push({
        id: layer.id,
        x: px - textW / 2,
        y: py - textH / 2,
        w: textW,
        h: textH,
      });
    }

    ctx.restore();
  }

  return newBounds;
}

export function renderOffScreen(
  imageDataUrl: string,
  layers: KeywordLayer[],
  canvasSize: CanvasSize,
  imageOffsetX?: number,
  imageOffsetY?: number
): Promise<string> {
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
      renderToCanvas(ctx, { canvasSize, image: img, layers, imageOffsetX, imageOffsetY });
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}
