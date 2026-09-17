import React, { useState, useEffect } from 'react';
import { CustomerSummary } from '../../types';
import { db } from '../../services/db';
import { 
  Search, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle2 
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
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search residents by Flat (e.g. A-101) or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {filtered.length} Registered Flats
        </div>
      </div>

      {/* Directory Table */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Flat</th>
              <th>Resident Name</th>
              <th>Phone</th>
              <th>Total Orders</th>
              <th>Lifetime Spent</th>
              <th>Outstanding Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const hasDue = c.outstanding_balance > 0;
              const whatsappLink = `https://wa.me/91${c.customer_phone}?text=${encodeURIComponent(
                `Namaste ${c.customer_name} ji, this is Ramu Dhobi. Hope your clothes were well-ironed. Let me know when you have clothes for ironing next!`
              )}`;

              return (
                <tr key={c.customer_id || c.flat_number}>
                  <td>
                    <span className="flat-badge-prominent">
                      Flat {c.flat_number}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{c.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.customer_phone}</td>
                  <td>{c.total_orders} orders</td>
                  <td style={{ fontWeight: 600 }}>₹{c.lifetime_spent}</td>
                  <td>
                    {hasDue ? (
                      <span className="due-pill due-pill-alert" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                        <AlertCircle size={12} />
                        ₹{c.outstanding_balance} Due
                      </span>
                    ) : (
                      <span className="due-pill due-pill-clean" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                        <CheckCircle2 size={12} />
                        All Clear
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {c.customer_phone && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline"
                          title="WhatsApp Resident"
                          style={{ padding: '0.35rem 0.55rem', color: '#25D366' }}
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
