import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import type { Project, Report, Recipe, CanvasSize, KeywordLayer } from './types';

const firebaseConfig = {
  apiKey: 'AIzaSyAv2aq52fIpQeaLpKupWH6fck1egj7pZiw',
  authDomain: 'ad-knowledge-center.firebaseapp.com',
  projectId: 'ad-knowledge-center',
  storageBucket: 'ad-knowledge-center.firebasestorage.app',
  messagingSenderId: '581507572050',
  appId: '1:581507572050:web:dd8da3d8fb1f8984011a8b',
  measurementId: 'G-7CGQKEJN1D',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getProjects(): Promise<Project[]> {
  const snap = await getDocs(collection(db, 'projects'));
  return snap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name ?? doc.id,
    description: doc.data().description,
  }));
}

export async function getLatestReport(
  projectId: string
): Promise<Report | null> {
  const q = query(
    collection(db, 'reports'),
    where('projectId', '==', projectId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const sorted = snap.docs.sort((a, b) => {
    const ta = a.data().timestamp?.toMillis?.() ?? 0;
    const tb = b.data().timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });
  const doc = sorted[0];
  const data = doc.data();
  return {
    id: doc.id,
    projectId: data.projectId,
    content: data.content,
    timestamp: data.timestamp?.toDate?.() ?? new Date(),
    tags: data.tags,
  };
}

const RECIPES_COLLECTION = 'coverart-recipes';

export async function getRecipes(): Promise<Recipe[]> {
  const q = query(
    collection(db, RECIPES_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      canvasSize: data.canvasSize,
      layers: data.layers,
      imageOffsetX: data.imageOffsetX,
      imageOffsetY: data.imageOffsetY,
      enhancePrompt: data.enhancePrompt,
      contentPrompt: data.contentPrompt,
      subjectLineLimit: data.subjectLineLimit,
      hashtagCount: data.hashtagCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Recipe;
  });
}

export async function createRecipe(
  name: string,
  canvasSize: CanvasSize,
  layers: KeywordLayer[],
  imageOffsetX?: number,
  imageOffsetY?: number,
  enhancePrompt?: string,
  contentPrompt?: string,
  subjectLineLimit?: number,
  hashtagCount?: number
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {
    name,
    canvasSize: { ...canvasSize },
    layers: JSON.parse(JSON.stringify(layers)),
    imageOffsetX: imageOffsetX ?? 0,
    imageOffsetY: imageOffsetY ?? 0,
    enhancePrompt: enhancePrompt ?? '',
    contentPrompt: contentPrompt ?? '',
    createdAt: Date.now(),
  };
  if (subjectLineLimit !== undefined) data.subjectLineLimit = subjectLineLimit;
  if (hashtagCount !== undefined) data.hashtagCount = hashtagCount;
  const docRef = await addDoc(collection(db, RECIPES_COLLECTION), data);
  return docRef.id;
}

export async function updateRecipeDoc(
  id: string,
  updates: { name?: string; canvasSize?: CanvasSize; layers?: KeywordLayer[]; imageOffsetX?: number; imageOffsetY?: number; enhancePrompt?: string; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number }
): Promise<void> {
  const ref = doc(db, RECIPES_COLLECTION, id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { updatedAt: Date.now() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.canvasSize !== undefined) payload.canvasSize = { ...updates.canvasSize };
  if (updates.layers !== undefined) payload.layers = JSON.parse(JSON.stringify(updates.layers));
  if (updates.imageOffsetX !== undefined) payload.imageOffsetX = updates.imageOffsetX;
  if (updates.imageOffsetY !== undefined) payload.imageOffsetY = updates.imageOffsetY;
  if (updates.enhancePrompt !== undefined) payload.enhancePrompt = updates.enhancePrompt;
  if (updates.contentPrompt !== undefined) payload.contentPrompt = updates.contentPrompt;
  if (updates.subjectLineLimit !== undefined) payload.subjectLineLimit = updates.subjectLineLimit;
  if (updates.hashtagCount !== undefined) payload.hashtagCount = updates.hashtagCount;
  await updateDoc(ref, payload);
}

export async function deleteRecipeDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, RECIPES_COLLECTION, id));
}
