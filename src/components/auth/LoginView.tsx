import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_USERS } from '../../services/seedData';
import { User } from '../../types';
import { db } from '../../services/db';
import { validators } from '../../utils/validators';
import { loginSecurity } from '../../services/loginSecurity';
import { 
  Building2, 
  Sparkles, 
  UserCheck, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck,
  Zap,
  KeyRound,
  MessageSquare,
  Clock
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, registerResident, switchDemoUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'resident' | 'vendor' | 'register' | 'forgot'>('resident');
  
  // Resident / Vendor Form State
  const [flatNumber, setFlatNumber] = useState('');
  const [pin, setPin] = useState('');
  const [vendorKey, setVendorKey] = useState('VENDOR');
  const [vendorPin, setVendorPin] = useState('Demo@1234');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regFlat, setRegFlat] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  const apartmentName = import.meta.env.VITE_APARTMENT_NAME || 'Palm Heights Apartments';

  // Check lockout on active key change
  useEffect(() => {
    const key = activeTab === 'resident' ? flatNumber : activeTab === 'vendor' ? vendorKey : '';
    if (key) {
      const status = loginSecurity.checkLockout(key);
      if (status.isLocked) {
        setLockoutRemaining(status.remainingSeconds);
        setError(`Too many failed attempts. Account locked. Try again in ${Math.ceil(status.remainingSeconds / 60)}m ${status.remainingSeconds % 60}s.`);
      } else {
        setLockoutRemaining(0);
      }
    }
  }, [flatNumber, vendorKey, activeTab]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const switchTab = (tab: 'resident' | 'vendor' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
    setForgotStep(1);
    setLockoutRemaining(0);
  };

  const handleResidentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!flatNumber.trim() || !pin.trim()) {
      setError('Please enter both your Flat Number and Password');
      return;
    }
    
    // Normalize and validate format
    const normalizedFlat = validators.normalizeFlatNumber(flatNumber);
    if (!validators.isValidFlatNumber(normalizedFlat)) {
      setError('Invalid Flat format. Expected format: S-3907 or A-1001');
      return;
    }

    const lockout = loginSecurity.checkLockout(normalizedFlat);
    if (lockout.isLocked) {
      setLockoutRemaining(lockout.remainingSeconds);
      setError(`Too many failed attempts. Account temporarily locked for ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(normalizedFlat, pin);
      if (!success) {
        const afterStatus = loginSecurity.checkLockout(normalizedFlat);
        if (afterStatus.isLocked) {
          setLockoutRemaining(afterStatus.remainingSeconds);
          setError(`Too many failed attempts. Account locked for 3 minutes.`);
        } else {
          setError(`Invalid Flat Number or Password. (${afterStatus.attemptsLeft} attempt(s) remaining before lockout)`);
        }
      }
    } catch (err: any) {
      const afterStatus = loginSecurity.checkLockout(normalizedFlat);
      if (afterStatus.isLocked) {
        setLockoutRemaining(afterStatus.remainingSeconds);
      }
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vendorKey.trim() || !vendorPin.trim()) {
      setError('Please enter Vendor ID and Password');
      return;
    }

    const lockout = loginSecurity.checkLockout(vendorKey);
    if (lockout.isLocked) {
      setLockoutRemaining(lockout.remainingSeconds);
      setError(`Too many failed attempts. Vendor account locked for ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(vendorKey, vendorPin);
      if (!success) {
        const afterStatus = loginSecurity.checkLockout(vendorKey);
        if (afterStatus.isLocked) {
          setLockoutRemaining(afterStatus.remainingSeconds);
          setError(`Too many failed attempts. Vendor account locked for 3 minutes.`);
        } else {
          setError(`Invalid Vendor ID or Password. (${afterStatus.attemptsLeft} attempt(s) remaining)`);
        }
      }
    } catch (err: any) {
      const afterStatus = loginSecurity.checkLockout(vendorKey);
      if (afterStatus.isLocked) {
        setLockoutRemaining(afterStatus.remainingSeconds);
      }
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regName.trim() || !regFlat.trim() || !regPhone.trim() || !regPin.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!validators.isValidName(regName)) {
      setError('Name can only contain alphabets and spaces (minimum 2 characters)');
      return;
    }
    
    const normalizedFlat = validators.normalizeFlatNumber(regFlat);
    if (!validators.isValidFlatNumber(normalizedFlat)) {
      setError('Flat number must be an alphabet, a hyphen, and 4 digits (e.g., S-3907 or A-1001)');
      return;
    }
    
    if (!validators.isValidPhone(regPhone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    
    if (!validators.isValidPassword(regPin)) {
      setError('Password must be min 6 characters and include an uppercase, lowercase, digit, and special character');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerResident(regName, normalizedFlat, regPhone, regPin);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (forgotStep === 1) {
      if (!validators.isValidPhone(forgotPhone)) {
        setError('Phone number must be exactly 10 digits');
        return;
      }
      setIsSubmitting(true);
      try {
        const user = await db.getUserByPhone(forgotPhone);
        if (!user) {
          setError(`No account found with phone number ${forgotPhone}. Please register first.`);
          setIsSubmitting(false);
          return;
        }
        setTimeout(() => {
          setIsSubmitting(false);
          setForgotStep(2);
          setSuccessMsg('OTP sent to your phone! (For demo, use any 4 digits like 1234)');
        }, 600);
      } catch (err: any) {
        setError('Verification failed. Please try again.');
        setIsSubmitting(false);
      }
    } else if (forgotStep === 2) {
      if (forgotOtp.length < 4) {
        setError('Please enter a valid 4-digit OTP');
        return;
      }
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setForgotStep(3);
        setSuccessMsg('OTP Verified! Enter your new password.');
      }, 600);
    } else if (forgotStep === 3) {
      if (!validators.isValidPassword(forgotNewPin)) {
        setError('Password must be min 6 characters and include an uppercase, lowercase, digit, and special character');
        return;
      }
      setIsSubmitting(true);
      try {
        await db.resetPassword(forgotPhone, forgotNewPin);
        setSuccessMsg('Password updated successfully! You can now log in.');
        setTimeout(() => switchTab('resident'), 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to reset password');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleQuickSwitch = (user: User) => {
    switchDemoUser(user);
  };

  return (
    <div className="login-theme-wrapper">
      <style>{`
        .login-theme-wrapper {
          --login-bg: #FAF9F6;
          --login-text: #1A1A1A;
          --login-muted: #5A5A5A;
          --login-surface: #FFFFFF;
          --login-border: rgba(0, 0, 0, 0.08);
          --login-accent: #7BAE5C;
          --login-accent-hover: #69984C;
          
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--login-bg);
          color: var(--login-text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow-y: auto;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 4rem 1rem;
          z-index: 100;
        }

        .login-orb {
          position: absolute;
          top: 5%;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          max-width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(123, 174, 92, 0.15) 0%, rgba(250, 249, 246, 0) 70%);
          filter: blur(60px);
          z-index: -1;
          pointer-events: none;
        }

        .login-container {
          position: relative;
          width: 100%;
          max-width: 440px;
          z-index: 1;
        }

        .login-heading {
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--login-text);
          margin-bottom: 0.25rem;
        }

        .login-card {
          background: var(--login-surface);
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 24px;
          padding: 2.25rem;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
          margin-bottom: 1.5rem;
        }

        .login-tabs {
          display: flex;
          background: #F6F5F2;
          padding: 0.4rem;
          border-radius: 16px;
          margin-bottom: 1.75rem;
          gap: 0.4rem;
        }

        .login-tab {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.85rem 0.5rem;
          border-radius: 12px;
          color: var(--login-muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
        }

        .login-tab.active {
          background: var(--login-surface);
          color: var(--login-text);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .login-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--login-muted);
          margin-bottom: 0.4rem;
        }

        .login-input {
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 16px;
          background: #F6F5F2;
          border: 1px solid transparent;
          color: var(--login-text);
          font-size: 0.95rem;
          transition: all 200ms ease;
          margin-bottom: 1.5rem;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--login-accent);
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(123, 174, 92, 0.15);
        }

        .login-btn {
          width: 100%;
          padding: 1rem;
          border-radius: 9999px;
          background: var(--login-accent);
          color: #FFFFFF;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .login-btn:hover:not(:disabled) {
          background: var(--login-accent-hover);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 20px rgba(123, 174, 92, 0.3);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .login-demo-card {
          background: var(--login-surface);
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 20px;
          padding: 1.75rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
        }

        .demo-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          margin-bottom: 0.6rem;
          background: #F6F5F2;
          border: 1px solid var(--login-border);
          border-radius: 16px;
          cursor: pointer;
          transition: all 200ms ease;
          text-align: left;
          width: 100%;
        }

        .demo-option:hover {
          background: #FFFFFF;
          border-color: var(--login-accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(123, 174, 92, 0.12);
        }

        .demo-badge {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
        }
        
        .demo-badge-vendor { background: #F3E8FF; color: #9333EA; }
        .demo-badge-customer { background: #E0F2FE; color: #0284C7; }
        .demo-badge-due { background: #FEE2E2; color: #DC2626; }

        .forgot-link {
          font-size: 0.8rem;
          color: var(--login-accent);
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          display: block;
          margin: 1rem auto 0;
        }
        .forgot-link:hover {
          text-decoration: underline;
        }
      `}</style>
      
      <div className="login-orb"></div>
      
      <div className="login-container">
        {/* Brand Hero Card */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div 
            style={{ 
              width: '68px', 
              height: '68px', 
              borderRadius: '22px', 
              background: 'var(--login-accent)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(123, 174, 92, 0.35)',
              marginBottom: '1.25rem'
            }}
          >
            <Sparkles size={34} />
          </div>
          <h1 className="login-heading">
            PressWala
          </h1>
          <p style={{ color: 'var(--login-muted)', fontSize: '0.95rem' }}>
            Ironing Order & Payment Tracker • {apartmentName}
          </p>
        </div>

        {/* Main Login Card */}
        <div className="login-card">
          {/* Portal Role Tabs */}
          {activeTab !== 'forgot' && (
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${activeTab === 'resident' ? 'active' : ''}`}
                onClick={() => switchTab('resident')}
              >
                <Building2 size={16} />
                Resident
              </button>
              <button
                type="button"
                className={`login-tab ${activeTab === 'vendor' ? 'active' : ''}`}
                onClick={() => switchTab('vendor')}
              >
                <ShieldCheck size={16} />
                Vendor
              </button>
              <button
                type="button"
                className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => switchTab('register')}
              >
                <UserCheck size={16} />
                New Flat
              </button>
            </div>
          )}

          {activeTab === 'forgot' && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} color="var(--login-accent)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reset Password</h2>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div 
              style={{ 
                background: '#FEE2E2', 
                border: '1px solid #FCA5A5', 
                borderRadius: '16px', 
                padding: '1rem', 
                color: '#DC2626', 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div 
              style={{ 
                background: '#F0FDF4', 
                border: '1px solid #86EFAC', 
                borderRadius: '16px', 
                padding: '1rem', 
                color: '#166534', 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}
            >
              <ShieldCheck size={20} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Resident Login Form */}
          {activeTab === 'resident' && (
            <form onSubmit={handleResidentLogin}>
              <div>
                <label className="login-label">Flat Number (e.g. S-3907)</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. S-3907"
                  maxLength={6}
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Enter your password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting || lockoutRemaining > 0}
                style={lockoutRemaining > 0 ? { opacity: 0.6, cursor: 'not-allowed', background: '#9CA3AF' } : {}}
              >
                <span>
                  {lockoutRemaining > 0 
                    ? `Locked (${Math.floor(lockoutRemaining / 60)}m ${lockoutRemaining % 60}s)` 
                    : isSubmitting 
                    ? 'Verifying...' 
                    : 'Sign In as Resident'}
                </span>
                {lockoutRemaining > 0 ? <Clock size={20} /> : <ArrowRight size={20} />}
              </button>
              
              <button type="button" className="forgot-link" onClick={() => switchTab('forgot')}>
                Forgot Password?
              </button>
            </form>
          )}

          {/* Vendor Login Form */}
          {activeTab === 'vendor' && (
            <form onSubmit={handleVendorLogin}>
              <div>
                <label className="login-label">Vendor ID / Mobile Number</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="VENDOR or 9876543210"
                  value={vendorKey}
                  onChange={(e) => setVendorKey(e.target.value)}
                />
              </div>

              <div>
                <label className="login-label">Staff Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Enter Password (Default: Demo@1234)"
                  value={vendorPin}
                  onChange={(e) => setVendorPin(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting || lockoutRemaining > 0}
                style={lockoutRemaining > 0 ? { opacity: 0.6, cursor: 'not-allowed', background: '#9CA3AF' } : {}}
              >
                {lockoutRemaining > 0 ? <Clock size={20} /> : <ShieldCheck size={20} />}
                <span>
                  {lockoutRemaining > 0 
                    ? `Locked (${Math.floor(lockoutRemaining / 60)}m ${lockoutRemaining % 60}s)` 
                    : isSubmitting 
                    ? 'Verifying...' 
                    : 'Access Vendor Dashboard'}
                </span>
              </button>
            </form>
          )}

          {/* Register Flat Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister}>
              <div>
                <label className="login-label">Resident Full Name</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Rajesh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  style={{ marginBottom: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="login-label">Flat Number</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. S-3907"
                    maxLength={6}
                    value={regFlat}
                    onChange={(e) => setRegFlat(e.target.value.toUpperCase())}
                    style={{ marginBottom: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="login-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="login-input"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ marginBottom: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label className="login-label">Set Complex Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="Upper, lower, digit, special char"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Registering...' : 'Save & Enter Flat Portal'}</span>
                <ArrowRight size={20} />
              </button>
            </form>
          )}

          {/* Forgot Password Flow */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              {forgotStep === 1 && (
                <div>
                  <label className="login-label">Registered Mobile Number</label>
                  <input
                    type="tel"
                    className="login-input"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  <button type="submit" className="login-btn" disabled={isSubmitting}>
                    <span>{isSubmitting ? 'Sending OTP...' : 'Send OTP via SMS'}</span>
                    <MessageSquare size={20} />
                  </button>
                </div>
              )}
              
              {forgotStep === 2 && (
                <div>
                  <label className="login-label">Enter OTP sent to {forgotPhone}</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. 1234"
                    maxLength={4}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  <button type="submit" className="login-btn" disabled={isSubmitting}>
                    <span>{isSubmitting ? 'Verifying...' : 'Verify OTP'}</span>
                    <ShieldCheck size={20} />
                  </button>
                </div>
              )}

              {forgotStep === 3 && (
                <div>
                  <label className="login-label">Enter New Password</label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="Upper, lower, digit, special char"
                    value={forgotNewPin}
                    onChange={(e) => setForgotNewPin(e.target.value)}
                  />
                  <button type="submit" className="login-btn" disabled={isSubmitting}>
                    <span>{isSubmitting ? 'Updating...' : 'Set New Password'}</span>
                    <KeyRound size={20} />
                  </button>
                </div>
              )}
              
              <button type="button" className="forgot-link" onClick={() => switchTab('resident')} style={{ color: 'var(--login-muted)', fontWeight: 500 }}>
                Cancel & Back to Login
              </button>
            </form>
          )}
        </div>

        {/* Quick Demo Switcher Card */}
        <div className="login-demo-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={20} color="var(--login-accent)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--login-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Instant Demo Profiles
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--login-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Click any persona below to test that role instantly without typing credentials:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Ramu Dhobi (Vendor) */}
            <button
              type="button"
              className="demo-option"
              onClick={() => handleQuickSwitch(INITIAL_USERS[0])}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--login-text)' }}>Ramu Dhobi (Vendor)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--login-muted)' }}>Dashboard & deliveries</div>
                </div>
              </div>
              <span className="demo-badge demo-badge-vendor">Vendor</span>
            </button>

            {/* Pooja Verma (A-2004 - Has Outstanding Due) */}
            <button
              type="button"
              className="demo-option"
              onClick={() => handleQuickSwitch(INITIAL_USERS[2])}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--login-text)' }}>Pooja Verma (A-2004)</div>
                  <div style={{ fontSize: '0.8rem', color: '#DC2626' }}>⚠️ ₹110 Unpaid Order</div>
                </div>
              </div>
              <span className="demo-badge demo-badge-due">₹110 Due</span>
            </button>

            {/* Sharma Ji (A-1001 - Active Order) */}
            <button
              type="button"
              className="demo-option"
              onClick={() => handleQuickSwitch(INITIAL_USERS[1])}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--login-text)' }}>Sharma Ji (A-1001)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--login-muted)' }}>Active order in progress</div>
                </div>
              </div>
              <span className="demo-badge demo-badge-customer">A-1001</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
