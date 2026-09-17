import React, { useState, useEffect } from 'react';
import { GarmentType } from '../../types';
import { db } from '../../services/db';
import { Modal } from '../common/Modal';
import { 
  Plus, 
  Check, 
  Edit2, 
  X 
} from 'lucide-react';

interface PriceListEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPricesUpdated: () => void;
}

export const PriceListEditorModal: React.FC<PriceListEditorModalProps> = ({
  isOpen,
  onClose,
  onPricesUpdated
}) => {
  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  // New item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Daily Wear');
  const [newPrice, setNewPrice] = useState('');

  const loadGarments = async () => {
    const items = await db.getGarmentTypes();
    setGarments(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadGarments();
    }
  }, [isOpen]);

  const handleStartEdit = (garment: GarmentType) => {
    setEditingId(garment.id);
    setEditPrice(garment.price.toString());
  };

  const handleSavePrice = async (id: string) => {
    const parsed = parseFloat(editPrice);
    if (!isNaN(parsed) && parsed >= 0) {
      await db.updateGarmentPrice(id, parsed);
      setEditingId(null);
      await loadGarments();
      onPricesUpdated();
    }
  };

  const handleAddGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(newPrice);
    if (!newName.trim() || isNaN(parsedPrice) || parsedPrice < 0) return;

    await db.addGarmentType(newName.trim(), newCategory, parsedPrice, 'shirt');
    setNewName('');
    setNewPrice('');
    setShowAddForm(false);
    await loadGarments();
    onPricesUpdated();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Garment Rate Card Manager">
      <div style={{ padding: '0.25rem 0' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Update per-piece ironing rates or add custom garment types. Changes take effect on all new resident orders immediately.
        </p>

        {/* Existing Items Table */}
        <div className="table-responsive" style={{ maxHeight: '360px', marginBottom: '1.25rem' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Garment Name</th>
                <th>Category</th>
                <th>Rate (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {garments.map(g => {
                const isEditing = editingId === g.id;
                return (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{g.category}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          style={{
                            width: '70px',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-focus)',
                            color: 'var(--text-primary)',
                            fontWeight: 700
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{g.price}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => handleSavePrice(g.id)}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setEditingId(null)}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => handleStartEdit(g)}
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add New Item Form Toggle */}
        {!showAddForm ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddForm(true)}
            style={{ width: '100%' }}
          >
            <Plus size={16} />
            <span>Add New Garment Type</span>
          </button>
        ) : (
          <form 
            onSubmit={handleAddGarment}
            style={{ 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1rem' 
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Add New Garment to Catalog
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem'
                }}
              >
                <option value="Daily Wear">Daily Wear</option>
                <option value="Ethnic Wear">Ethnic Wear</option>
                <option value="Household">Household</option>
                <option value="Formal">Formal</option>
              </select>
              <input
                type="number"
                placeholder="Price (₹)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                Save Garment
              </button>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
