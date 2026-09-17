import React, { useState } from 'react';
import { Order, PaymentMethod } from '../../types';
import { db } from '../../services/db';
import { 
  MessageCircle, 
  CheckCircle2, 
  Banknote, 
  Smartphone, 
  ShieldAlert
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
      <div 
        style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.08))', 
          border: '1px solid var(--danger-border)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Revenue Register
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
              ₹{totalOutstanding} Outstanding
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Across {unpaidOrders.length} pending order{unpaidOrders.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '300px' }}>
          Clothes were delivered before payment collection. Use 1-tap WhatsApp to request payment, then mark paid once received.
        </div>
      </div>

      {/* Unpaid Orders Table / Cards */}
      {unpaidOrders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {unpaidOrders.map(order => {
            const due = order.total_amount - (order.paid_amount || 0);
            const totalClothes = order.items?.reduce((a, b) => a + b.quantity, 0) || 0;

            return (
              <div 
                key={order.id}
                className="order-card unpaid-card"
                style={{ marginBottom: 0 }}
              >
                <div className="order-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span className="flat-badge-prominent" style={{ background: '#7f1d1d', borderColor: '#ef4444' }}>
                        Flat {order.flat_number}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                        {order.customer_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Order {order.order_number} • Placed {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', fontWeight: 600 }}>
                      PENDING AMOUNT
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger-text)' }}>
                      ₹{due}
                    </div>
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>
                  <strong>{totalClothes} Clothes:</strong>{' '}
                  {order.items?.map(i => `${i.quantity}x ${i.garment_name.split('/')[0]}`).join(', ')}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {order.customer_phone && (
                    <a
                      href={generateWhatsAppLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-whatsapp"
                      style={{ textDecoration: 'none' }}
                    >
                      <MessageCircle size={14} />
                      <span>Send WhatsApp Reminder</span>
                    </a>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={() => handleOpenMarkPaid(order)}
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark Paid (₹{due})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="var(--success-color)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success-text)', marginBottom: '0.35rem' }}>
            Zero Outstanding Dues!
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Recording payment from {activeOrder.customer_name}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-text)' }}>
                ₹{activeOrder.total_amount - (activeOrder.paid_amount || 0)}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Payment Method Collected:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${paymentMethod === 'cash' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote size={16} />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPaymentMethod('upi')}
                >
                  <Smartphone size={16} />
                  <span>UPI Transfer</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'upi' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  UPI Reference / UTR (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/4928194821"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
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
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setActiveOrder(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success btn-lg"
                style={{ flex: 2 }}
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Saving...' : 'Confirm Payment Collected'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
