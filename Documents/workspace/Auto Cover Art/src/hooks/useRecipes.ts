import { useState, useEffect, useCallback } from 'react';
import { getRecipes, createRecipe, updateRecipeDoc, deleteRecipeDoc } from '../firebase';
import type { Recipe, CanvasSize, Layer, Language } from '../types';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const id = await createRecipe(name, canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount, language);
    await refresh();
    return id;
  };

  const updateRecipe = async (
    id: string,
    updates: { name?: string; canvasSize?: CanvasSize; layers?: Layer[]; imageOffsetX?: number; imageOffsetY?: number; enhancePrompt?: string; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number; language?: Language }
  ): Promise<void> => {
    await updateRecipeDoc(id, updates);
    await refresh();
  };

  const deleteRecipe = async (id: string): Promise<void> => {
    await deleteRecipeDoc(id);
    await refresh();
  };

  return { recipes, loading, error, saveRecipe, updateRecipe, deleteRecipe, refresh };
}
