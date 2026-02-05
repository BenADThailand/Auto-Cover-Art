import { useState, useEffect, useCallback } from 'react';
import type { TeamMember } from '../types';
import { getTeamMembers, saveTeamMember, deleteTeamMember } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const members = await getTeamMembers();
      setTeamMembers(members);
      setError(null);
    } catch (err) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const addMember = useCallback(async (name: string, color: string) => {
    const member: TeamMember = {
      id: uuidv4(),
      name,
      color,
    };
    await saveTeamMember(member);
    setTeamMembers(prev => [...prev, member]);
  }, []);

  const updateMember = useCallback(async (member: TeamMember) => {
    await saveTeamMember(member);
    setTeamMembers(prev => prev.map(m => (m.id === member.id ? member : m)));
  }, []);

  const removeMember = useCallback(async (id: string) => {
    await deleteTeamMember(id);
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    teamMembers,
    loading,
    error,
    addMember,
    updateMember,
    removeMember,
    reload: loadTeamMembers,
  };
}
