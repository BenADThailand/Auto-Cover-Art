import { useState, useEffect, useCallback } from 'react';
import type { Chore, ChoreCompletion, ChoreInstance } from '../types';
import {
  getChores,
  saveChore,
  deleteChore,
  getCompletions,
  saveCompletion,
  deleteCompletion,
} from '../services/storage';
import { generateChoreInstances } from '../services/recurrence';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export function useChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [choreData, completionData] = await Promise.all([
        getChores(),
        getCompletions(),
      ]);
      setChores(choreData);
      setCompletions(completionData);
      setError(null);
    } catch (err) {
      setError('Failed to load chores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addChore = useCallback(async (choreData: Omit<Chore, 'id'>) => {
    const chore: Chore = {
      ...choreData,
      id: uuidv4(),
    };
    await saveChore(chore);
    setChores(prev => [...prev, chore]);
    return chore;
  }, []);

  const updateChore = useCallback(async (chore: Chore) => {
    await saveChore(chore);
    setChores(prev => prev.map(c => (c.id === chore.id ? chore : c)));
  }, []);

  const removeChore = useCallback(async (id: string) => {
    await deleteChore(id);
    setChores(prev => prev.filter(c => c.id !== id));
    setCompletions(prev => prev.filter(c => c.choreId !== id));
  }, []);

  const toggleCompletion = useCallback(
    async (choreId: string, date: Date, completedBy: string) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = completions.find(
        c => c.choreId === choreId && c.date === dateStr
      );

      if (existing) {
        await deleteCompletion(choreId, dateStr);
        setCompletions(prev =>
          prev.filter(c => !(c.choreId === choreId && c.date === dateStr))
        );
      } else {
        const completion: ChoreCompletion = {
          id: uuidv4(),
          choreId,
          date: dateStr,
          completedBy,
          completedAt: new Date().toISOString(),
        };
        await saveCompletion(completion);
        setCompletions(prev => [...prev, completion]);
      }
    },
    [completions]
  );

  const getInstances = useCallback(
    (rangeStart: Date, rangeEnd: Date): ChoreInstance[] => {
      return generateChoreInstances(chores, completions, rangeStart, rangeEnd);
    },
    [chores, completions]
  );

  const getChoreById = useCallback(
    (id: string): Chore | undefined => {
      return chores.find(c => c.id === id);
    },
    [chores]
  );

  return {
    chores,
    completions,
    loading,
    error,
    addChore,
    updateChore,
    removeChore,
    toggleCompletion,
    getInstances,
    getChoreById,
    reload: loadData,
  };
}
