import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { GarmentType, Order } from '../../types';
import { 
  Shirt, 
  Sparkles, 
  Crown, 
  Bed, 
  Briefcase, 
  Layers, 
  Palette, 
  Plus, 
  Minus, 
  CheckCircle2, 
  ShoppingBag,
  ArrowRight,
  FileText,
  AlertOctagon,
  Calendar,
  Clock
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { Skeleton } from '../common/Skeleton';
import { DeliverySlotPickerModal } from '../common/DeliverySlotPickerModal';

interface CreateOrderViewProps {
  onOrderCreated: (newOrder: Order) => void;
  onNavigateToOrders?: () => void;
}

// Map icon string to Lucide icon
function renderGarmentIcon(iconName: string) {
  switch (iconName) {
    case 'shirt': return <Shirt size={22} />;
    case 'sparkles': return <Sparkles size={22} />;
    case 'crown': return <Crown size={22} />;
    case 'bed': return <Bed size={22} />;
    case 'bed-double': return <Bed size={22} />;
    case 'briefcase': return <Briefcase size={22} />;
    case 'layers': return <Layers size={22} />;
    case 'palette': return <Palette size={22} />;
    default: return <Shirt size={22} />;
  }
}

export const CreateOrderView: React.FC<CreateOrderViewProps> = ({ onOrderCreated, onNavigateToOrders }) => {
  const { currentUser } = useAuth();
  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [quantities, setQuantities] = useState<{ [garmentId: string]: number }>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Phase D: Due-based order blocking & Delivery Slot booking
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; window: string } | null>(null);
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      if (!currentUser) return;
      try {
        const [items, balance] = await Promise.all([
          db.getGarmentTypes(),
          db.getCustomerBalance(currentUser.flat_number, currentUser.apartment_id)
        ]);
        setGarments(items);
        setOutstandingBalance(balance.totalOutstanding);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [currentUser]);

  const handleIncrement = (id: string) => {
    setQuantities(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const handleDecrement = (id: string) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: current - 1 };
    });
  };

  // Calculate totals
  let totalItemsCount = 0;
  let totalCost = 0;

  const selectedItemsList: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[] = [];

  for (const garment of garments) {
    const qty = quantities[garment.id] || 0;
    if (qty > 0) {
      totalItemsCount += qty;
      totalCost += qty * garment.price;
      selectedItemsList.push({
        garmentTypeId: garment.id,
        garmentName: garment.name,
        unitPrice: garment.price,
        quantity: qty
      });
    }
  }

  const handlePlaceOrder = async () => {
    if (!currentUser || selectedItemsList.length === 0) return;
    if (outstandingBalance > 0) {
      setSubmissionError(`Order creation blocked: You have an outstanding balance of ₹${outstandingBalance}. Please clear previous dues before creating a new order.`);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const order = await db.createOrder(
        currentUser,
        selectedItemsList,
        specialInstructions.trim() || undefined,
        selectedSlot ? { date: selectedSlot.date, window: selectedSlot.window } : undefined
      );
      setCreatedOrder(order);
      setQuantities({});
      setSpecialInstructions('');
      setSelectedSlot(null);
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setSubmissionError(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    if (createdOrder) {
      onOrderCreated(createdOrder);
      setCreatedOrder(null);
    }
  };

  const isDueBlocked = outstandingBalance > 0;

  return (
    <div style={{ paddingBottom: '120px' }}>
      {/* Page Title & Instructions */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h2 className="customer-heading" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          Select Clothes for Ironing
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--customer-muted)' }}>
          Pick the quantity for each garment type. Your order total calculates automatically.
        </p>
      </div>

      {/* Due-Based Order Blocking Alert Banner */}
      {isDueBlocked && (
        <div 
          style={{
            marginBottom: '1.5rem',
            padding: '1.25rem 1.5rem',
            borderRadius: '20px',
            background: '#FFF5F4',
            border: '1.5px solid #F87171',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertOctagon size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.25rem 0' }}>
              Order Placement Blocked — Outstanding Balance Due
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#B91C1C', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
              You currently have an outstanding unpaid balance of <strong>₹{outstandingBalance}</strong>. Per society guidelines, previous laundry dues must be cleared before placing a new order.
            </p>
            {onNavigateToOrders && (
              <button
                type="button"
                onClick={onNavigateToOrders}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>Pay Outstanding Dues Now</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {submissionError && (
        <div 
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertOctagon size={18} />
          <span>{submissionError}</span>
        </div>
      )}

      {/* Garments Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {isLoading && (
          <>
            <Skeleton height="100px" borderRadius="20px" />
            <Skeleton height="100px" borderRadius="20px" />
            <Skeleton height="100px" borderRadius="20px" />
            <Skeleton height="100px" borderRadius="20px" />
          </>
        )}
        
        {!isLoading && garments.map(garment => {
          const qty = quantities[garment.id] || 0;
          const isSelected = qty > 0;
          
          return (
            <div 
              key={garment.id} 
              className="customer-card"
              style={{ 
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 200ms ease',
                border: isSelected ? '1px solid var(--customer-accent)' : '1px solid var(--customer-border)',
                background: isSelected ? 'var(--status-sage-bg)' : 'var(--customer-surface)',
                boxShadow: isSelected ? '0 8px 24px rgba(123, 174, 92, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '16px',
                  background: isSelected ? 'var(--customer-accent)' : '#F6F5F2',
                  color: isSelected ? '#FFFFFF' : 'var(--customer-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 200ms ease'
                }}>
                  {renderGarmentIcon(garment.icon)}
                </div>
                
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--customer-text)', marginBottom: '0.15rem' }}>
                    {garment.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--customer-muted)', display: 'flex', alignItems: 'center' }}>
                    ₹{garment.price} / pc
                    {isSelected && (
                      <span style={{ color: '#557A3C', fontWeight: 700, marginLeft: '6px', fontSize: '0.8rem' }}>
                        • ₹{qty * garment.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tactile Pill-Shaped Stepper */}
              <div style={{ 
                display: 'flex', alignItems: 'center', background: '#FFFFFF', 
                border: '1px solid var(--customer-border)', borderRadius: '9999px',
                padding: '0.25rem', gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <button
                  type="button"
                  onClick={() => handleDecrement(garment.id)}
                  disabled={qty === 0}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: qty > 0 ? '#F6F5F2' : 'transparent',
                    color: qty > 0 ? 'var(--customer-text)' : 'var(--customer-border)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: qty > 0 ? 'pointer' : 'default',
                    transition: 'all 150ms ease'
                  }}
                  onMouseOver={(e) => qty > 0 && (e.currentTarget.style.background = '#EBE8E0')}
                  onMouseOut={(e) => qty > 0 && (e.currentTarget.style.background = '#F6F5F2')}
                >
                  <Minus size={16} />
                </button>
                
                <span style={{ 
                  width: '16px', textAlign: 'center', fontSize: '1rem', 
                  fontWeight: 700, color: 'var(--customer-text)',
                  fontFamily: 'Outfit, sans-serif'
                }}>
                  {qty}
                </span>
                
                <button
                  type="button"
                  onClick={() => handleIncrement(garment.id)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--status-sage-bg)',
                    color: '#557A3C',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--customer-accent)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--status-sage-bg)'}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Instructions */}
      <div 
        className="customer-card"
        style={{ 
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <label 
          htmlFor="specialNotes"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            color: 'var(--customer-text)', 
            marginBottom: '0.75rem' 
          }}
        >
          <FileText size={16} color="var(--customer-muted)" />
          Special Instructions (Optional)
        </label>
        <textarea
          id="specialNotes"
          placeholder="e.g. Starch white shirt, pickup clothes from the door basket outside Flat."
          rows={2}
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '16px',
            background: '#F6F5F2',
            border: '1px solid transparent',
            color: 'var(--customer-text)',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            resize: 'none',
            transition: 'all 200ms ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = 'var(--customer-accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = '#F6F5F2';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        />
      </div>

      {/* Delivery Slot Booking Card */}
      <div 
        className="customer-card"
        style={{ 
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              color: 'var(--customer-text)', 
              margin: 0
            }}
          >
            <Calendar size={16} color="var(--customer-muted)" />
            Delivery Slot (Optional)
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--customer-muted)' }}>(Max 3 deliveries per slot)</span>
          </label>
          {selectedSlot && (
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              style={{ background: 'none', border: 'none', color: '#B91C1C', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear Slot
            </button>
          )}
        </div>

        {selectedSlot ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            background: 'var(--status-sage-bg)',
            border: '1px solid var(--customer-accent)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--customer-accent)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--customer-text)' }}>
                  {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#557A3C', fontWeight: 600 }}>
                  {selectedSlot.window}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSlotPickerOpen(true)}
              className="customer-btn customer-btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              Change Slot
            </button>
          </div>
        ) : (
          <div style={{
            padding: '1.25rem',
            background: '#F6F5F2',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--customer-text)', marginBottom: '0.2rem' }}>
                No delivery slot selected
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--customer-muted)' }}>
                Choose a 2-hour window so Ramu Dhobi drops off your clothes at the ideal time.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSlotPickerOpen(true)}
              className="customer-btn customer-btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.6rem 1rem', background: '#FFFFFF', fontWeight: 700 }}
            >
              <Calendar size={16} />
              <span>Select Slot</span>
            </button>
          </div>
        )}
      </div>

      {/* Sticky Bottom Order Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--customer-border)',
        padding: '1rem',
        zIndex: 50,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--customer-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
              {totalItemsCount === 0 ? 'No garments selected' : `${totalItemsCount} Garments Selected`}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--customer-text)', fontFamily: 'Outfit, sans-serif' }}>₹</span>
              <AnimatedNumber 
                value={totalCost} 
                style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 800, 
                  color: 'var(--customer-text)',
                  fontFamily: 'Outfit, sans-serif'
                }} 
              />
            </div>
          </div>

          <button
            type="button"
            className="customer-btn customer-btn-primary"
            onClick={handlePlaceOrder}
            disabled={totalItemsCount === 0 || isSubmitting || isDueBlocked}
            style={{ 
              minWidth: '180px',
              padding: '1rem 1.5rem',
              fontSize: '1.05rem',
              opacity: (totalItemsCount === 0 || isDueBlocked) ? 0.6 : 1,
              cursor: (totalItemsCount === 0 || isDueBlocked) ? 'not-allowed' : 'pointer',
              background: isDueBlocked ? '#DC2626' : undefined
            }}
          >
            <ShoppingBag size={18} />
            <span>
              {isSubmitting 
                ? 'Placing Order...' 
                : isDueBlocked 
                ? `Blocked (Clear ₹${outstandingBalance})` 
                : 'Place Order'}
            </span>
            {!isDueBlocked && <ArrowRight size={18} />}
          </button>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {createdOrder && (
        <Modal 
          isOpen={Boolean(createdOrder)} 
          onClose={handleCloseConfirmation}
          title="Order Confirmed!"
          hideCloseButton
        >
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--customer-text)' }}>
            <div 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'var(--status-sage-bg)', 
                color: '#557A3C',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 0 0 10px rgba(142, 168, 110, 0.05)'
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
              Order {createdOrder.order_number} Received!
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--customer-muted)', marginBottom: '1.5rem' }}>
              Ramu Dhobi has been notified and will collect your clothes shortly.
            </p>

            <div 
              style={{ 
                background: '#F6F5F2', 
                borderRadius: '16px', 
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--customer-muted)' }}>Flat Number</span>
                <span style={{ fontWeight: 700 }}>Flat {createdOrder.flat_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--customer-muted)' }}>Total Clothes</span>
                <span style={{ fontWeight: 700 }}>{totalItemsCount} items</span>
              </div>
              {createdOrder.delivery_slot_date && createdOrder.delivery_slot_window && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--customer-muted)' }}>Delivery Slot</span>
                  <span style={{ fontWeight: 700, color: 'var(--customer-accent)' }}>
                    {createdOrder.delivery_slot_date} ({createdOrder.delivery_slot_window})
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, paddingTop: '0.75rem', borderTop: '1px solid var(--customer-border)' }}>
                <span>Estimated Total</span>
                <span style={{ color: 'var(--customer-accent)' }}>₹{createdOrder.total_amount}</span>
              </div>
            </div>

            <button
              type="button"
              className="customer-btn customer-btn-primary"
              onClick={handleCloseConfirmation}
              style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            >
              <span>View in My Orders</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Delivery Slot Picker Modal */}
      {currentUser && (
        <DeliverySlotPickerModal
          isOpen={isSlotPickerOpen}
          onClose={() => setIsSlotPickerOpen(false)}
          apartmentId={currentUser.apartment_id || ''}
          currentDate={selectedSlot?.date}
          currentWindow={selectedSlot?.window}
          onSelectSlot={(date, window) => {
            setSelectedSlot({ date, window });
          }}
        />
      )}
    </div>
  );
};
