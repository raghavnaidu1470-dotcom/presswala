import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { User, VendorDrilldownCustomer, VendorStatus, VendorInvite } from '../../types';
import { Modal } from '../common/Modal';
import { AnimatedNumber } from '../common/AnimatedNumber';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Users,
  Store,
  Clock,
  LogOut,
  UserPlus,
  Link2,
  Copy,
  Check
} from 'lucide-react';

export const OwnerPortal: React.FC = () => {
  const { logout } = useAuth();
  const [vendors, setVendors] = useState<User[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<User[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'active' | 'revoked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Drilldown Modal State
  const [selectedVendorForDrilldown, setSelectedVendorForDrilldown] = useState<User | null>(null);
  const [drilldownResidents, setDrilldownResidents] = useState<VendorDrilldownCustomer[]>([]);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);

  // Confirmation Modal for Revoking
  const [vendorToRevoke, setVendorToRevoke] = useState<User | null>(null);

  // Vendor Invite State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInvitesListOpen, setIsInvitesListOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteApt, setInviteApt] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<VendorInvite | null>(null);
  const [copiedInviteToken, setCopiedInviteToken] = useState<string | null>(null);
  const [invites, setInvites] = useState<VendorInvite[]>([]);

  const loadInvites = async () => {
    try {
      const list = await db.getVendorInvites();
      setInvites(list);
    } catch (err) {
      console.error('Failed to load invites:', err);
    }
  };

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const list = await db.getVendors();
      setVendors(list);
    } catch (err) {
      console.error('[OwnerPortal] Failed to load vendors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
    loadInvites();
  }, []);

  // Filter and search
  useEffect(() => {
    let result = [...vendors];

    if (activeFilter !== 'all') {
      result = result.filter(v => (v.status || 'active') === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        (v.apartment_name && v.apartment_name.toLowerCase().includes(q)) ||
        v.flat_number.toLowerCase().includes(q)
      );
    }

    setFilteredVendors(result);
  }, [vendors, activeFilter, searchQuery]);

  // Helper: Detect if another active vendor is assigned to the same apartment
  const getApartmentConflict = (aptName?: string, currentVendorId?: string): User | undefined => {
    if (!aptName) return undefined;
    const clean = aptName.trim().toLowerCase();
    return vendors.find(v => 
      v.id !== currentVendorId && 
      (v.status || 'active') === 'active' && 
      v.apartment_name && 
      v.apartment_name.trim().toLowerCase() === clean
    );
  };

  // Handle Approve / Reinstate
  const handleApprove = async (vendor: User) => {
    const conflict = getApartmentConflict(vendor.apartment_name, vendor.id);
    if (conflict) {
      const proceed = window.confirm(
        `⚠️ Apartment Conflict Alert:\n\nActive vendor "${conflict.name}" (${conflict.phone}) is already assigned to "${vendor.apartment_name}".\n\nApproving this vendor will establish multiple active vendors for the same apartment complex.\n\nDo you want to proceed and approve anyway?`
      );
      if (!proceed) return;
    }

    setActionInProgress(vendor.id);
    try {
      await db.updateVendorStatus(vendor.id, 'active');
      await loadVendors();
    } catch (err: any) {
      alert(`Failed to approve vendor: ${err.message || err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Create Invite
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !invitePhone.trim() || !inviteApt.trim()) {
      alert('Please fill in vendor name, mobile, and apartment complex');
      return;
    }

    setIsCreatingInvite(true);
    try {
      const newInv = await db.createVendorInvite(inviteName, invitePhone, inviteApt);
      setGeneratedInvite(newInv);
      setInviteName('');
      setInvitePhone('');
      setInviteApt('');
      await loadInvites();
    } catch (err: any) {
      alert(`Failed to create invite: ${err.message || err}`);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/vendor-onboard/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteToken(token);
    setTimeout(() => setCopiedInviteToken(null), 3000);
  };

  // Handle Revoke
  const handleConfirmRevoke = async () => {
    if (!vendorToRevoke) return;
    setActionInProgress(vendorToRevoke.id);
    try {
      await db.updateVendorStatus(vendorToRevoke.id, 'revoked');
      setVendorToRevoke(null);
      await loadVendors();
    } catch (err: any) {
      alert(`Failed to revoke vendor: ${err.message || err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Drilldown into residents
  const handleOpenDrilldown = async (vendor: User) => {
    setSelectedVendorForDrilldown(vendor);
    setIsLoadingDrilldown(true);
    try {
      const apt = vendor.apartment_name || 'Palm Heights Apartments';
      const residents = await db.getResidentsForVendorApartment(apt);
      setDrilldownResidents(residents);
    } catch (err) {
      console.error('[OwnerPortal] Failed to load apartment residents:', err);
    } finally {
      setIsLoadingDrilldown(false);
    }
  };

  const totalVendors = vendors.length;
  const activeCount = vendors.filter(v => (v.status || 'active') === 'active').length;
  const pendingCount = vendors.filter(v => v.status === 'pending').length;
  const revokedCount = vendors.filter(v => v.status === 'revoked').length;

  return (
    <div className="owner-portal-theme">
      <style>{`
        .owner-portal-theme {
          --owner-bg: #FAF9F6;
          --owner-surface: #FFFFFF;
          --owner-surface-elevated: #F6F5F2;
          --owner-text: #1A1A1A;
          --owner-muted: #5A5A5A;
          --owner-border: rgba(0, 0, 0, 0.08);
          --owner-accent: #7BAE5C;
          --owner-accent-hover: #69984C;
          --owner-indigo: #6366F1;
          
          padding: 1.5rem 1rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .kpi-card {
          background: var(--owner-surface);
          border-radius: 20px;
          padding: 1.25rem 1.5rem;
          border: 1px solid var(--owner-border);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }

        .kpi-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--owner-muted);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .kpi-value {
          font-family: 'Outfit', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: var(--owner-text);
          line-height: 1.1;
        }

        .kpi-subtitle {
          font-size: 0.8rem;
          color: var(--owner-muted);
          margin-top: 0.35rem;
        }

        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .filter-tabs {
          display: flex;
          background: var(--owner-surface-elevated);
          padding: 0.35rem;
          border-radius: 14px;
          gap: 0.3rem;
        }

        .filter-tab {
          border: none;
          background: transparent;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--owner-muted);
          cursor: pointer;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .filter-tab.active {
          background: var(--owner-surface);
          color: var(--owner-text);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .filter-count {
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .search-box {
          position: relative;
          min-width: 260px;
        }

        .search-box input {
          width: 100%;
          padding: 0.65rem 1rem 0.65rem 2.5rem;
          border-radius: 12px;
          border: 1px solid var(--owner-border);
          background: var(--owner-surface);
          font-size: 0.9rem;
          color: var(--owner-text);
          outline: none;
          transition: all 150ms ease;
        }

        .search-box input:focus {
          border-color: var(--owner-accent);
          box-shadow: 0 0 0 3px rgba(123, 174, 92, 0.15);
        }

        .search-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--owner-muted);
        }

        .vendor-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .vendor-card {
          background: var(--owner-surface);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid var(--owner-border);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        @media (min-width: 768px) {
          .vendor-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .vendor-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }

        .vendor-info {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .vendor-avatar {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .vendor-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--owner-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .vendor-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1rem;
          margin-top: 0.4rem;
          font-size: 0.85rem;
          color: var(--owner-muted);
        }

        .vendor-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .status-pill-active {
          background: rgba(123, 174, 92, 0.15);
          color: #486E32;
        }

        .status-pill-pending {
          background: rgba(212, 163, 115, 0.2);
          color: #8F6235;
        }

        .status-pill-revoked {
          background: rgba(217, 136, 128, 0.2);
          color: #A84E45;
        }

        .resident-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          font-size: 0.9rem;
        }

        .resident-table th {
          text-align: left;
          padding: 0.75rem;
          background: var(--owner-surface-elevated);
          color: var(--owner-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--owner-border);
        }

        .resident-table td {
          padding: 0.85rem 0.75rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .resident-table tr:hover td {
          background: rgba(0, 0, 0, 0.01);
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span 
              style={{ 
                background: '#EEF2FF', 
                color: '#4F46E5', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.3rem' 
              }}
            >
              <ShieldCheck size={13} />
              Platform Owner
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--owner-muted)' }}>Multi-Tenant Administration</span>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.9rem', fontWeight: 800, margin: 0 }}>
            Vendor Directory & Governance
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setGeneratedInvite(null);
              setIsInviteModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1.1rem',
              background: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
            title="Generate private onboarding invite link"
          >
            <UserPlus size={16} />
            <span>Invite Vendor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadInvites();
              setIsInvitesListOpen(true);
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
            title="View generated onboarding links"
          >
            <Link2 size={16} />
            <span>Vendor Invitations ({invites.length})</span>
          </button>

          <button
            type="button"
            onClick={loadVendors}
            disabled={isLoading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
            title="Refresh Vendors"
          >
            <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="btn btn-outline"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1rem',
              color: '#EF4444',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }}
            title="Sign out of Operations Console"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">
            <Store size={16} color="var(--owner-accent)" />
            Total Vendors
          </div>
          <div className="kpi-value">
            <AnimatedNumber value={totalVendors} />
          </div>
          <div className="kpi-subtitle">Registered on platform</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <CheckCircle2 size={16} color="#486E32" />
            Active Operators
          </div>
          <div className="kpi-value" style={{ color: '#486E32' }}>
            <AnimatedNumber value={activeCount} />
          </div>
          <div className="kpi-subtitle">Live in apartments</div>
        </div>

        <div className="kpi-card" style={pendingCount > 0 ? { border: '2px solid #D4A373' } : {}}>
          <div className="kpi-title">
            <Clock size={16} color="#8F6235" />
            Pending Approval
          </div>
          <div className="kpi-value" style={{ color: '#8F6235' }}>
            <AnimatedNumber value={pendingCount} />
          </div>
          <div className="kpi-subtitle">
            {pendingCount > 0 ? '⚠️ Awaiting your action' : 'All applications reviewed'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <XCircle size={16} color="#A84E45" />
            Revoked Access
          </div>
          <div className="kpi-value" style={{ color: '#A84E45' }}>
            <AnimatedNumber value={revokedCount} />
          </div>
          <div className="kpi-subtitle">Login suspended</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Vendors
            <span className="filter-count" style={{ background: '#E2E8F0', color: '#475569' }}>
              {totalVendors}
            </span>
          </button>
          <button
            type="button"
            className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pending')}
          >
            Pending
            <span className="filter-count" style={{ background: 'rgba(212, 163, 115, 0.25)', color: '#8F6235' }}>
              {pendingCount}
            </span>
          </button>
          <button
            type="button"
            className={`filter-tab ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => setActiveFilter('active')}
          >
            Active
            <span className="filter-count" style={{ background: 'rgba(123, 174, 92, 0.25)', color: '#486E32' }}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            className={`filter-tab ${activeFilter === 'revoked' ? 'active' : ''}`}
            onClick={() => setActiveFilter('revoked')}
          >
            Revoked
            <span className="filter-count" style={{ background: 'rgba(217, 136, 128, 0.25)', color: '#A84E45' }}>
              {revokedCount}
            </span>
          </button>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search vendor, phone, complex..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Vendors List */}
      {filteredVendors.length === 0 ? (
        <div 
          style={{ 
            background: 'var(--owner-surface)', 
            borderRadius: '20px', 
            padding: '3.5rem 2rem', 
            textAlign: 'center', 
            border: '1px dashed var(--owner-border)' 
          }}
        >
          <Store size={40} color="var(--owner-muted)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>No vendors match your filter</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--owner-muted)', margin: 0 }}>
            {searchQuery ? 'Try clearing your search term' : 'No vendors currently found in this status category.'}
          </p>
        </div>
      ) : (
        <div className="vendor-list">
          {filteredVendors.map((vendor) => {
            const status: VendorStatus = vendor.status || 'active';
            const isPending = status === 'pending';
            const isActive = status === 'active';
            const isRevoked = status === 'revoked';
            const isBusy = actionInProgress === vendor.id;

            return (
              <div key={vendor.id} className="vendor-card">
                <div className="vendor-info">
                  {/* Status-colored Avatar */}
                  <div 
                    className="vendor-avatar"
                    style={{
                      background: isActive 
                        ? 'rgba(123, 174, 92, 0.15)' 
                        : isPending 
                        ? 'rgba(212, 163, 115, 0.18)' 
                        : 'rgba(217, 136, 128, 0.18)',
                      color: isActive ? '#486E32' : isPending ? '#8F6235' : '#A84E45'
                    }}
                  >
                    <Store size={26} />
                  </div>

                  <div>
                    <div className="vendor-name">
                      <span>{vendor.name}</span>
                      <span className={`status-pill status-pill-${status}`}>
                        {isPending && <Clock size={12} />}
                        {isActive && <CheckCircle2 size={12} />}
                        {isRevoked && <XCircle size={12} />}
                        {isPending ? 'Pending Approval' : isActive ? 'Active' : 'Revoked'}
                      </span>
                    </div>

                    <div className="vendor-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--owner-text)' }}>
                        <Building2 size={14} color="var(--owner-accent)" />
                        {vendor.apartment_name || 'Palm Heights Apartments'}
                      </span>

                      <a 
                        href={`tel:${vendor.phone}`} 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', color: 'inherit' }}
                      >
                        <Phone size={13} />
                        {vendor.phone}
                      </a>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} />
                        Applied: {new Date(vendor.created_at).toLocaleDateString()}
                      </span>

                      {vendor.approved_at && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#486E32' }}>
                          <CheckCircle2 size={13} />
                          Approved: {new Date(vendor.approved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Surfaced Apartment Conflict Check */}
                    {(() => {
                      const conflict = getApartmentConflict(vendor.apartment_name, vendor.id);
                      if (!conflict) return null;
                      return (
                        <div 
                          style={{ 
                            marginTop: '0.5rem', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.4rem', 
                            padding: '0.3rem 0.65rem', 
                            borderRadius: '8px', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#DC2626', 
                            fontSize: '0.78rem', 
                            fontWeight: 600 
                          }}
                        >
                          <AlertTriangle size={13} />
                          <span>Apartment Conflict: Already served by active vendor {conflict.name} ({conflict.phone})</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Actions & Drill-down */}
                <div className="vendor-actions">
                  {/* Drill down into residents button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleOpenDrilldown(vendor)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    title="View Residents under this Apartment"
                  >
                    <Users size={14} />
                    <span>View Residents</span>
                  </button>

                  {/* Pending Actions */}
                  {isPending && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApprove(vendor)}
                        disabled={isBusy}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve Vendor</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setVendorToRevoke(vendor)}
                        disabled={isBusy}
                        style={{ color: '#DC2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {/* Active Actions */}
                  {isActive && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setVendorToRevoke(vendor)}
                      disabled={isBusy}
                      style={{ color: '#DC2626', borderColor: 'rgba(220, 38, 38, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      title="Block login immediately"
                    >
                      <ShieldAlert size={14} />
                      <span>Revoke Access</span>
                    </button>
                  )}

                  {/* Revoked Actions */}
                  {isRevoked && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleApprove(vendor)}
                      disabled={isBusy}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <RotateCw size={14} />
                      <span>Re-Approve</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drill-down Residents Modal */}
      {selectedVendorForDrilldown && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVendorForDrilldown(null)}
          title={`Residents: ${selectedVendorForDrilldown.apartment_name || 'Palm Heights'}`}
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{ background: 'var(--owner-surface-elevated)', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--owner-muted)' }}>Assigned Vendor Operator</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--owner-text)' }}>
                    {selectedVendorForDrilldown.name} ({selectedVendorForDrilldown.phone})
                  </div>
                </div>
                <span className={`status-pill status-pill-${selectedVendorForDrilldown.status || 'active'}`}>
                  {selectedVendorForDrilldown.status || 'active'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--owner-text)' }}>
                Registered Flats & Order History ({drilldownResidents.length})
              </div>
            </div>

            {isLoadingDrilldown ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--owner-muted)' }}>
                Loading flat details...
              </div>
            ) : drilldownResidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#FBFBFA', borderRadius: '16px' }}>
                <Users size={32} color="var(--owner-muted)" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--owner-muted)' }}>
                  No residents have placed orders or registered under this apartment yet.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="resident-table">
                  <thead>
                    <tr>
                      <th>Flat</th>
                      <th>Resident Name</th>
                      <th>Phone</th>
                      <th>Orders</th>
                      <th>Spent</th>
                      <th>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownResidents.map((res) => (
                      <tr key={res.flat_number}>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--owner-text)' }}>
                            {res.flat_number}
                          </span>
                        </td>
                        <td>{res.customer_name}</td>
                        <td>
                          <a 
                            href={`tel:${res.customer_phone}`} 
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {res.customer_phone}
                          </a>
                        </td>
                        <td>{res.total_orders}</td>
                        <td>₹{res.lifetime_spent}</td>
                        <td>
                          {res.outstanding_balance > 0 ? (
                            <span style={{ color: '#DC2626', fontWeight: 700 }}>
                              ₹{res.outstanding_balance} due
                            </span>
                          ) : (
                            <span style={{ color: '#16A34A', fontWeight: 600 }}>
                              All clear
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Revoking Access */}
      {vendorToRevoke && (
        <Modal
          isOpen={true}
          onClose={() => setVendorToRevoke(null)}
          title="Revoke Vendor Access"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div 
              style={{ 
                background: '#FEF2F2', 
                border: '1px solid #FCA5A5', 
                borderRadius: '16px', 
                padding: '1rem', 
                color: '#991B1B', 
                display: 'flex', 
                gap: '0.75rem', 
                marginBottom: '1.25rem' 
              }}
            >
              <AlertTriangle size={24} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  Are you sure you want to revoke access?
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Revoking will immediately terminate <strong>{vendorToRevoke.name}</strong>'s session and block future sign-ins.
                  Existing apartment order and payment history will be preserved.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setVendorToRevoke(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmRevoke}
                style={{ background: '#DC2626', color: '#FFFFFF' }}
              >
                Confirm & Revoke Access
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Create Single-Use Vendor Invitation */}
      {isInviteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsInviteModalOpen(false);
            setGeneratedInvite(null);
          }}
          title="Invite New Vendor (Private Onboarding)"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--owner-muted)', lineHeight: 1.5, marginTop: 0, marginBottom: '1.25rem' }}>
              Generate a secure, single-use onboarding link with a 7-day expiry. The prospective vendor can set their password and submit their account for final approval.
            </p>

            {generatedInvite ? (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16A34A', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={18} />
                  <span>Single-Use Invitation Generated!</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Send this private link to <strong>{generatedInvite.vendor_name}</strong> ({generatedInvite.vendor_phone}) for <strong>{generatedInvite.apartment_name}</strong>:
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/vendor-onboard/${generatedInvite.token}`}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      color: '#0F172A',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(generatedInvite.token)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1rem',
                      background: copiedInviteToken === generatedInvite.token ? '#16A34A' : '#4F46E5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copiedInviteToken === generatedInvite.token ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedInviteToken === generatedInvite.token ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={13} />
                  <span>Expires in 7 days ({new Date(generatedInvite.expires_at).toLocaleDateString()}). Single-use only.</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--owner-text)', marginBottom: '0.35rem' }}>
                    Prospective Vendor Name
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Ramesh Laundry Services"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--owner-border)' }}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--owner-text)', marginBottom: '0.35rem' }}>
                    Contact Mobile Number (10 Digits)
                  </label>
                  <input
                    type="tel"
                    className="login-input"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--owner-border)' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--owner-text)', marginBottom: '0.35rem' }}>
                    Target Apartment Complex
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="e.g. Palm Heights Apartments or Green Glen Villas"
                    value={inviteApt}
                    onChange={(e) => setInviteApt(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--owner-border)', marginBottom: '0.5rem' }}
                  />

                  {/* Apartment Quick Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--owner-muted)' }}>Quick Select:</span>
                    {Array.from(new Set(vendors.map(v => v.apartment_name).filter(Boolean) as string[])).map((apt) => (
                      <button
                        key={apt}
                        type="button"
                        onClick={() => setInviteApt(apt)}
                        style={{
                          background: inviteApt === apt ? 'rgba(79, 70, 229, 0.12)' : '#F1F5F9',
                          color: inviteApt === apt ? '#4F46E5' : '#475569',
                          border: inviteApt === apt ? '1px solid #6366F1' : '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {apt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Conflict Warning in Modal */}
                {(() => {
                  const conflict = getApartmentConflict(inviteApt);
                  if (!conflict) return null;
                  return (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.82rem', marginBottom: '1.25rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#D97706' }} />
                      <div>
                        <strong>Active Vendor Conflict:</strong> "{conflict.apartment_name}" is currently served by active vendor <strong>{conflict.name}</strong> ({conflict.phone}). Creating an invite for this complex will permit multiple vendors for the same society.
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreatingInvite}
                    style={{ background: '#4F46E5', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <UserPlus size={15} />
                    <span>{isCreatingInvite ? 'Generating...' : 'Generate 7-Day Invite Link'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Vendor Invitations Registry */}
      {isInvitesListOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsInvitesListOpen(false)}
          title="Vendor Invitations Registry"
        >
          <div style={{ padding: '0.5rem 0' }}>
            {invites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#FBFBFA', borderRadius: '16px' }}>
                <Link2 size={32} color="var(--owner-muted)" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--owner-muted)' }}>
                  No onboarding invitations generated yet. Click "Invite Vendor" to create one.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="resident-table">
                  <thead>
                    <tr>
                      <th>Vendor & Contact</th>
                      <th>Apartment</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => {
                      const isUsed = !!inv.used_at;
                      const isExpired = !isUsed && new Date() > new Date(inv.expires_at);
                      const isValid = !isUsed && !isExpired;

                      return (
                        <tr key={inv.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--owner-text)' }}>{inv.vendor_name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--owner-muted)' }}>{inv.vendor_phone}</div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                              <Building2 size={13} color="var(--owner-accent)" />
                              {inv.apartment_name}
                            </span>
                          </td>
                          <td>
                            {isUsed ? (
                              <span className="status-pill status-pill-active" style={{ fontSize: '0.72rem' }}>
                                <CheckCircle2 size={11} /> Used
                              </span>
                            ) : isExpired ? (
                              <span className="status-pill status-pill-revoked" style={{ fontSize: '0.72rem' }}>
                                <Clock size={11} /> Expired
                              </span>
                            ) : (
                              <span className="status-pill" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '0.72rem' }}>
                                <CheckCircle2 size={11} /> Active
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--owner-muted)' }}>
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </td>
                          <td>
                            {isValid && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => handleCopyLink(inv.token)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                title="Copy onboarding link"
                              >
                                {copiedInviteToken === inv.token ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                                <span>{copiedInviteToken === inv.token ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OwnerPortal;
