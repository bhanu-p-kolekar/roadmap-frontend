import React, { useState } from 'react';

const ConfirmDialog = ({ 
  open, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Save',
  cancelText = 'Cancel',
  type = 'save'
}) => {
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverConfirm, setHoverConfirm] = useState(false);
  
  if (!open) return null;

  // Different styles based on dialog type
  const getDialogStyles = () => {
    switch(type) {
      case 'reload':
        return {
          title: '#dc2626', // Red color for warning
          button: '#2563eb', // Blue for Reload button
          buttonHover: '#1d4ed8',
          cancelButton: '#6b7280',
          cancelButtonHover: '#4b5563',
          icon: (
            <div style={{ marginBottom: '16px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          )
        };
      default:
        return {
          title: '#2563eb', // Blue for save
          button: '#2563eb',
          buttonHover: '#1d4ed8',
          cancelButton: '#6b7280',
          cancelButtonHover: '#4b5563',
          icon: null
        };
    }
  };

  const styles = getDialogStyles();
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '32px',
        borderRadius: '16px',
        width: '440px',
        maxWidth: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {styles.icon}
        <h3 style={{ 
          margin: '0 0 12px', 
          color: '#111827', 
          fontSize: '22px',
          fontWeight: '700',
          letterSpacing: '-0.025em'
        }}>{title}</h3>
        <p style={{ 
          margin: '0 0 28px', 
          color: '#6b7280', 
          fontSize: '15px',
          lineHeight: '1.6'
        }}>{message}</p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px' 
        }}>
          <button
            onMouseEnter={() => setHoverCancel(true)}
            onMouseLeave={() => setHoverCancel(false)}
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: hoverCancel ? '#f3f4f6' : '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              color: '#374151',
              transition: 'all 0.2s ease',
              minWidth: '100px'
            }}
          >
            {cancelText}
          </button>
          <button
            onMouseEnter={() => setHoverConfirm(true)}
            onMouseLeave={() => setHoverConfirm(false)}
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: hoverConfirm ? styles.buttonHover : styles.button,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.2s ease',
              boxShadow: hoverConfirm ? '0 4px 6px rgba(37, 99, 235, 0.3)' : '0 2px 4px rgba(37, 99, 235, 0.2)',
              transform: hoverConfirm ? 'translateY(-1px)' : 'translateY(0)',
              minWidth: '100px'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;