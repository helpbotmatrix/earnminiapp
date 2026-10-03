import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import type { AdminTab } from './AdminSidebar';
import { OverviewModule } from './modules/OverviewModule';
import { WheelSettingsModule } from './modules/WheelSettingsModule';
import { DailyRewardsModule } from './modules/DailyRewardsModule';
import { ReferralSettingsModule } from './modules/ReferralSettingsModule';
import { ContestsModule } from './modules/ContestsModule';
import { RafflesModule } from './modules/RafflesModule';
import { TasksModule } from './modules/TasksModule';
import { UsersModule } from './modules/UsersModule';
import { WithdrawalsModule } from './modules/WithdrawalsModule';
import { GiftCodesModule } from './modules/GiftCodesModule';
import { SweepsModule } from './modules/SweepsModule';
import { SupportModule } from './modules/SupportModule';
import { SubAdminsModule } from './modules/SubAdminsModule';
import { BroadcastModule } from './modules/BroadcastModule';
import { SettingsModule } from './modules/SettingsModule';
import { VaultSetupWizardModal } from './VaultSetupWizardModal';
import { AdminDiagnosticModal } from './AdminDiagnosticModal';
import { adminService } from '../../services/adminService';
import type { AdminWalletStatus } from '../../types/admin';
import { notifyToast } from '../../utils/debugToast';
import { haptics } from '../../utils/haptics';

interface AdminDashboardProps {
  onBackToApp: () => void;
  onLogout: () => void;
}

function isBrowserAdminRoute() {
  if (typeof window === 'undefined') return true;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/became-admin' || path.startsWith('/became-admin/') || path === '/admin-panel';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp, onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [walletStatus, setWalletStatus] = useState<AdminWalletStatus | null>(null);
  const [syncingWallet, setSyncingWallet] = useState(false);

  // Block embedding inside Mini App shell — force browser /became-admin
  useEffect(() => {
    if (isBrowserAdminRoute()) return;
    const url = window.location.origin + '/became-admin/';
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    notifyToast('Admin is browser-only — opening /became-admin/', 'info', 3500);
    if (tg?.openLink) tg.openLink(url);
    else window.location.href = url;
    onBackToApp();
  }, [onBackToApp]);

  const loadWalletStatus = async () => {
    setSyncingWallet(true);
    try {
      const res = await adminService.getWalletStatus();
      if (res.data) setWalletStatus(res.data);
    } catch (err) {
      console.error('Failed to sync wallet status:', err);
    } finally {
      setSyncingWallet(false);
    }
  };

  useEffect(() => {
    if (!isBrowserAdminRoute()) return;
    const checkVaultInitialization = async () => {
      try {
        const res = await adminService.getMasterVaultStatus();
        if (res.data && res.data.is_initialized === false) {
          setShowSetupWizard(true);
        }
      } catch (err) {
        console.error('Failed to check vault status:', err);
      }
    };
    checkVaultInitialization();
    loadWalletStatus();
  }, []);

  const handleLogout = () => {
    adminService.logout();
    haptics.notification('warning');
    notifyToast('Admin session locked', 'info', 2500);
    onLogout();
  };

  if (!isBrowserAdminRoute()) {
    return (
      <div style={{ minHeight: '100dvh', background: '#070a12', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        Redirecting to browser admin…
      </div>
    );
  }

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewModule />;
      case 'wheel':
        return <WheelSettingsModule />;
      case 'daily':
        return <DailyRewardsModule />;
      case 'referrals':
        return <ReferralSettingsModule />;
      case 'contests':
        return <ContestsModule />;
      case 'raffles':
        return <RafflesModule />;
      case 'tasks':
        return <TasksModule />;
      case 'users':
        return <UsersModule />;
      case 'withdrawals':
        return <WithdrawalsModule />;
      case 'giftcodes':
        return <GiftCodesModule />;
      case 'sweeps':
        return <SweepsModule />;
      case 'support':
        return <SupportModule />;
      case 'subadmins':
        return <SubAdminsModule />;
      case 'broadcast':
        return <BroadcastModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <OverviewModule />;
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        background: '#070a12',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'row',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <VaultSetupWizardModal
        isOpen={showSetupWizard}
        onInitialized={() => setShowSetupWizard(false)}
        onCancel={onBackToApp}
      />
      <AdminDiagnosticModal />

      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          haptics.impact('light');
          setActiveTab(tab);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100dvh', overflow: 'hidden' }}>
        <div
          style={{
            background: '#090d16',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.6rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#070a12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.85rem',
              }}
            >
              A
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Admin Console</span>
              <span
                style={{
                  marginLeft: 8,
                  background: 'rgba(16,185,129,0.15)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16,185,129,0.35)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                LIVE
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {walletStatus && (
              <>
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '7px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {(walletStatus.bnbBalance ?? walletStatus.bnb_balance ?? 0).toFixed?.(4) ??
                    walletStatus.bnbBalance ??
                    walletStatus.bnb_balance ??
                    0}{' '}
                  BNB
                </div>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '7px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  ${Number(walletStatus.usdtBalance ?? walletStatus.usdt_balance ?? 0).toFixed(2)} USDT
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptics.impact('light');
                    loadWalletStatus();
                  }}
                  disabled={syncingWallet}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    borderRadius: '6px',
                    padding: '0.25rem 0.45rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  {syncingWallet ? '...' : 'Refresh'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                borderRadius: '7px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lock
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '1rem 1.1rem', overflowY: 'auto', boxSizing: 'border-box' }}>
          {renderActiveModule()}
        </div>
      </div>
    </div>
  );
};
