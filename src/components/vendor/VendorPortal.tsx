import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Order, DashboardMetrics, PaymentMethod } from '../../types';
import { OrderManagementView } from './OrderManagementView';
import { OutstandingPaymentsView } from './OutstandingPaymentsView';
import { CustomerDirectoryView } from './CustomerDirectoryView';
import { DailyReportView } from './DailyReportView';
import { PriceListEditorModal } from './PriceListEditorModal';
import { DeliveryPaymentPromptModal } from './DeliveryPaymentPromptModal';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { 
  Inbox, 
  Sparkles, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  RotateCw, 
  Tag, 
  BarChart3, 
  ShoppingBag
} from 'lucide-react';

export const VendorPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'outstanding' | 'customers' | 'reports'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delivery Payment Modal State
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Price List Modal State
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  const fetchVendorData = async () => {
    setIsRefreshing(true);
    try {
      const [allOrders, m] = await Promise.all([
        db.getOrders(),
        db.getDashboardMetrics()
      ]);
      setOrders(allOrders);
      setMetrics(m);
    } catch (err) {
      console.error('Error loading vendor data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, []);

  const handleRequestDeliveryPayment = (order: Order) => {
    setSelectedOrderForDelivery(order);
    setIsDeliveryModalOpen(true);
  };

  const handleConfirmDeliveryWithPayment = async (paymentDecision: {
    isPaid: boolean;
    method?: PaymentMethod;
    collectedAmount?: number;
    referenceId?: string;
    notes?: string;
  }) => {
    if (!selectedOrderForDelivery) return;
    try {
      await db.markOrderDeliveredWithPayment(selectedOrderForDelivery.id, paymentDecision);
      setIsDeliveryModalOpen(false);
      setSelectedOrderForDelivery(null);
      await fetchVendorData();
    } catch (err) {
      console.error('Failed to deliver order with payment:', err);
    }
  };

  const readyOrdersCount = orders.filter(o => o.status === 'ready').length;
  const unpaidCount = orders.filter(o => o.payment_status === 'unpaid' || o.payment_status === 'partial').length;

  return (
    <div className="vendor-theme-wrapper">
      <style>{`
        .vendor-theme-wrapper {
          --vendor-bg: #FAF9F6;
          --vendor-surface: #FFFFFF;
          --vendor-text: #1A1A1A;
          --vendor-muted: #5A5A5A;
          --vendor-border: rgba(0, 0, 0, 0.08);
          --vendor-accent: #7BAE5C;
          --vendor-accent-hover: #69984C;
          
          /* Pastel Status Colors */
          --status-sage: #8EA86E;
          --status-sage-bg: rgba(142, 168, 110, 0.15);
          
          --status-amber: #D4A373;
          --status-amber-bg: rgba(212, 163, 115, 0.15);
          
          --status-coral: #D98880;
          --status-coral-bg: rgba(217, 136, 128, 0.15);

          position: relative;
          min-height: 100vh;
          background-color: var(--vendor-bg);
          color: var(--vendor-text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          z-index: 10;
        }

        .vendor-orb {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          max-width: 800px;
          height: 400px;
          background: radial-gradient(circle, rgba(123, 174, 92, 0.1) 0%, rgba(250, 249, 246, 0) 70%);
          filter: blur(60px);
          z-index: -1;
          pointer-events: none;
        }

        .vendor-main-content {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 1.5rem 1rem 6rem 1rem;
        }

        .vendor-card {
          background: var(--vendor-surface);
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
        }

        .vendor-btn {
          border-radius: 9999px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
        }

        .vendor-btn-primary {
          background: var(--vendor-accent);
          color: #FFFFFF;
          padding: 0.85rem 1.25rem;
        }

        .vendor-btn-primary:hover {
          background: var(--vendor-accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(123, 174, 92, 0.25);
        }
          
        .vendor-btn-secondary {
          background: #F6F5F2;
          color: var(--vendor-text);
          border: 1px solid var(--vendor-border);
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .vendor-btn-secondary:hover {
          background: #FFFFFF;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .vendor-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .vendor-metric-card {
          background: var(--vendor-surface);
          border-radius: 20px;
          padding: 1.25rem;
          border: 1px solid rgba(0,0,0,0.03);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .vendor-metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
        }

        .vendor-metric-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }

        .vendor-metric-value {
          font-family: 'Outfit', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: var(--vendor-text);
          line-height: 1.1;
          margin-bottom: 0.25rem;
        }

        .vendor-metric-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--vendor-muted);
        }

        .vendor-tabs {
          display: flex;
          background: #EBE8E0;
          padding: 0.35rem;
          border-radius: 16px;
          gap: 0.35rem;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }
        .vendor-tabs::-webkit-scrollbar { display: none; }

        .vendor-tab {
          padding: 0.6rem 1rem;
          border-radius: 12px;
          background: transparent;
          border: none;
          color: var(--vendor-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 200ms ease;
        }

        .vendor-tab.active {
          background: var(--vendor-surface);
          color: var(--vendor-text);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .vendor-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .vendor-metrics-grid > div:last-child {
            grid-column: span 2;
          }
        }
      `}</style>
      
      <div className="vendor-orb"></div>

      <div className="vendor-main-content">
        {/* 5-Metric Cards Dashboard */}
        {metrics && (
          <div className="vendor-metrics-grid">
            {/* 1. New Orders */}
            <div className="vendor-metric-card" onClick={() => setActiveTab('orders')}>
              <div className="vendor-metric-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                <Inbox size={20} />
              </div>
              <div className="vendor-metric-value">
                <AnimatedNumber value={metrics.newOrdersCount} />
              </div>
              <div className="vendor-metric-label">New Requests</div>
            </div>

            {/* 2. In Progress */}
            <div className="vendor-metric-card" onClick={() => setActiveTab('orders')}>
              <div className="vendor-metric-icon" style={{ background: 'var(--status-amber-bg)', color: '#9C6F3F' }}>
                <Sparkles size={20} />
              </div>
              <div className="vendor-metric-value">
                <AnimatedNumber value={metrics.inProgressCount} />
              </div>
              <div className="vendor-metric-label">Ironing</div>
            </div>

            {/* 3. Ready for Delivery */}
            <div className="vendor-metric-card" onClick={() => setActiveTab('orders')}>
              <div className="vendor-metric-icon" style={{ background: '#F3E8FF', color: '#9333EA' }}>
                <Package size={20} />
              </div>
              <div className="vendor-metric-value">
                <AnimatedNumber value={readyOrdersCount} />
              </div>
              <div className="vendor-metric-label">Ready for Pickup</div>
            </div>

            {/* 4. Completed Today */}
            <div className="vendor-metric-card" onClick={() => setActiveTab('reports')}>
              <div className="vendor-metric-icon" style={{ background: 'var(--status-sage-bg)', color: '#557A3C' }}>
                <CheckCircle2 size={20} />
              </div>
              <div className="vendor-metric-value">
                <AnimatedNumber value={metrics.completedTodayCount} />
              </div>
              <div className="vendor-metric-label">Delivered Today</div>
            </div>

            {/* 5. Total Outstanding Dues */}
            <div 
              className="vendor-metric-card" 
              onClick={() => setActiveTab('outstanding')} 
              style={{ border: metrics.totalOutstandingAmount > 0 ? '1px solid var(--status-coral-bg)' : '' }}
            >
              <div className="vendor-metric-icon" style={{ background: 'var(--status-coral-bg)', color: '#B95E54' }}>
                <AlertTriangle size={20} />
              </div>
              <div className="vendor-metric-value" style={{ color: '#B95E54' }}>
                <AnimatedNumber value={metrics.totalOutstandingAmount} prefix="₹" />
              </div>
              <div className="vendor-metric-label" style={{ color: '#B95E54' }}>
                Outstanding
              </div>
            </div>
          </div>
        )}

        {/* Tabs & Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="vendor-tabs">
            <button
              type="button"
              className={`vendor-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <ShoppingBag size={16} />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              type="button"
              className={`vendor-tab ${activeTab === 'outstanding' ? 'active' : ''}`}
              onClick={() => setActiveTab('outstanding')}
              style={metrics && metrics.totalOutstandingAmount > 0 ? { color: '#B95E54' } : {}}
            >
              <AlertTriangle size={16} />
              <span>Dues ({unpaidCount})</span>
            </button>
            <button
              type="button"
              className={`vendor-tab ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              <Users size={16} />
              <span>Flats</span>
            </button>
            <button
              type="button"
              className={`vendor-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <BarChart3 size={16} />
              <span>Reports</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="vendor-btn vendor-btn-secondary"
              onClick={() => setIsPriceModalOpen(true)}
              title="Edit Garment Rate Card"
            >
              <Tag size={16} />
              <span>Price List</span>
            </button>
            <button
              type="button"
              className="vendor-btn vendor-btn-secondary"
              onClick={fetchVendorData}
              disabled={isRefreshing}
              title="Sync Latest Orders"
            >
              <RotateCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
            </button>
          </div>
        </div>

        {/* Tab 1: Orders Management */}
        {activeTab === 'orders' && (
          <OrderManagementView
            orders={orders}
            onOrderUpdated={fetchVendorData}
            onRequestDeliveryPayment={handleRequestDeliveryPayment}
            onCollectPaymentForDeliveredOrder={(order) => {
              setSelectedOrderForDelivery(order);
              setIsDeliveryModalOpen(true);
            }}
          />
        )}

        {/* Tab 2: Outstanding Dues Register */}
        {activeTab === 'outstanding' && (
          <OutstandingPaymentsView
            orders={orders}
            onPaymentCollected={fetchVendorData}
          />
        )}

        {/* Tab 3: Customers Directory */}
        {activeTab === 'customers' && (
          <CustomerDirectoryView />
        )}

        {/* Tab 4: Reports & Analytics */}
        {activeTab === 'reports' && metrics && (
          <DailyReportView orders={orders} metrics={metrics} />
        )}

        {/* Mandatory Delivery Payment Prompt Modal */}
        <DeliveryPaymentPromptModal
          isOpen={isDeliveryModalOpen}
          order={selectedOrderForDelivery}
          onCancel={() => {
            setIsDeliveryModalOpen(false);
            setSelectedOrderForDelivery(null);
          }}
          onConfirm={handleConfirmDeliveryWithPayment}
        />

        {/* Garment Price List Editor Modal */}
        <PriceListEditorModal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          onPricesUpdated={fetchVendorData}
        />
      </div>
    </div>
  );
};
