import React from 'react';
import { X, MessageSquare, Phone, CheckCircle2 } from 'lucide-react';
import { CustomerContact } from '../../types';

interface ContactPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentName: string;
  flatNumber: string;
  contacts: CustomerContact[];
  defaultMessage?: string;
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
  isOpen,
  onClose,
  residentName,
  flatNumber,
  contacts,
  defaultMessage = ''
}) => {
  if (!isOpen) return null;

  const handleOpenWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(
      defaultMessage || `Hi ${residentName} (Flat ${flatNumber}), reaching out regarding your PressWala laundry order.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${encodedMsg}`, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/40 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Select Contact Number</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {residentName} • Flat {flatNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700/50 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            This resident has registered {contacts.length} contact numbers. Select which number to message on WhatsApp:
          </p>

          <div className="space-y-2.5">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleOpenWhatsApp(contact.phone)}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900">+91 {contact.phone}</span>
                      {contact.is_primary && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {contact.label || 'Contact'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center text-xs font-medium text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Chat</span>
                  <CheckCircle2 className="w-4 h-4 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
