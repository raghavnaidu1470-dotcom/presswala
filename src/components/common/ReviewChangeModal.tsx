import React, { useState } from 'react';
import { X, Check, XCircle, AlertCircle, Layers, FileText } from 'lucide-react';
import { Order, OrderChangeProposal } from '../../types';

interface ReviewChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  proposal: OrderChangeProposal;
  callerRole: 'customer' | 'vendor';
  onRespond: (decision: 'accept' | 'decline') => Promise<void>;
}

export const ReviewChangeModal: React.FC<ReviewChangeModalProps> = ({
  isOpen,
  onClose,
  order,
  proposal,
  onRespond
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const originalItems = order.items || [];
  const proposedItems = proposal.proposed_items || [];

  // Build a union of all garment IDs to show exact line-by-line diff
  const allGarmentIds = Array.from(new Set([
    ...originalItems.map(i => i.garment_type_id),
    ...proposedItems.map(i => i.garment_type_id)
  ]));

  const diffItems = allGarmentIds.map(gId => {
    const orig = originalItems.find(i => i.garment_type_id === gId);
    const prop = proposedItems.find(i => i.garment_type_id === gId);

    const name = prop?.garment_name || orig?.garment_name || 'Garment';
    const unitPrice = prop?.unit_price ?? orig?.unit_price ?? 0;
    const origQty = orig?.quantity || 0;
    const propQty = prop?.quantity || 0;
    const diffQty = propQty - origQty;

    return {
      garmentTypeId: gId,
      name,
      unitPrice,
      origQty,
      propQty,
      diffQty,
      origSubtotal: origQty * unitPrice,
      propSubtotal: propQty * unitPrice
    };
  });

  const totalDiff = proposal.proposed_total_amount - order.total_amount;

  const handleAction = async (decision: 'accept' | 'decline') => {
    setIsProcessing(true);
    setError(null);
    try {
      await onRespond(decision);
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${decision} proposal`);
    } finally {
      setIsProcessing(false);
    }
  };

  const proposedByLabel = proposal.proposed_by === 'vendor' ? 'Vendor (Ramu Dhobi)' : 'Resident';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Review Order Changes</h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                {order.order_number} • Proposed by {proposedByLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-indigo-800 text-indigo-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Proposal metadata */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Proposed:</span>
              <span className="font-medium text-slate-800">
                {new Date(proposal.created_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            {proposal.reason && (
              <div className="pt-2 border-t border-slate-200 flex items-start gap-1.5 text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">Note:</strong> {proposal.reason}</span>
              </div>
            )}
          </div>

          {/* Items Diff Table */}
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Garment Comparison (Original vs Proposed)
          </label>
          <div className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1">
            {diffItems.map((item) => (
              <div 
                key={item.garmentTypeId}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  item.diffQty !== 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-slate-500 text-[11px]">₹{item.unitPrice} per item</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-slate-500 font-medium">
                      {item.origQty} &rarr; <span className="font-bold text-slate-900">{item.propQty}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ₹{item.propSubtotal}
                    </div>
                  </div>

                  {item.diffQty !== 0 ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.diffQty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.diffQty > 0 ? `+${item.diffQty}` : item.diffQty}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                      Same
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total comparison */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl mb-6">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Current Order Total:</span>
              <span className="font-semibold line-through text-slate-500">₹{order.total_amount}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-800 mb-2">
              <span className="font-bold">New Proposed Total:</span>
              <span className="font-extrabold text-indigo-900 text-base">₹{proposal.proposed_total_amount}</span>
            </div>
            <div className="pt-2 border-t border-indigo-200 flex items-center justify-between text-xs">
              <span className="text-indigo-800 font-medium">Price Difference:</span>
              <span className={`font-bold ${totalDiff > 0 ? 'text-emerald-700' : totalDiff < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                {totalDiff > 0 ? `+ ₹${totalDiff}` : totalDiff < 0 ? `- ₹${Math.abs(totalDiff)}` : '₹0 (No Price Change)'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction('decline')}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Decline Changes</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction('accept')}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Update Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
