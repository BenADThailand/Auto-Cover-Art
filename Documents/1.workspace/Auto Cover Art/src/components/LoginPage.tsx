import { useState } from 'react';
import { loginUser } from '../firebase';
import type { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginUser(username, password);
      if (!user) {
        setError('Invalid credentials. Access denied.');
        setLoading(false);
        return;
      }
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M8 22L14 6L20 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.5 16H17.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="login-title">AD Photo Studio</h2>
        <div className="login-subtitle">
          <span className="login-subtitle-line" />
          <span>Secure Terminal</span>
          <span className="login-subtitle-line" />
        </div>

        {/* Divider */}
        <div className="login-divider" />

        {/* Fields */}
        <div className="login-fields">
          <label>
            <span className="login-label">Operator_ID</span>
            <input
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </label>

          <label>
            <span className="login-label">Security_Token</span>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </label>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          type="submit"
          className="login-submit"
          disabled={loading || !username || !password}
        >
          {loading ? 'Authenticating...' : 'Establish Connection'}
        </button>

        {/* Footer */}
        <div className="login-divider" />
        <p className="login-footer">V2.0_Stable &bull; Session_Encrypted</p>
      </form>
    </div>
  );
}
