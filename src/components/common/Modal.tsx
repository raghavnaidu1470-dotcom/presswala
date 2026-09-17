import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  hideCloseButton = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose && !hideCloseButton) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, hideCloseButton]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose && !hideCloseButton) {
          onClose();
        }
      }}
    >
      <div className="modal-content" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {!hideCloseButton && onClose && (
            <button 
              className="btn btn-sm btn-outline" 
              onClick={onClose}
              aria-label="Close"
              style={{ padding: '0.35rem', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};
