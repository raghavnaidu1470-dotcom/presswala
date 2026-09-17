import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { Order } from '../../types';
import { PaymentSummaryBar } from './PaymentSummaryBar';
import { OrderCard } from './OrderCard';
import { CreateOrderView } from './CreateOrderView';
import { UpiPaymentModal } from './UpiPaymentModal';
import { 
  PlusCircle, 
  Clock, 
  RotateCw, 
  PackageSearch, 
  ShoppingBag 
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'orders'>('create');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'delivered'>('all');
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [selectedOrderForUpi, setSelectedOrderForUpi] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCustomerData = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const customerOrders = await db.getOrders({ flatNumber: currentUser.flat_number });
      setOrders(customerOrders);

      const balance = await db.getCustomerBalance(currentUser.flat_number);
      setTotalPaid(balance.totalPaid);
      setTotalOutstanding(balance.totalOutstanding);
    } catch (err) {
      console.error('Failed to load customer data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [currentUser]);

  const handlePayUpiForOrder = (order: Order) => {
    setSelectedOrderForUpi(order);
    setIsUpiModalOpen(true);
  };

  const handleOpenGeneralUpi = () => {
    setSelectedOrderForUpi(null);
    setIsUpiModalOpen(true);
  };

  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    setActiveTab('orders');
    fetchCustomerData();
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'active') {
      return order.status !== 'delivered';
    }
    if (filterStatus === 'delivered') {
      return order.status === 'delivered';
    }
    return true;
  });

  return (
    <div className="main-content">
      {/* Payment Summary Bar */}
      <PaymentSummaryBar
        totalPaid={totalPaid}
        totalOutstanding={totalOutstanding}
        onOpenUpiModal={handleOpenGeneralUpi}
      />

      {/* Tabs */}
      <div className="tabs-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <PlusCircle size={16} />
            <span>Create Order</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Clock size={16} />
            <span>My Orders ({orders.length})</span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={fetchCustomerData}
          disabled={isRefreshing}
          title="Refresh Orders"
        >
          <RotateCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
          <span className="hide-mobile">Refresh</span>
        </button>
      </div>

      {/* Tab 1: Create Order */}
      {activeTab === 'create' && (
        <CreateOrderView onOrderCreated={handleOrderCreated} />
      )}

      {/* Tab 2: My Orders */}
      {activeTab === 'orders' && (
        <div>
          {/* Filter Pills */}
          <div className="filter-pills" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({orders.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              In Progress ({orders.filter(o => o.status !== 'delivered').length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterStatus === 'delivered' ? 'active' : ''}`}
              onClick={() => setFilterStatus('delivered')}
            >
              Delivered ({orders.filter(o => o.status === 'delivered').length})
            </button>
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div>
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPayUpi={handlePayUpiForOrder}
                />
              ))}
            </div>
          ) : (
            <div 
              style={{ 
                background: 'var(--bg-surface)', 
                border: '1px dashed var(--border-subtle)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '3rem 1.5rem', 
                textAlign: 'center' 
              }}
            >
              <PackageSearch size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                No orders found
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                {filterStatus !== 'all' 
                  ? 'No orders match this status filter.' 
                  : "You haven't placed any ironing requests yet."}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('create')}
              >
                <ShoppingBag size={14} />
                <span>Create First Order</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* UPI Payment Modal */}
      <UpiPaymentModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
        orderId={selectedOrderForUpi?.id || null}
        amount={selectedOrderForUpi ? (selectedOrderForUpi.total_amount - selectedOrderForUpi.paid_amount) : totalOutstanding}
        onPaymentSuccess={fetchCustomerData}
      />
    </div>
  );
};
