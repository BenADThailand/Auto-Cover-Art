import { useState, useEffect } from 'react';
import { getProjects, getLatestReport } from '../firebase';
import type { Project, Report } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects()
      .then((p) => {
        setProjects(p);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load projects: ' + err.message);
        setLoading(false);
      });
  }, []);

  const fetchReport = async (projectId: string): Promise<Report | null> => {
    return getLatestReport(projectId);
  };

  return { projects, loading, error, fetchReport };
}
