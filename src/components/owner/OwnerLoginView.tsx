import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Terminal, AlertCircle, Clock, KeyRound } from 'lucide-react';

export const OwnerLoginView: React.FC = () => {
  const { login } = useAuth();
  const [operatorKey, setOperatorKey] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorKey.trim() || !password.trim()) {
      setError('Please provide both Operator Key and Security Password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await login(operatorKey.trim(), password.trim());
      if (!success) {
        setError('Invalid operator credentials. Access denied.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setOperatorKey('SUPER_OWNER_KEY');
    setPassword('PressWala!Ops#2026');
    setError(null);
  };

  return (
    <div className="ops-login-container">
      <style>{`
        .ops-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090D16;
          color: #F8FAFC;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 1.5rem;
          box-sizing: border-box;
        }

        .ops-card {
          width: 100%;
          max-width: 440px;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          position: relative;
          overflow: hidden;
        }

        .ops-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4F46E5, #06B6D4, #10B981);
        }

        .ops-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(79, 70, 229, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #A5B4FC;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          margin-bottom: 1.25rem;
        }

        .ops-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem 0;
        }

        .ops-subtitle {
          font-size: 0.85rem;
          color: #94A3B8;
          line-height: 1.5;
          margin: 0 0 2rem 0;
        }

        .ops-form-group {
          margin-bottom: 1.25rem;
        }

        .ops-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #CBD5E1;
          margin-bottom: 0.5rem;
        }

        .ops-input {
          width: 100%;
          background: #1F2937;
          border: 1px solid #374151;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          color: #F8FAFC;
          font-size: 0.95rem;
          box-sizing: border-box;
          outline: none;
          transition: all 150ms ease;
          font-family: inherit;
        }

        .ops-input:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
          background: #1E293B;
        }

        .ops-input::placeholder {
          color: #64748B;
        }

        .ops-submit-btn {
          width: 100%;
          background: #4F46E5;
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 0.9rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 150ms ease;
          margin-top: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
        }

        .ops-submit-btn:hover:not(:disabled) {
          background: #4338CA;
          transform: translateY(-1px);
          box-shadow: 0 12px 20px -3px rgba(79, 70, 229, 0.4);
        }

        .ops-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .ops-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #FCA5A5;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .ops-demo-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
        }

        .ops-demo-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: #94A3B8;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 150ms ease;
        }

        .ops-demo-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #F1F5F9;
          border-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>

      <div className="ops-card">
        <div className="ops-badge">
          <Terminal size={14} />
          Operations Infrastructure
        </div>

        <h1 className="ops-title">Operator Console</h1>
        <p className="ops-subtitle">
          Restricted administrative access (/platform-admin). Authenticate using authorized operator credentials.
        </p>

        {error && (
          <div className="ops-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="ops-form-group">
            <label className="ops-label">Operator Key / Identity</label>
            <input
              type="text"
              className="ops-input"
              placeholder="e.g. SUPER_OWNER_KEY or 9800000001"
              value={operatorKey}
              onChange={(e) => setOperatorKey(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="ops-form-group">
            <label className="ops-label">Security Password</label>
            <input
              type="password"
              className="ops-input"
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="ops-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Clock size={18} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Lock size={18} />
                <span>Authenticate Session</span>
              </>
            )}
          </button>
        </form>

        {/* Demo/Dev shortcut strictly contained on this secret route */}
        <div className="ops-demo-section">
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.6rem' }}>
            Authorized Testing Environment
          </div>
          <button
            type="button"
            className="ops-demo-btn"
            onClick={handleFillDemo}
            title="Auto-fill developer bootstrap credentials"
          >
            <KeyRound size={14} />
            <span>Auto-fill Operator Credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerLoginView;
