import { useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { canDelete } from '../lib/permissions';
import type { SharedAsset } from '../types';

interface Props {
  assets: SharedAsset[];
  loading: boolean;
  onUpload: (file: File, tags?: string[]) => Promise<SharedAsset>;
  onDelete: (asset: SharedAsset) => Promise<void>;
  /** If provided, the component operates in "picker" mode */
  pickerMode?: boolean;
  onPick?: (asset: SharedAsset) => void;
  onClose?: () => void;
}

export default function AssetLibrary({
  assets,
  loading,
  onUpload,
  onDelete,
  pickerMode,
  onPick,
  onClose,
}: Props) {
  const user = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.fileName.toLowerCase().includes(search.toLowerCase()) ||
          a.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : assets;

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const content = (
    <div className={pickerMode ? 'asset-library-picker' : 'asset-library'}>
      <div className="asset-library-header">
        <h2>{pickerMode ? 'Choose Asset' : 'Asset Library'}</h2>
        <div className="asset-library-toolbar">
          <input
            type="text"
            className="input"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.svg"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          {pickerMode && onClose && (
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <p style={{ color: '#ff6b6b', textAlign: 'center', padding: '8px 12px', margin: '0 0 8px', background: 'rgba(255,107,107,0.1)', borderRadius: 6 }}>
          {uploadError}
        </p>
      )}

      {loading && <p className="muted" style={{ textAlign: 'center', padding: 20 }}>Loading assets...</p>}

      {!loading && filtered.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          {search ? 'No matching assets' : 'No assets yet. Upload your first asset!'}
        </p>
      )}

      <div className="asset-grid">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="asset-card"
            onClick={() => {
              if (pickerMode && onPick) onPick(asset);
            }}
            style={pickerMode ? { cursor: 'pointer' } : undefined}
          >
            <img
              src={asset.downloadUrl}
              alt={asset.name}
              className="asset-thumb"
            />
            <div className="asset-info">
              <span className="asset-name">{asset.name}</span>
              <span className="asset-meta">{asset.mimeType}</span>
              {asset.uploadedByName && (
                <span className="creator-badge">{asset.uploadedByName}</span>
              )}
            </div>
            {!pickerMode && canDelete(user, asset) && (
              <button
                className="asset-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset);
                }}
                title="Delete asset"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (pickerMode) {
    return (
      <div className="asset-picker-overlay" onClick={onClose}>
        <div className="asset-picker-modal" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
