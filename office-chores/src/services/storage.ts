import type { AppData, TeamMember, Category, Chore, ChoreCompletion } from '../types';

const API_BASE = 'http://localhost:3001/api';
const STORAGE_KEY = 'office-chores-data';

const defaultData: AppData = {
  teamMembers: [],
  categories: [
    { id: 'cat-1', name: 'Kitchen', color: '#22c55e' },
    { id: 'cat-2', name: 'Bathroom', color: '#3b82f6' },
    { id: 'cat-3', name: 'Common Area', color: '#f59e0b' },
    { id: 'cat-4', name: 'Office', color: '#8b5cf6' },
  ],
  chores: [],
  completions: [],
};

let useLocalStorage = false;

async function checkBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

function getLocalData(): AppData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

function saveLocalData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function initStorage(): Promise<void> {
  const backendAvailable = await checkBackendAvailable();
  useLocalStorage = !backendAvailable;
  console.log(`Storage mode: ${useLocalStorage ? 'localStorage' : 'backend'}`);
}

export async function loadData(): Promise<AppData> {
  if (useLocalStorage) {
    return getLocalData();
  }

  try {
    const response = await fetch(`${API_BASE}/data`);
    if (!response.ok) throw new Error('Failed to load data');
    return await response.json();
  } catch {
    useLocalStorage = true;
    return getLocalData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  if (useLocalStorage) {
    saveLocalData(data);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save data');
  } catch {
    useLocalStorage = true;
    saveLocalData(data);
  }
}

// Team Members
export async function getTeamMembers(): Promise<TeamMember[]> {
  const data = await loadData();
  return data.teamMembers;
}

export async function saveTeamMember(member: TeamMember): Promise<void> {
  const data = await loadData();
  const index = data.teamMembers.findIndex(m => m.id === member.id);
  if (index >= 0) {
    data.teamMembers[index] = member;
  } else {
    data.teamMembers.push(member);
  }
  await saveData(data);
}

export async function deleteTeamMember(id: string): Promise<void> {
  const data = await loadData();
  data.teamMembers = data.teamMembers.filter(m => m.id !== id);
  await saveData(data);
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const data = await loadData();
  return data.categories;
}

export async function saveCategory(category: Category): Promise<void> {
  const data = await loadData();
  const index = data.categories.findIndex(c => c.id === category.id);
  if (index >= 0) {
    data.categories[index] = category;
  } else {
    data.categories.push(category);
  }
  await saveData(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const data = await loadData();
  data.categories = data.categories.filter(c => c.id !== id);
  await saveData(data);
}

// Chores
export async function getChores(): Promise<Chore[]> {
  const data = await loadData();
  return data.chores;
}

export async function saveChore(chore: Chore): Promise<void> {
  const data = await loadData();
  const index = data.chores.findIndex(c => c.id === chore.id);
  if (index >= 0) {
    data.chores[index] = chore;
  } else {
    data.chores.push(chore);
  }
  await saveData(data);
}

export async function deleteChore(id: string): Promise<void> {
  const data = await loadData();
  data.chores = data.chores.filter(c => c.id !== id);
  data.completions = data.completions.filter(c => c.choreId !== id);
  await saveData(data);
}

// Completions
export async function getCompletions(): Promise<ChoreCompletion[]> {
  const data = await loadData();
  return data.completions;
}

export async function saveCompletion(completion: ChoreCompletion): Promise<void> {
  const data = await loadData();
  const existingIndex = data.completions.findIndex(
    c => c.choreId === completion.choreId && c.date === completion.date
  );
  if (existingIndex >= 0) {
    data.completions[existingIndex] = completion;
  } else {
    data.completions.push(completion);
  }
  await saveData(data);
}

export async function deleteCompletion(choreId: string, date: string): Promise<void> {
  const data = await loadData();
  data.completions = data.completions.filter(
    c => !(c.choreId === choreId && c.date === date)
  );
  await saveData(data);
}
