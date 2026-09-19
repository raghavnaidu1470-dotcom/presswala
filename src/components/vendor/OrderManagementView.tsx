import React, { useState } from 'react';
import { Order, OrderChangeProposal } from '../../types';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
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
  ChevronUp, 
  FileText,
  Calendar,
  Edit3
} from 'lucide-react';
import { DeliverySlotPickerModal } from '../common/DeliverySlotPickerModal';
import { ProposeChangeModal } from '../common/ProposeChangeModal';
import { ReviewChangeModal } from '../common/ReviewChangeModal';

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
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Phase D Modals State
  const [selectedOrderForSlot, setSelectedOrderForSlot] = useState<Order | null>(null);
  const [selectedOrderForProposal, setSelectedOrderForProposal] = useState<Order | null>(null);
  const [selectedProposalForReview, setSelectedProposalForReview] = useState<{
    order: Order;
    proposal: OrderChangeProposal;
  } | null>(null);

  const handleStartIroning = async (orderId: string) => {
    await db.updateOrderStatus(orderId, 'in_progress');
    onOrderUpdated();
  };

  const handleMarkReady = async (orderId: string) => {
    await db.updateOrderStatus(orderId, 'ready');
    onOrderUpdated();
  };

  const handleVendorBookSlot = async (date: string, window: string) => {
    if (!selectedOrderForSlot || !currentUser) return;
    await db.bookDeliverySlot(selectedOrderForSlot.id, date, window, {
      id: currentUser.id,
      role: 'vendor',
      apartment_id: currentUser.apartment_id
    });
    setSelectedOrderForSlot(null);
    onOrderUpdated();
  };

  const handleVendorSubmitProposal = async (
    proposedItems: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[],
    reason: string
  ) => {
    if (!selectedOrderForProposal || !currentUser) return;
    await db.proposeOrderChange(selectedOrderForProposal.id, proposedItems, reason, {
      id: currentUser.id,
      role: 'vendor',
      apartment_id: currentUser.apartment_id
    });
    setSelectedOrderForProposal(null);
    onOrderUpdated();
  };

  const handleVendorRespondProposal = async (decision: 'accept' | 'decline') => {
    if (!selectedProposalForReview || !currentUser) return;
    await db.respondToOrderChange(selectedProposalForReview.proposal.id, decision, {
      id: currentUser.id,
      role: 'vendor',
      apartment_id: currentUser.apartment_id
    });
    setSelectedProposalForReview(null);
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
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          position: 'relative', 
          marginBottom: '1rem',
          maxWidth: '500px' 
        }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--vendor-muted)' }} />
          <input
            type="text"
            placeholder="Search by Flat (e.g. S-3907), Name, or Order #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          <button
            type="button"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
              background: statusFilter === 'all' ? 'var(--vendor-text)' : '#FFFFFF',
              color: statusFilter === 'all' ? '#FFFFFF' : 'var(--vendor-muted)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
              background: statusFilter === 'created' ? 'var(--vendor-text)' : '#FFFFFF',
              color: statusFilter === 'created' ? '#FFFFFF' : 'var(--vendor-muted)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
            onClick={() => setStatusFilter('created')}
          >
            New ({orders.filter(o => o.status === 'created').length})
          </button>
          <button
            type="button"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
              background: statusFilter === 'in_progress' ? 'var(--vendor-text)' : '#FFFFFF',
              color: statusFilter === 'in_progress' ? '#FFFFFF' : 'var(--vendor-muted)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
            onClick={() => setStatusFilter('in_progress')}
          >
            Ironing ({orders.filter(o => o.status === 'in_progress').length})
          </button>
          <button
            type="button"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
              background: statusFilter === 'ready' ? 'var(--vendor-text)' : '#FFFFFF',
              color: statusFilter === 'ready' ? '#FFFFFF' : 'var(--vendor-muted)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
            onClick={() => setStatusFilter('ready')}
          >
            Ready ({orders.filter(o => o.status === 'ready').length})
          </button>
          <button
            type="button"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
              background: statusFilter === 'unpaid_only' ? '#B95E54' : '#FFF5F4',
              color: statusFilter === 'unpaid_only' ? '#FFFFFF' : '#B95E54',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
            onClick={() => setStatusFilter('unpaid_only')}
          >
            ⚠️ Unpaid
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map(order => {
            const isUnpaid = order.payment_status === 'unpaid';
            const isExpanded = expandedOrderId === order.id;
            const isDelivered = order.status === 'delivered';
            const totalGarments = order.items?.reduce((acc, itm) => acc + itm.quantity, 0) || 0;

            const whatsappMessage = encodeURIComponent(
              `Namaste ${order.customer_name}, this is Ramu Dhobi. Regarding your ironing order ${order.order_number} for Flat ${order.flat_number}.`
            );

            return (
              <div 
                key={order.id} 
                className="vendor-card"
                style={{ 
                  padding: '1.5rem',
                  border: isUnpaid && order.status === 'delivered' ? '1px solid var(--status-coral-bg)' : '1px solid var(--vendor-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem' }}>
                        {order.order_number}
                      </span>
                      <span style={{ 
                        background: '#EBE8E0', padding: '0.2rem 0.6rem', borderRadius: '8px', 
                        fontSize: '0.8rem', fontWeight: 700, color: 'var(--vendor-text)' 
                      }}>
                        Flat {order.flat_number}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--vendor-text)', fontWeight: 500 }}>
                        {order.customer_name}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      {order.customer_phone && (
                        <a 
                          href={`https://wa.me/91${order.customer_phone}?text=${whatsappMessage}`}
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', textDecoration: 'none', background: '#e8f9ed', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}
                        >
                          <MessageCircle size={12} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {/* Status Badge */}
                    {order.status === 'created' && <span style={{ background: '#EBE8E0', color: 'var(--vendor-text)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>New Request</span>}
                    {order.status === 'in_progress' && <span style={{ background: 'var(--status-amber-bg)', color: '#9C6F3F', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Ironing</span>}
                    {order.status === 'ready' && <span style={{ background: '#F3E8FF', color: '#9333EA', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Ready</span>}
                    {order.status === 'delivered' && <span style={{ background: 'var(--status-sage-bg)', color: '#557A3C', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Delivered</span>}

                    {/* Payment Status Badge */}
                    {order.payment_status === 'paid' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#557A3C', fontSize: '0.8rem', fontWeight: 700 }}>
                        <Check size={14} /> Paid
                      </span>
                    )}
                    {order.payment_status === 'unpaid' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#B95E54', fontSize: '0.8rem', fontWeight: 700 }}>
                        <AlertCircle size={14} /> ₹{order.total_amount - order.paid_amount} Unpaid
                      </span>
                    )}
                    {order.payment_status === 'partial' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#9C6F3F', fontSize: '0.8rem', fontWeight: 700 }}>
                        Partial (₹{order.total_amount - order.paid_amount} due)
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Slot Strip (Phase D) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {order.delivery_slot_date && order.delivery_slot_window ? (
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                      fontSize: '0.8rem', color: '#1E3A8A', background: '#EFF6FF', 
                      padding: '0.3rem 0.7rem', borderRadius: '8px', fontWeight: 600, border: '1px solid #BFDBFE' 
                    }}>
                      <Calendar size={13} />
                      <span>Slot: <strong>{order.delivery_slot_date}</strong> ({order.delivery_slot_window})</span>
                      {!isDelivered && (
                        <button 
                          type="button" 
                          onClick={() => setSelectedOrderForSlot(order)}
                          style={{ background: 'none', border: 'none', color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 700 }}
                        >
                          Change
                        </button>
                      )}
                    </div>
                  ) : !isDelivered ? (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForSlot(order)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        color: 'var(--vendor-muted)',
                        background: '#F6F5F2',
                        border: '1px dashed var(--vendor-border)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      <Calendar size={13} />
                      <span>+ Assign Delivery Slot</span>
                    </button>
                  ) : null}

                  {/* Propose Change button for vendor */}
                  {!isDelivered && !order.active_change_proposal && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForProposal(order)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        color: 'var(--vendor-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textDecoration: 'underline'
                      }}
                    >
                      <Edit3 size={12} />
                      <span>Modify Garments</span>
                    </button>
                  )}
                </div>

                {/* Mutual Order Change Banner (Phase D) */}
                {order.active_change_proposal && (
                  <div style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: order.active_change_proposal.proposed_by === 'customer' ? '#F5F3FF' : '#FFFBEB',
                    border: order.active_change_proposal.proposed_by === 'customer' ? '1px solid #DDD6FE' : '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '0.825rem', 
                        fontWeight: 700, 
                        color: order.active_change_proposal.proposed_by === 'customer' ? '#5B21B6' : '#92400E' 
                      }}>
                        {order.active_change_proposal.proposed_by === 'customer'
                          ? 'Resident Requested Order Changes'
                          : 'Change Proposal Awaiting Resident Approval'}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: order.active_change_proposal.proposed_by === 'customer' ? '#7C3AED' : '#B45309',
                        marginTop: '0.15rem'
                      }}>
                        Proposed Total: ₹{order.active_change_proposal.proposed_total_amount} (Current: ₹{order.total_amount})
                        {order.active_change_proposal.reason && ` • "${order.active_change_proposal.reason}"`}
                      </div>
                    </div>

                    {order.active_change_proposal.proposed_by === 'customer' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedProposalForReview({ order, proposal: order.active_change_proposal! })}
                        className="vendor-btn vendor-btn-primary"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.4rem 0.8rem',
                          background: '#7C3AED',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Review Request
                      </button>
                    ) : (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: '#B45309',
                        background: '#FEF3C7',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        Pending Resident
                      </span>
                    )}
                  </div>
                )}

                {/* Garments Breakdown Bar */}
                <div style={{ background: '#F6F5F2', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--vendor-text)' }}>
                      {totalGarments} Clothes:
                      {' '}
                      <span style={{ color: 'var(--vendor-muted)', fontWeight: 500 }}>
                        {order.items?.map(i => `${i.quantity}x ${i.garment_name.split('/')[0]}`).join(', ')}
                      </span>
                    </span>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--vendor-muted)', cursor: 'pointer', display: 'flex' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--vendor-border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {order.items?.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--vendor-muted)' }}>{item.garment_name}</span>
                            <span style={{ fontWeight: 600, color: 'var(--vendor-text)' }}>
                              {item.quantity} × ₹{item.unit_price} = ₹{item.subtotal}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.special_instructions && (
                        <div style={{ 
                          marginTop: '1rem', padding: '0.75rem', background: '#FFFFFF', 
                          borderRadius: '12px', fontSize: '0.8rem', color: 'var(--vendor-muted)',
                          display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                        }}>
                          <FileText size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span><strong style={{ color: 'var(--vendor-text)' }}>Note:</strong> {order.special_instructions}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--vendor-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Total Bill</span>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--vendor-text)', lineHeight: 1 }}>
                      ₹{order.total_amount}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {order.status === 'created' && (
                      <button
                        type="button"
                        className="vendor-btn vendor-btn-secondary"
                        onClick={() => handleStartIroning(order.id)}
                      >
                        <Sparkles size={16} />
                        <span>Start Ironing</span>
                      </button>
                    )}

                    {order.status === 'in_progress' && (
                      <button
                        type="button"
                        className="vendor-btn vendor-btn-primary"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                        onClick={() => handleMarkReady(order.id)}
                      >
                        <Package size={16} />
                        <span>Mark Ready</span>
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        type="button"
                        className="vendor-btn vendor-btn-primary"
                        onClick={() => onRequestDeliveryPayment(order)}
                        title="Deliver order to flat and record payment"
                      >
                        <CheckCircle2 size={16} />
                        <span>Deliver (Payment Gate)</span>
                      </button>
                    )}

                    {order.status === 'delivered' && isUnpaid && (
                      <button
                        type="button"
                        className="vendor-btn"
                        style={{ background: '#FFF5F4', color: '#B95E54', border: '1px solid var(--status-coral-bg)' }}
                        onClick={() => onCollectPaymentForDeliveredOrder(order)}
                      >
                        <IndianRupee size={16} />
                        <span>Collect Dues</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="vendor-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--vendor-border)', margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>No orders found</h3>
          <p style={{ color: 'var(--vendor-muted)', fontSize: '0.9rem' }}>
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Phase D Modals */}
      {/* 1. Delivery Slot Picker Modal */}
      {selectedOrderForSlot && (
        <DeliverySlotPickerModal
          isOpen={Boolean(selectedOrderForSlot)}
          onClose={() => setSelectedOrderForSlot(null)}
          apartmentId={selectedOrderForSlot.apartment_id || ''}
          currentDate={selectedOrderForSlot.delivery_slot_date}
          currentWindow={selectedOrderForSlot.delivery_slot_window}
          onSelectSlot={(date, window) => handleVendorBookSlot(date, window)}
        />
      )}

      {/* 2. Propose Change Modal */}
      {selectedOrderForProposal && (
        <ProposeChangeModal
          isOpen={Boolean(selectedOrderForProposal)}
          onClose={() => setSelectedOrderForProposal(null)}
          order={selectedOrderForProposal}
          callerRole="vendor"
          onSubmitProposal={handleVendorSubmitProposal}
        />
      )}

      {/* 3. Review Change Modal */}
      {selectedProposalForReview && (
        <ReviewChangeModal
          isOpen={Boolean(selectedProposalForReview)}
          onClose={() => setSelectedProposalForReview(null)}
          order={selectedProposalForReview.order}
          proposal={selectedProposalForReview.proposal}
          callerRole="vendor"
          onRespond={handleVendorRespondProposal}
        />
      )}
    </div>
  );
};
