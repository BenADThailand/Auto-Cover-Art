import { useState, useEffect, useCallback } from 'react';
import { getMenus, createMenu, updateMenuDoc, deleteMenuDoc } from '../firebase';
import { useUser } from '../contexts/UserContext';
import { canEdit, canDelete } from '../lib/permissions';
import type { Menu, MenuSlot, Language } from '../types';

export function useMenus() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useUser();

  const refresh = useCallback(async () => {
    try {
      const data = await getMenus();
      setMenus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveMenu = async (
    name: string,
    slots: MenuSlot[],
    contentPrompt: string,
    subjectLineLimit?: number,
    hashtagCount?: number,
    language?: Language
  ): Promise<string> => {
    const id = await createMenu(name, slots, contentPrompt, subjectLineLimit, hashtagCount, language, user?.id, user?.name);
    await refresh();
    return id;
  };

  const updateMenu = async (
    id: string,
    updates: { name?: string; slots?: MenuSlot[]; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number; language?: Language }
  ): Promise<void> => {
    const currentMenu = menus.find((m) => m.id === id);
    if (!currentMenu || !canEdit(user, currentMenu)) {
      throw new Error('Permission denied: cannot edit this menu');
    }
    await updateMenuDoc(id, updates, currentMenu, user?.id, user?.name);
    await refresh();
  };

  const deleteMenu = async (id: string): Promise<void> => {
    const menu = menus.find((m) => m.id === id);
    if (!menu || !canDelete(user, menu)) {
      throw new Error('Permission denied: cannot delete this menu');
    }
    await deleteMenuDoc(id);
    await refresh();
  };

  return { menus, loading, error, saveMenu, updateMenu, deleteMenu, refresh };
}
