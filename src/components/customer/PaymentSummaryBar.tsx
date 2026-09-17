import React from 'react';
import { QrCode, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

interface PaymentSummaryBarProps {
  totalPaid: number;
  totalOutstanding: number;
  onOpenUpiModal: () => void;
}

export const PaymentSummaryBar: React.FC<PaymentSummaryBarProps> = ({
  totalPaid,
  totalOutstanding,
  onOpenUpiModal
}) => {
  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '0.875rem',
        marginBottom: '1.25rem' 
      }}
    >
      {/* Outstanding Dues Card */}
      <div 
        className={`metric-card ${totalOutstanding > 0 ? 'alert-card' : ''}`}
        style={{ justifyContent: 'space-between' }}
      >
        <div>
          <div className="metric-header">
            <span className="metric-label" style={{ color: totalOutstanding > 0 ? 'var(--danger-text)' : 'var(--text-secondary)' }}>
              Currently Outstanding
            </span>
            <div 
              className="metric-icon-box"
              style={{ 
                background: totalOutstanding > 0 ? 'var(--danger-subtle)' : 'var(--success-subtle)',
                color: totalOutstanding > 0 ? 'var(--danger-color)' : 'var(--success-color)'
              }}
            >
              {totalOutstanding > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            </div>
          </div>
          <div className="metric-value" style={{ color: totalOutstanding > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
            ₹{totalOutstanding}
          </div>
          <div className="metric-footer">
            {totalOutstanding > 0 
              ? 'Pending payment to Ramu Dhobi' 
              : 'All your orders are cleared!'}
          </div>
        </div>

        {totalOutstanding > 0 && (
          <div style={{ marginTop: '0.875rem' }}>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={onOpenUpiModal}
              style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <QrCode size={14} />
              <span>Pay ₹{totalOutstanding} via UPI</span>
            </button>
          </div>
        )}
      </div>

      {/* Lifetime Paid Card */}
      <div className="metric-card">
        <div>
          <div className="metric-header">
            <span className="metric-label">Total Ever Paid</span>
            <div 
              className="metric-icon-box"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary-500)' }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--text-primary)' }}>
            ₹{totalPaid}
          </div>
          <div className="metric-footer">
            Lifetime payments processed
          </div>
        </div>
      </div>
    </div>
  );
};
