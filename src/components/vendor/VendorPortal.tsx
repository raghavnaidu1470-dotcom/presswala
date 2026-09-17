import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Order, DashboardMetrics, PaymentMethod } from '../../types';
import { OrderManagementView } from './OrderManagementView';
import { OutstandingPaymentsView } from './OutstandingPaymentsView';
import { CustomerDirectoryView } from './CustomerDirectoryView';
import { DailyReportView } from './DailyReportView';
import { PriceListEditorModal } from './PriceListEditorModal';
import { DeliveryPaymentPromptModal } from './DeliveryPaymentPromptModal';
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
    <div className="main-content">
      {/* 5-Metric Cards Dashboard */}
      {metrics && (
        <div className="metrics-grid">
          {/* 1. New Orders */}
          <div className="metric-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-label">New Requests</span>
              <div className="metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <Inbox size={18} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#60a5fa' }}>
              {metrics.newOrdersCount}
            </div>
            <div className="metric-footer">Waiting to be picked up</div>
          </div>

          {/* 2. In Progress */}
          <div className="metric-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-label">On Ironing Table</span>
              <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Sparkles size={18} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#fbbf24' }}>
              {metrics.inProgressCount}
            </div>
            <div className="metric-footer">Currently being pressed</div>
          </div>

          {/* 3. Ready for Delivery */}
          <div className="metric-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-label">Ready for Delivery</span>
              <div className="metric-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <Package size={18} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#c084fc' }}>
              {readyOrdersCount}
            </div>
            <div className="metric-footer">Ironed, awaiting doorstep handoff</div>
          </div>

          {/* 4. Completed Today */}
          <div className="metric-card" onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-label">Delivered Today</span>
              <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#34d399' }}>
              {metrics.completedTodayCount}
            </div>
            <div className="metric-footer">Clothes returned to flats</div>
          </div>

          {/* 5. Total Outstanding Dues (CRITICAL ALERT) */}
          <div 
            className="metric-card alert-card" 
            onClick={() => setActiveTab('outstanding')} 
            style={{ cursor: 'pointer' }}
          >
            <div className="metric-header">
              <span className="metric-label" style={{ color: 'var(--danger-text)' }}>
                Total Outstanding
              </span>
              <div className="metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--danger-text)' }}>
              ₹{metrics.totalOutstandingAmount}
            </div>
            <div className="metric-footer" style={{ color: 'var(--danger-text)' }}>
              ⚠️ Across {unpaidCount} unpaid order{unpaidCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Controls Header */}
      <div className="tabs-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingBag size={15} />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'outstanding' ? 'active' : ''}`}
            onClick={() => setActiveTab('outstanding')}
            style={metrics && metrics.totalOutstandingAmount > 0 ? { color: '#fca5a5' } : {}}
          >
            <AlertTriangle size={15} />
            <span>Outstanding ({unpaidCount})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={15} />
            <span>Flats Directory</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BarChart3 size={15} />
            <span>Reports</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setIsPriceModalOpen(true)}
            title="Edit Garment Rate Card"
          >
            <Tag size={14} />
            <span className="hide-mobile">Price List</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={fetchVendorData}
            disabled={isRefreshing}
            title="Sync Latest Orders"
          >
            <RotateCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
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
  );
};
