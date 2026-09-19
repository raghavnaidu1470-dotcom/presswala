import React, { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginView } from './components/auth/LoginView';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { VendorPortal } from './components/vendor/VendorPortal';
import { DemoSwitcherModal } from './components/common/DemoSwitcherModal';
import { UpiPaymentModal } from './components/customer/UpiPaymentModal';
import { db } from './services/db';
import { ShieldAlert } from 'lucide-react';

// Code-split the Owner experience and vendor invite onboarding so they are completely invisible at the bundle level
const OwnerPortal = React.lazy(() => import('./components/owner/OwnerPortal'));
const OwnerLoginView = React.lazy(() => import('./components/owner/OwnerLoginView'));
const VendorOnboardingView = React.lazy(() => import('./components/vendor/VendorOnboardingView').then(m => ({ default: m.VendorOnboardingView })));

// Decode admin path at runtime to ensure the string literal does not leak into the public main JS bundle
const ADMIN_PATH = atob('L3BsYXRmb3JtLWFkbWlu'); // '/platform-admin'

const MainApp: React.FC = () => {
  const { currentUser, role, isLoading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [isHeaderUpiOpen, setIsHeaderUpiOpen] = useState(false);
  const [customerDues, setCustomerDues] = useState(0);

  // Sync URL popstate events
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isPlatformAdminRoute = currentPath === ADMIN_PATH || currentPath === `${ADMIN_PATH}/`;
  const isVendorOnboardRoute = currentPath.startsWith('/vendor-onboard');

  // Dynamic SEO & Crawler Shield: ensure admin & onboard routes are never indexed
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (isPlatformAdminRoute || isVendorOnboardRoute) {
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute('content', 'noindex, nofollow');
    } else {
      if (metaRobots) {
        metaRobots.remove();
      }
    }
  }, [isPlatformAdminRoute, isVendorOnboardRoute]);

  // Extract vendor invite token from path (/vendor-onboard/:token) or query param (?token=...)
  let vendorOnboardToken = '';
  if (isVendorOnboardRoute) {
    const parts = currentPath.split('/vendor-onboard/');
    if (parts.length > 1 && parts[1]) {
      vendorOnboardToken = parts[1].split('/')[0].split('?')[0];
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      vendorOnboardToken = searchParams.get('token') || '';
    }
  }

  // Route-level guard: If an owner is logged in and navigates to the shared root '/',
  // immediately redirect them to the dedicated admin route.
  useEffect(() => {
    if (currentUser?.role === 'owner' && !isPlatformAdminRoute && !isVendorOnboardRoute) {
      window.history.replaceState(null, '', ADMIN_PATH);
      setCurrentPath(ADMIN_PATH);
    }
  }, [currentUser, isPlatformAdminRoute, isVendorOnboardRoute]);

  // Poll / refresh customer dues when currentUser changes
  useEffect(() => {
    async function loadDues() {
      if (currentUser && currentUser.role === 'customer') {
        const bal = await db.getCustomerBalance(currentUser.flat_number, currentUser.apartment_id);
        setCustomerDues(bal.totalOutstanding);
      }
    }
    loadDues();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading PressWala...</div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Dedicated /vendor-onboard/:token Route (Invite-Only Onboarding Form)
  // ---------------------------------------------------------------------------
  if (isVendorOnboardRoute) {
    return (
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#94A3B8' }}>
          Loading Onboarding...
        </div>
      }>
        <VendorOnboardingView token={vendorOnboardToken} />
      </Suspense>
    );
  }

  // ---------------------------------------------------------------------------
  // Dedicated Admin Route (Completely Isolated from Consumer App)
  // ---------------------------------------------------------------------------
  if (isPlatformAdminRoute) {
    // If not logged in, render the dedicated login view
    if (!currentUser) {
      return (
        <Suspense fallback={
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090D16', color: '#94A3B8' }}>
            Loading Console...
          </div>
        }>
          <OwnerLoginView />
        </Suspense>
      );
    }

    // If logged in as owner, render management portal
    if (currentUser.role === 'owner') {
      return (
        <div style={{ minHeight: '100vh', background: '#FAF9F6' }}>
          <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F6', color: '#64748B' }}>
              Loading Operations...
            </div>
          }>
            <OwnerPortal />
          </Suspense>
        </div>
      );
    }

    // If logged in as a non-owner (resident or vendor) and attempting to access admin route
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#090D16', 
        color: '#F8FAFC',
        padding: '1.5rem'
      }}>
        <div style={{ 
          maxWidth: '420px', 
          background: '#111827', 
          padding: '2rem', 
          borderRadius: '20px', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <ShieldAlert size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Access Restricted</h2>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
            You do not possess the required platform operational privileges to access this console.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                window.history.replaceState(null, '', '/');
                setCurrentPath('/');
              }}
              style={{
                background: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Return to User Dashboard
            </button>
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                color: '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Shared Consumer App Routes (Resident / Vendor)
  // ---------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="app-container">
        <LoginView />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        outstandingDues={customerDues}
        onOpenUpiModal={() => setIsHeaderUpiOpen(true)}
        onSwitchPortal={() => setIsDemoSwitcherOpen(true)}
      />

      {/* Role-based Portals (Only Customer & Vendor) */}
      {role === 'customer' ? (
        <CustomerPortal />
      ) : (
        <VendorPortal />
      )}

      {/* Quick Persona / Demo Switcher Modal */}
      <DemoSwitcherModal
        isOpen={isDemoSwitcherOpen}
        onClose={() => setIsDemoSwitcherOpen(false)}
      />

      {/* Header UPI Modal */}
      {role === 'customer' && (
        <UpiPaymentModal
          isOpen={isHeaderUpiOpen}
          onClose={() => setIsHeaderUpiOpen(false)}
          amount={customerDues}
          onPaymentSuccess={async () => {
            if (currentUser) {
              const bal = await db.getCustomerBalance(currentUser.flat_number, currentUser.apartment_id);
              setCustomerDues(bal.totalOutstanding);
            }
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
