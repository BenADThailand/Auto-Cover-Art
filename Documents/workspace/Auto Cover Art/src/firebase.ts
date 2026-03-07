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
import {
  getStorage,
  ref as storageRef,
  deleteObject,
} from 'firebase/storage';
import { migrateLayers } from './types';
import type { Project, Report, Recipe, Menu, MenuSlot, CanvasSize, Layer, User, UserRole, Language, SharedAsset } from './types';

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
const storage = getStorage(app);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUserDoc(id: string, data: Record<string, any>): User {
  const name = data.name || data.fullName || data.username || 'User';
  const role = (String(data.role || 'agent').toUpperCase()) as UserRole;
  const avatar = data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2a2a2a&color=fff`;
  return {
    id,
    username: data.username,
    name,
    email: data.email,
    role,
    teamId: data.teamId,
    managerIds: data.managerIds,
    baseSalary: data.baseSalary,
    avatar,
    createdAt: data.createdAt,
    geminiApiKey: data.geminiApiKey,
  };
}

export async function loginUser(username: string, password: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const userDoc = snap.docs[0];
  const data = userDoc.data();
  if (data.password !== password) return null;
  return mapUserDoc(userDoc.id, data);
}

export async function updateUserApiKey(userId: string, apiKey: string): Promise<void> {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, { geminiApiKey: apiKey });
}

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
  const d = sorted[0];
  const data = d.data();
  return {
    id: d.id,
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
      layers: migrateLayers(data.layers),
      imageOffsetX: data.imageOffsetX,
      imageOffsetY: data.imageOffsetY,
      enhancePrompt: data.enhancePrompt,
      contentPrompt: data.contentPrompt,
      subjectLineLimit: data.subjectLineLimit,
      hashtagCount: data.hashtagCount,
      language: data.language,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Recipe;
  });
}

export async function createRecipe(
  name: string,
  canvasSize: CanvasSize,
  layers: Layer[],
  imageOffsetX?: number,
  imageOffsetY?: number,
  enhancePrompt?: string,
  contentPrompt?: string,
  subjectLineLimit?: number,
  hashtagCount?: number,
  language?: Language
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
  if (language !== undefined) data.language = language;
  const docRef = await addDoc(collection(db, RECIPES_COLLECTION), data);
  return docRef.id;
}

export async function updateRecipeDoc(
  id: string,
  updates: { name?: string; canvasSize?: CanvasSize; layers?: Layer[]; imageOffsetX?: number; imageOffsetY?: number; enhancePrompt?: string; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number; language?: Language }
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
  if (updates.language !== undefined) payload.language = updates.language;
  await updateDoc(ref, payload);
}

export async function deleteRecipeDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, RECIPES_COLLECTION, id));
}

const MENUS_COLLECTION = 'coverart-menus';

export async function getMenus(): Promise<Menu[]> {
  const q = query(
    collection(db, MENUS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const slots = (data.slots ?? []).map((slot: MenuSlot) => ({
      ...slot,
      layers: migrateLayers(slot.layers),
    }));
    return {
      id: d.id,
      name: data.name,
      slots,
      contentPrompt: data.contentPrompt ?? '',
      subjectLineLimit: data.subjectLineLimit,
      hashtagCount: data.hashtagCount,
      language: data.language,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Menu;
  });
}

export async function createMenu(
  name: string,
  slots: MenuSlot[],
  contentPrompt: string,
  subjectLineLimit?: number,
  hashtagCount?: number,
  language?: Language
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {
    name,
    slots: JSON.parse(JSON.stringify(slots)),
    contentPrompt,
    createdAt: Date.now(),
  };
  if (subjectLineLimit !== undefined) data.subjectLineLimit = subjectLineLimit;
  if (hashtagCount !== undefined) data.hashtagCount = hashtagCount;
  if (language !== undefined) data.language = language;
  const docRef = await addDoc(collection(db, MENUS_COLLECTION), data);
  return docRef.id;
}

export async function updateMenuDoc(
  id: string,
  updates: { name?: string; slots?: MenuSlot[]; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number; language?: Language }
): Promise<void> {
  const ref = doc(db, MENUS_COLLECTION, id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { updatedAt: Date.now() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slots !== undefined) payload.slots = JSON.parse(JSON.stringify(updates.slots));
  if (updates.contentPrompt !== undefined) payload.contentPrompt = updates.contentPrompt;
  if (updates.subjectLineLimit !== undefined) payload.subjectLineLimit = updates.subjectLineLimit;
  if (updates.hashtagCount !== undefined) payload.hashtagCount = updates.hashtagCount;
  if (updates.language !== undefined) payload.language = updates.language;
  await updateDoc(ref, payload);
}

export async function deleteMenuDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, MENUS_COLLECTION, id));
}

// ── Shared Asset CRUD ───────────────────────────────────

const ASSETS_COLLECTION = 'coverart-assets';

export async function getSharedAssets(): Promise<SharedAsset[]> {
  const q = query(
    collection(db, ASSETS_COLLECTION),
    orderBy('uploadedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      fileName: data.fileName,
      mimeType: data.mimeType,
      storagePath: data.storagePath,
      downloadUrl: data.downloadUrl,
      uploadedBy: data.uploadedBy,
      uploadedAt: data.uploadedAt,
      tags: data.tags,
    } as SharedAsset;
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadSharedAsset(
  file: File,
  userId: string,
  tags?: string[]
): Promise<SharedAsset> {
  const MAX_FILE_SIZE = 800_000; // ~800 KB to stay within Firestore 1 MB doc limit
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(file.size / 1024).toFixed(0)} KB). Max is ${(MAX_FILE_SIZE / 1024).toFixed(0)} KB.`);
  }

  const timestamp = Date.now();
  const downloadUrl = await readFileAsDataURL(file);

  const assetData = {
    name: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    mimeType: file.type,
    storagePath: '',
    downloadUrl,
    uploadedBy: userId,
    uploadedAt: timestamp,
    ...(tags && tags.length > 0 ? { tags } : {}),
  };

  const docRef = await addDoc(collection(db, ASSETS_COLLECTION), assetData);
  return { id: docRef.id, ...assetData };
}

export async function deleteSharedAsset(asset: SharedAsset): Promise<void> {
  // Delete from Storage if this is a legacy asset with a storagePath
  if (asset.storagePath) {
    const fileRef = storageRef(storage, asset.storagePath);
    try {
      await deleteObject(fileRef);
    } catch {
      // File may already be deleted from storage — continue
    }
  }
  // Delete Firestore doc
  await deleteDoc(doc(db, ASSETS_COLLECTION, asset.id));
}
