import { useRef, useState } from 'react';
import { enhanceImage } from '../api';

interface Props {
  image: string | null; // base64 data URL
  mimeType: string;
  onImageChange: (dataUrl: string, mimeType: string) => void;
  enhancePrompt: string;
  onEnhancePromptChange: (value: string) => void;
}

export default function ImageUploader({ image, mimeType, onImageChange, enhancePrompt, onEnhancePromptChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onImageChange(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleEnhance = async () => {
    if (!image) return;
    setEnhancing(true);
    setError('');
    try {
      // Strip data URL prefix to get raw base64
      const base64 = image.replace(/^data:[^;]+;base64,/, '');
      const enhanced = await enhanceImage(base64, mimeType, enhancePrompt);
      onImageChange(`data:image/png;base64,${enhanced}`, 'image/png');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <section className="section">
      <h2>1. Image & Enhancement</h2>

      <div className="upload-row">
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Choose Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          hidden
        />
        {image && (
          <img src={image} alt="preview" className="thumbnail" />
        )}
      </div>

      <div className="enhance-row">
        <input
          type="text"
          className="input"
          placeholder="Enhancement prompt (e.g. make warmer, increase contrast)"
          value={enhancePrompt}
          onChange={(e) => onEnhancePromptChange(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={handleEnhance}
          disabled={!image || enhancing}
        >
          {enhancing ? 'Enhancing...' : 'Enhance'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
