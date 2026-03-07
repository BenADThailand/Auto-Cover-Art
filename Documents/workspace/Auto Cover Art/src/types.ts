export type Language = 'zh-CN' | 'zh-TW' | 'en' | 'th' | 'my' | 'fr' | 'de' | 'es' | 'ru';

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'zh-CN', label: 'Simplified Chinese' },
  { value: 'zh-TW', label: 'Traditional Chinese' },
  { value: 'en',    label: 'English' },
  { value: 'th',    label: 'Thai' },
  { value: 'my',    label: 'Burmese' },
  { value: 'fr',    label: 'French' },
  { value: 'de',    label: 'German' },
  { value: 'es',    label: 'Spanish' },
  { value: 'ru',    label: 'Russian' },
];

export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  teamId?: string;
  managerIds?: string[];
  baseSalary?: number;
  avatar: string;
  createdAt?: number;
  geminiApiKey?: string;
}

export interface CanvasSize {
  label: string;
  width: number;
  height: number;
}

export const CANVAS_SIZES: CanvasSize[] = [
  { label: '1080 × 1920 (9:16)', width: 1080, height: 1920 },
  { label: '1080 × 1440 (3:4)', width: 1080, height: 1440 },
];

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Report {
  id: string;
  projectId: string;
  content: string;
  timestamp: Date;
  tags?: string[];
}

// ── Layer System (discriminated union) ──────────────────

export type ShapeKind = 'rectangle' | 'rounded-rectangle' | 'circle' | 'line' | 'dot';

interface LayerBase {
  id: number;
  type: 'text' | 'shape' | 'image';
  xPercent: number;
  yPercent: number;
  opacity: number;
  locked: boolean;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  orientation: 'horizontal' | 'vertical';
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  aiGenerate: boolean;
  aiPrompt: string;
  minWords?: number;
  maxWords?: number;
  letterSpacing: number;
  lineHeight: number;
  strokeWidth: number;
  strokeColor: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  maxWidth?: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shape: ShapeKind;
  widthPercent: number;
  heightPercent: number;
  fillColor: string;
  strokeWidth: number;
  strokeColor: string;
  borderRadius?: number;
  rotation?: number;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  assetId: string;
  assetUrl: string;
  widthPercent: number;
  heightPercent?: number;
}

export type Layer = TextLayer | ShapeLayer | ImageLayer;

/** Backward-compat alias */
export type KeywordLayer = TextLayer;

// ── Type Guards ─────────────────────────────────────────

export function isTextLayer(layer: Layer): layer is TextLayer {
  return layer.type === 'text';
}

export function isShapeLayer(layer: Layer): layer is ShapeLayer {
  return layer.type === 'shape';
}

export function isImageLayer(layer: Layer): layer is ImageLayer {
  return layer.type === 'image';
}

// ── Migration (old data without `type` → TextLayer) ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateLayer(raw: any): Layer {
  if (!raw.type) {
    return { ...raw, type: 'text' } as TextLayer;
  }
  return raw as Layer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateLayers(raw: any[]): Layer[] {
  if (!raw) return [];
  return raw.map(migrateLayer);
}

// ── Defaults ────────────────────────────────────────────

export const LAYER_STYLE_DEFAULTS = {
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textDecoration: 'none' as const,
  textAlign: 'center' as const,
  letterSpacing: 0,
  lineHeight: 1.2,
  opacity: 1,
  strokeWidth: 0,
  strokeColor: '#000000',
  shadowColor: '#000000',
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
} as const;

export const SHAPE_LAYER_DEFAULTS: Omit<ShapeLayer, 'id'> = {
  type: 'shape',
  xPercent: 50,
  yPercent: 50,
  opacity: 1,
  locked: false,
  shape: 'rectangle',
  widthPercent: 20,
  heightPercent: 10,
  fillColor: '#ffffff',
  strokeWidth: 0,
  strokeColor: '#000000',
};

export const IMAGE_LAYER_DEFAULTS: Omit<ImageLayer, 'id' | 'assetId' | 'assetUrl'> = {
  type: 'image',
  xPercent: 50,
  yPercent: 50,
  opacity: 1,
  locked: false,
  widthPercent: 30,
};

// ── Ownership & Audit ───────────────────────────────────

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface EditHistoryEntry {
  editedBy: string;
  editedByName: string;
  editedAt: number;
  changes: FieldChange[];
}

export interface Ownable {
  createdBy?: string;
  uploadedBy?: string;
}

// ── Shared Asset ────────────────────────────────────────

export interface SharedAsset {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: number;
  tags?: string[];
  editHistory?: EditHistoryEntry[];
}

// ── Recipe / Menu (updated to Layer[]) ──────────────────

export interface Recipe {
  id: string;
  name: string;
  canvasSize: CanvasSize;
  layers: Layer[];
  imageOffsetX?: number;
  imageOffsetY?: number;
  enhancePrompt?: string;
  contentPrompt?: string;
  subjectLineLimit?: number;
  hashtagCount?: number;
  language?: Language;
  createdAt: number;
  updatedAt?: number;
  createdBy?: string;
  createdByName?: string;
  editHistory?: EditHistoryEntry[];
}

export interface PostContent {
  subjectLine: string;
  contentBody: string;
  hashtags: string;
}

export const DEFAULT_POST_CONTENT: PostContent = {
  subjectLine: '',
  contentBody: '',
  hashtags: '',
};

export interface GenerateAllResult {
  subjectLine: string;
  contentBody: string;
  hashtags: string;
  keywords: { layerId: number; text: string }[];
}

export interface MenuSlot {
  canvasSize: CanvasSize;
  layers: Layer[];
  imageOffsetX: number;
  imageOffsetY: number;
  enhancePrompt: string;
}

export interface Menu {
  id: string;
  name: string;
  slots: MenuSlot[];
  contentPrompt: string;
  subjectLineLimit?: number;
  hashtagCount?: number;
  language?: Language;
  createdAt: number;
  updatedAt?: number;
  createdBy?: string;
  createdByName?: string;
  editHistory?: EditHistoryEntry[];
}

export type JobStatus = 'pending' | 'generating' | 'done' | 'error';

export interface MenuPipelineJob {
  id: string;
  folderName: string;
  projectId: string;
  slotImages: {
    slotIndex: number;
    imageDataUrl: string;
    imageName: string;
    status: JobStatus;
    resultDataUrl: string | null;
    error: string | null;
  }[];
  subjectLine: string | null;
  contentBody: string | null;
  hashtags: string | null;
  status: JobStatus;
  error: string | null;
}

export interface BulkJob {
  id: string;
  imageDataUrl: string;
  imageName: string;
  projectId: string;
  recipeId: string;
  status: JobStatus;
  resultDataUrl: string | null;
  error: string | null;
  subjectLine: string | null;
  contentBody: string | null;
  hashtags: string | null;
}

export const DEFAULT_LAYERS: Layer[] = [
  {
    id: 1,
    type: 'text',
    text: '\u66FC\u8C37\u522B\u5885',
    xPercent: 50,
    yPercent: 20,
    orientation: 'horizontal',
    fontFamily: 'SimSun, serif',
    fontSize: 72,
    fontColor: '#ffffff',
    locked: false,
    aiGenerate: false,
    aiPrompt: '',
    ...LAYER_STYLE_DEFAULTS,
  },
  {
    id: 2,
    type: 'text',
    text: '',
    xPercent: 50,
    yPercent: 40,
    orientation: 'horizontal',
    fontFamily: 'SimSun, serif',
    fontSize: 48,
    fontColor: '#ffffff',
    locked: false,
    aiGenerate: false,
    aiPrompt: '',
    ...LAYER_STYLE_DEFAULTS,
  },
  {
    id: 3,
    type: 'text',
    text: '',
    xPercent: 50,
    yPercent: 60,
    orientation: 'vertical',
    fontFamily: 'SimSun, serif',
    fontSize: 48,
    fontColor: '#ffffff',
    locked: false,
    aiGenerate: false,
    aiPrompt: '',
    ...LAYER_STYLE_DEFAULTS,
  },
  {
    id: 4,
    type: 'text',
    text: '',
    xPercent: 50,
    yPercent: 80,
    orientation: 'horizontal',
    fontFamily: 'SimSun, serif',
    fontSize: 36,
    fontColor: '#ffffff',
    locked: false,
    aiGenerate: false,
    aiPrompt: '',
    ...LAYER_STYLE_DEFAULTS,
  },
];

export const DEFAULT_MENU_SLOT: MenuSlot = {
  canvasSize: CANVAS_SIZES[0],
  layers: JSON.parse(JSON.stringify(DEFAULT_LAYERS)),
  imageOffsetX: 0,
  imageOffsetY: 0,
  enhancePrompt: '',
};
