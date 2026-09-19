import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../../services/db';
import { DeliverySlotAvailability } from '../../types';

interface DeliverySlotPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartmentId: string;
  currentDate?: string | null;
  currentWindow?: string | null;
  onSelectSlot: (date: string, window: string) => Promise<void> | void;
}

export const DeliverySlotPickerModal: React.FC<DeliverySlotPickerModalProps> = ({
  isOpen,
  onClose,
  apartmentId,
  currentDate,
  currentWindow,
  onSelectSlot
}) => {
  const [slots, setSlots] = useState<DeliverySlotAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedWindow, setSelectedWindow] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadSlots() {
      setIsLoading(true);
      setError(null);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const data = await db.getAvailableDeliverySlots(apartmentId, todayStr, 5);
        if (!mounted) return;
        setSlots(data);

        // Pre-select current date/window or first available date
        if (currentDate && currentWindow) {
          setSelectedDate(currentDate);
          setSelectedWindow(currentWindow);
        } else if (data.length > 0) {
          const uniqueDates = Array.from(new Set(data.map(s => s.date)));
          setSelectedDate(uniqueDates[0]);
          const firstAvail = data.find(s => s.date === uniqueDates[0] && s.isAvailable);
          if (firstAvail) setSelectedWindow(firstAvail.window);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load delivery slots');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSlots();
    return () => { mounted = false; };
  }, [isOpen, apartmentId, currentDate, currentWindow]);

  if (!isOpen) return null;

  const dates = Array.from(new Set(slots.map(s => s.date)));
  const slotsForSelectedDate = slots.filter(s => s.date === selectedDate);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedWindow) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSelectSlot(selectedDate, selectedWindow);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reserve delivery slot');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    if (diffDays === 0) return `Today (${monthDay})`;
    if (diffDays === 1) return `Tomorrow (${monthDay})`;
    return `${dayName}, ${monthDay}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Book Delivery Slot</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                Max 3 deliveries per time window for your community
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-800 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading available delivery windows...
            </div>
          ) : (
            <>
              {/* Date selection pill tabs */}
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Select Delivery Date
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-thin">
                {dates.map((dateStr) => {
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        // If current window is full on new date, pick first available
                        const matching = slots.find(s => s.date === dateStr && s.window === selectedWindow);
                        if (!matching || !matching.isAvailable) {
                          const firstAvail = slots.find(s => s.date === dateStr && s.isAvailable);
                          setSelectedWindow(firstAvail ? firstAvail.window : '');
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {formatDateLabel(dateStr)}
                    </button>
                  );
                })}
              </div>

              {/* Time Windows */}
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Select 2-Hour Delivery Window
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {slotsForSelectedDate.map((slot) => {
                  const isSelected = selectedWindow === slot.window;
                  const isFull = !slot.isAvailable || slot.bookedCount >= slot.capacity;
                  const spotsLeft = Math.max(0, slot.capacity - slot.bookedCount);

                  return (
                    <button
                      key={slot.window}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedWindow(slot.window)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
                          : isFull
                          ? 'border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed opacity-75'
                          : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`text-sm font-bold flex items-center gap-1.5 ${
                          isFull ? 'text-slate-400' : isSelected ? 'text-emerald-900' : 'text-slate-800'
                        }`}>
                          <Clock className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {slot.window}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${
                          isFull 
                            ? 'text-rose-600' 
                            : spotsLeft <= 1 
                            ? 'text-amber-600' 
                            : 'text-emerald-600'
                        }`}>
                          {isFull ? 'Slot Full' : `${spotsLeft} of ${slot.capacity} left`}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {slot.bookedCount}/{slot.capacity} booked
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || isSaving || !selectedDate || !selectedWindow}
              onClick={handleConfirm}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {isSaving ? 'Reserving...' : 'Confirm Delivery Slot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
