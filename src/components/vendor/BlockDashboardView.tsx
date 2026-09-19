import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Phone, 
  MessageSquare, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Layers,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { BlockGroup, BlockResidentSummary, CustomerContact, OrderStatus } from '../../types';
import { db } from '../../services/db';
import { ContactPickerModal } from '../common/ContactPickerModal';
import { ManageContactsModal } from '../common/ManageContactsModal';

interface BlockDashboardViewProps {
  apartmentId?: string;
  apartmentName?: string;
  onSelectOrder?: (orderId: string) => void;
  onNavigateToOrders?: () => void;
}

export const BlockDashboardView: React.FC<BlockDashboardViewProps> = ({
  apartmentId,
  apartmentName = 'Apartment Community',
  onSelectOrder,
  onNavigateToOrders
}) => {
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_orders' | 'has_dues'>('all');

  // Contact Picker Modal State (for WhatsApp)
  const [pickerModal, setPickerModal] = useState<{
    isOpen: boolean;
    residentName: string;
    flatNumber: string;
    contacts: CustomerContact[];
    message?: string;
  }>({
    isOpen: false,
    residentName: '',
    flatNumber: '',
    contacts: []
  });

  // Manage Contacts Modal State
  const [manageModal, setManageModal] = useState<{
    isOpen: boolean;
    customerId: string;
    residentName: string;
    flatNumber: string;
  }>({
    isOpen: false,
    customerId: '',
    residentName: '',
    flatNumber: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await db.getBlockDashboardData(apartmentId);
      setBlockGroups(data);
    } catch (err) {
      console.error('[PressWala] Error loading block dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apartmentId]);

  // Overall aggregate metrics
  const totalFlats = useMemo(() => {
    return blockGroups.reduce((acc, b) => acc + b.totalResidents, 0);
  }, [blockGroups]);

  const totalActiveOrders = useMemo(() => {
    return blockGroups.reduce((acc, b) => acc + b.activeOrdersCount, 0);
  }, [blockGroups]);

  const totalOutstandingDues = useMemo(() => {
    return blockGroups.reduce((acc, b) => acc + b.totalDues, 0);
  }, [blockGroups]);

  // Available block names
  const availableBlocks = useMemo(() => {
    return blockGroups.map(b => b.blockName);
  }, [blockGroups]);

  // Filtered block groups
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return blockGroups
      .filter(group => {
        if (selectedBlock !== 'all' && group.blockName !== selectedBlock) {
          return false;
        }
        return true;
      })
      .map(group => {
        const filteredResidents = group.residents.filter(r => {
          // Search query check
          if (query) {
            const matchName = r.customer_name?.toLowerCase().includes(query);
            const matchFlat = r.flat_number?.toLowerCase().includes(query);
            const matchPhone = r.customer_phone?.includes(query);
            const matchContacts = r.contacts?.some(c => c.phone.includes(query) || c.label.toLowerCase().includes(query));
            if (!matchName && !matchFlat && !matchPhone && !matchContacts) {
              return false;
            }
          }

          // Status filter check
          if (statusFilter === 'active_orders') {
            return !!r.active_order;
          }
          if (statusFilter === 'has_dues') {
            return r.outstanding_balance > 0;
          }

          return true;
        });

        return {
          ...group,
          residents: filteredResidents,
          totalResidents: filteredResidents.length,
          activeOrdersCount: filteredResidents.filter(r => !!r.active_order).length,
          totalDues: filteredResidents.reduce((acc, r) => acc + r.outstanding_balance, 0)
        };
      })
      .filter(group => group.residents.length > 0);
  }, [blockGroups, searchQuery, selectedBlock, statusFilter]);

  // Smart WhatsApp button handler
  const handleSmartWhatsApp = (resident: BlockResidentSummary) => {
    const contacts = resident.contacts || [
      {
        id: `fallback-${resident.customer_id}`,
        customer_id: resident.customer_id,
        phone: resident.customer_phone,
        label: 'Primary',
        is_primary: true
      }
    ];

    const message = resident.active_order 
      ? `Hi ${resident.customer_name} (Flat ${resident.flat_number}), update regarding your order ${resident.active_order.order_number}: status is currently "${resident.active_order.status}".`
      : resident.outstanding_balance > 0
        ? `Hi ${resident.customer_name} (Flat ${resident.flat_number}), gentle reminder regarding your outstanding laundry balance of ₹${resident.outstanding_balance}.`
        : `Hi ${resident.customer_name} (Flat ${resident.flat_number}), reaching out from PressWala laundry service.`;

    if (contacts.length <= 1) {
      const phone = contacts[0]?.phone || resident.customer_phone;
      const cleanPhone = phone.replace(/\D/g, '');
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/91${cleanPhone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    } else {
      setPickerModal({
        isOpen: true,
        residentName: resident.customer_name,
        flatNumber: resident.flat_number,
        contacts,
        message
      });
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'created':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Created
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Package className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ready for Delivery
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Flats Monitored</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalFlats}</p>
            <p className="text-xs text-slate-400 mt-0.5">{availableBlocks.length} Blocks active</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Orders</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalActiveOrders}</p>
            <p className="text-xs text-slate-400 mt-0.5">In Progress or Ready</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Dues</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">₹{totalOutstandingDues}</p>
            <p className="text-xs text-slate-400 mt-0.5">Across all registered flats</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Community View
            </span>
            <p className="text-base font-bold text-white mt-1 truncate">{apartmentName}</p>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Block-grouped ledger with instant WhatsApp dispatch.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by resident name, flat number (e.g. A-101), or phone..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Status Quick Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Residents
            </button>
            <button
              onClick={() => setStatusFilter('active_orders')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center space-x-1 ${
                statusFilter === 'active_orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>With Active Orders</span>
            </button>
            <button
              onClick={() => setStatusFilter('has_dues')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center space-x-1 ${
                statusFilter === 'has_dues'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Has Dues</span>
            </button>
          </div>
        </div>

        {/* Block Selector Pills */}
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center mr-1">
            <Layers className="w-3.5 h-3.5 mr-1" />
            Block:
          </span>
          <button
            onClick={() => setSelectedBlock('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedBlock === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Blocks ({availableBlocks.length})
          </button>
          {availableBlocks.map((blk) => (
            <button
              key={blk}
              onClick={() => setSelectedBlock(blk)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedBlock === blk
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Block {blk}
            </button>
          ))}
        </div>
      </div>

      {/* Block Sections */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading block roster and active orders...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base">No residents match your filter</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or clearing the block and status filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBlock('all');
              setStatusFilter('all');
            }}
            className="mt-4 px-4 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div
              key={group.blockName}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Block Header Banner */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {group.blockName}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Block {group.blockName}</h3>
                    <p className="text-xs text-slate-500">
                      {group.totalResidents} {group.totalResidents === 1 ? 'flat' : 'flats'} registered
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 font-medium">
                    <Package className="w-3.5 h-3.5" />
                    <span>{group.activeOrdersCount} active orders</span>
                  </div>

                  <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium ${
                    group.totalDues > 0 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span>Dues: ₹{group.totalDues}</span>
                  </div>
                </div>
              </div>

              {/* Residents Roster */}
              <div className="divide-y divide-slate-100">
                {group.residents.map((resident) => {
                  const contactCount = resident.contacts?.length || 1;

                  return (
                    <div
                      key={resident.customer_id}
                      className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Resident & Flat Identity */}
                      <div className="flex items-start space-x-3 min-w-[220px]">
                        <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs shadow-sm flex-shrink-0">
                          {resident.flat_number}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              {resident.customer_name}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-slate-500 font-mono">
                              +91 {resident.customer_phone}
                            </span>
                            {contactCount > 1 && (
                              <button
                                onClick={() => setManageModal({
                                  isOpen: true,
                                  customerId: resident.customer_id,
                                  residentName: resident.customer_name,
                                  flatNumber: resident.flat_number
                                })}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                title="Click to view all registered contact numbers"
                              >
                                +{contactCount - 1} more
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Active Order At-A-Glance */}
                      <div className="flex-1 md:px-4">
                        {resident.active_order ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between max-w-md">
                            <div className="flex items-center space-x-2.5">
                              {getStatusBadge(resident.active_order.status)}
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-semibold text-xs text-slate-800">
                                    {resident.active_order.order_number}
                                  </span>
                                  <span className="text-[11px] text-slate-400">•</span>
                                  <span className="text-xs text-slate-600">
                                    {resident.active_order.garment_count} pcs
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Order Total: ₹{resident.active_order.total_amount}
                                </span>
                              </div>
                            </div>

                            {(onSelectOrder || onNavigateToOrders) && (
                              <button
                                onClick={() => {
                                  if (onSelectOrder) {
                                    onSelectOrder(resident.active_order!.id);
                                  } else if (onNavigateToOrders) {
                                    onNavigateToOrders();
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                                title="View order details"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No active orders currently
                          </span>
                        )}
                      </div>

                      {/* Right: Outstanding Dues & Actions */}
                      <div className="flex items-center justify-between md:justify-end space-x-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-right pr-2">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Balance</p>
                          <p className={`text-sm font-bold ${
                            resident.outstanding_balance > 0 ? 'text-rose-600' : 'text-slate-700'
                          }`}>
                            ₹{resident.outstanding_balance}
                          </p>
                        </div>

                        {/* Manage Numbers Action */}
                        <button
                          onClick={() => setManageModal({
                            isOpen: true,
                            customerId: resident.customer_id,
                            residentName: resident.customer_name,
                            flatNumber: resident.flat_number
                          })}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors shadow-sm"
                          title="Manage contact numbers (up to 5)"
                        >
                          <Phone className="w-4 h-4" />
                        </button>

                        {/* Smart WhatsApp Action */}
                        <button
                          onClick={() => handleSmartWhatsApp(resident)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                          title={contactCount > 1 ? `Select from ${contactCount} numbers` : 'Chat on WhatsApp'}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Contact Picker Modal */}
      <ContactPickerModal
        isOpen={pickerModal.isOpen}
        onClose={() => setPickerModal(prev => ({ ...prev, isOpen: false }))}
        residentName={pickerModal.residentName}
        flatNumber={pickerModal.flatNumber}
        contacts={pickerModal.contacts}
        defaultMessage={pickerModal.message}
      />

      {/* Manage Contacts Modal */}
      <ManageContactsModal
        isOpen={manageModal.isOpen}
        onClose={() => setManageModal(prev => ({ ...prev, isOpen: false }))}
        customerId={manageModal.customerId}
        residentName={manageModal.residentName}
        flatNumber={manageModal.flatNumber}
        onUpdated={loadData}
      />
    </div>
  );
};
