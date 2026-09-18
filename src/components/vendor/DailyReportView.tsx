import React from 'react';
import { Order, DashboardMetrics } from '../../types';
import { 
  TrendingUp, 
  AlertCircle,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface DailyReportViewProps {
  orders: Order[];
  metrics: DashboardMetrics;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  orders,
  metrics
}) => {
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const unpaidOrders = orders.filter(o => o.payment_status === 'unpaid' || o.payment_status === 'partial');

  const totalGarmentsIroned = orders.reduce((sum, o) => {
    return sum + (o.items?.reduce((s, itm) => s + itm.quantity, 0) || 0);
  }, 0);

  return (
    <div>
      {/* Metrics Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="vendor-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#557A3C', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <TrendingUp size={16} /> Total Revenue Collected
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--vendor-text)', lineHeight: 1 }}>
            <AnimatedNumber value={metrics.totalRevenueCollected} prefix="₹" />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--vendor-muted)' }}>
            From {paidOrders.length} fully paid orders
          </div>
        </div>

        <div className="vendor-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--status-coral-bg)', background: '#FFF5F4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B95E54', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <AlertCircle size={16} /> Pending Dues
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: '#B95E54', lineHeight: 1 }}>
            <AnimatedNumber value={metrics.totalOutstandingAmount} prefix="₹" />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#B95E54', opacity: 0.8 }}>
            Across {unpaidOrders.length} pending orders
          </div>
        </div>

        <div className="vendor-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--vendor-muted)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <FileSpreadsheet size={16} /> Clothes Processed
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--vendor-text)', lineHeight: 1 }}>
            <AnimatedNumber value={totalGarmentsIroned} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--vendor-muted)' }}>
            Lifetime garments logged
          </div>
        </div>
      </div>

      {/* Completed Orders History Table */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif', color: 'var(--vendor-text)' }}>
          <Calendar size={20} color="var(--vendor-accent)" />
          <span>Completed Orders Log ({deliveredOrders.length})</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1.5fr', gap: '1rem', padding: '0 1rem 0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--vendor-muted)', borderBottom: '1px solid var(--vendor-border)' }}>
            <div>Flat</div>
            <div>Resident</div>
            <div>Clothes</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          
          {deliveredOrders.map(order => {
            const totalClothes = order.items?.reduce((a, b) => a + b.quantity, 0) || 0;
            const deliveredDate = order.delivered_at 
              ? new Date(order.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Delivered';

            return (
              <div 
                key={order.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr 1fr 1.5fr',
                  gap: '1rem',
                  padding: '1rem',
                  background: '#F6F5F2',
                  borderRadius: '16px',
                  alignItems: 'center',
                  fontSize: '0.9rem'
                }}
              >
                <div>
                  <span style={{ background: '#EBE8E0', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--vendor-text)' }}>
                    {order.flat_number}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--vendor-text)', marginBottom: '0.1rem' }}>{order.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vendor-muted)' }}>{order.order_number}</div>
                </div>
                <div style={{ color: 'var(--vendor-muted)' }}>{totalClothes} pcs</div>
                <div style={{ fontWeight: 800, color: 'var(--vendor-text)' }}>₹{order.total_amount}</div>
                <div>
                  {order.payment_status === 'paid' ? (
                    <span style={{ background: 'var(--status-sage-bg)', color: '#557A3C', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', marginBottom: '0.2rem' }}>
                      Paid
                    </span>
                  ) : (
                    <span style={{ background: 'var(--status-coral-bg)', color: '#B95E54', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', marginBottom: '0.2rem' }}>
                      ₹{order.total_amount - order.paid_amount} Due
                    </span>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--vendor-muted)' }}>{deliveredDate}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
