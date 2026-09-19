import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { VendorInvite } from '../../types';
import { validators } from '../../utils/validators';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface VendorOnboardingViewProps {
  token: string;
}

export const VendorOnboardingView: React.FC<VendorOnboardingViewProps> = ({ token }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [invite, setInvite] = useState<VendorInvite | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [apartmentName, setApartmentName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function verifyInvite() {
      setIsLoading(true);
      try {
        const res = await db.getVendorInviteByToken(token);
        if (res.valid && res.invite) {
          setInvite(res.invite);
          setName(res.invite.vendor_name);
          setPhone(res.invite.vendor_phone);
          setApartmentName(res.invite.apartment_name);
        } else {
          setInvalidReason(res.reason || 'not_found');
        }
      } catch (err: any) {
        setInvalidReason('not_found');
      } finally {
        setIsLoading(false);
      }
    }
    verifyInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim() || !apartmentName.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!validators.isValidName(name)) {
      setError('Business name must be at least 2 characters.');
      return;
    }

    if (!validators.isValidPhone(phone)) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    if (!validators.isValidPassword(password)) {
      setError('Password must be min 6 characters and include an uppercase, lowercase, digit, and special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await db.completeVendorInvite(token, password, name, phone, apartmentName);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateHome = () => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F6' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Verifying onboarding invitation...</div>
      </div>
    );
  }

  // Invalid or Expired Token State
  if (invalidReason || !invite) {
    return (
      <div className="onboard-container">
        <style>{`
          .onboard-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FAF9F6;
            padding: 1.5rem;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .onboard-card {
            width: 100%;
            max-width: 480px;
            background: #FFFFFF;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 24px;
            padding: 2.5rem 2rem;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          }
        `}</style>
        <div className="onboard-card">
          <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1A1A1A', margin: '0 0 0.75rem 0' }}>
            Invitation No Longer Valid
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#5A5A5A', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
            {invalidReason === 'expired'
              ? 'This onboarding link has expired (links remain valid for 7 days). Please contact the platform owner for a new one.'
              : invalidReason === 'already_used'
              ? 'This onboarding link has already been used to set up an account. Please contact the platform owner for a new one if you need another account.'
              : 'This invite link is no longer valid, please contact the platform owner for a new one.'}
          </p>
          <button
            type="button"
            onClick={handleNavigateHome}
            style={{
              background: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '0.85rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Return to Main App
          </button>
        </div>
      </div>
    );
  }

  // Registration Completed State
  if (isSuccess) {
    return (
      <div className="onboard-container">
        <style>{`
          .onboard-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FAF9F6;
            padding: 1.5rem;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .onboard-card {
            width: 100%;
            max-width: 480px;
            background: #FFFFFF;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 24px;
            padding: 2.5rem 2rem;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          }
        `}</style>
        <div className="onboard-card">
          <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(123, 174, 92, 0.15)', color: '#486E32', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={30} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1A1A1A', margin: '0 0 0.75rem 0' }}>
            Account Setup Submitted!
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#5A5A5A', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
            Your vendor account for <strong>{apartmentName}</strong> has been created and is pending administrative approval. You will receive access as soon as operations approves your account.
          </p>
          <div style={{ padding: '0.9rem', background: '#F6F5F2', borderRadius: '12px', fontSize: '0.85rem', color: '#666', marginBottom: '2rem' }}>
            Login Key: <strong>{phone}</strong> (or <strong>VENDOR-{phone.slice(-4)}</strong>)
          </div>
          <button
            type="button"
            onClick={handleNavigateHome}
            style={{
              width: '100%',
              background: '#7BAE5C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '0.9rem 1.5rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Go to Vendor Sign In
          </button>
        </div>
      </div>
    );
  }

  // Active Onboarding Form
  return (
    <div className="onboard-container">
      <style>{`
        .onboard-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FAF9F6;
          padding: 2rem 1.5rem;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .onboard-card {
          width: 100%;
          max-width: 500px;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        .onboard-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .onboard-input {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #FFFFFF;
          font-size: 0.95rem;
          color: #111827;
          box-sizing: border-box;
          outline: none;
          margin-bottom: 1.1rem;
          transition: all 150ms ease;
        }
        .onboard-input:focus {
          border-color: #7BAE5C;
          box-shadow: 0 0 0 3px rgba(123, 174, 92, 0.18);
        }
        .onboard-btn {
          width: 100%;
          background: #7BAE5C;
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 0.9rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          box-shadow: 0 4px 12px rgba(123, 174, 92, 0.3);
        }
        .onboard-btn:hover:not(:disabled) {
          background: #68964C;
        }
        .onboard-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="onboard-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(123, 174, 92, 0.15)', color: '#486E32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7BAE5C', letterSpacing: '0.05em' }}>
              Invited Partner Setup
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              Vendor Registration
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.5, marginBottom: '1.75rem' }}>
          You have been invited by platform operations to manage ironing & laundry operations. Complete your password to submit your account for activation.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="onboard-label">Vendor / Business Name</label>
          <input
            type="text"
            className="onboard-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramu Dhobi"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="onboard-label">Contact Phone</label>
              <input
                type="tel"
                className="onboard-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit phone"
              />
            </div>
            <div>
              <label className="onboard-label">Assigned Apartment</label>
              <input
                type="text"
                className="onboard-input"
                value={apartmentName}
                onChange={(e) => setApartmentName(e.target.value)}
                placeholder="e.g. Palm Heights"
              />
            </div>
          </div>

          <label className="onboard-label">Create Vendor Password</label>
          <input
            type="password"
            className="onboard-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 chars (upper, lower, digit, special)"
          />

          <label className="onboard-label">Confirm Password</label>
          <input
            type="password"
            className="onboard-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
          />

          <button
            type="submit"
            className="onboard-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Submitting Account...' : 'Complete Account Setup'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
