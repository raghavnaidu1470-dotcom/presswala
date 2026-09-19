import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { Order } from '../../types';
import { PaymentSummaryBar } from './PaymentSummaryBar';
import { OrderCard } from './OrderCard';
import { CreateOrderView } from './CreateOrderView';
import { UpiPaymentModal } from './UpiPaymentModal';
import { ManageContactsModal } from '../common/ManageContactsModal';
import { Skeleton } from '../common/Skeleton';
import { 
  PlusCircle, 
  Clock, 
  RotateCw, 
  PackageSearch, 
  ShoppingBag,
  Phone
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
  const [isManageContactsOpen, setIsManageContactsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchCustomerData = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const customerOrders = await db.getOrders({ 
        flatNumber: currentUser.flat_number,
        apartmentId: currentUser.apartment_id 
      });
      setOrders(customerOrders);

      const balance = await db.getCustomerBalance(currentUser.flat_number, currentUser.apartment_id);
      setTotalPaid(balance.totalPaid);
      setTotalOutstanding(balance.totalOutstanding);
    } catch (err) {
      console.error('Failed to load customer data:', err);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoad(false);
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
    <div className="customer-theme-wrapper">
      <style>{`
        .customer-theme-wrapper {
          --customer-bg: #FAF9F6;
          --customer-surface: #FFFFFF;
          --customer-text: #1A1A1A;
          --customer-muted: #5A5A5A;
          --customer-border: rgba(0, 0, 0, 0.08);
          --customer-accent: #7BAE5C;
          --customer-accent-hover: #69984C;
          
          /* Pastel Status Colors */
          --status-sage: #8EA86E;
          --status-sage-bg: rgba(142, 168, 110, 0.15);
          
          --status-amber: #D4A373;
          --status-amber-bg: rgba(212, 163, 115, 0.15);
          
          --status-coral: #D98880;
          --status-coral-bg: rgba(217, 136, 128, 0.15);

          position: relative;
          min-height: 100vh;
          background-color: var(--customer-bg);
          color: var(--customer-text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          z-index: 10;
        }

        .customer-theme-wrapper h1, 
        .customer-theme-wrapper h2, 
        .customer-theme-wrapper h3,
        .customer-heading {
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.02em;
        }

        .customer-card {
          background: var(--customer-surface);
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
        }

        .customer-btn {
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

        .customer-btn-primary {
          background: var(--customer-accent);
          color: #FFFFFF;
          padding: 0.85rem 1.25rem;
        }

        .customer-btn-primary:hover {
          background: var(--customer-accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(123, 174, 92, 0.25);
        }
          
        .customer-btn-secondary {
          background: #F6F5F2;
          color: var(--customer-text);
          border: 1px solid var(--customer-border);
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .customer-btn-secondary:hover {
          background: #FFFFFF;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .customer-tabs {
          display: flex;
          background: #EBE8E0;
          padding: 0.35rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          gap: 0.35rem;
        }

        .customer-tab {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: transparent;
          border: none;
          color: var(--customer-muted);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 200ms ease;
        }

        .customer-tab.active {
          background: var(--customer-surface);
          color: var(--customer-text);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .customer-filter-pills {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .customer-filter-pill {
          padding: 0.4rem 1rem;
          border-radius: 9999px;
          background: #F6F5F2;
          border: 1px solid var(--customer-border);
          color: var(--customer-muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 200ms ease;
        }

        .customer-filter-pill.active {
          background: var(--customer-text);
          color: #FFFFFF;
          border-color: var(--customer-text);
        }

        /* Override main-content styling specific to customer portal */
        .customer-main-content {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 1.25rem 1rem 6rem 1rem;
        }
      `}</style>

      <div className="customer-main-content">
        {/* Resident Community Greeting */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: 'var(--customer-text)' }}>
              Namaste, {currentUser?.name || 'Resident'}!
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--customer-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{currentUser?.block ? `${currentUser.block} • ` : ''}Flat {currentUser?.flat_number}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsManageContactsOpen(true)}
            className="customer-btn customer-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '10px'
            }}
            title="Manage registered contact numbers (up to 5)"
          >
            <Phone size={14} />
            <span>Manage Numbers</span>
          </button>
        </div>

        {/* Payment Summary Bar */}
        <PaymentSummaryBar
          totalPaid={totalPaid}
          totalOutstanding={totalOutstanding}
          onOpenUpiModal={handleOpenGeneralUpi}
          isLoading={isInitialLoad}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          {/* Tabs */}
          <div className="customer-tabs" style={{ margin: 0, flex: 1, maxWidth: '400px' }}>
            <button
              type="button"
              className={`customer-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <PlusCircle size={18} />
              <span className="hide-mobile">Create Order</span>
            </button>
            <button
              type="button"
              className={`customer-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <Clock size={18} />
              <span className="hide-mobile">My Orders ({orders.length})</span>
            </button>
          </div>

          <button
            type="button"
            className="customer-btn customer-btn-secondary"
            onClick={fetchCustomerData}
            disabled={isRefreshing}
            title="Refresh Orders"
            style={{ marginLeft: '1rem' }}
          >
            <RotateCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
            <span className="hide-mobile">Refresh</span>
          </button>
        </div>

        {/* Tab 1: Create Order */}
        {activeTab === 'create' && (
          <CreateOrderView 
            onOrderCreated={handleOrderCreated} 
            onNavigateToOrders={() => setActiveTab('orders')}
          />
        )}

        {/* Tab 2: My Orders */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter Pills */}
            <div className="customer-filter-pills">
              <button
                type="button"
                className={`customer-filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({orders.length})
              </button>
              <button
                type="button"
                className={`customer-filter-pill ${filterStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                In Progress ({orders.filter(o => o.status !== 'delivered').length})
              </button>
              <button
                type="button"
                className={`customer-filter-pill ${filterStatus === 'delivered' ? 'active' : ''}`}
                onClick={() => setFilterStatus('delivered')}
              >
                Delivered ({orders.filter(o => o.status === 'delivered').length})
              </button>
            </div>

            {/* Orders List */}
            {isInitialLoad ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Skeleton height="180px" borderRadius="24px" />
                <Skeleton height="180px" borderRadius="24px" />
              </div>
            ) : filteredOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPayUpi={handlePayUpiForOrder}
                    onOrderUpdated={fetchCustomerData}
                  />
                ))}
              </div>
            ) : (
              <div className="customer-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <PackageSearch size={48} style={{ color: 'var(--customer-border)', marginBottom: '1rem', display: 'inline-block' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
                  No orders found
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--customer-muted)', marginBottom: '1.5rem' }}>
                  {filterStatus !== 'all' 
                    ? 'No orders match this status filter.' 
                    : "You haven't placed any ironing requests yet."}
                </p>
                <button
                  type="button"
                  className="customer-btn customer-btn-primary"
                  onClick={() => setActiveTab('create')}
                >
                  <ShoppingBag size={18} />
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

        {/* Manage Contacts Modal (Phase C) */}
        {currentUser && (
          <ManageContactsModal
            isOpen={isManageContactsOpen}
            onClose={() => setIsManageContactsOpen(false)}
            customerId={currentUser.id}
            residentName={currentUser.name}
            flatNumber={currentUser.flat_number}
            onUpdated={fetchCustomerData}
          />
        )}
      </div>
    </div>
  );
};
