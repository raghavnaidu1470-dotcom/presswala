import React from 'react';
import { Order, DashboardMetrics } from '../../types';
import { 
  TrendingUp, 
  AlertCircle,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

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
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Revenue Collected</span>
            <div className="metric-icon-box" style={{ background: 'var(--success-subtle)', color: 'var(--success-color)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--success-text)' }}>
            ₹{metrics.totalRevenueCollected}
          </div>
          <div className="metric-footer">
            From {paidOrders.length} fully paid orders
          </div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-header">
            <span className="metric-label" style={{ color: 'var(--danger-text)' }}>Pending Dues (Uncollected)</span>
            <div className="metric-icon-box" style={{ background: 'var(--danger-subtle)', color: 'var(--danger-color)' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--danger-text)' }}>
            ₹{metrics.totalOutstandingAmount}
          </div>
          <div className="metric-footer">
            Across {unpaidOrders.length} pending orders
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Clothes Processed</span>
            <div className="metric-icon-box" style={{ background: 'var(--primary-subtle)', color: 'var(--primary-500)' }}>
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div className="metric-value">
            {totalGarmentsIroned}
          </div>
          <div className="metric-footer">
            Lifetime garments logged in system
          </div>
        </div>
      </div>

      {/* Completed Orders History Table */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} />
          <span>Completed Orders Log ({deliveredOrders.length})</span>
        </h3>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Flat</th>
                <th>Resident</th>
                <th>Clothes</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Delivered Date</th>
              </tr>
            </thead>
            <tbody>
              {deliveredOrders.map(order => {
                const totalClothes = order.items?.reduce((a, b) => a + b.quantity, 0) || 0;
                const deliveredDate = order.delivered_at 
                  ? new Date(order.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Delivered';

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700 }}>{order.order_number}</td>
                    <td>
                      <span className="flat-badge-prominent">
                        Flat {order.flat_number}
                      </span>
                    </td>
                    <td>{order.customer_name}</td>
                    <td>{totalClothes} pcs</td>
                    <td style={{ fontWeight: 800 }}>₹{order.total_amount}</td>
                    <td>
                      {order.payment_status === 'paid' ? (
                        <span className="badge badge-paid">Paid</span>
                      ) : (
                        <span className="badge badge-unpaid">₹{order.total_amount - order.paid_amount} Due</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {deliveredDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
