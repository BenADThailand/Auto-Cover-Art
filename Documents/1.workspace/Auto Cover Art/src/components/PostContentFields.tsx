import { useState } from 'react';
import {
  generateSubjectLine,
  generateContentBody,
  generateHashtags,
  generateAllContent,
} from '../api';
import { isTextLayer } from '../types';
import type { PostContent, Layer, Language } from '../types';
import { LANGUAGES } from '../types';

interface Props {
  postContent: PostContent;
  onPostContentChange: (pc: PostContent) => void;
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
  reportContent: string;
  contentPrompt: string;
  onContentPromptChange: (prompt: string) => void;
  subjectLineLimit?: number;
  onSubjectLineLimitChange: (v: number | undefined) => void;
  hashtagCount?: number;
  onHashtagCountChange: (v: number | undefined) => void;
  language?: Language;
  onLanguageChange: (v: Language | undefined) => void;
}

export default function PostContentFields({
  postContent,
  onPostContentChange,
  layers,
  onLayersChange,
  reportContent,
  contentPrompt,
  onContentPromptChange,
  subjectLineLimit,
  onSubjectLineLimitChange,
  hashtagCount,
  onHashtagCountChange,
  language,
  onLanguageChange,
}: Props) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAll = async () => {
    if (!reportContent) return;
    setGenerating('all');
    setError(null);
    try {
      // Only send text layers for AI generation
      const textLayers = layers.filter(isTextLayer);
      const layerInputs = textLayers.map((l) => ({ id: l.id, aiPrompt: l.aiPrompt, minWords: l.minWords, maxWords: l.maxWords }));
      const result = await generateAllContent(reportContent, layerInputs, contentPrompt, { subjectLineLimit, hashtagCount, language });
      onPostContentChange({
        subjectLine: result.subjectLine,
        contentBody: result.contentBody,
        hashtags: result.hashtags,
      });
      // Apply keywords to text layers only
      const updated = layers.map((l) => {
        if (!isTextLayer(l)) return l;
        const kw = result.keywords.find((k) => k.layerId === l.id);
        return kw ? { ...l, text: kw.text } : l;
      });
      onLayersChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateField = async (field: 'subjectLine' | 'contentBody' | 'hashtags') => {
    if (!reportContent) return;
    setGenerating(field);
    setError(null);
    try {
      let value: string;
      if (field === 'subjectLine') {
        value = await generateSubjectLine(reportContent, contentPrompt || undefined, subjectLineLimit, language);
      } else if (field === 'contentBody') {
        value = await generateContentBody(reportContent, contentPrompt || undefined, language);
      } else {
        value = await generateHashtags(reportContent, contentPrompt || undefined, hashtagCount, language);
      }
      onPostContentChange({ ...postContent, [field]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const disabled = !reportContent;

  return (
    <div className="post-content-fields">
      <div className="field-row" style={{ marginBottom: 8 }}>
        <label style={{ fontWeight: 600, color: '#a0a0ff' }}>Content Prompt</label>
        <input
          type="text"
          className="input"
          value={contentPrompt}
          onChange={(e) => onContentPromptChange(e.target.value)}
          placeholder="Guide AI tone/direction (e.g. luxury lifestyle, family friendly)"
        />
      </div>

      <div className="field-row" style={{ marginBottom: 8, gap: 12 }}>
        <label style={{ fontSize: 12 }}>Subject limit</label>
        <input
          type="number"
          className="input"
          style={{ width: 64 }}
          value={subjectLineLimit ?? ''}
          onChange={(e) => onSubjectLineLimitChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="50"
          min={1}
        />
        <label style={{ fontSize: 12 }}>Hashtag count</label>
        <input
          type="number"
          className="input"
          style={{ width: 64 }}
          value={hashtagCount ?? ''}
          onChange={(e) => onHashtagCountChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="8"
          min={1}
        />
        <label style={{ fontSize: 12 }}>Language</label>
        <select
          className="input"
          style={{ width: 160 }}
          value={language ?? ''}
          onChange={(e) => onLanguageChange(e.target.value ? (e.target.value as Language) : undefined)}
        >
          <option value="">Simplified Chinese</option>
          {LANGUAGES.filter((l) => l.value !== 'zh-CN').map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div className="field-row" style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, color: '#a0a0ff' }}>Post Content</label>
        <button
          className="btn btn-small btn-primary"
          onClick={handleGenerateAll}
          disabled={disabled || generating !== null}
          style={{ marginLeft: 'auto' }}
        >
          {generating === 'all' ? 'Generating...' : 'Generate All'}
        </button>
      </div>

      <div className="field-row">
        <label>Subject</label>
        <input
          type="text"
          className="input"
          value={postContent.subjectLine}
          onChange={(e) =>
            onPostContentChange({ ...postContent, subjectLine: e.target.value })
          }
          placeholder="Subject line"
        />
        <button
          className="btn btn-small"
          onClick={() => handleGenerateField('subjectLine')}
          disabled={disabled || generating !== null}
        >
          {generating === 'subjectLine' ? 'AI...' : 'AI'}
        </button>
      </div>

      <div className="field-row" style={{ marginTop: 8 }}>
        <label>Content</label>
        <textarea
          className="input"
          value={postContent.contentBody}
          onChange={(e) =>
            onPostContentChange({ ...postContent, contentBody: e.target.value })
          }
          placeholder="Post body"
          style={{ resize: 'vertical', minHeight: 60 }}
        />
        <button
          className="btn btn-small"
          onClick={() => handleGenerateField('contentBody')}
          disabled={disabled || generating !== null}
          style={{ alignSelf: 'flex-start' }}
        >
          {generating === 'contentBody' ? 'AI...' : 'AI'}
        </button>
      </div>

      <div className="field-row" style={{ marginTop: 8 }}>
        <label>Hashtags</label>
        <input
          type="text"
          className="input"
          value={postContent.hashtags}
          onChange={(e) =>
            onPostContentChange({ ...postContent, hashtags: e.target.value })
          }
          placeholder="#hashtags"
        />
        <button
          className="btn btn-small"
          onClick={() => handleGenerateField('hashtags')}
          disabled={disabled || generating !== null}
        >
          {generating === 'hashtags' ? 'AI...' : 'AI'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
