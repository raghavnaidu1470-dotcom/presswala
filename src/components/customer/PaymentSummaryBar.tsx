import React from 'react';
import { QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { Skeleton } from '../common/Skeleton';

interface PaymentSummaryBarProps {
  totalPaid: number;
  totalOutstanding: number;
  onOpenUpiModal: () => void;
  isLoading?: boolean;
}

export const PaymentSummaryBar: React.FC<PaymentSummaryBarProps> = ({
  totalPaid,
  totalOutstanding,
  onOpenUpiModal,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="customer-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <Skeleton width="120px" height="16px" style={{ marginBottom: '0.75rem' }} />
        <Skeleton width="200px" height="48px" style={{ marginBottom: '1.25rem' }} />
        <Skeleton width="100%" height="48px" borderRadius="9999px" />
      </div>
    );
  }

  const hasDues = totalOutstanding > 0;

  return (
    <div 
      className="customer-card"
      style={{ 
        padding: '2.5rem 2rem', 
        marginBottom: '2rem',
        background: hasDues 
          ? 'linear-gradient(145deg, #FFFFFF 0%, #FFF5F4 100%)' 
          : 'linear-gradient(145deg, #FFFFFF 0%, #F5F9F4 100%)',
        border: `1px solid ${hasDues ? 'var(--status-coral-bg)' : 'var(--status-sage-bg)'}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative background shape */}
      <div 
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: hasDues ? 'var(--status-coral)' : 'var(--status-sage)',
          opacity: 0.05,
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: hasDues ? 'var(--status-coral-bg)' : 'var(--status-sage-bg)',
          color: hasDues ? '#B95E54' : '#557A3C', // Slightly darker accessible tones
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1rem'
        }}>
          {hasDues ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{hasDues ? 'Payment Due' : 'All Cleared'}</span>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <AnimatedNumber 
            value={totalOutstanding} 
            prefix="₹" 
            style={{ 
              fontSize: '4rem', 
              fontWeight: 800, 
              lineHeight: 1,
              letterSpacing: '-0.04em',
              fontFamily: 'Outfit, sans-serif'
            }} 
          />
        </div>
        
        <div style={{ 
          color: 'var(--customer-muted)', 
          fontSize: '0.9rem', 
          fontWeight: 500,
          marginBottom: hasDues ? '1.5rem' : '1rem'
        }}>
          Total Outstanding Balance
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: 'var(--customer-muted)',
          background: 'rgba(0,0,0,0.03)',
          padding: '0.3rem 0.75rem',
          borderRadius: '9999px',
          marginBottom: hasDues ? '1.5rem' : '0'
        }}>
          Lifetime Paid: ₹{totalPaid}
        </div>

        {hasDues && (
          <button 
            className="customer-btn customer-btn-primary" 
            onClick={onOpenUpiModal}
            style={{ 
              width: '100%', 
              maxWidth: '300px',
              padding: '1rem',
              fontSize: '1.05rem',
              boxShadow: '0 8px 24px rgba(123, 174, 92, 0.25)'
            }}
          >
            <QrCode size={20} />
            <span>Pay Now via UPI</span>
          </button>
        )}
      </div>
    </div>
  );
};
