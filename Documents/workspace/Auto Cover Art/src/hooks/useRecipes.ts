import { useState, useEffect, useCallback } from 'react';
import { getRecipes, createRecipe, updateRecipeDoc, deleteRecipeDoc } from '../firebase';
import { useUser } from '../contexts/UserContext';
import { canEdit, canDelete } from '../lib/permissions';
import type { Recipe, CanvasSize, Layer, Language } from '../types';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useUser();

  const refresh = useCallback(async () => {
    try {
      const data = await getRecipes();
      setRecipes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveRecipe = async (
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
  ): Promise<string> => {
    const id = await createRecipe(name, canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount, language, user?.id, user?.name);
    await refresh();
    return id;
  };

  const updateRecipe = async (
    id: string,
    updates: { name?: string; canvasSize?: CanvasSize; layers?: Layer[]; imageOffsetX?: number; imageOffsetY?: number; enhancePrompt?: string; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number; language?: Language }
  ): Promise<void> => {
    const currentRecipe = recipes.find((r) => r.id === id);
    if (!currentRecipe || !canEdit(user, currentRecipe)) {
      throw new Error('Permission denied: cannot edit this recipe');
    }
    await updateRecipeDoc(id, updates, currentRecipe, user?.id, user?.name);
    await refresh();
  };

  const deleteRecipe = async (id: string): Promise<void> => {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe || !canDelete(user, recipe)) {
      throw new Error('Permission denied: cannot delete this recipe');
    }
    await deleteRecipeDoc(id);
    await refresh();
  };

  return { recipes, loading, error, saveRecipe, updateRecipe, deleteRecipe, refresh };
}
