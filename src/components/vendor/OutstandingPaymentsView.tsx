import React, { useState } from 'react';
import { Order, PaymentMethod } from '../../types';
import { db } from '../../services/db';
import { 
  MessageCircle, 
  CheckCircle2, 
  Banknote, 
  Smartphone, 
  ShieldAlert,
  IndianRupee
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface OutstandingPaymentsViewProps {
  orders: Order[];
  onPaymentCollected: () => void;
}

export const OutstandingPaymentsView: React.FC<OutstandingPaymentsViewProps> = ({
  orders,
  onPaymentCollected
}) => {
  const unpaidOrders = orders.filter(o => o.payment_status === 'unpaid' || o.payment_status === 'partial');
  const totalOutstanding = unpaidOrders.reduce((sum, o) => sum + (o.total_amount - (o.paid_amount || 0)), 0);

  // Quick Payment Modal State
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceId, setReferenceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenMarkPaid = (order: Order) => {
    setActiveOrder(order);
    setPaymentMethod('cash');
    setReferenceId('');
  };

  const handleConfirmPayment = async () => {
    if (!activeOrder) return;
    const dueAmount = activeOrder.total_amount - (activeOrder.paid_amount || 0);

    setIsSubmitting(true);
    try {
      await db.recordPayment({
        order_id: activeOrder.id,
        customer_id: activeOrder.customer_id,
        flat_number: activeOrder.flat_number,
        amount: dueAmount,
        payment_method: paymentMethod,
        reference_id: referenceId.trim() || undefined,
        notes: `Outstanding payment collected later via ${paymentMethod.toUpperCase()}`
      });

      setActiveOrder(null);
      onPaymentCollected();
    } catch (err) {
      console.error('Failed to collect payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateWhatsAppLink = (order: Order) => {
    const due = order.total_amount - (order.paid_amount || 0);
    const vendorUpi = import.meta.env.VITE_VENDOR_UPI_ID || 'dhobi@upi';
    const text = `Namaste ${order.customer_name} ji,\nThis is Ramu Dhobi. Your bill of ₹${due} for ironing (Order ${order.order_number} • Flat ${order.flat_number}) is pending.\n\nYou can pay via UPI to: ${vendorUpi}\nor in cash when convenient.\nThank you! 🙏`;
    return `https://wa.me/91${order.customer_phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div>
      {/* Top Warning Banner */}
      <div style={{ 
        background: '#FFF5F4', 
        border: '1px solid var(--status-coral-bg)', 
        borderRadius: '24px', 
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        boxShadow: '0 8px 32px rgba(217, 136, 128, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--status-coral-bg)', color: '#B95E54', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#B95E54', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
              Pending Revenue Register
            </div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: '#B95E54', lineHeight: 1, marginBottom: '0.2rem' }}>
              ₹{totalOutstanding} <span style={{ fontSize: '1.25rem', fontWeight: 700, opacity: 0.8 }}>Outstanding</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#B95E54', opacity: 0.8, fontWeight: 600 }}>
              Across {unpaidOrders.length} pending order{unpaidOrders.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.9rem', color: '#B95E54', maxWidth: '300px', lineHeight: 1.5, opacity: 0.9 }}>
          Clothes were delivered before payment collection. Use the 1-tap WhatsApp button to request payment, then mark paid once received.
        </div>
      </div>

      {/* Unpaid Orders Table / Cards */}
      {unpaidOrders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {unpaidOrders.map(order => {
            const due = order.total_amount - (order.paid_amount || 0);
            const totalClothes = order.items?.reduce((a, b) => a + b.quantity, 0) || 0;

            return (
              <div 
                key={order.id}
                className="vendor-card"
                style={{ padding: '1.5rem', border: '1px solid var(--status-coral-bg)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        background: 'var(--status-coral-bg)', padding: '0.2rem 0.6rem', borderRadius: '8px', 
                        fontSize: '0.9rem', fontWeight: 700, color: '#B95E54' 
                      }}>
                        Flat {order.flat_number}
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
                        {order.customer_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)' }}>
                      Order {order.order_number} • Placed {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#B95E54', fontWeight: 700, marginBottom: '0.2rem' }}>
                      PENDING AMOUNT
                    </div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: '#B95E54', lineHeight: 1 }}>
                      ₹{due}
                    </div>
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)', marginBottom: '1.25rem', background: '#F6F5F2', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                  <strong style={{ color: 'var(--vendor-text)' }}>{totalClothes} Clothes:</strong>{' '}
                  {order.items?.map(i => `${i.quantity}x ${i.garment_name.split('/')[0]}`).join(', ')}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  {order.customer_phone && (
                    <a
                      href={generateWhatsAppLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="vendor-btn"
                      style={{ background: '#e8f9ed', color: '#25D366', textDecoration: 'none', padding: '0.75rem 1rem' }}
                    >
                      <MessageCircle size={16} />
                      <span>Send WhatsApp Reminder</span>
                    </a>
                  )}

                  <button
                    type="button"
                    className="vendor-btn vendor-btn-primary"
                    onClick={() => handleOpenMarkPaid(order)}
                    style={{ padding: '0.75rem 1rem' }}
                  >
                    <IndianRupee size={16} />
                    <span>Mark Paid (₹{due})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="vendor-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', background: 'var(--status-sage-bg)', color: '#557A3C',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
          }}>
            <CheckCircle2 size={40} />
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--vendor-text)', marginBottom: '0.5rem' }}>
            Zero Outstanding Dues!
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--vendor-muted)' }}>
            Every delivered order has been paid in full. No pending balances across any flat.
          </p>
        </div>
      )}

      {/* Mark Paid Modal */}
      {activeOrder && (
        <Modal
          isOpen={Boolean(activeOrder)}
          onClose={() => setActiveOrder(null)}
          title={`Collect Payment: Flat ${activeOrder.flat_number}`}
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--vendor-muted)', marginBottom: '0.5rem' }}>
                Recording payment from <strong style={{ color: 'var(--vendor-text)' }}>{activeOrder.customer_name}</strong>
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
                ₹{activeOrder.total_amount - (activeOrder.paid_amount || 0)}
              </div>
            </div>

            <div style={{ background: '#F6F5F2', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--vendor-text)', marginBottom: '0.75rem' }}>
                Payment Method Collected:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: paymentMethod === 'upi' ? '1rem' : '0' }}>
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
                  <Smartphone size={16} /> UPI Transfer
                </button>
              </div>

              {paymentMethod === 'upi' && (
                <div>
                  <input
                    type="text"
                    placeholder="UPI Reference / UTR (Optional)"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    style={{
                      width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--vendor-border)',
                      background: '#FFFFFF', color: 'var(--vendor-text)', fontSize: '0.9rem', outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--vendor-accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--vendor-border)'}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="vendor-btn vendor-btn-secondary"
                style={{ flex: 1, padding: '1rem' }}
                onClick={() => setActiveOrder(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vendor-btn vendor-btn-primary"
                style={{ flex: 2, padding: '1rem' }}
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Saving...' : 'Confirm Payment'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
