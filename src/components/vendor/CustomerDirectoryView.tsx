import React, { useState, useEffect } from 'react';
import { CustomerSummary } from '../../types';
import { db } from '../../services/db';
import { Modal } from '../common/Modal';
import { validators } from '../../utils/validators';
import { 
  Search, 
  MessageCircle, 
  CheckCircle2,
  Users,
  KeyRound
} from 'lucide-react';

export const CustomerDirectoryView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState('');
  
  // Vendor-assisted Password Reset Modal State
  const [resetModalCustomer, setResetModalCustomer] = useState<CustomerSummary | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function loadDirectory() {
      const data = await db.getCustomerSummaries();
      setCustomers(data);
    }
    loadDirectory();
  }, []);

  const handleOpenResetModal = (customer: CustomerSummary) => {
    setResetModalCustomer(customer);
    setNewPasswordInput('');
    setResetError(null);
    setResetSuccess(null);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalCustomer) return;
    setResetError(null);
    setResetSuccess(null);

    if (!validators.isValidPassword(newPasswordInput)) {
      setResetError('Password must be at least 6 characters (with upper, lower, digit, and special char). E.g. Demo@1010');
      return;
    }

    setIsResetting(true);
    try {
      await db.vendorResetResidentPassword(resetModalCustomer.flat_number, newPasswordInput);
      setResetSuccess(`Password for Flat ${resetModalCustomer.flat_number} successfully updated! Share it with the resident.`);
      setTimeout(() => {
        setResetModalCustomer(null);
      }, 2200);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset resident password');
    } finally {
      setIsResetting(false);
    }
  };

  const filtered = customers.filter(c => 
    c.flat_number.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_phone.includes(search)
  );

  return (
    <div>
      {/* Header & Search */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--vendor-muted)' }} />
          <input
            type="text"
            placeholder="Search residents by Flat (e.g. S-3907) or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              borderRadius: '9999px',
              background: '#FFFFFF',
              border: '1px solid var(--vendor-border)',
              color: 'var(--vendor-text)',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              outline: 'none',
              transition: 'all 200ms ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--vendor-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--vendor-border)'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F6F5F2', padding: '0.5rem 1rem', borderRadius: '9999px', color: 'var(--vendor-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Users size={16} />
          {filtered.length} Registered Flats
        </div>
      </div>

      {/* Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filtered.map(c => {
          const hasDue = c.outstanding_balance > 0;
          const whatsappLink = `https://wa.me/91${c.customer_phone}?text=${encodeURIComponent(
            `Namaste ${c.customer_name} ji, this is Ramu Dhobi. Hope your clothes were well-ironed. Let me know when you have clothes for ironing next!`
          )}`;

          return (
            <div 
              key={c.customer_id || c.flat_number}
              className="vendor-card"
              style={{
                padding: '1.5rem',
                border: hasDue ? '1px solid var(--status-coral-bg)' : '1px solid var(--vendor-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ 
                      background: '#EBE8E0', padding: '0.2rem 0.6rem', borderRadius: '8px', 
                      fontSize: '0.9rem', fontWeight: 700, color: 'var(--vendor-text)' 
                    }}>
                      Flat {c.flat_number}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
                    {c.customer_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)' }}>
                    {c.customer_phone}
                  </div>
                </div>

                {c.customer_phone && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#e8f9ed', color: '#25D366',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease',
                      textDecoration: 'none'
                    }}
                    title="WhatsApp Resident"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#F6F5F2', padding: '1rem', borderRadius: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vendor-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Lifetime Spent</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--vendor-text)' }}>₹{c.lifetime_spent}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--vendor-muted)' }}>Across {c.total_orders} orders</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vendor-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Outstanding Due</div>
                  {hasDue ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: '#B95E54', fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
                      ₹{c.outstanding_balance}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: '#557A3C', fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
                      <CheckCircle2 size={16} /> ₹0
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Actions: Password Reset for Resident */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button
                  type="button"
                  onClick={() => handleOpenResetModal(c)}
                  className="btn btn-sm btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    color: 'var(--vendor-muted)'
                  }}
                  title="Reset resident password if requested"
                >
                  <KeyRound size={14} />
                  <span>Reset Password</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vendor Password Reset Modal */}
      {resetModalCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setResetModalCustomer(null)}
          title={`Reset Password — Flat ${resetModalCustomer.flat_number}`}
        >
          <form onSubmit={handleConfirmReset}>
            <p style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Enter a new password for resident <strong>{resetModalCustomer.customer_name}</strong> (Flat {resetModalCustomer.flat_number}). Once saved, share it directly with them in person or on WhatsApp.
            </p>

            {resetError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '0.75rem', color: '#166534', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {resetSuccess}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--vendor-text)', marginBottom: '0.4rem' }}>
                New Password (e.g. Demo@1010)
              </label>
              <input
                type="text"
                placeholder="Enter new password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#F6F5F2',
                  border: '1px solid var(--vendor-border)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setResetModalCustomer(null)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isResetting}
              >
                {isResetting ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
