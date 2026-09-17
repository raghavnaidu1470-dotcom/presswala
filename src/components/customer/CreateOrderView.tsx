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
  FileText
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface CreateOrderViewProps {
  onOrderCreated: (newOrder: Order) => void;
}

// Map icon string to Lucide icon
function renderGarmentIcon(iconName: string) {
  switch (iconName) {
    case 'shirt': return <Shirt size={20} />;
    case 'sparkles': return <Sparkles size={20} />;
    case 'crown': return <Crown size={20} />;
    case 'bed': return <Bed size={20} />;
    case 'bed-double': return <Bed size={20} />;
    case 'briefcase': return <Briefcase size={20} />;
    case 'layers': return <Layers size={20} />;
    case 'palette': return <Palette size={20} />;
    default: return <Shirt size={20} />;
  }
}

export const CreateOrderView: React.FC<CreateOrderViewProps> = ({ onOrderCreated }) => {
  const { currentUser } = useAuth();
  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [quantities, setQuantities] = useState<{ [garmentId: string]: number }>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function loadGarments() {
      const items = await db.getGarmentTypes();
      setGarments(items);
    }
    loadGarments();
  }, []);

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
    setIsSubmitting(true);
    try {
      const order = await db.createOrder(currentUser, selectedItemsList, specialInstructions.trim() || undefined);
      setCreatedOrder(order);
      setQuantities({});
      setSpecialInstructions('');
    } catch (err) {
      console.error('Failed to place order:', err);
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

  return (
    <div style={{ paddingBottom: '90px' }}>
      {/* Page Title & Instructions */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Select Clothes for Ironing
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Pick quantity for each garment type. Your order total calculates automatically.
        </p>
      </div>

      {/* Garments Grid */}
      <div className="garments-grid">
        {garments.map(garment => {
          const qty = quantities[garment.id] || 0;
          return (
            <div 
              key={garment.id} 
              className={`garment-card ${qty > 0 ? 'has-quantity' : ''}`}
            >
              <div className="garment-info">
                <div className="garment-icon-bubble">
                  {renderGarmentIcon(garment.icon)}
                </div>
                <div>
                  <div className="garment-name">{garment.name}</div>
                  <div className="garment-price-rate">
                    ₹{garment.price} / pc
                    {qty > 0 && (
                      <span style={{ color: 'var(--primary-500)', fontWeight: 700, marginLeft: '6px' }}>
                        • ₹{qty * garment.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="stepper-control">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => handleDecrement(garment.id)}
                  disabled={qty === 0}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="stepper-value">{qty}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => handleIncrement(garment.id)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Instructions */}
      <div 
        style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <label 
          htmlFor="specialNotes"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.8125rem', 
            fontWeight: 700, 
            color: 'var(--text-secondary)', 
            marginBottom: '0.5rem' 
          }}
        >
          <FileText size={15} />
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
            padding: '0.65rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            resize: 'none'
          }}
        />
      </div>

      {/* Sticky Bottom Order Bar */}
      <div className="order-sticky-bar">
        <div className="order-sticky-inner">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {totalItemsCount === 0 ? 'No garments selected' : `${totalItemsCount} Garments Selected`}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ₹{totalCost}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handlePlaceOrder}
            disabled={totalItemsCount === 0 || isSubmitting}
            style={{ minWidth: '180px' }}
          >
            <ShoppingBag size={18} />
            <span>{isSubmitting ? 'Placing Order...' : 'Place Order'}</span>
            <ArrowRight size={16} />
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
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'var(--success-subtle)', 
                color: 'var(--success-color)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Order {createdOrder.order_number} Received!
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Ramu Dhobi has been notified and will collect your clothes shortly.
            </p>

            <div 
              style={{ 
                background: 'var(--bg-input)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1rem',
                textAlign: 'left',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Flat Number</span>
                <span style={{ fontWeight: 700 }}>Flat {createdOrder.flat_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Clothes</span>
                <span style={{ fontWeight: 700 }}>{totalItemsCount} items</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span>Estimated Total</span>
                <span style={{ color: 'var(--accent-primary)' }}>₹{createdOrder.total_amount}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleCloseConfirmation}
              style={{ width: '100%' }}
            >
              <span>View in My Orders</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
