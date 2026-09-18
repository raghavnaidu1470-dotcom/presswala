import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Order, PaymentMethod } from '../../types';
import { 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  Smartphone, 
  Banknote,
  IndianRupee
} from 'lucide-react';

interface DeliveryPaymentPromptModalProps {
  isOpen: boolean;
  order: Order | null;
  onCancel: () => void;
  onConfirm: (paymentDecision: {
    isPaid: boolean;
    method?: PaymentMethod;
    collectedAmount?: number;
    referenceId?: string;
    notes?: string;
  }) => Promise<void>;
}

export const DeliveryPaymentPromptModal: React.FC<DeliveryPaymentPromptModalProps> = ({
  isOpen,
  order,
  onCancel,
  onConfirm
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<'full' | 'unpaid' | 'partial' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsMounted(true), 10);
      setSelectedChoice(null);
      setPaymentMethod('cash');
      setPartialAmount('');
      setReferenceId('');
      setValidationError(null);
    } else {
      setIsMounted(false);
    }
  }, [isOpen]);

  if (!order) return null;
  const remainingDue = Math.max(0, order.total_amount - (order.paid_amount || 0));

  const handleSubmit = async () => {
    setValidationError(null);

    if (selectedChoice === 'full') {
      setIsSubmitting(true);
      try {
        await onConfirm({
          isPaid: true,
          method: paymentMethod,
          collectedAmount: remainingDue,
          referenceId: referenceId.trim() || undefined,
          notes: `Full payment collected on delivery via ${paymentMethod.toUpperCase()}`
        });
      } finally {
        setIsSubmitting(false);
      }
    } else if (selectedChoice === 'unpaid') {
      setIsSubmitting(true);
      try {
        await onConfirm({
          isPaid: false,
          notes: 'Delivered without payment. Promised to pay later.'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else if (selectedChoice === 'partial') {
      const parsed = parseFloat(partialAmount);
      if (isNaN(parsed) || parsed <= 0 || parsed >= remainingDue) {
        setValidationError(`Enter a valid partial amount between ₹1 and ₹${remainingDue - 1}`);
        return;
      }
      setIsSubmitting(true);
      try {
        await onConfirm({
          isPaid: true,
          method: paymentMethod,
          collectedAmount: parsed,
          referenceId: referenceId.trim() || undefined,
          notes: `Partial payment of ₹${parsed} collected on delivery via ${paymentMethod.toUpperCase()}`
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title=""
      hideCloseButton
    >
      <div style={{ 
        padding: '1rem',
        opacity: isMounted ? 1 : 0,
        transform: isMounted ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Anti-forgetting Warning Banner */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--status-amber-bg)', color: '#9C6F3F',
            marginBottom: '1rem'
          }}>
            <IndianRupee size={32} />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--vendor-text)', marginBottom: '0.5rem' }}>
            Record Payment
          </h2>
          <p style={{ color: 'var(--vendor-muted)', fontSize: '0.95rem' }}>
            You are delivering to <strong>Flat {order.flat_number}</strong>. Did you receive the ₹{remainingDue} payment?
          </p>
        </div>

        {/* Order Details Snippet */}
        <div style={{ 
          background: '#F6F5F2', 
          borderRadius: '16px', 
          padding: '1.25rem', 
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--vendor-muted)', marginBottom: '0.2rem' }}>Customer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
              {order.customer_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)' }}>
              Order {order.order_number} ({order.items?.length || 0} items)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--vendor-muted)', marginBottom: '0.2rem' }}>Total Due</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--vendor-text)', lineHeight: 1 }}>
              ₹{remainingDue}
            </div>
          </div>
        </div>

        {validationError && (
          <div style={{ 
            background: '#FFF5F4', border: '1px solid var(--status-coral-bg)', borderRadius: '12px', 
            padding: '1rem', color: '#B95E54', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 600
          }}>
            {validationError}
          </div>
        )}

        {/* 2 Huge Deliberate Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* PAID BUTTON */}
          <button
            type="button"
            onClick={() => setSelectedChoice('full')}
            style={{
              padding: '1.5rem 1rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              transition: 'all 200ms ease',
              background: selectedChoice === 'full' ? 'var(--vendor-accent)' : '#F6F5F2',
              color: selectedChoice === 'full' ? '#FFFFFF' : 'var(--vendor-text)',
              boxShadow: selectedChoice === 'full' ? '0 8px 24px rgba(123, 174, 92, 0.25)' : 'none',
              transform: selectedChoice === 'full' ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: selectedChoice === 'full' ? 'rgba(255,255,255,0.2)' : 'var(--status-sage-bg)',
              color: selectedChoice === 'full' ? '#FFFFFF' : '#557A3C'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>PAID</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Received ₹{remainingDue}</span>
          </button>

          {/* UNPAID BUTTON */}
          <button
            type="button"
            onClick={() => setSelectedChoice('unpaid')}
            style={{
              padding: '1.5rem 1rem', borderRadius: '20px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              transition: 'all 200ms ease',
              background: selectedChoice === 'unpaid' ? '#FFF5F4' : 'transparent',
              border: selectedChoice === 'unpaid' ? '2px solid #B95E54' : '2px solid var(--vendor-border)',
              color: selectedChoice === 'unpaid' ? '#B95E54' : 'var(--vendor-muted)',
              transform: selectedChoice === 'unpaid' ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: selectedChoice === 'unpaid' ? 'var(--status-coral-bg)' : '#F6F5F2',
              color: selectedChoice === 'unpaid' ? '#B95E54' : 'var(--vendor-muted)'
            }}>
              <ShieldAlert size={24} />
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>UNPAID</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Collect later</span>
          </button>

        </div>

        {/* Sub-options for PAID */}
        <div style={{ 
          overflow: 'hidden', 
          maxHeight: selectedChoice === 'full' ? '200px' : '0', 
          opacity: selectedChoice === 'full' ? 1 : 0,
          transition: 'all 300ms ease',
          marginBottom: selectedChoice === 'full' ? '2rem' : '0'
        }}>
          <div style={{ background: '#F6F5F2', borderRadius: '16px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--vendor-text)', marginBottom: '0.75rem' }}>Payment Method</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: paymentMethod === 'upi' ? '1rem' : '0' }}>
              <button
                type="button"
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: paymentMethod === 'cash' ? 'var(--vendor-text)' : '#FFFFFF',
                  color: paymentMethod === 'cash' ? '#FFFFFF' : 'var(--vendor-muted)'
                }}
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote size={16} /> Cash
              </button>
              <button
                type="button"
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: paymentMethod === 'upi' ? 'var(--vendor-text)' : '#FFFFFF',
                  color: paymentMethod === 'upi' ? '#FFFFFF' : 'var(--vendor-muted)'
                }}
                onClick={() => setPaymentMethod('upi')}
              >
                <Smartphone size={16} /> UPI
              </button>
            </div>
            
            {paymentMethod === 'upi' && (
              <input
                type="text"
                placeholder="UPI Reference (Optional)"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--vendor-border)',
                  background: '#FFFFFF', color: 'var(--vendor-text)', fontSize: '0.9rem', outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--vendor-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--vendor-border)'}
              />
            )}
          </div>
        </div>

        {/* Small link for partial payment */}
        {!selectedChoice || selectedChoice === 'partial' ? (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--vendor-muted)', fontSize: '0.85rem', textDecoration: 'underline', cursor: 'pointer' }}
              onClick={() => setSelectedChoice('partial')}
            >
              Wait, they only paid a partial amount
            </button>
            
            <div style={{ 
              overflow: 'hidden', 
              maxHeight: selectedChoice === 'partial' ? '300px' : '0', 
              opacity: selectedChoice === 'partial' ? 1 : 0,
              transition: 'all 300ms ease',
              marginTop: selectedChoice === 'partial' ? '1rem' : '0'
            }}>
              <div style={{ background: '#F6F5F2', borderRadius: '16px', padding: '1.25rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--vendor-text)', display: 'block', marginBottom: '0.5rem' }}>
                  Amount Collected Now (₹):
                </label>
                <input
                  type="number"
                  placeholder={`Max: ${remainingDue - 1}`}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--vendor-border)',
                    background: '#FFFFFF', color: 'var(--vendor-text)', fontSize: '1rem', outline: 'none', marginBottom: '1rem'
                  }}
                />
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: paymentMethod === 'cash' ? 'var(--vendor-text)' : '#FFFFFF',
                      color: paymentMethod === 'cash' ? '#FFFFFF' : 'var(--vendor-muted)'
                    }}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote size={16} /> Cash
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: paymentMethod === 'upi' ? 'var(--vendor-text)' : '#FFFFFF',
                      color: paymentMethod === 'upi' ? '#FFFFFF' : 'var(--vendor-muted)'
                    }}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <Smartphone size={16} /> UPI
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="vendor-btn vendor-btn-secondary"
            style={{ flex: 1, padding: '1rem' }}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="vendor-btn vendor-btn-primary"
            style={{ 
              flex: 2, padding: '1rem', 
              opacity: !selectedChoice ? 0.5 : 1, 
              cursor: !selectedChoice ? 'not-allowed' : 'pointer',
              background: selectedChoice === 'unpaid' ? '#B95E54' : 'var(--vendor-accent)'
            }}
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedChoice}
          >
            <span>{isSubmitting ? 'Confirming...' : 'Confirm Delivery'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
};
