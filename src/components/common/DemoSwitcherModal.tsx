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
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Switch between resident and vendor views instantly to test the complete end-to-end workflow:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {/* Ramu Dhobi Vendor */}
          <div
            onClick={() => handleSelectUser(INITIAL_USERS[0])}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              borderRadius: '16px',
              background: currentUser?.role === 'vendor' ? 'rgba(123, 174, 92, 0.12)' : '#F6F5F2',
              border: currentUser?.role === 'vendor' ? '2px solid var(--primary-500)' : '1px solid rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(123, 174, 92, 0.2)', color: '#557A3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ramu Dhobi (Vendor)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dashboard, delivery gate & dues tracking</div>
              </div>
            </div>
            <span className="badge badge-vendor">Vendor</span>
          </div>

          {/* Pooja Verma Flat A-2004 */}
          <div
            onClick={() => handleSelectUser(INITIAL_USERS[2])}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              borderRadius: '16px',
              background: currentUser?.flat_number === 'A-2004' ? 'rgba(123, 174, 92, 0.12)' : '#F6F5F2',
              border: currentUser?.flat_number === 'A-2004' ? '2px solid var(--primary-500)' : '1px solid rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(217, 136, 128, 0.2)', color: '#B95E54', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pooja Verma (Flat A-2004)</div>
                <div style={{ fontSize: '0.8rem', color: '#B95E54' }}>⚠️ Has ₹110 Unpaid Order</div>
              </div>
            </div>
            <span className="due-pill due-pill-alert">₹110 Due</span>
          </div>

          {/* Sharma Ji Flat A-1001 */}
          <div
            onClick={() => handleSelectUser(INITIAL_USERS[1])}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              borderRadius: '16px',
              background: currentUser?.flat_number === 'A-1001' ? 'rgba(123, 174, 92, 0.12)' : '#F6F5F2',
              border: currentUser?.flat_number === 'A-1001' ? '2px solid var(--primary-500)' : '1px solid rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(142, 168, 110, 0.2)', color: '#557A3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sharma Ji (Flat A-1001)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active order in progress</div>
              </div>
            </div>
            <span className="badge badge-customer">A-1001</span>
          </div>

          {/* Karthik Raja Flat B-3002 */}
          <div
            onClick={() => handleSelectUser(INITIAL_USERS[3])}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              borderRadius: '16px',
              background: currentUser?.flat_number === 'B-3002' ? 'rgba(123, 174, 92, 0.12)' : '#F6F5F2',
              border: currentUser?.flat_number === 'B-3002' ? '2px solid var(--primary-500)' : '1px solid rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(142, 168, 110, 0.2)', color: '#557A3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Karthik Raja (Flat B-3002)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All past orders paid</div>
              </div>
            </div>
            <span className="badge badge-paid">Paid</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          style={{ width: '100%', padding: '0.75rem' }}
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Sign Out to Login Screen</span>
        </button>
      </div>
    </Modal>
  );
};
