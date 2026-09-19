import React, { useState, useEffect } from 'react';
import { ResidentJoinRequest } from '../../types';
import { db } from '../../services/db';
import { Modal } from '../common/Modal';
import { 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  Clock, 
  Phone, 
  AlertCircle,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface PendingRequestsViewProps {
  vendorApartmentId?: string;
  onRequestProcessed?: () => void;
}

export const PendingRequestsView: React.FC<PendingRequestsViewProps> = ({ 
  vendorApartmentId, 
  onRequestProcessed 
}) => {
  const [requests, setRequests] = useState<ResidentJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reject confirmation modal
  const [rejectModalReq, setRejectModalReq] = useState<ResidentJoinRequest | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await db.getPendingJoinRequests(vendorApartmentId);
      setRequests(data);
    } catch (err) {
      console.warn('Failed to load pending requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [vendorApartmentId]);

  const handleApprove = async (req: ResidentJoinRequest) => {
    setActionLoadingId(req.id);
    setActionMessage(null);
    try {
      await db.approveResidentJoinRequest(req.id);
      setActionMessage({
        type: 'success',
        text: `Approved access for ${req.name} (Flat ${req.flat_number}). Their account is now active!`
      });
      await loadRequests();
      onRequestProcessed?.();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to approve request'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    const req = rejectModalReq;
    setActionLoadingId(req.id);
    setActionMessage(null);
    try {
      await db.rejectResidentJoinRequest(req.id);
      setActionMessage({
        type: 'success',
        text: `Rejected access request for ${req.name} (Flat ${req.flat_number}).`
      });
      setRejectModalReq(null);
      await loadRequests();
      onRequestProcessed?.();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to reject request'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--vendor-text)', margin: '0 0 0.25rem 0', fontFamily: 'Outfit, sans-serif' }}>
            Resident Join Requests
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--vendor-muted)', margin: 0 }}>
            Verify residents requesting access to your apartment community before enabling their portal.
          </p>
        </div>

        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: requests.length > 0 ? '#FEF3C7' : '#F6F5F2', 
          color: requests.length > 0 ? '#B45309' : 'var(--vendor-muted)', 
          padding: '0.4rem 1rem', 
          borderRadius: '9999px', 
          fontWeight: 700, 
          fontSize: '0.85rem' 
        }}>
          <Clock size={16} />
          <span>{requests.length} Pending {requests.length === 1 ? 'Request' : 'Requests'}</span>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div style={{
          background: actionMessage.type === 'success' ? '#F0FDF4' : '#FEE2E2',
          border: `1px solid ${actionMessage.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: actionMessage.type === 'success' ? '#166534' : '#DC2626',
          borderRadius: '16px',
          padding: '1rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1.5rem'
        }}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--vendor-muted)' }}>
          Loading join requests...
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          background: '#FFFFFF',
          border: '1px dashed var(--vendor-border)',
          borderRadius: '24px',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          maxWidth: '550px',
          margin: '2rem auto'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#F0FDF4',
            color: '#16A34A',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--vendor-text)', marginBottom: '0.5rem' }}>
            No Pending Requests
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--vendor-muted)', lineHeight: 1.5, margin: 0 }}>
            All resident access requests for your apartment have been reviewed. New requests from residents registering at the door will appear here for verification.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {requests.map(req => {
            const isProcessing = actionLoadingId === req.id;
            const dateFormatted = new Date(req.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={req.id}
                className="vendor-card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}
              >
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span style={{
                        background: '#EBE8E0',
                        color: 'var(--vendor-text)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700
                      }}>
                        Flat {req.flat_number}
                      </span>
                      {req.block && (
                        <span style={{
                          background: '#F6F5F2',
                          color: 'var(--vendor-muted)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {req.block}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
                      {req.name}
                    </div>
                  </div>

                  <span style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    Pending
                  </span>
                </div>

                {/* Details */}
                <div style={{ background: '#F6F5F2', padding: '0.9rem 1rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--vendor-text)' }}>
                    <Phone size={15} color="var(--vendor-muted)" />
                    <a href={`tel:${req.phone}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                      +91 {req.phone}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--vendor-muted)', fontSize: '0.8rem' }}>
                    <Calendar size={15} />
                    <span>Requested: {dateFormatted}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setRejectModalReq(req)}
                    disabled={isProcessing}
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      color: '#DC2626',
                      borderColor: '#FCA5A5',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    <UserX size={16} />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(req)}
                    disabled={isProcessing}
                    style={{
                      background: 'var(--vendor-accent, #7BAE5C)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(123, 174, 92, 0.25)'
                    }}
                  >
                    <UserCheck size={16} />
                    <span>{isProcessing ? 'Approving...' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModalReq && (
        <Modal
          isOpen={true}
          onClose={() => setRejectModalReq(null)}
          title={`Decline Join Request`}
        >
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--vendor-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to decline the join request from <strong>{rejectModalReq.name}</strong> for <strong>Flat {rejectModalReq.flat_number}</strong>?
              They will not be able to log in unless they submit a new request.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRejectModalReq(null)}
                disabled={actionLoadingId === rejectModalReq.id}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalReq.id}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                {actionLoadingId === rejectModalReq.id ? 'Declining...' : 'Decline Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
