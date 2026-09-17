import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check 
} from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  amount: number;
  onPaymentSuccess: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  orderId,
  amount,
  onPaymentSuccess
}) => {
  const { currentUser } = useAuth();
  const [utrNumber, setUtrNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vendorUpi = import.meta.env.VITE_VENDOR_UPI_ID || 'dhobi@upi';
  const vendorName = import.meta.env.VITE_VENDOR_NAME || 'Ramu Dhobi';

  const upiDeepLink = `upi://pay?pa=${vendorUpi}&pn=${encodeURIComponent(vendorName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Flat ${currentUser?.flat_number || ''} Dhobi Bill`)}`;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(vendorUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmUpiPayment = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      await db.recordPayment({
        order_id: orderId || null,
        customer_id: currentUser.id,
        flat_number: currentUser.flat_number,
        amount: amount,
        payment_method: 'upi',
        reference_id: utrNumber.trim() || `UPI-${Date.now().toString().slice(-6)}`,
        notes: `Resident online payment for Flat ${currentUser.flat_number}`
      });

      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error('Payment record failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay via UPI">
      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        {/* Amount Pill */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Amount to Pay
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success-text)', letterSpacing: '-0.02em' }}>
            ₹{amount}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Paying to: <strong style={{ color: 'var(--text-primary)' }}>{vendorName}</strong>
          </div>
        </div>

        {/* UPI Details Box */}
        <div 
          style={{ 
            background: 'var(--bg-input)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Vendor UPI ID
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {vendorUpi}
            </div>
          </div>
          <button 
            type="button"
            className="btn btn-sm btn-secondary" 
            onClick={handleCopyUpi}
          >
            {copied ? <Check size={14} color="var(--success-color)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Mobile 1-Tap UPI Launch */}
        <div style={{ marginBottom: '1.25rem' }}>
          <a
            href={upiDeepLink}
            className="btn btn-primary btn-lg"
            style={{ 
              width: '100%', 
              textDecoration: 'none', 
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <ExternalLink size={18} />
            <span>Open in GPay / PhonePe / Paytm</span>
          </a>
        </div>

        {/* Manual Confirmation Section */}
        <div 
          style={{ 
            background: 'var(--bg-surface-elevated)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1rem',
            textAlign: 'left'
          }}
        >
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Already transferred?
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Enter your UPI Reference/UTR number (optional) to update your flat's ledger immediately:
          </p>
          <input
            type="text"
            placeholder="e.g. 428192849182"
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              marginBottom: '0.75rem'
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleConfirmUpiPayment}
            disabled={isSubmitting}
            style={{ width: '100%' }}
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? 'Recording...' : 'Mark as Paid & Clear Due'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
