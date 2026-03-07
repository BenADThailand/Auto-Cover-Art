import { useState, useRef } from 'react';
import { generateAllContent, enhanceImage } from '../api';
import { renderOffScreen } from '../lib/renderCanvas';
import { isTextLayer } from '../types';
import type { Project, Menu, MenuPipelineJob, Report, Layer, TextLayer } from '../types';

interface Props {
  projects: Project[];
  menus: Menu[];
  fetchReport: (projectId: string) => Promise<Report | null>;
}

export default function MenuPipeline({
  projects,
  menus,
  fetchReport,
}: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<MenuPipelineJob[]>([]);
  const [running, setRunning] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);

  const selectedMenu = menus.find((m) => m.id === selectedMenuId) ?? null;

  // --- Folder input ---

  const handleAddFolders = (files: FileList | null) => {
    if (!files || !selectedMenu) return;

    // Group files by parent folder name from webkitRelativePath
    const folderMap = new Map<string, File[]>();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = (file as any).webkitRelativePath as string;
      if (!relPath) continue;
      // Skip non-image files
      if (!file.type.startsWith('image/')) continue;
      const parts = relPath.split('/');
      // Folder name is the first directory component
      const folderName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      if (!folderMap.has(folderName)) folderMap.set(folderName, []);
      folderMap.get(folderName)!.push(file);
    }

    // Sort files within each folder by name, create jobs
    const newJobPromises: Promise<MenuPipelineJob>[] = [];
    folderMap.forEach((folderFiles, folderName) => {
      folderFiles.sort((a, b) => a.name.localeCompare(b.name));
      const slotCount = selectedMenu.slots.length;

      const slotReaders = folderFiles.slice(0, slotCount).map(
        (file, idx) =>
          new Promise<MenuPipelineJob['slotImages'][0]>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                slotIndex: idx,
                imageDataUrl: reader.result as string,
                imageName: file.name,
                status: 'pending',
                resultDataUrl: null,
                error: null,
              });
            };
            reader.readAsDataURL(file);
          })
      );

      newJobPromises.push(
        Promise.all(slotReaders).then((slotImages) => ({
          id: crypto.randomUUID(),
          folderName,
          projectId: '',
          slotImages,
          subjectLine: null,
          contentBody: null,
          hashtags: null,
          status: 'pending' as const,
          error: null,
        }))
      );
    });

    Promise.all(newJobPromises).then((newJobs) =>
      setJobs((prev) => [...prev, ...newJobs])
    );
  };

  const updateJob = (id: string, patch: Partial<MenuPipelineJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const handleRemoveJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  // --- Generation ---

  const handleGenerateAll = async () => {
    if (!selectedMenu) return;
    setRunning(true);
    const currentJobs = [...jobs];

    for (const job of currentJobs) {
      if (!job.projectId) {
        updateJob(job.id, { status: 'error', error: 'No project selected' });
        continue;
      }

      updateJob(job.id, { status: 'generating', error: null });

      try {
        // 1. Fetch report
        const report = await fetchReport(job.projectId);
        if (!report) throw new Error('No report found for project');

        // 2. Namespace layer IDs across slots — only text layers for AI
        const allNamespacedLayers: { id: number; aiPrompt: string; minWords?: number; maxWords?: number }[] = [];
        for (let si = 0; si < selectedMenu.slots.length; si++) {
          const slot = selectedMenu.slots[si];
          const textLayers = slot.layers.filter(isTextLayer);
          for (const layer of textLayers) {
            allNamespacedLayers.push({
              id: si * 1000 + layer.id,
              aiPrompt: layer.aiPrompt,
              minWords: layer.minWords,
              maxWords: layer.maxWords,
            });
          }
        }

        // 3. Call generateAllContent ONCE with all namespaced layers
        const result = await generateAllContent(
          report.content,
          allNamespacedLayers,
          selectedMenu.contentPrompt,
          {
            subjectLineLimit: selectedMenu.subjectLineLimit,
            hashtagCount: selectedMenu.hashtagCount,
            language: selectedMenu.language,
          }
        );

        // 4. Process each slot
        const updatedSlotImages = [...job.slotImages];
        for (let si = 0; si < selectedMenu.slots.length; si++) {
          const slotImage = updatedSlotImages.find((s) => s.slotIndex === si);
          if (!slotImage) continue;

          try {
            const slot = selectedMenu.slots[si];
            // Clone layers for this slot and apply keywords to text layers
            const resolvedLayers: Layer[] = JSON.parse(
              JSON.stringify(slot.layers)
            );
            for (const layer of resolvedLayers) {
              if (isTextLayer(layer)) {
                const namespacedId = si * 1000 + layer.id;
                const kw = result.keywords.find((k) => k.layerId === namespacedId);
                if (kw) (layer as TextLayer).text = kw.text;
              }
            }

            // Enhance image if needed
            let finalImageDataUrl = slotImage.imageDataUrl;
            if (slot.enhancePrompt) {
              const base64 = slotImage.imageDataUrl.replace(
                /^data:[^;]+;base64,/,
                ''
              );
              const mimeMatch = slotImage.imageDataUrl.match(/^data:([^;]+);/);
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
              const enhanced = await enhanceImage(
                base64,
                mimeType,
                slot.enhancePrompt
              );
              finalImageDataUrl = `data:image/png;base64,${enhanced}`;
            }

            // Render (handles image layer preloading internally)
            const resultDataUrl = await renderOffScreen(
              finalImageDataUrl,
              resolvedLayers,
              slot.canvasSize,
              slot.imageOffsetX,
              slot.imageOffsetY
            );

            slotImage.status = 'done';
            slotImage.resultDataUrl = resultDataUrl;
            slotImage.error = null;
          } catch (err) {
            slotImage.status = 'error';
            slotImage.error = err instanceof Error ? err.message : 'Unknown error';
          }
        }

        updateJob(job.id, {
          status: 'done',
          slotImages: updatedSlotImages,
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

  // --- Download ---

  const handleDownloadAll = () => {
    for (const job of jobs) {
      if (job.status !== 'done') continue;
      for (const slotImage of job.slotImages) {
        if (slotImage.status !== 'done' || !slotImage.resultDataUrl) continue;
        const a = document.createElement('a');
        a.href = slotImage.resultDataUrl;
        const baseName = slotImage.imageName.replace(/\.[^.]+$/, '');
        a.download = `${job.folderName}-slot${slotImage.slotIndex + 1}-${baseName}.png`;
        a.click();
      }
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllContent = (job: MenuPipelineJob) => {
    const parts = [job.subjectLine, job.contentBody, job.hashtags].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n\n'));
  };

  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const canGenerate =
    jobs.length > 0 &&
    !running &&
    selectedMenu !== null &&
    jobs.some((j) => j.projectId);

  return (
    <div className="menu-pipeline">
      {/* Toolbar */}
      <div className="menu-management">
        <h2>Menu Run</h2>
        <div className="bulk-toolbar">
          <div className="field-row">
            <label>Menu</label>
            <select
              className="input"
              value={selectedMenuId ?? ''}
              onChange={(e) => setSelectedMenuId(e.target.value || null)}
            >
              <option value="">-- Select Menu --</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.slots.length} slots)
                </option>
              ))}
            </select>
          </div>

          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in React types
            webkitdirectory=""
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleAddFolders(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            className="btn"
            onClick={() => folderRef.current?.click()}
            disabled={!selectedMenu}
          >
            Add Folders
          </button>

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

        {selectedMenu && (
          <div className="menu-preview">
            &ldquo;{selectedMenu.name}&rdquo; &mdash; {selectedMenu.slots.length} slot{selectedMenu.slots.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Folder Job Cards */}
      {jobs.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          {selectedMenu
            ? 'Use "Add Folders" to select project photo folders'
            : 'Select a menu to get started'}
        </p>
      )}

      <div className="job-list">
        {jobs.map((job) => (
          <div key={job.id} className="folder-job-card">
            <div className="folder-job-header">
              <span className="job-filename">{job.folderName}</span>

              <div className="field-row">
                <label>Project</label>
                <select
                  className="input"
                  value={job.projectId}
                  onChange={(e) =>
                    updateJob(job.id, { projectId: e.target.value })
                  }
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className={`status-badge status-${job.status}`}>
                {job.status}
              </span>

              <div className="job-actions">
                <button
                  className="btn btn-small"
                  onClick={() => handleRemoveJob(job.id)}
                  disabled={running}
                >
                  Remove
                </button>
              </div>
            </div>

            {job.error && <span className="error">{job.error}</span>}

            {/* Slot thumbnails */}
            <div className="folder-slot-images">
              {job.slotImages.map((slotImg) => (
                <div key={slotImg.slotIndex} className="folder-slot-item">
                  <span className="slot-badge">#{slotImg.slotIndex + 1}</span>
                  <img
                    src={slotImg.resultDataUrl ?? slotImg.imageDataUrl}
                    alt={slotImg.imageName}
                    className="job-thumbnail"
                  />
                  <span className="muted" style={{ fontSize: 11 }}>
                    {slotImg.imageName}
                  </span>
                  {slotImg.error && (
                    <span className="error" style={{ fontSize: 11 }}>
                      {slotImg.error}
                    </span>
                  )}
                </div>
              ))}
              {selectedMenu &&
                job.slotImages.length < selectedMenu.slots.length && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    {selectedMenu.slots.length - job.slotImages.length} slot(s) missing photos
                  </p>
                )}
            </div>

            {/* Post content */}
            {job.status === 'done' &&
              (job.subjectLine || job.contentBody || job.hashtags) && (
                <div className="job-content">
                  {job.subjectLine && (
                    <div className="job-content-row">
                      <span className="job-content-label">Subject</span>
                      <span className="job-content-text">
                        {job.subjectLine}
                      </span>
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
                      <span className="job-content-text">
                        {job.contentBody}
                      </span>
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
                    onClick={() => copyAllContent(job)}
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
