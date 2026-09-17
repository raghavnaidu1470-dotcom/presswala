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
  { key: 'created', label: 'Order Placed', icon: <Clock size={14} /> },
  { key: 'in_progress', label: 'Ironing', icon: <Sparkles size={14} /> },
  { key: 'ready', label: 'Ready for Pickup', icon: <Package size={14} /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle2 size={14} /> }
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
    <div className={`order-card ${isUnpaid ? 'unpaid-card' : 'paid-card'}`}>
      {/* Header */}
      <div className="order-card-header">
        <div className="order-main-info">
          <div className="order-number">
            <span>{order.order_number}</span>
            <span className="flat-badge-prominent">Flat {order.flat_number}</span>
          </div>
          <div className="order-time">{orderDate}</div>
        </div>

        <div className="order-badges-group">
          {/* Status Badge */}
          {order.status === 'created' && <span className="badge badge-created">Placed</span>}
          {order.status === 'in_progress' && <span className="badge badge-in-progress">Ironing</span>}
          {order.status === 'ready' && <span className="badge badge-ready">Ready for Delivery</span>}
          {order.status === 'delivered' && <span className="badge badge-delivered">Delivered</span>}

          {/* Payment Status Badge */}
          {order.payment_status === 'paid' && (
            <span className="badge badge-paid">
              <Check size={11} /> Paid
            </span>
          )}
          {order.payment_status === 'unpaid' && (
            <span className="badge badge-unpaid">
              <AlertCircle size={11} /> Unpaid
            </span>
          )}
          {order.payment_status === 'partial' && (
            <span className="badge badge-partial">
              Partial (₹{order.paid_amount})
            </span>
          )}
        </div>
      </div>

      {/* 4-Stage Stepper Timeline */}
      <div className="order-stepper">
        <div className="stepper-progress-line">
          <div 
            className="stepper-progress-fill" 
            style={{ width: `${(currentStageIndex / 3) * 100}%` }}
          />
        </div>

        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isActive = idx === currentStageIndex;

          return (
            <div 
              key={stage.key} 
              className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-circle">
                {isCompleted ? <Check size={14} /> : stage.icon}
              </div>
              <span className="step-label">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Items Summary Quick Peek */}
      <div className="order-items-preview">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer' 
          }}
          onClick={() => setShowDetails(!showDetails)}
        >
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {totalItemsCount} Garment{totalItemsCount === 1 ? '' : 's'}:
            {' '}
            <span style={{ color: 'var(--text-primary)' }}>
              {order.items?.map(i => `${i.quantity}x ${i.garment_name.split('/')[0]}`).join(', ')}
            </span>
          </span>
          <button 
            type="button" 
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
          >
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded Items Breakdown */}
        {showDetails && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="order-items-list">
              {order.items?.map(item => (
                <div key={item.id} className="order-item-row">
                  <span className="order-item-name">{item.garment_name}</span>
                  <span className="order-item-qty-subtotal">
                    {item.quantity} × ₹{item.unit_price} = ₹{item.subtotal}
                  </span>
                </div>
              ))}
            </div>

            {order.special_instructions && (
              <div className="order-special-note">
                <FileText size={13} />
                <span>Note: {order.special_instructions}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="order-card-footer">
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Bill</span>
          <div className="order-total-price">
            ₹{order.total_amount}
          </div>
        </div>

        <div className="order-actions-group">
          {/* If unpaid and delivered or ready, resident can pay via UPI */}
          {isUnpaid && onPayUpi && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onPayUpi(order)}
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <QrCode size={14} />
              <span>Pay ₹{order.total_amount - order.paid_amount} via UPI</span>
            </button>
          )}

          {isDelivered && order.payment_status === 'paid' && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--success-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} /> Order Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
