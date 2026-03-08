import { useState, useEffect } from 'react';
import { getAllUsers } from '../firebase';
import type { User } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { users, loading };
}
