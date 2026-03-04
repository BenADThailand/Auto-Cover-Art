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

export interface KeywordLayer {
  id: number;
  text: string;
  xPercent: number;
  yPercent: number;
  orientation: 'horizontal' | 'vertical';
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  locked: boolean;
  aiGenerate: boolean;
  aiPrompt: string;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  strokeWidth: number;
  strokeColor: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export const LAYER_STYLE_DEFAULTS = {
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

export interface Recipe {
  id: string;
  name: string;
  canvasSize: CanvasSize;
  layers: KeywordLayer[];
  imageOffsetX?: number;
  imageOffsetY?: number;
  enhancePrompt?: string;
  contentPrompt?: string;
  subjectLineLimit?: number;
  hashtagCount?: number;
  createdAt: number;
  updatedAt?: number;
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

export type JobStatus = 'pending' | 'generating' | 'done' | 'error';

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

export const DEFAULT_LAYERS: KeywordLayer[] = [
  {
    id: 1,
    text: '曼谷别墅',
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
