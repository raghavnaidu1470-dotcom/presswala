import React, { useState, useEffect } from 'react';
import { GarmentType } from '../../types';
import { db } from '../../services/db';
import { Modal } from '../common/Modal';
import { 
  Plus, 
  Check, 
  Edit2, 
  X,
  Tag
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
        <p style={{ fontSize: '0.9rem', color: 'var(--vendor-muted)', marginBottom: '1.5rem' }}>
          Update per-piece ironing rates or add custom garment types. Changes take effect immediately.
        </p>

        {/* List of Garments */}
        <div style={{ 
          maxHeight: '360px', 
          overflowY: 'auto', 
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          paddingRight: '0.5rem'
        }}>
          {garments.map(g => {
            const isEditing = editingId === g.id;
            return (
              <div 
                key={g.id} 
                style={{
                  background: isEditing ? 'var(--status-sage-bg)' : '#F6F5F2',
                  border: isEditing ? '1px solid var(--vendor-accent)' : '1px solid transparent',
                  borderRadius: '16px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 200ms ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--vendor-text)', fontSize: '1rem', marginBottom: '0.2rem' }}>
                    {g.name}
                  </div>
                  <div style={{ color: 'var(--vendor-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                    {g.category}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--vendor-text)' }}>₹</span>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        style={{
                          width: '70px',
                          padding: '0.5rem',
                          borderRadius: '12px',
                          background: '#FFFFFF',
                          border: '1px solid var(--vendor-accent)',
                          color: 'var(--vendor-text)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePrice(g.id)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'var(--vendor-accent)', color: '#FFFFFF',
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: '#FFFFFF', color: 'var(--vendor-muted)',
                          border: '1px solid var(--vendor-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: 'var(--vendor-text)' }}>
                        ₹{g.price}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(g)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: '#FFFFFF', color: 'var(--vendor-muted)',
                          border: '1px solid var(--vendor-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 200ms ease'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Item Form Toggle */}
        {!showAddForm ? (
          <button
            type="button"
            className="vendor-btn vendor-btn-secondary"
            onClick={() => setShowAddForm(true)}
            style={{ width: '100%', padding: '1rem', borderStyle: 'dashed', background: '#F6F5F2' }}
          >
            <Plus size={18} />
            <span>Add New Garment Type</span>
          </button>
        ) : (
          <form 
            onSubmit={handleAddGarment}
            style={{ 
              background: '#F6F5F2', 
              borderRadius: '20px', 
              padding: '1.25rem',
              border: '1px solid var(--vendor-border)'
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--vendor-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={16} /> Add New Garment
            </div>
            
            <input
              type="text"
              placeholder="Garment Name (e.g. Saree)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid transparent',
                background: '#FFFFFF', color: 'var(--vendor-text)', fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--vendor-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'transparent'}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid transparent',
                  background: '#FFFFFF', color: 'var(--vendor-text)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer'
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
                  width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid transparent',
                  background: '#FFFFFF', color: 'var(--vendor-text)', fontSize: '0.9rem', outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--vendor-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="vendor-btn vendor-btn-primary" style={{ flex: 1, padding: '0.85rem' }}>
                Save Garment
              </button>
              <button 
                type="button" 
                className="vendor-btn vendor-btn-secondary" 
                onClick={() => setShowAddForm(false)}
                style={{ padding: '0.85rem' }}
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
