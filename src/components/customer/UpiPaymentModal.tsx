import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { 
  ExternalLink, 
  Copy, 
  Check,
  Info
} from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  amount: number;
  onPaymentSuccess?: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  amount
}) => {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const vendorUpi = import.meta.env.VITE_VENDOR_UPI_ID || 'dhobi@upi';
  const vendorName = import.meta.env.VITE_VENDOR_NAME || 'Ramu Dhobi';

  const upiDeepLink = `upi://pay?pa=${vendorUpi}&pn=${encodeURIComponent(vendorName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Flat ${currentUser?.flat_number || ''} Dhobi Bill`)}`;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(vendorUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay via UPI">
      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        {/* Amount Pill */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Amount to Pay
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '3rem', fontWeight: 800, color: 'var(--primary-500)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0.25rem 0' }}>
            ₹{amount}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Paying to: <strong style={{ color: 'var(--text-primary)' }}>{vendorName}</strong>
          </div>
        </div>

        {/* UPI Details Box */}
        <div 
          style={{ 
            background: '#F6F5F2', 
            border: '1px solid rgba(0, 0, 0, 0.06)', 
            borderRadius: '16px', 
            padding: '1.1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Vendor UPI ID
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {vendorUpi}
            </div>
          </div>
          <button 
            type="button"
            className="btn btn-sm btn-secondary" 
            onClick={handleCopyUpi}
          >
            {copied ? <Check size={14} color="var(--primary-500)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Mobile 1-Tap UPI Deep Link Launch */}
        <div style={{ marginBottom: '1.5rem' }}>
          <a
            href={upiDeepLink}
            className="btn btn-primary btn-lg"
            style={{ 
              width: '100%', 
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <ExternalLink size={18} />
            <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
          </a>
        </div>

        {/* Informational Notice: Vendor Confirms Payment */}
        <div 
          style={{ 
            background: '#F0F9FF', 
            borderRadius: '16px', 
            padding: '1rem 1.25rem',
            textAlign: 'left',
            border: '1px solid #BAE6FD',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            marginBottom: '1.5rem'
          }}
        >
          <Info size={20} color="#0284C7" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: '#0369A1', lineHeight: 1.45 }}>
            <strong style={{ display: 'block', color: '#0C4A6E', marginBottom: '0.2rem' }}>
              Vendor Payment Verification
            </strong>
            This deep-link prepares the transfer in your UPI app. Per society security policy, {vendorName} will independently verify credit in their bank account and record the payment receipt on the portal (or confirm during delivery).
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
        >
          Done
        </button>
      </div>
    </Modal>
  );
};
