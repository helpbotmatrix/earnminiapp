import React, { useEffect } from 'react';
import { notifyToast } from '../../utils/debugToast';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Mini App no longer hosts admin login.
 * Opens browser admin at /became-admin/ instead.
 */
export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const url =
      (typeof window !== 'undefined' ? window.location.origin : 'https://earnminiapp-production.up.railway.app') +
      '/became-admin/';
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    try {
      if (tg?.openLink) tg.openLink(url);
      else window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
    notifyToast('Admin panel opens in browser only', 'info', 3500);
    onClose();
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: '100%',
          background: '#0f172a',
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: 16,
          padding: '1.5rem',
          textAlign: 'center',
          color: '#e2e8f0',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🌐</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Browser Admin Only</div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1rem' }}>
          Admin login is not available inside the Mini App.
          <br />
          Use: <code style={{ color: '#6ee7b7' }}>/became-admin/</code>
        </p>
        <button
          type="button"
          onClick={() => {
            const url =
              (typeof window !== 'undefined' ? window.location.origin : '') + '/became-admin/';
            // @ts-ignore
            const tg = window.Telegram?.WebApp;
            if (tg?.openLink) tg.openLink(url);
            else window.open(url, '_blank');
            onClose();
          }}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(90deg,#059669,#10b981)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          Open Admin in Browser
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.65rem',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
