import React, { useState, useEffect } from 'react';
import { CustomerSummary, CustomerContact } from '../../types';
import { db } from '../../services/db';
import { Modal } from '../common/Modal';
import { ContactPickerModal } from '../common/ContactPickerModal';
import { ManageContactsModal } from '../common/ManageContactsModal';
import { validators } from '../../utils/validators';
import { 
  Search, 
  MessageCircle, 
  CheckCircle2,
  Users,
  KeyRound,
  UserX,
  AlertTriangle,
  Phone
} from 'lucide-react';

interface CustomerDirectoryViewProps {
  vendorApartmentId?: string;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({ vendorApartmentId }) => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState('');
  
  // Vendor-assisted Password Reset Modal State
  const [resetModalCustomer, setResetModalCustomer] = useState<CustomerSummary | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Revoke Resident Access Modal State
  const [revokeModalCustomer, setRevokeModalCustomer] = useState<CustomerSummary | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // WhatsApp Contact Picker Modal State
  const [contactPicker, setContactPicker] = useState<{
    isOpen: boolean;
    residentName: string;
    flatNumber: string;
    contacts: CustomerContact[];
    message?: string;
  }>({
    isOpen: false,
    residentName: '',
    flatNumber: '',
    contacts: []
  });

  // Manage Contacts Modal State
  const [manageModal, setManageModal] = useState<{
    isOpen: boolean;
    customerId: string;
    residentName: string;
    flatNumber: string;
  }>({
    isOpen: false,
    customerId: '',
    residentName: '',
    flatNumber: ''
  });

  const loadDirectory = async () => {
    const data = await db.getCustomerSummaries(vendorApartmentId);
    setCustomers(data);
  };

  useEffect(() => {
    loadDirectory();
  }, [vendorApartmentId]);

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

  const handleConfirmRevoke = async () => {
    if (!revokeModalCustomer) return;
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await db.revokeResidentAccess(revokeModalCustomer.customer_id);
      setRevokeModalCustomer(null);
      await loadDirectory();
    } catch (err: any) {
      setRevokeError(err.message || 'Failed to revoke resident access');
    } finally {
      setIsRevoking(false);
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
                    {c.status === 'revoked' && (
                      <span style={{
                        background: '#FEE2E2',
                        color: '#DC2626',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        Revoked
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
                    {c.customer_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <span>{c.customer_phone}</span>
                    {c.contacts && c.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setManageModal({
                          isOpen: true,
                          customerId: c.customer_id,
                          residentName: c.customer_name,
                          flatNumber: c.flat_number
                        })}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '6px',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          border: '1px solid #C7D2FE',
                          cursor: 'pointer'
                        }}
                        title="View all registered numbers"
                      >
                        +{c.contacts.length - 1} more
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setManageModal({
                      isOpen: true,
                      customerId: c.customer_id,
                      residentName: c.customer_name,
                      flatNumber: c.flat_number
                    })}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#F1F5F9', color: '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      transition: 'all 200ms ease'
                    }}
                    title="Manage Contact Numbers (up to 5)"
                  >
                    <Phone size={16} />
                  </button>

                  {c.customer_phone && (
                    <button
                      type="button"
                      onClick={() => {
                        const contacts = c.contacts || [
                          {
                            id: `fallback-${c.customer_id}`,
                            customer_id: c.customer_id,
                            phone: c.customer_phone,
                            label: 'Primary',
                            is_primary: true
                          }
                        ];
                        const msg = `Hi ${c.customer_name} (Flat ${c.flat_number}), reaching out from PressWala regarding your laundry orders.`;
                        if (contacts.length <= 1) {
                          const cleanPhone = (contacts[0]?.phone || c.customer_phone).replace(/\D/g, '');
                          window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                        } else {
                          setContactPicker({
                            isOpen: true,
                            residentName: c.customer_name,
                            flatNumber: c.flat_number,
                            contacts,
                            message: msg
                          });
                        }
                      }}
                      style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#e8f9ed', color: '#25D366',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms ease'
                      }}
                      title={c.contacts && c.contacts.length > 1 ? `Select from ${c.contacts.length} numbers` : 'WhatsApp Resident'}
                    >
                      <MessageCircle size={18} />
                    </button>
                  )}
                </div>
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

              {/* Vendor Actions: Password Reset & Revoke */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                {c.status === 'revoked' ? (
                  <div style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <UserX size={14} /> Access Revoked
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevokeModalCustomer(c)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      color: '#DC2626',
                      background: '#FEE2E2',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Revoke resident portal access"
                  >
                    <UserX size={13} />
                    <span>Revoke</span>
                  </button>
                )}

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

      {/* Revoke Resident Access Modal */}
      {revokeModalCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setRevokeModalCustomer(null)}
          title={`Revoke Access — Flat ${revokeModalCustomer.flat_number}`}
        >
          <div>
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              marginBottom: '1.25rem'
            }}>
              <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: '#92400E', lineHeight: 1.5 }}>
                Revoking access will immediately disable <strong>{revokeModalCustomer.customer_name}</strong>'s resident login.
                Past orders, payment logs, and financial records remain safely preserved.
              </div>
            </div>

            {revokeError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {revokeError}
              </div>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              The resident will not be able to log in unless they submit a fresh access request and you approve it.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRevokeModalCustomer(null)}
                disabled={isRevoking}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isRevoking ? 'not-allowed' : 'pointer'
                }}
              >
                {isRevoking ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Contact Picker Modal */}
      <ContactPickerModal
        isOpen={contactPicker.isOpen}
        onClose={() => setContactPicker(prev => ({ ...prev, isOpen: false }))}
        residentName={contactPicker.residentName}
        flatNumber={contactPicker.flatNumber}
        contacts={contactPicker.contacts}
        defaultMessage={contactPicker.message}
      />

      {/* Manage Contacts Modal */}
      <ManageContactsModal
        isOpen={manageModal.isOpen}
        onClose={() => setManageModal(prev => ({ ...prev, isOpen: false }))}
        customerId={manageModal.customerId}
        residentName={manageModal.residentName}
        flatNumber={manageModal.flatNumber}
        onUpdated={loadDirectory}
      />
    </div>
  );
};
