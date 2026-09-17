import React from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_USERS } from '../../services/seedData';
import { ShieldCheck, Building2, LogOut } from 'lucide-react';

interface DemoSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoSwitcherModal: React.FC<DemoSwitcherModalProps> = ({
  isOpen,
  onClose
}) => {
  const { switchDemoUser, logout, currentUser } = useAuth();

  const handleSelectUser = (user: typeof INITIAL_USERS[0]) => {
    switchDemoUser(user);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch User / Persona">
      <div style={{ padding: '0.25rem 0' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Switch between resident and vendor views instantly to test the complete end-to-end workflow:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {/* Ramu Dhobi Vendor */}
          <div
            className={`payment-option-card ${currentUser?.role === 'vendor' ? 'selected' : ''}`}
            onClick={() => handleSelectUser(INITIAL_USERS[0])}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Ramu Dhobi (Vendor)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dashboard, delivery gate & dues tracking</div>
              </div>
            </div>
            <span className="badge badge-vendor">Vendor</span>
          </div>

          {/* Pooja Verma Flat A-204 */}
          <div
            className={`payment-option-card ${currentUser?.flat_number === 'A-204' ? 'selected' : ''}`}
            onClick={() => handleSelectUser(INITIAL_USERS[2])}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Pooja Verma (Flat A-204)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>⚠️ Has ₹110 Unpaid Order</div>
              </div>
            </div>
            <span className="due-pill due-pill-alert">₹110 Due</span>
          </div>

          {/* Sharma Ji Flat A-101 */}
          <div
            className={`payment-option-card ${currentUser?.flat_number === 'A-101' ? 'selected' : ''}`}
            onClick={() => handleSelectUser(INITIAL_USERS[1])}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Sharma Ji (Flat A-101)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active order in progress</div>
              </div>
            </div>
            <span className="badge badge-customer">A-101</span>
          </div>

          {/* Karthik Raja Flat B-302 */}
          <div
            className={`payment-option-card ${currentUser?.flat_number === 'B-302' ? 'selected' : ''}`}
            onClick={() => handleSelectUser(INITIAL_USERS[3])}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', margin: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Karthik Raja (Flat B-302)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All past orders paid</div>
              </div>
            </div>
            <span className="badge badge-paid">Paid</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          style={{ width: '100%' }}
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Sign Out to Login Screen</span>
        </button>
      </div>
    </Modal>
  );
};
