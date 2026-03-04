import { useState, useRef } from 'react';
import { generateAllContent, enhanceImage } from '../api';
import { renderOffScreen } from '../lib/renderCanvas';
import type { Project, Recipe, Report, BulkJob, KeywordLayer } from '../types';

interface Props {
  projects: Project[];
  recipes: Recipe[];
  fetchReport: (projectId: string) => Promise<Report | null>;
}

export default function BulkPipeline({ projects, recipes, fetchReport }: Props) {
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const readers: Promise<BulkJob>[] = [];
    for (const file of Array.from(files)) {
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: crypto.randomUUID(),
              imageDataUrl: reader.result as string,
              imageName: file.name,
              projectId: '',
              recipeId: '',
              status: 'pending',
              resultDataUrl: null,
              error: null,
              subjectLine: null,
              contentBody: null,
              hashtags: null,
            });
          };
          reader.readAsDataURL(file);
        })
      );
    }
    Promise.all(readers).then((newJobs) =>
      setJobs((prev) => [...prev, ...newJobs])
    );
  };

  const updateJob = (id: string, patch: Partial<BulkJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const handleApplyRecipeToAll = (recipeId: string) => {
    setJobs((prev) => prev.map((j) => ({ ...j, recipeId })));
  };

  const handleApplyProjectToAll = (projectId: string) => {
    setJobs((prev) => prev.map((j) => ({ ...j, projectId })));
  };

  const handleRemoveJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleGenerateAll = async () => {
    setRunning(true);
    const currentJobs = [...jobs];

    for (const job of currentJobs) {
      if (!job.recipeId || !job.projectId) {
        updateJob(job.id, {
          status: 'error',
          error: 'Missing project or recipe',
        });
        continue;
      }

      updateJob(job.id, { status: 'generating', error: null });

      try {
        const recipe = recipes.find((r) => r.id === job.recipeId);
        if (!recipe) throw new Error('Recipe not found');

        const resolvedLayers: KeywordLayer[] = JSON.parse(
          JSON.stringify(recipe.layers)
        );

        const report = await fetchReport(job.projectId);
        if (!report) throw new Error('No report found for project');

        // Use unified AI call for keywords + post content
        const layerInputs = resolvedLayers.map((l) => ({
          id: l.id,
          aiPrompt: l.aiPrompt,
        }));

        const result = await generateAllContent(report.content, layerInputs, recipe.contentPrompt || '', { subjectLineLimit: recipe.subjectLineLimit, hashtagCount: recipe.hashtagCount });

        // Apply keywords to layers
        for (const layer of resolvedLayers) {
          const kw = result.keywords.find((k) => k.layerId === layer.id);
          if (kw) layer.text = kw.text;
        }

        // Enhance image if recipe has an enhancePrompt
        let finalImageDataUrl = job.imageDataUrl;
        if (recipe.enhancePrompt) {
          const base64 = job.imageDataUrl.replace(/^data:[^;]+;base64,/, '');
          const mimeMatch = job.imageDataUrl.match(/^data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const enhanced = await enhanceImage(base64, mimeType, recipe.enhancePrompt);
          finalImageDataUrl = `data:image/png;base64,${enhanced}`;
        }

        // Render off-screen
        const resultDataUrl = await renderOffScreen(
          finalImageDataUrl,
          resolvedLayers,
          recipe.canvasSize
        );

        updateJob(job.id, {
          status: 'done',
          resultDataUrl,
          subjectLine: result.subjectLine,
          contentBody: result.contentBody,
          hashtags: result.hashtags,
        });
      } catch (err) {
        updateJob(job.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setRunning(false);
  };

  const handleDownloadAll = () => {
    for (const job of jobs) {
      if (job.status !== 'done' || !job.resultDataUrl) continue;
      const a = document.createElement('a');
      a.href = job.resultDataUrl;
      const baseName = job.imageName.replace(/\.[^.]+$/, '');
      a.download = `${baseName}-cover.png`;
      a.click();
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAll = (job: BulkJob) => {
    const parts = [
      job.subjectLine,
      job.contentBody,
      job.hashtags,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n\n'));
  };

  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const canGenerate = jobs.length > 0 && !running;

  return (
    <div className="bulk-pipeline">
      <div className="bulk-toolbar">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleAddImages(e.target.files)}
        />
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Add Images
        </button>

        <div className="field-row">
          <label>Recipe for All</label>
          <select
            className="input"
            value=""
            onChange={(e) => handleApplyRecipeToAll(e.target.value)}
          >
            <option value="">-- Apply to all --</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <label>Project for All</label>
          <select
            className="input"
            value=""
            onChange={(e) => handleApplyProjectToAll(e.target.value)}
          >
            <option value="">-- Apply to all --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          disabled={!canGenerate}
          onClick={handleGenerateAll}
        >
          {running ? 'Generating...' : 'Generate All'}
        </button>

        {doneCount > 0 && (
          <button className="btn" onClick={handleDownloadAll}>
            Download All ({doneCount})
          </button>
        )}

        {jobs.length > 0 && !running && (
          <button className="btn" onClick={() => setJobs([])}>
            Clear All
          </button>
        )}
      </div>

      {jobs.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          Add images to get started
        </p>
      )}

      <div className="job-list">
        {jobs.map((job) => (
          <div key={job.id} className="job-card">
            <div className="job-card-header">
              <img
                src={job.imageDataUrl}
                alt={job.imageName}
                className="job-thumbnail"
              />

              <div className="job-info">
                <span className="job-filename">{job.imageName}</span>

                <select
                  className="input"
                  value={job.projectId}
                  onChange={(e) =>
                    updateJob(job.id, { projectId: e.target.value })
                  }
                >
                  <option value="">-- Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <select
                  className="input"
                  value={job.recipeId}
                  onChange={(e) =>
                    updateJob(job.id, { recipeId: e.target.value })
                  }
                >
                  <option value="">-- Recipe --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className={`status-badge status-${job.status}`}>
                {job.status}
              </span>

              {job.error && <span className="error">{job.error}</span>}

              {job.resultDataUrl && (
                <img
                  src={job.resultDataUrl}
                  alt="Result"
                  className="result-thumbnail"
                />
              )}

              <div className="job-actions">
                {job.resultDataUrl && (
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = job.resultDataUrl!;
                      const baseName = job.imageName.replace(/\.[^.]+$/, '');
                      a.download = `${baseName}-cover.png`;
                      a.click();
                    }}
                  >
                    Download
                  </button>
                )}
                <button
                  className="btn btn-small"
                  onClick={() => handleRemoveJob(job.id)}
                  disabled={running}
                >
                  Remove
                </button>
              </div>
            </div>

            {job.status === 'done' && (job.subjectLine || job.contentBody || job.hashtags) && (
              <div className="job-content">
                {job.subjectLine && (
                  <div className="job-content-row">
                    <span className="job-content-label">Subject</span>
                    <span className="job-content-text">{job.subjectLine}</span>
                    <button
                      className="btn btn-small"
                      onClick={() => copyText(job.subjectLine!)}
                    >
                      Copy
                    </button>
                  </div>
                )}
                {job.contentBody && (
                  <div className="job-content-row">
                    <span className="job-content-label">Content</span>
                    <span className="job-content-text">{job.contentBody}</span>
                    <button
                      className="btn btn-small"
                      onClick={() => copyText(job.contentBody!)}
                    >
                      Copy
                    </button>
                  </div>
                )}
                {job.hashtags && (
                  <div className="job-content-row">
                    <span className="job-content-label">Hashtags</span>
                    <span className="job-content-text">{job.hashtags}</span>
                    <button
                      className="btn btn-small"
                      onClick={() => copyText(job.hashtags!)}
                    >
                      Copy
                    </button>
                  </div>
                )}
                <button
                  className="btn btn-small"
                  onClick={() => copyAll(job)}
                  style={{ alignSelf: 'flex-end', marginTop: 4 }}
                >
                  Copy All
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
