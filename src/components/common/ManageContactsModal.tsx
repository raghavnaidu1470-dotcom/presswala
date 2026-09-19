import React, { useState, useEffect } from 'react';
import { X, Phone, Plus, Trash2, Check, Star, AlertCircle, Shield } from 'lucide-react';
import { CustomerContact } from '../../types';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface ManageContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  residentName: string;
  flatNumber: string;
  onUpdated?: () => void;
}

const PRESET_LABELS = ['Alternate', 'Spouse', 'Family', 'Home', 'Work', 'Other'];

export const ManageContactsModal: React.FC<ManageContactsModalProps> = ({
  isOpen,
  onClose,
  customerId,
  residentName,
  flatNumber,
  onUpdated
}) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New contact form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newLabel, setNewLabel] = useState('Alternate');
  const [customLabel, setCustomLabel] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      loadContacts();
    }
  }, [isOpen, customerId]);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await db.getCustomerContacts(customerId);
      setContacts(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load contact numbers.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanPhone = newPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const effectiveLabel = newLabel === 'Other' ? (customLabel.trim() || 'Other') : newLabel;
    if (!effectiveLabel) {
      setError('Please provide a label for this contact.');
      return;
    }

    const caller = currentUser ? { id: currentUser.id, role: currentUser.role, apartment_id: currentUser.apartment_id } : undefined;

    setSaving(true);
    try {
      await db.addCustomerContact(customerId, cleanPhone, effectiveLabel, isPrimary, caller);
      setSuccess('Contact number added successfully.');
      setNewPhone('');
      setCustomLabel('');
      setIsPrimary(false);
      setShowAddForm(false);
      await loadContacts();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to add contact number.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    setError(null);
    setSuccess(null);
    const caller = currentUser ? { id: currentUser.id, role: currentUser.role, apartment_id: currentUser.apartment_id } : undefined;
    try {
      await db.updateCustomerContact(contactId, { is_primary: true }, caller);
      setSuccess('Primary contact number updated.');
      await loadContacts();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to update primary contact.');
    }
  };

  const handleDeleteContact = async (contactId: string, label: string) => {
    if (contacts.length <= 1) {
      setError('Cannot delete contact: A resident must have at least 1 contact number on file.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove the ${label} contact number?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    const caller = currentUser ? { id: currentUser.id, role: currentUser.role, apartment_id: currentUser.apartment_id } : undefined;
    try {
      await db.deleteCustomerContact(contactId, caller);
      setSuccess('Contact number removed.');
      await loadContacts();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete contact number.');
    }
  };

  const isAtLimit = contacts.length >= 5;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg leading-tight">Manage Contact Numbers</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isAtLimit ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {contacts.length} / 5 Numbers
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {residentName} • Flat {flatNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Contact List */}
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Loading contact numbers...
            </div>
          ) : (
            <div className="space-y-2.5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          +91 {contact.phone}
                        </span>
                        {contact.is_primary ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            <span>Primary</span>
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                            {contact.label}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {contact.is_primary ? `${contact.label} • Primary account contact` : `Label: ${contact.label}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {!contact.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(contact.id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                        title="Set as primary number"
                      >
                        Make Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.label)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove contact number"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Contact Trigger / Form */}
          {isAtLimit ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Maximum limit of 5 contact numbers reached. Remove an existing number to register a new one.
              </span>
            </div>
          ) : !showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 px-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Contact Number ({5 - contacts.length} remaining)</span>
            </button>
          ) : (
            <form onSubmit={handleAddContact} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Add New Contact Number</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mobile Number (10 digits)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                  <select
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {PRESET_LABELS.map((lbl) => (
                      <option key={lbl} value={lbl}>{lbl}</option>
                    ))}
                  </select>
                </div>

                {newLabel === 'Other' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Custom Label</label>
                    <input
                      type="text"
                      maxLength={30}
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g. Caretaker"
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Set as primary contact number</span>
              </label>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newPhone}
                  className="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Contacts are scoped to this apartment community.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
