import React, { useState, useEffect } from 'react';
import { X, Edit3, Plus, Minus, AlertCircle, ArrowRight } from 'lucide-react';
import { Order, GarmentType } from '../../types';
import { db } from '../../services/db';

interface ProposeChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  callerRole: 'customer' | 'vendor';
  onSubmitProposal: (
    proposedItems: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[],
    reason: string
  ) => Promise<void>;
}

interface EditableItem {
  garmentTypeId: string;
  garmentName: string;
  unitPrice: number;
  quantity: number;
}

export const ProposeChangeModal: React.FC<ProposeChangeModalProps> = ({
  isOpen,
  onClose,
  order,
  callerRole,
  onSubmitProposal
}) => {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [allGarments, setAllGarments] = useState<GarmentType[]>([]);
  const [selectedNewGarmentId, setSelectedNewGarmentId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Initialize items from current order
    const initialItems: EditableItem[] = (order.items || []).map(i => ({
      garmentTypeId: i.garment_type_id,
      garmentName: i.garment_name,
      unitPrice: i.unit_price,
      quantity: i.quantity
    }));
    setItems(initialItems);
    setReason('');
    setError(null);
    setSelectedNewGarmentId('');

    // Load all garments
    db.getGarmentTypes().then(gTypes => setAllGarments(gTypes));
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleUpdateQty = (garmentTypeId: string, delta: number) => {
    setItems(prev => {
      return prev.map(item => {
        if (item.garmentTypeId === garmentTypeId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleAddNewGarment = () => {
    if (!selectedNewGarmentId) return;
    const gType = allGarments.find(g => g.id === selectedNewGarmentId);
    if (!gType) return;

    setItems(prev => {
      const existing = prev.find(i => i.garmentTypeId === gType.id);
      if (existing) {
        return prev.map(i => i.garmentTypeId === gType.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        garmentTypeId: gType.id,
        garmentName: gType.name,
        unitPrice: gType.price,
        quantity: 1
      }];
    });
    setSelectedNewGarmentId('');
  };

  const currentProposedTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDifference = currentProposedTotal - order.total_amount;

  // Check if anything actually changed
  const hasChanges = () => {
    if (items.length !== (order.items || []).length) return true;
    for (const item of items) {
      const orig = (order.items || []).find(o => o.garment_type_id === item.garmentTypeId);
      if (!orig || orig.quantity !== item.quantity) return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('An order must have at least one garment item.');
      return;
    }
    if (!hasChanges()) {
      setError('Please adjust at least one item quantity to propose changes.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitProposal(items, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Garments not yet in the list
  const availableToAdd = allGarments.filter(g => !items.some(i => i.garmentTypeId === g.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Edit3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Propose Order Change</h3>
              <p className="text-slate-300 text-xs mt-0.5">
                {order.order_number} • Flat {order.flat_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">
            Adjust garment quantities below. The other party ({callerRole === 'vendor' ? 'Resident' : 'Vendor'}) will be prompted to review and accept or decline your proposal.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Garments List */}
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => (
              <div 
                key={item.garmentTypeId}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-800">{item.garmentName}</div>
                  <div className="text-xs text-slate-500">
                    ₹{item.unitPrice} each • Subtotal: <strong className="text-slate-700">₹{item.unitPrice * item.quantity}</strong>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.garmentTypeId, -1)}
                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.garmentTypeId, 1)}
                    className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Garment Type Dropdown */}
          {availableToAdd.length > 0 && (
            <div className="flex gap-2 mb-5">
              <select
                value={selectedNewGarmentId}
                onChange={(e) => setSelectedNewGarmentId(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="">+ Add another garment type...</option>
                {availableToAdd.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} (₹{g.price})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedNewGarmentId}
                onClick={handleAddNewGarment}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Add
              </button>
            </div>
          )}

          {/* Reason Input */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Added 2 extra shirts found in clothes bundle"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-slate-400"
            />
          </div>

          {/* Bill Comparison Box */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl mb-6">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Original Total:</span>
              <span className="font-semibold">₹{order.total_amount}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span>Proposed Total:</span>
              <span className="font-bold text-sm text-slate-900">₹{currentProposedTotal}</span>
            </div>
            <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-900">Impact on Total:</span>
              <span className={totalDifference > 0 ? 'text-emerald-700 font-bold' : totalDifference < 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}>
                {totalDifference > 0 ? `+ ₹${totalDifference}` : totalDifference < 0 ? `- ₹${Math.abs(totalDifference)}` : 'No change in total'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !hasChanges() || items.length === 0}
              onClick={handleSubmit}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Send Change Proposal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
