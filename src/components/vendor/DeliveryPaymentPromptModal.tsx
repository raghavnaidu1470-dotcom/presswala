import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Order, PaymentMethod } from '../../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  Smartphone, 
  Banknote
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
  if (!order) return null;

  const remainingDue = Math.max(0, order.total_amount - (order.paid_amount || 0));

  const [selectedChoice, setSelectedChoice] = useState<'full' | 'unpaid' | 'partial'>('full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      title="Doorstep Delivery & Payment Gate"
    >
      <div style={{ padding: '0.25rem 0' }}>
        {/* Anti-forgetting Warning Banner */}
        <div className="mandatory-gate-box">
          <div className="mandatory-gate-title">
            <AlertTriangle size={18} />
            <span>CRITICAL STEP: Record Payment Status</span>
          </div>
          <div className="mandatory-gate-desc">
            You are delivering clothes to <strong>Flat {order.flat_number}</strong>. To prevent lost income, choose whether you received payment right now or if it should be tracked as unpaid.
          </div>
        </div>

        {/* Order Handoff Details */}
        <div 
          style={{ 
            background: 'var(--bg-input)', 
            borderRadius: 'var(--radius-md)', 
            padding: '0.875rem 1rem', 
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>
              {order.customer_name} • Flat {order.flat_number}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Order {order.order_number} ({order.items?.length || 0} garment types)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Due</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning-text)' }}>
              ₹{remainingDue}
            </div>
          </div>
        </div>

        {validationError && (
          <div 
            style={{ 
              background: 'var(--danger-subtle)', 
              border: '1px solid var(--danger-border)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '0.65rem', 
              color: 'var(--danger-text)', 
              fontSize: '0.8125rem',
              marginBottom: '0.875rem' 
            }}
          >
            {validationError}
          </div>
        )}

        {/* 3 Decision Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {/* Option 1: Full Payment Collected */}
          <div 
            className={`payment-option-card ${selectedChoice === 'full' ? 'selected' : ''}`}
            onClick={() => setSelectedChoice('full')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedChoice === 'full' ? '0.75rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success-subtle)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Collected Full Payment (₹{remainingDue})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Customer paid in full via Cash or UPI
                  </div>
                </div>
              </div>
              <input 
                type="radio" 
                name="paymentChoice" 
                checked={selectedChoice === 'full'} 
                onChange={() => setSelectedChoice('full')}
                style={{ accentColor: 'var(--primary-500)' }}
              />
            </div>

            {selectedChoice === 'full' && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${paymentMethod === 'cash' ? 'btn-success' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); setPaymentMethod('cash'); }}
                  >
                    <Banknote size={14} />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); setPaymentMethod('upi'); }}
                  >
                    <Smartphone size={14} />
                    <span>UPI (GPay/PhonePe)</span>
                  </button>
                </div>
                {paymentMethod === 'upi' && (
                  <input
                    type="text"
                    placeholder="UPI Reference / UTR No. (Optional)"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Option 2: Unpaid / Collect Later */}
          <div 
            className={`payment-option-card ${selectedChoice === 'unpaid' ? 'selected option-unpaid' : ''}`}
            onClick={() => setSelectedChoice('unpaid')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--danger-subtle)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger-text)' }}>
                    Delivered but UNPAID (Collect Later)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Flags this flat on your dashboard until collected
                  </div>
                </div>
              </div>
              <input 
                type="radio" 
                name="paymentChoice" 
                checked={selectedChoice === 'unpaid'} 
                onChange={() => setSelectedChoice('unpaid')}
                style={{ accentColor: 'var(--danger-color)' }}
              />
            </div>
            {selectedChoice === 'unpaid' && (
              <div style={{ marginTop: '0.6rem', padding: '0.5rem', borderRadius: 'var(--radius-xs)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-text)', fontSize: '0.75rem' }}>
                ⚠️ ₹{remainingDue} will stay highlighted in red on your Outstanding screen with WhatsApp reminder links.
              </div>
            )}
          </div>

          {/* Option 3: Partial Payment */}
          <div 
            className={`payment-option-card ${selectedChoice === 'partial' ? 'selected' : ''}`}
            onClick={() => setSelectedChoice('partial')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedChoice === 'partial' ? '0.75rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--warning-subtle)', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Partial Payment Received
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Resident paid part of the bill
                  </div>
                </div>
              </div>
              <input 
                type="radio" 
                name="paymentChoice" 
                checked={selectedChoice === 'partial'} 
                onChange={() => setSelectedChoice('partial')}
                style={{ accentColor: 'var(--warning-color)' }}
              />
            </div>

            {selectedChoice === 'partial' && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                    Amount Collected Now (₹):
                  </label>
                  <input
                    type="number"
                    placeholder={`e.g. 50 (Max: ${remainingDue - 1})`}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${paymentMethod === 'cash' ? 'btn-success' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); setPaymentMethod('cash'); }}
                  >
                    <Banknote size={14} />
                    Cash
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); setPaymentMethod('upi'); }}
                  >
                    <Smartphone size={14} />
                    UPI
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel (Keep Ready)
          </button>
          <button
            type="button"
            className={`btn ${selectedChoice === 'unpaid' ? 'btn-danger' : 'btn-primary'} btn-lg`}
            style={{ flex: 2 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Confirming...' : 'Confirm Delivery'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
};
