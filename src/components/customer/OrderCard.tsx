import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { db } from '../../services/db';
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
  FileText,
  Calendar,
  Lock,
  Edit3
} from 'lucide-react';
import { DeliverySlotPickerModal } from '../common/DeliverySlotPickerModal';
import { ProposeChangeModal } from '../common/ProposeChangeModal';
import { ReviewChangeModal } from '../common/ReviewChangeModal';

interface OrderCardProps {
  order: Order;
  onPayUpi?: (order: Order) => void;
  onOrderUpdated?: () => void;
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

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPayUpi, onOrderUpdated }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const currentStageIndex = getStageIndex(order.status);
  const isDelivered = order.status === 'delivered';
  const isUnpaid = order.payment_status === 'unpaid';
  const isPartial = order.payment_status === 'partial';
  const hasOutstandingDue = isUnpaid || isPartial;

  // Phase D: Payment-option timing — "Pay Now" is strictly hidden until order status is Ready or Delivered
  const isPaymentUnlocked = order.status === 'ready' || order.status === 'delivered';

  // Format date nicely
  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalItemsCount = order.items?.reduce((acc, itm) => acc + itm.quantity, 0) || 0;

  const handleBookSlot = async (date: string, window: string) => {
    await db.bookDeliverySlot(order.id, date, window, {
      id: order.customer_id,
      role: 'customer',
      apartment_id: order.apartment_id
    });
    onOrderUpdated?.();
  };

  const handleProposeChange = async (
    proposedItems: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[],
    reason: string
  ) => {
    await db.proposeOrderChange(order.id, proposedItems, reason, {
      id: order.customer_id,
      role: 'customer',
      apartment_id: order.apartment_id
    });
    onOrderUpdated?.();
  };

  const handleRespondToProposal = async (decision: 'accept' | 'decline') => {
    if (!order.active_change_proposal) return;
    await db.respondToOrderChange(order.active_change_proposal.id, decision, {
      id: order.customer_id,
      role: 'customer',
      apartment_id: order.apartment_id
    });
    onOrderUpdated?.();
  };

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
          {/* Payment Status Badge */}
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

      {/* Delivery Slot Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        {order.delivery_slot_date && order.delivery_slot_window ? (
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
            fontSize: '0.8rem', color: '#275225', background: 'var(--status-sage-bg)', 
            padding: '0.35rem 0.75rem', borderRadius: '10px', fontWeight: 600 
          }}>
            <Calendar size={13} />
            <span>Delivery: {order.delivery_slot_date} • {order.delivery_slot_window}</span>
            {!isDelivered && (
              <button 
                type="button" 
                onClick={() => setIsSlotPickerOpen(true)}
                style={{ background: 'none', border: 'none', color: '#3A6B29', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 700 }}
              >
                Change
              </button>
            )}
          </div>
        ) : !isDelivered ? (
          <button
            type="button"
            onClick={() => setIsSlotPickerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--customer-muted)',
              background: '#F6F5F2',
              border: '1px dashed var(--customer-border)',
              padding: '0.35rem 0.75rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Calendar size={13} />
            <span>+ Book 2-Hour Delivery Slot</span>
          </button>
        ) : null}

        {/* Change Request Button if order not delivered and no pending proposal */}
        {!isDelivered && !order.active_change_proposal && (
          <button
            type="button"
            onClick={() => setIsProposeModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--customer-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            <Edit3 size={12} />
            <span>Request Changes</span>
          </button>
        )}
      </div>

      {/* Mutual Order Change Proposal Notification Banner */}
      {order.active_change_proposal && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '14px',
          background: order.active_change_proposal.proposed_by === 'vendor' ? '#EEF2FF' : '#FFFBEB',
          border: order.active_change_proposal.proposed_by === 'vendor' ? '1px solid #C7D2FE' : '1px solid #FDE68A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ 
              fontSize: '0.825rem', 
              fontWeight: 700, 
              color: order.active_change_proposal.proposed_by === 'vendor' ? '#3730A3' : '#92400E' 
            }}>
              {order.active_change_proposal.proposed_by === 'vendor'
                ? 'Vendor Proposed Order Modification'
                : 'Change Proposal Pending Vendor Confirmation'}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: order.active_change_proposal.proposed_by === 'vendor' ? '#4F46E5' : '#B45309',
              marginTop: '0.15rem'
            }}>
              Proposed Total: ₹{order.active_change_proposal.proposed_total_amount} (Original: ₹{order.total_amount})
              {order.active_change_proposal.reason && ` • "${order.active_change_proposal.reason}"`}
            </div>
          </div>

          {order.active_change_proposal.proposed_by === 'vendor' ? (
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="customer-btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                background: '#4F46E5',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}
            >
              Review & Respond
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
              Pending Review
            </span>
          )}
        </div>
      )}

      {/* 4-Stage Visual Progress Timeline */}
      <div style={{ position: 'relative', margin: '0.5rem 0' }}>
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
          {/* Phase D Payment Timing Gate: */}
          {/* If unpaid and status is Ready or Delivered -> show Pay Now */}
          {hasOutstandingDue && isPaymentUnlocked && onPayUpi && (
            <button
              type="button"
              className="customer-btn customer-btn-primary"
              onClick={() => onPayUpi(order)}
            >
              <QrCode size={16} />
              <span>Pay ₹{order.total_amount - order.paid_amount}</span>
            </button>
          )}

          {/* If unpaid and status is Placed or Ironing -> Payment locked indicator */}
          {hasOutstandingDue && !isPaymentUnlocked && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--customer-muted)',
              background: '#F6F5F2',
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              fontWeight: 600
            }}>
              <Lock size={12} />
              <span>Pay unlocks when Ready</span>
            </div>
          )}

          {isDelivered && order.payment_status === 'paid' && (
            <span style={{ fontSize: '0.85rem', color: '#557A3C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={16} /> Order Completed
            </span>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* 1. Delivery Slot Picker Modal */}
      <DeliverySlotPickerModal
        isOpen={isSlotPickerOpen}
        onClose={() => setIsSlotPickerOpen(false)}
        apartmentId={order.apartment_id || ''}
        currentDate={order.delivery_slot_date}
        currentWindow={order.delivery_slot_window}
        onSelectSlot={handleBookSlot}
      />

      {/* 2. Propose Change Modal */}
      <ProposeChangeModal
        isOpen={isProposeModalOpen}
        onClose={() => setIsProposeModalOpen(false)}
        order={order}
        callerRole="customer"
        onSubmitProposal={handleProposeChange}
      />

      {/* 3. Review Change Modal */}
      {order.active_change_proposal && (
        <ReviewChangeModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          order={order}
          proposal={order.active_change_proposal}
          callerRole="customer"
          onRespond={handleRespondToProposal}
        />
      )}
    </div>
  );
};
