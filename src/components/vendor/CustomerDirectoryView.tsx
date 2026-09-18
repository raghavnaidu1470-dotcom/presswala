import React, { useState, useEffect } from 'react';
import { CustomerSummary } from '../../types';
import { db } from '../../services/db';
import { 
  Search, 
  MessageCircle, 
  CheckCircle2,
  Users
} from 'lucide-react';

export const CustomerDirectoryView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadDirectory() {
      const data = await db.getCustomerSummaries();
      setCustomers(data);
    }
    loadDirectory();
  }, []);

  const filtered = customers.filter(c => 
    c.flat_number.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_phone.includes(search)
  );

  return (
    <div>
      {/* Header & Search */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--vendor-muted)' }} />
          <input
            type="text"
            placeholder="Search residents by Flat (e.g. S-3907) or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              borderRadius: '9999px',
              background: '#FFFFFF',
              border: '1px solid var(--vendor-border)',
              color: 'var(--vendor-text)',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              outline: 'none',
              transition: 'all 200ms ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--vendor-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--vendor-border)'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F6F5F2', padding: '0.5rem 1rem', borderRadius: '9999px', color: 'var(--vendor-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Users size={16} />
          {filtered.length} Registered Flats
        </div>
      </div>

      {/* Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filtered.map(c => {
          const hasDue = c.outstanding_balance > 0;
          const whatsappLink = `https://wa.me/91${c.customer_phone}?text=${encodeURIComponent(
            `Namaste ${c.customer_name} ji, this is Ramu Dhobi. Hope your clothes were well-ironed. Let me know when you have clothes for ironing next!`
          )}`;

          return (
            <div 
              key={c.customer_id || c.flat_number}
              className="vendor-card"
              style={{
                padding: '1.5rem',
                border: hasDue ? '1px solid var(--status-coral-bg)' : '1px solid var(--vendor-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ 
                      background: '#EBE8E0', padding: '0.2rem 0.6rem', borderRadius: '8px', 
                      fontSize: '0.9rem', fontWeight: 700, color: 'var(--vendor-text)' 
                    }}>
                      Flat {c.flat_number}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--vendor-text)' }}>
                    {c.customer_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--vendor-muted)' }}>
                    {c.customer_phone}
                  </div>
                </div>

                {c.customer_phone && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#e8f9ed', color: '#25D366',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease',
                      textDecoration: 'none'
                    }}
                    title="WhatsApp Resident"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#F6F5F2', padding: '1rem', borderRadius: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vendor-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Lifetime Spent</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--vendor-text)' }}>₹{c.lifetime_spent}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--vendor-muted)' }}>Across {c.total_orders} orders</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vendor-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Outstanding Due</div>
                  {hasDue ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: '#B95E54', fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
                      ₹{c.outstanding_balance}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: '#557A3C', fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
                      <CheckCircle2 size={16} /> ₹0
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
