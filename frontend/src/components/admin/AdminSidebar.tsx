import React from 'react';

export type AdminTab =
  | 'overview'
  | 'withdrawals'
  | 'users'
  | 'tasks'
  | 'wheel'
  | 'daily'
  | 'referrals'
  | 'contests'
  | 'raffles'
  | 'giftcodes'
  | 'sweeps'
  | 'support'
  | 'broadcast'
  | 'subadmins'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const GROUPS: { title: string; items: { id: AdminTab; label: string; icon: string }[] }[] = [
  {
    title: 'Core',
    items: [
      { id: 'overview', label: 'Dashboard', icon: '\uD83D\uDCCA' },
      { id: 'withdrawals', label: 'Withdrawals', icon: '\uD83D\uDCB8' },
      { id: 'users', label: 'Users', icon: '\uD83D\uDC65' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { id: 'tasks', label: 'Tasks', icon: '\uD83D\uDCCB' },
      { id: 'wheel', label: 'Spin Wheel', icon: '\uD83C\uDFB0' },
      { id: 'daily', label: 'Daily Check-in', icon: '\uD83D\uDCC5' },
      { id: 'referrals', label: 'Referrals', icon: '\uD83D\uDD17' },
      { id: 'giftcodes', label: 'Gift Codes', icon: '\uD83C\uDF81' },
    ],
  },
  {
    title: 'Events',
    items: [
      { id: 'contests', label: 'Contests', icon: '\uD83C\uDFC6' },
      { id: 'raffles', label: 'Raffles', icon: '\uD83C\uDF9F\uFE0F' },
      { id: 'broadcast', label: 'Broadcast', icon: '\uD83D\uDCE2' },
    ],
  },
  {
    title: 'Finance & Ops',
    items: [
      { id: 'sweeps', label: 'Sweeps / Vault', icon: '\uD83C\uDFE6' },
      { id: 'support', label: 'Support', icon: '\uD83D\uDCE9' },
      { id: 'subadmins', label: 'Sub-Admins', icon: '\uD83D\uDEE1\uFE0F' },
      { id: 'settings', label: 'Settings & Ads', icon: '\u2699\uFE0F' },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <aside
      style={{
        width: collapsed ? 72 : 240,
        minWidth: collapsed ? 72 : 240,
        height: '100%',
        background: 'linear-gradient(180deg, #0b1220 0%, #070b14 100%)',
        borderRight: '1px solid rgba(148,163,184,0.12)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: collapsed ? '1rem 0.5rem' : '1.1rem 1rem',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
        }}
      >
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Admin Panel
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>Earn Mini App</div>
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {collapsed ? '\u00bb' : '\u00ab'}
          </button>
        )}
      </div>

      <nav
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: collapsed ? '0.6rem 0.35rem' : '0.75rem 0.65rem',
        }}
      >
        {GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: '1rem' }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0.35rem 0.55rem',
                  marginBottom: 4,
                }}
              >
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={item.label}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '0.65rem 0' : '0.55rem 0.65rem',
                    marginBottom: 3,
                    borderRadius: 10,
                    border: active
                      ? '1px solid rgba(52, 211, 153, 0.45)'
                      : '1px solid transparent',
                    background: active
                      ? 'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.06) 100%)'
                      : 'transparent',
                    color: active ? '#6ee7b7' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid rgba(148,163,184,0.1)',
            fontSize: '0.68rem',
            color: '#475569',
          }}
        >
          Withdrawals → confirm / reject
          <br />
          Settings → ads, limits, fees
        </div>
      )}
    </aside>
  );
};
