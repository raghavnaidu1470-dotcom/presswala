import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { 
  Clock, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  Package, 
  AlertCircle, 
  QrCode, 
  ChevronDown, 
  ChevronUp, 
  FileText 
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onPayUpi?: (order: Order) => void;
}

const STAGES: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'created', label: 'Placed', icon: <Clock size={12} /> },
  { key: 'in_progress', label: 'Ironing', icon: <Sparkles size={12} /> },
  { key: 'ready', label: 'Ready', icon: <Package size={12} /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle2 size={12} /> }
];

function getStageIndex(status: OrderStatus): number {
  switch (status) {
    case 'created': return 0;
    case 'in_progress': return 1;
    case 'ready': return 2;
    case 'delivered': return 3;
    default: return 0;
  }
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPayUpi }) => {
  const [showDetails, setShowDetails] = useState(false);
  const currentStageIndex = getStageIndex(order.status);
  const isDelivered = order.status === 'delivered';
  const isUnpaid = order.payment_status === 'unpaid';

  // Format date nicely
  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalItemsCount = order.items?.reduce((acc, itm) => acc + itm.quantity, 0) || 0;

  return (
    <div 
      className="customer-card" 
      style={{ 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem',
        border: isUnpaid && isDelivered ? '1px solid var(--status-coral)' : '1px solid var(--customer-border)',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem' }}>
              {order.order_number}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--customer-muted)' }}>
            {orderDate}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Payment Status Badge - Positioned clearly in corner */}
          {order.payment_status === 'paid' && (
            <span style={{ 
              background: 'var(--status-sage-bg)', color: '#557A3C', padding: '0.35rem 0.75rem', 
              borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' 
            }}>
              <Check size={12} /> Paid
            </span>
          )}
          {order.payment_status === 'unpaid' && (
            <span style={{ 
              background: 'var(--status-coral-bg)', color: '#B95E54', padding: '0.35rem 0.75rem', 
              borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' 
            }}>
              <AlertCircle size={12} /> Unpaid
            </span>
          )}
          {order.payment_status === 'partial' && (
            <span style={{ 
              background: 'var(--status-amber-bg)', color: '#9C6F3F', padding: '0.35rem 0.75rem', 
              borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' 
            }}>
              Partial (₹{order.paid_amount})
            </span>
          )}
        </div>
      </div>

      {/* 4-Stage Visual Progress Timeline */}
      <div style={{ position: 'relative', margin: '1rem 0' }}>
        {/* Background Line */}
        <div style={{ 
          position: 'absolute', top: '12px', left: '0', right: '0', height: '2px', 
          background: 'var(--customer-border)', zIndex: 1 
        }} />
        
        {/* Filled Progress Line */}
        <div style={{ 
          position: 'absolute', top: '12px', left: '0', height: '2px', 
          background: 'var(--customer-accent)', zIndex: 2,
          width: `${(currentStageIndex / 3) * 100}%`,
          transition: 'width 300ms ease'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
          {STAGES.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isActive = idx === currentStageIndex;

            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '60px' }}>
                <div style={{ 
                  width: '26px', height: '26px', borderRadius: '50%', 
                  background: isCompleted ? 'var(--customer-accent)' : '#F6F5F2',
                  border: isCompleted ? '2px solid var(--customer-accent)' : '2px solid var(--customer-border)',
                  color: isCompleted ? '#fff' : 'var(--customer-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 300ms ease',
                  boxShadow: isActive ? '0 0 0 4px rgba(123, 174, 92, 0.2)' : 'none'
                }}>
                  {isCompleted && !isActive ? <Check size={14} /> : stage.icon}
                </div>
                <span style={{ 
                  fontSize: '0.7rem', fontWeight: 600, textAlign: 'center',
                  color: isActive ? 'var(--customer-text)' : 'var(--customer-muted)',
                  opacity: isCompleted ? 1 : 0.6
                }}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items Summary Quick Peek */}
      <div style={{ background: '#F6F5F2', borderRadius: '16px', padding: '1rem' }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer' 
          }}
          onClick={() => setShowDetails(!showDetails)}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--customer-text)' }}>
            {totalItemsCount} Garment{totalItemsCount === 1 ? '' : 's'}:
            {' '}
            <span style={{ color: 'var(--customer-muted)', fontWeight: 500 }}>
              {order.items?.map(i => `${i.quantity}x ${i.garment_name.split('/')[0]}`).join(', ')}
            </span>
          </span>
          <button 
            type="button" 
            style={{ 
              background: 'none', border: 'none', color: 'var(--customer-muted)', 
              display: 'flex', alignItems: 'center', cursor: 'pointer'
            }}
          >
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Expanded Items Breakdown */}
        {showDetails && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--customer-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {order.items?.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--customer-muted)' }}>{item.garment_name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--customer-text)' }}>
                    {item.quantity} × ₹{item.unit_price} = ₹{item.subtotal}
                  </span>
                </div>
              ))}
            </div>

            {order.special_instructions && (
              <div style={{ 
                marginTop: '1rem', padding: '0.75rem', background: '#FFFFFF', 
                borderRadius: '12px', fontSize: '0.8rem', color: 'var(--customer-muted)',
                display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
              }}>
                <FileText size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong style={{ color: 'var(--customer-text)' }}>Note:</strong> {order.special_instructions}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--customer-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Total Bill</span>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--customer-text)', lineHeight: 1 }}>
            ₹{order.total_amount}
          </div>
        </div>

        <div>
          {/* If unpaid and resident can pay via UPI */}
          {isUnpaid && onPayUpi && (
            <button
              type="button"
              className="customer-btn customer-btn-primary"
              onClick={() => onPayUpi(order)}
            >
              <QrCode size={16} />
              <span>Pay ₹{order.total_amount - order.paid_amount}</span>
            </button>
          )}

          {isDelivered && order.payment_status === 'paid' && (
            <span style={{ fontSize: '0.85rem', color: '#557A3C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={16} /> Order Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
