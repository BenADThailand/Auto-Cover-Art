import { useState } from 'react';
import { updateUserApiKey } from '../firebase';
import type { User } from '../types';

interface Props {
  user: User;
  onKeySet: (updatedUser: User) => void;
  inline?: boolean;
}

export default function ApiKeySetup({ user, onKeySet, inline }: Props) {
  const [key, setKey] = useState('');
  const [editing, setEditing] = useState(!user.geminiApiKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed) { setError('API key cannot be empty'); return; }
    setSaving(true);
    setError('');
    try {
      await updateUserApiKey(user.id, trimmed);
      onKeySet({ ...user, geminiApiKey: trimmed });
      setEditing(false);
      setKey('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const masked = user.geminiApiKey
    ? user.geminiApiKey.slice(0, 4) + '••••••••' + user.geminiApiKey.slice(-4)
    : '';

  if (inline) {
    if (!editing) {
      return (
        <div className="api-key-inline">
          <span className="api-key-display">{masked}</span>
          <button className="btn btn-small" onClick={() => setEditing(true)}>Change</button>
        </div>
      );
    }
    return (
      <div className="api-key-inline">
        <input
          className="input"
          type="password"
          placeholder="Enter new Gemini API key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-small btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {user.geminiApiKey && (
          <button className="btn btn-small" onClick={() => { setEditing(false); setKey(''); setError(''); }}>Cancel</button>
        )}
        {error && <span className="error">{error}</span>}
      </div>
    );
  }

  // Full-page setup (first-time)
  return (
    <div className="api-key-setup">
      <div className="api-key-card section">
        <h2>API Key Setup</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Enter your Google Gemini API key to use AI features. You can get one from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#888' }}>
            Google AI Studio
          </a>.
        </p>
        <div className="login-fields">
          <label>
            API Key
            <input
              className="input"
              type="password"
              placeholder="AIza..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </label>
        </div>
        <button className="btn btn-primary login-submit" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Continue'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
