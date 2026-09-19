import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { 
  Sparkles, 
  LogOut, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  Building2
} from 'lucide-react';

interface NavbarProps {
  outstandingDues?: number;
  onOpenUpiModal?: () => void;
  onSwitchPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  outstandingDues = 0, 
  onOpenUpiModal,
  onSwitchPortal 
}) => {
  const { currentUser, role, logout } = useAuth();
  const [currentApartmentName, setCurrentApartmentName] = useState<string>(
    import.meta.env.VITE_APARTMENT_NAME || 'Palm Heights'
  );

  useEffect(() => {
    if (currentUser?.apartment_id) {
      db.getApartmentById(currentUser.apartment_id).then(apt => {
        if (apt) setCurrentApartmentName(apt.name);
      });
    }
  }, [currentUser?.apartment_id]);

  return (
    <header className="header-nav">
      <div className="header-inner">
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>
          <div className="brand-text-wrapper">
            <span className="brand-title">PressWala</span>
            <span className="brand-subtitle">
              <Building2 size={11} style={{ display: 'inline', marginRight: '3px' }} />
              {currentApartmentName}
            </span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="user-nav-actions">
          {currentUser ? (
            <>
              {role === 'customer' ? (
                <>
                  <span className="flat-badge-prominent">
                    {currentUser.block ? `${currentUser.block} • ` : ''}Flat {currentUser.flat_number}
                  </span>

                  {/* Dynamic Due Pill */}
                  {outstandingDues > 0 ? (
                    <button 
                      className="due-pill due-pill-alert" 
                      onClick={onOpenUpiModal}
                      title="Click to Pay via UPI"
                    >
                      <AlertCircle size={13} />
                      <span>₹{outstandingDues} Due</span>
                    </button>
                  ) : (
                    <span className="due-pill due-pill-clean">
                      <CheckCircle2 size={13} />
                      <span>All Clear</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="badge badge-vendor">
                  <UserIcon size={12} />
                  Vendor Portal
                </span>
              )}

              {onSwitchPortal && (
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={onSwitchPortal}
                  title="Switch Role or Demo User"
                >
                  Switch
                </button>
              )}

              <button 
                className="btn btn-sm btn-outline" 
                onClick={logout}
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <span className="badge badge-created">Not Signed In</span>
          )}
        </div>
      </div>
    </header>
  );
};
