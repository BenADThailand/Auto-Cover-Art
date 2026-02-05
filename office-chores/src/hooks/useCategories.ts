import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../types';
import { getCategories, saveCategory, deleteCategory } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const category: Category = {
      id: uuidv4(),
      name,
      color,
    };
    await saveCategory(category);
    setCategories(prev => [...prev, category]);
  }, []);

  const updateCategory = useCallback(async (category: Category) => {
    await saveCategory(category);
    setCategories(prev => prev.map(c => (c.id === category.id ? category : c)));
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    removeCategory,
    reload: loadCategories,
  };
}
