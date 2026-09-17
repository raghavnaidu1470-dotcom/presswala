import React, { useState } from 'react';
import { Order } from '../../types';
import { db } from '../../services/db';
import { 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Package, 
  IndianRupee, 
  MessageCircle, 
  AlertCircle, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface OrderManagementViewProps {
  orders: Order[];
  onOrderUpdated: () => void;
  onRequestDeliveryPayment: (order: Order) => void;
  onCollectPaymentForDeliveredOrder: (order: Order) => void;
}

export const OrderManagementView: React.FC<OrderManagementViewProps> = ({
  orders,
  onOrderUpdated,
  onRequestDeliveryPayment,
  onCollectPaymentForDeliveredOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleStartIroning = async (orderId: string) => {
    await db.updateOrderStatus(orderId, 'in_progress');
    onOrderUpdated();
  };

  const handleMarkReady = async (orderId: string) => {
    await db.updateOrderStatus(orderId, 'ready');
    onOrderUpdated();
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.flat_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'unpaid_only') return order.payment_status === 'unpaid';
    return order.status === statusFilter;
  });

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Flat (e.g. A-101), Name, or Order #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({orders.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'created' ? 'active' : ''}`}
            onClick={() => setStatusFilter('created')}
          >
            New ({orders.filter(o => o.status === 'created').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            Ironing ({orders.filter(o => o.status === 'in_progress').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'ready' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ready')}
          >
            Ready ({orders.filter(o => o.status === 'ready').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('delivered')}
          >
            Delivered ({orders.filter(o => o.status === 'delivered').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'unpaid_only' ? 'active' : ''}`}
            onClick={() => setStatusFilter('unpaid_only')}
            style={statusFilter === 'unpaid_only' ? { borderColor: 'var(--danger-color)', color: 'var(--danger-text)' } : {}}
          >
            ⚠️ Unpaid Only ({orders.filter(o => o.payment_status === 'unpaid').length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div>
          {filteredOrders.map(order => {
            const isUnpaid = order.payment_status === 'unpaid';
            const isExpanded = expandedOrderId === order.id;
            const totalGarments = order.items?.reduce((acc, itm) => acc + itm.quantity, 0) || 0;

            const whatsappMessage = encodeURIComponent(
              `Namaste ${order.customer_name}, this is Ramu Dhobi. Regarding your ironing order ${order.order_number} for Flat ${order.flat_number}.`
            );

            return (
              <div 
                key={order.id} 
                className={`order-card ${isUnpaid ? 'unpaid-card' : 'paid-card'}`}
              >
                <div className="order-card-header">
                  <div className="order-main-info">
                    <div className="order-number">
                      <span>{order.order_number}</span>
                      <span className="flat-badge-prominent">Flat {order.flat_number}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        • {order.customer_name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                      <span className="order-time">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {order.customer_phone && (
                        <a 
                          href={`https://wa.me/91${order.customer_phone}?text=${whatsappMessage}`}
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          <MessageCircle size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="order-badges-group">
                    {/* Status Badge */}
                    {order.status === 'created' && <span className="badge badge-created">New Request</span>}
                    {order.status === 'in_progress' && <span className="badge badge-in-progress">Ironing</span>}
                    {order.status === 'ready' && <span className="badge badge-ready">Ready for Delivery</span>}
                    {order.status === 'delivered' && <span className="badge badge-delivered">Delivered</span>}

                    {/* Payment Status Badge */}
                    {order.payment_status === 'paid' && (
                      <span className="badge badge-paid">
                        <Check size={11} /> Paid Full
                      </span>
                    )}
                    {order.payment_status === 'unpaid' && (
                      <span className="badge badge-unpaid">
                        <AlertCircle size={11} /> ₹{order.total_amount - order.paid_amount} Unpaid
                      </span>
                    )}
                    {order.payment_status === 'partial' && (
                      <span className="badge badge-partial">
                        Partial (₹{order.total_amount - order.paid_amount} due)
                      </span>
                    )}
                  </div>
                </div>

                {/* Garments Breakdown Bar */}
                <div className="order-items-preview">
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {totalGarments} Clothes:
                      {' '}
                      <span style={{ color: 'var(--text-primary)' }}>
                        {order.items?.map(i => `${i.quantity}x ${i.garment_name.split('/')[0]}`).join(', ')}
                      </span>
                    </span>
                    <button type="button" style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isExpanded && (
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
                          <span>Special Note: {order.special_instructions}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="order-card-footer">
                  <div>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Total Amount</span>
                    <div className="order-total-price">
                      ₹{order.total_amount}
                    </div>
                  </div>

                  <div className="order-actions-group">
                    {/* Stage 1: Created -> In Progress */}
                    {order.status === 'created' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleStartIroning(order.id)}
                      >
                        <Sparkles size={14} />
                        <span>Start Ironing</span>
                      </button>
                    )}

                    {/* Stage 2: In Progress -> Ready */}
                    {order.status === 'in_progress' && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}
                        onClick={() => handleMarkReady(order.id)}
                      >
                        <Package size={14} />
                        <span>Mark Ready for Delivery</span>
                      </button>
                    )}

                    {/* Stage 3: Ready -> Delivered (TRIGGERS MANDATORY PAYMENT PROMPT) */}
                    {order.status === 'ready' && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => onRequestDeliveryPayment(order)}
                        title="Deliver order to flat and record payment"
                      >
                        <CheckCircle2 size={14} />
                        <span>Deliver to Flat (Payment Gate)</span>
                      </button>
                    )}

                    {/* Delivered but Unpaid: Quick Mark Payment */}
                    {order.status === 'delivered' && isUnpaid && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => onCollectPaymentForDeliveredOrder(order)}
                        style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}
                      >
                        <IndianRupee size={14} />
                        <span>Collect Payment</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No orders found matching your search and filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};
