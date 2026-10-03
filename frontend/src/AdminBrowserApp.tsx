import React, { useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { adminService } from './services/adminService';
import api from './api/client';
import { notifyToast } from './utils/debugToast';
import { DebugToastContainer } from './components/debug/DebugToastContainer';

/** Standalone browser admin at /became-admin/ */
export default function AdminBrowserApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('t') || params.get('token') || '';
    if (tokenFromUrl) {
      api.setAdminToken(tokenFromUrl);
      window.history.replaceState({}, '', '/became-admin/');
      setAuthed(true);
      setReady(true);
      return;
    }
    if (adminService.isAuthenticated()) setAuthed(true);
    setReady(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminService.authenticate(secret.trim());
      if (res.success && res.data?.token) {
        setAuthed(true);
        notifyToast('Admin authorized', 'success', 2500);
      } else {
        setError(res.error || res.message || 'Invalid key');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: '#070a12', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading admin…
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0b1220 0%, #070a12 50%, #020617 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <DebugToastContainer />
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 400, background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 16, padding: '1.75rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🔐</div>
          <h1 style={{ margin: '0 0 0.35rem', color: '#f8fafc', fontSize: '1.25rem', textAlign: 'center' }}>Admin Panel</h1>
          <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>Browser only · /became-admin</p>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: 6 }}>Admin secret key</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="ADMIN_SECRET_KEY" autoFocus style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 0.85rem', borderRadius: 10, border: '1px solid rgba(148,163,184,0.25)', background: '#020617', color: '#f8fafc', marginBottom: 12, fontSize: '0.95rem' }} />
          {error && <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: 10 }}>{error}</div>}
          <button type="submit" disabled={loading || !secret.trim()} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: loading ? '#334155' : 'linear-gradient(90deg, #059669, #10b981)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Checking…' : 'Enter dashboard'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <DebugToastContainer />
      <AdminDashboard onBackToApp={() => { window.location.href = '/'; }} onLogout={() => { adminService.logout(); setAuthed(false); setSecret(''); }} />
    </>
  );
}
