import { useState } from 'react';
import { getLatestReport } from '../firebase';
import type { Project, Report } from '../types';

interface Props {
  projects: Project[];
  report: Report | null;
  onReportChange: (report: Report | null) => void;
}

export default function ProjectSelector({ projects, report, onReportChange }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (projectId: string) => {
    setSelectedId(projectId);
    if (!projectId) {
      onReportChange(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await getLatestReport(projectId);
      onReportChange(r);
      if (!r) setError('No reports found for this project');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-selector">
      <label>Project</label>
      <select
        className="input"
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="">-- Select a project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {loading && <p className="muted">Loading report...</p>}
      {error && <p className="error">{error}</p>}

      {report && (
        <div className="report-preview">
          <label>Latest Report</label>
          <pre className="report-content">{report.content}</pre>
        </div>
      )}
    </div>
  );
}
