import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginView } from './components/auth/LoginView';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { VendorPortal } from './components/vendor/VendorPortal';
import { DemoSwitcherModal } from './components/common/DemoSwitcherModal';
import { UpiPaymentModal } from './components/customer/UpiPaymentModal';
import { db } from './services/db';

const MainApp: React.FC = () => {
  const { currentUser, role, isLoading } = useAuth();
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [isHeaderUpiOpen, setIsHeaderUpiOpen] = useState(false);
  const [customerDues, setCustomerDues] = useState(0);

  // Poll / refresh customer dues when currentUser changes
  useEffect(() => {
    async function loadDues() {
      if (currentUser && currentUser.role === 'customer') {
        const bal = await db.getCustomerBalance(currentUser.flat_number);
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

      {/* Role-based Portals */}
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
              const bal = await db.getCustomerBalance(currentUser.flat_number);
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
