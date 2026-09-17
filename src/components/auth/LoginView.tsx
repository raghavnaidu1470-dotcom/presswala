import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_USERS } from '../../services/seedData';
import { User } from '../../types';
import { 
  Building2, 
  Sparkles, 
  UserCheck, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, registerResident, switchDemoUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'resident' | 'vendor' | 'register'>('resident');
  
  // Resident / Vendor Form State
  const [flatNumber, setFlatNumber] = useState('');
  const [pin, setPin] = useState('');
  const [vendorKey, setVendorKey] = useState('VENDOR');
  const [vendorPin, setVendorPin] = useState('1234');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regFlat, setRegFlat] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apartmentName = import.meta.env.VITE_APARTMENT_NAME || 'Palm Heights Apartments';

  const handleResidentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!flatNumber.trim() || !pin.trim()) {
      setError('Please enter both your Flat Number and PIN');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await login(flatNumber, pin);
      if (!success) {
        setError('Invalid Flat Number or PIN. For demo flats, check the Demo Switcher below.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vendorKey.trim() || !vendorPin.trim()) {
      setError('Please enter Vendor ID and PIN');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await login(vendorKey, vendorPin);
      if (!success) {
        setError('Invalid Vendor ID or PIN. Default is VENDOR / 1234');
      }
    } catch (err: any) {
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
    if (regPin.length < 4) {
      setError('PIN should be at least 4 digits');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerResident(regName, regFlat, regPhone, regPin);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = (user: User) => {
    switchDemoUser(user);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Brand Hero Card */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div 
          style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, var(--primary-600), #1d4ed8)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
            marginBottom: '0.75rem'
          }}
        >
          <Sparkles size={32} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          PressWala
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Ironing Order & Payment Tracker • {apartmentName}
        </p>
      </div>

      {/* Main Login Card */}
      <div 
        style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-xl)', 
          padding: '1.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Portal Role Tabs */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '0.35rem', 
            background: 'var(--bg-input)', 
            padding: '0.3rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.25rem' 
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'resident' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', fontSize: '0.775rem' }}
            onClick={() => { setActiveTab('resident'); setError(null); }}
          >
            <Building2 size={13} />
            Resident
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'vendor' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', fontSize: '0.775rem' }}
            onClick={() => { setActiveTab('vendor'); setError(null); }}
          >
            <ShieldCheck size={13} />
            Vendor
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'register' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', fontSize: '0.775rem' }}
            onClick={() => { setActiveTab('register'); setError(null); }}
          >
            <UserCheck size={13} />
            New Flat
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            style={{ 
              background: 'var(--danger-subtle)', 
              border: '1px solid var(--danger-border)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '0.75rem', 
              color: 'var(--danger-text)', 
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Resident Login Form */}
        {activeTab === 'resident' && (
          <form onSubmit={handleResidentLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Flat Number
              </label>
              <input
                type="text"
                placeholder="e.g. A-101 or A-204"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                No SMS or OTP needed. Just your flat number and PIN.
              </span>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Security PIN
              </label>
              <input
                type="password"
                placeholder="Enter 4-digit PIN (e.g. 1010)"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
              style={{ width: '100%' }}
            >
              <span>{isSubmitting ? 'Verifying...' : 'Sign In as Resident'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Vendor Login Form */}
        {activeTab === 'vendor' && (
          <form onSubmit={handleVendorLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Vendor ID / Mobile Number
              </label>
              <input
                type="text"
                placeholder="VENDOR or 9876543210"
                value={vendorKey}
                onChange={(e) => setVendorKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Staff PIN
              </label>
              <input
                type="password"
                placeholder="Enter PIN (Default: 1234)"
                value={vendorPin}
                onChange={(e) => setVendorPin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
              style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <ShieldCheck size={16} />
              <span>{isSubmitting ? 'Verifying...' : 'Access Vendor Dashboard'}</span>
            </button>
          </form>
        )}

        {/* Register Flat Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Resident Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Flat Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. B-504"
                  value={regFlat}
                  onChange={(e) => setRegFlat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Set 4-Digit Login PIN
              </label>
              <input
                type="password"
                placeholder="e.g. 5040"
                maxLength={6}
                value={regPin}
                onChange={(e) => setRegPin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-success btn-lg"
              disabled={isSubmitting}
              style={{ width: '100%' }}
            >
              <span>{isSubmitting ? 'Registering...' : 'Save & Enter Flat Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>

      {/* Quick Demo Switcher Card */}
      <div 
        style={{ 
          marginTop: '1.5rem', 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '1.25rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Zap size={16} color="var(--warning-color)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Instant Demo Profiles
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Click any persona below to test that role instantly without typing credentials:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Ramu Dhobi (Vendor) */}
          <button
            type="button"
            className="payment-option-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
            onClick={() => handleQuickSwitch(INITIAL_USERS[0])}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <ShieldCheck size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ramu Dhobi (Vendor)</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Dashboard, delivery gates, unpaid dues</div>
              </div>
            </div>
            <span className="badge badge-vendor">Vendor</span>
          </button>

          {/* Pooja Verma (A-204 - Has Outstanding Due) */}
          <button
            type="button"
            className="payment-option-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
            onClick={() => handleQuickSwitch(INITIAL_USERS[2])}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                <Building2 size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pooja Verma (Flat A-204)</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--danger-text)' }}>⚠️ Has ₹110 Unpaid Order</div>
              </div>
            </div>
            <span className="due-pill due-pill-alert">₹110 Due</span>
          </button>

          {/* Sharma Ji (A-101 - Active Order) */}
          <button
            type="button"
            className="payment-option-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
            onClick={() => handleQuickSwitch(INITIAL_USERS[1])}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Building2 size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sharma Ji (Flat A-101)</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Has active order in progress</div>
              </div>
            </div>
            <span className="badge badge-customer">A-101</span>
          </button>
        </div>
      </div>
    </div>
  );
};
