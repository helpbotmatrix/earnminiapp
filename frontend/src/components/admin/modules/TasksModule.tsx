import React, { useEffect, useState, useRef } from 'react';
import { adminService } from '../../../services/adminService';
import type { AdminTask, AdminTaskType, ConnectedTelegramChat } from '../../../types/admin';
import { notifyToast } from '../../../utils/debugToast';
import { haptics } from '../../../utils/haptics';
import { showAdminDiagnostic } from '../../../utils/adminDiagnostics';
import { TaskIconRenderer } from '../TaskIconRenderer';

export { TaskIconRenderer };

const ICON_PRESETS = [
  { label: 'Telegram', value: '📢', emoji: '📢' },
  { label: 'AdsGram', value: '🎬', emoji: '🎬' },
  { label: 'YouTube', value: '🎥', emoji: '🎥' },
  { label: 'X / Twitter', value: '🐦', emoji: '🐦' },
  { label: 'Lucky Wheel', value: '🎡', emoji: '🎡' },
  { label: 'Diamonds', value: '💎', emoji: '💎' },
  { label: 'Friends / Gift', value: '👥', emoji: '👥' },
  { label: 'Trophy / Level', value: '🏆', emoji: '🏆' },
  { label: 'Daily Reward', value: '🎁', emoji: '🎁' },
  { label: 'Website / Link', value: '🔗', emoji: '🔗' }
];

export const TasksModule: React.FC = () => {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [chats, setChats] = useState<ConnectedTelegramChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'chats'>('tasks');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskType, setTaskType] = useState<AdminTaskType>('telegram_channel');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'social' | 'daily' | 'partner' | 'special'>('social');
  const [icon, setIcon] = useState('📢');
  const [rewardDiamonds, setRewardDiamonds] = useState('500');
  const [rewardSpins, setRewardSpins] = useState('2');
  const [targetCount, setTargetCount] = useState('5');
  const [actionUrl, setActionUrl] = useState('');
  const [selectedChatId, setSelectedChatId] = useState('');
  const [customChannelId, setCustomChannelId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [verifyingChannel, setVerifyingChannel] = useState(false);
  const [channelVerifyResult, setChannelVerifyResult] = useState<{
    verified: boolean;
    title?: string;
    username?: string;
    invite_link?: string;
    error?: string;
  } | null>(null);

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showChatModal, setShowChatModal] = useState(false);
  const [newChatId, setNewChatId] = useState('');
  const [linkingChat, setLinkingChat] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([adminService.getTasks(), adminService.getConnectedChats()]);
      const rawTasks = tRes.data;
      let taskList: AdminTask[] = [];
      if (Array.isArray(rawTasks)) {
        taskList = rawTasks;
      } else if (rawTasks && typeof rawTasks === 'object') {
        const potential = (rawTasks as any).tasks || (rawTasks as any).items || (rawTasks as any).data || [];
        if (Array.isArray(potential)) taskList = potential;
      }
      setTasks(taskList);

      const rawChats = cRes.data;
      let chatList: ConnectedTelegramChat[] = [];
      if (Array.isArray(rawChats)) {
        chatList = rawChats;
      } else if (rawChats && typeof rawChats === 'object') {
        const potential = (rawChats as any).chats || (rawChats as any).connected_chats || (rawChats as any).data || [];
        if (Array.isArray(potential)) chatList = potential;
      }
      setChats(chatList);
    } catch (err: any) {
      console.warn('Failed to load tasks/chats:', err);
      notifyToast(`Failed to load: ${err.message}`, 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTaskTypeChange = (newType: AdminTaskType) => {
    setTaskType(newType);
    setChannelVerifyResult(null);
    if (newType === 'watch_ad') {
      setIcon('🎬');
      setCategory('daily');
      setActionUrl('');
    } else if (newType === 'telegram_channel') {
      setIcon('📢');
      setCategory('social');
      setActionUrl('');
    } else if (newType === 'invite_count') {
      setIcon('👥');
      setCategory('special');
      setActionUrl('');
    } else if (newType === 'spin_count') {
      setIcon('🎡');
      setCategory('daily');
      setActionUrl('');
    } else if (newType === 'level_reach') {
      setIcon('🏆');
      setCategory('special');
      setActionUrl('');
    } else {
      setIcon('🔗');
      setCategory('social');
      if (!actionUrl) setActionUrl('https://');
    }
  };

  const handleVerifyChannelLive = async (targetId?: string) => {
    const channelToTest = targetId || (selectedChatId === 'custom' ? customChannelId.trim() : (selectedChatId || customChannelId.trim()));
    if (!channelToTest) {
      notifyToast('Please enter a Channel @username or Chat ID to test', 'info', 2500);
      return;
    }

    setVerifyingChannel(true);
    setChannelVerifyResult(null);
    try {
      const res = await adminService.verifyAndConnectChannel(channelToTest);
      if (res.success && res.data) {
        setChannelVerifyResult({
          verified: true,
          title: res.data.title || 'Official Channel',
          username: res.data.username || channelToTest,
          invite_link: res.data.invite_link
        });
        haptics.notification('success');
        notifyToast('✓ Bot is verified as Administrator in this channel!', 'success', 3500);
      } else {
        setChannelVerifyResult({
          verified: false,
          error: res.error || 'Bot is not an administrator in this channel'
        });
        haptics.notification('warning');
        const errMsg = res.error || '⚠️ Bot not detected as admin. Please add bot as admin to channel.';
        notifyToast(errMsg, 'error', 4000);
        showAdminDiagnostic(errMsg, 'Verify Telegram Channel');
      }
    } catch (err: any) {
      setChannelVerifyResult({
        verified: false,
        error: err.message || 'Connection error'
      });
      notifyToast(`Verification failed: ${err.message}`, 'error', 3500);
      showAdminDiagnostic(err, 'Verify Telegram Channel');
    } finally {
      setVerifyingChannel(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'info', 3000);
      return;
    }

    setUploadingIcon(true);
    try {
      const res = await adminService.uploadImage(file);
      if (res.success && res.data?.url) {
        setIcon(res.data.url);
        haptics.notification('success');
        notifyToast('📁 Icon uploaded and hosted on server successfully!', 'success', 3000);
      } else {
        notifyToast(res.error || 'Failed to upload image', 'error', 3000);
        showAdminDiagnostic(res.error || 'Failed to upload image', 'Upload Task Icon');
      }
    } catch (err: any) {
      notifyToast(`Upload error: ${err.message}`, 'error', 3000);
      showAdminDiagnostic(err, 'Upload Task Icon');
    } finally {
      setUploadingIcon(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notifyToast('Task title is required', 'info', 2500);
      return;
    }

    if (taskType === 'external_link' && (!actionUrl.trim() || actionUrl.trim() === 'https://')) {
      notifyToast('Redirect URL is required for External Link tasks', 'info', 3000);
      return;
    }

    setSubmitting(true);
    try {
      let resolvedChannelId = '';
      let resolvedActionUrl = actionUrl.trim();

      if (taskType === 'telegram_channel') {
        resolvedChannelId = selectedChatId === 'custom' ? customChannelId.trim() : (selectedChatId || customChannelId.trim());
        if (channelVerifyResult?.invite_link) {
          resolvedActionUrl = channelVerifyResult.invite_link;
        } else if (!resolvedActionUrl && resolvedChannelId) {
          const clean = resolvedChannelId.replace('@', '');
          if (!clean.startsWith('-100')) {
            resolvedActionUrl = `https://t.me/${clean}`;
          }
        }
      } else if (taskType !== 'external_link') {
        resolvedActionUrl = '';
      }

      await adminService.createTask({
        title: title.trim(),
        task_type: taskType,
        category,
        icon: icon.trim() || '🎯',
        icon_url: icon.trim() || '🎯',
        reward_diamonds: parseInt(rewardDiamonds, 10) || 0,
        reward_spins: parseInt(rewardSpins, 10) || 0,
        target_count: ['invite_count', 'spin_count', 'level_reach'].includes(taskType) ? (parseInt(targetCount, 10) || 1) : 1,
        action_url: resolvedActionUrl,
        telegram_chat_id: resolvedChannelId || undefined,
        channel_id: resolvedChannelId || undefined,
        is_active: true
      });

      haptics.notification('success');
      notifyToast('📋 Quest Task created successfully!', 'success', 3500);
      setShowTaskModal(false);
      setTitle('');
      setActionUrl('');
      setSelectedChatId('');
      setCustomChannelId('');
      setChannelVerifyResult(null);
      loadData();
    } catch (err: any) {
      haptics.notification('error');
      notifyToast(`Error: ${err.message}`, 'error', 3500);
      showAdminDiagnostic(err, 'Create Quest Task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      haptics.impact('medium');
      await adminService.deleteTask(id);
      notifyToast('Task removed', 'info', 2500);
      loadData();
    } catch (err: any) {
      notifyToast(`Error: ${err.message}`, 'error', 3000);
      showAdminDiagnostic(err, 'Delete Quest Task');
    }
  };

  const handleLinkChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatId.trim()) return;
    setLinkingChat(true);
    try {
      haptics.notification('success');
      await adminService.linkConnectedChat(newChatId.trim());
      notifyToast('📢 Channel linked to bot!', 'success', 3000);
      setShowChatModal(false);
      setNewChatId('');
      loadData();
    } catch (err: any) {
      notifyToast(`Error: ${err.message}`, 'error', 3000);
      showAdminDiagnostic(err, 'Link Telegram Channel');
    } finally {
      setLinkingChat(false);
    }
  };

  const handleUnlinkChat = async (id: number) => {
    try {
      haptics.impact('medium');
      await adminService.unlinkConnectedChat(id);
      notifyToast('Channel unlinked', 'info', 2500);
      loadData();
    } catch (err: any) {
      notifyToast(`Error: ${err.message}`, 'error', 3000);
      showAdminDiagnostic(err, 'Unlink Telegram Channel');
    }
  };

  const getTaskTypeBadge = (type?: AdminTaskType) => {
    switch (type) {
      case 'watch_ad':
      case 'ad_view':
        return { label: '🎬 AdsGram Rewarded Ad', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
      case 'telegram_channel':
        return { label: '📢 Telegram Channel', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'invite_count':
        return { label: '👥 Invite Milestone', color: '#a7f3d0', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'spin_count':
        return { label: '🎡 Spin Milestone', color: '#fde047', bg: 'rgba(250, 204, 21, 0.15)' };
      case 'level_reach':
        return { label: '🏆 Level Milestone', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' };
      default:
        return { label: '🔗 External Link', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: 800 }}>
            📋 Quests, Tasks & Channels
          </h2>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Configure 100% dynamic quest requirements, media icons, and rewards
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '0.2rem', display: 'flex', gap: '0.2rem' }}>
            <button
              onClick={() => setActiveSubTab('tasks')}
              style={{
                background: activeSubTab === 'tasks' ? 'rgba(56, 189, 248, 0.25)' : 'none',
                color: activeSubTab === 'tasks' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setActiveSubTab('chats')}
              style={{
                background: activeSubTab === 'chats' ? 'rgba(56, 189, 248, 0.25)' : 'none',
                color: activeSubTab === 'chats' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Bot Channels ({chats.length})
            </button>
          </div>

          {activeSubTab === 'tasks' ? (
            <button
              onClick={() => {
                setShowTaskModal(true);
                setChannelVerifyResult(null);
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              <span>➕</span>
              <span>Create Task</span>
            </button>
          ) : (
            <button
              onClick={() => setShowChatModal(true)}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>📢</span>
              <span>Link Channel</span>
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'tasks' && (
        loading ? (
          <div className="skeleton-glow-box" style={{ width: '100%', height: '220px', borderRadius: '16px' }} />
        ) : tasks.length === 0 ? (
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '2.5rem', borderRadius: '14px', textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            No tasks found. Click "Create Task" above to publish your first quest.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.75)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.35)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Task Details</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Rewards</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Requirements / Target</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Completions</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const typeBadge = getTaskTypeBadge(t.task_type);
                  const dia = t.reward_diamonds ?? (t.reward_type === 'diamonds' ? t.reward_amount : 0) ?? 0;
                  const spn = t.reward_spins ?? (t.reward_type === 'spins' ? t.reward_amount : 0) ?? 0;

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <TaskIconRenderer icon={t.icon || t.icon_url || (t as any).iconUrl} size={26} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{t.title}</div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'capitalize' }}>Category: {t.category}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ background: typeBadge.bg, color: typeBadge.color, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          {typeBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {dia > 0 && <span style={{ color: '#fde047', fontWeight: 800 }}>+{dia} 💎</span>}
                          {spn > 0 && <span style={{ color: '#67e8f9', fontWeight: 800 }}>+{spn} 🎡</span>}
                          {dia <= 0 && spn <= 0 && <span style={{ color: '#64748b' }}>—</span>}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                        {(t as any).target_count ? `Target: ${(t as any).target_count}` : (t.action_url || (t as any).telegram_chat_id || '—')}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                        {(t as any).completions ?? (t as any).claim_count ?? 0} claims
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            borderRadius: '7px',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeSubTab === 'chats' && (
        loading ? (
          <div className="skeleton-glow-box" style={{ width: '100%', height: '180px', borderRadius: '16px' }} />
        ) : chats.length === 0 ? (
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '2rem', borderRadius: '14px', textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
            No linked channels. Use "Link Channel" to attach Telegram chats the bot can verify.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {chats.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{c.title || c.username || c.chat_id}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.username || c.chat_id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnlinkChat(c.id)}
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '0.35rem 0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {showTaskModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <form
            onSubmit={handleCreateTask}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 16,
              padding: '1.25rem',
              color: '#e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Create Task</h3>
              <button type="button" onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Type</label>
            <select value={taskType} onChange={(e) => handleTaskTypeChange(e.target.value as AdminTaskType)} style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }}>
              <option value="telegram_channel">Telegram Channel</option>
              <option value="watch_ad">Watch Ad</option>
              <option value="invite_count">Invite Count</option>
              <option value="spin_count">Spin Count</option>
              <option value="level_reach">Level Reach</option>
              <option value="external_link">External Link</option>
            </select>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Icon (emoji or image path)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <TaskIconRenderer icon={icon} size={28} />
              <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {ICON_PRESETS.map((p) => (
                <button key={p.value} type="button" onClick={() => setIcon(p.value)} style={{ background: icon === p.value ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: '#e2e8f0' }}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ marginBottom: 10, color: '#94a3b8', fontSize: 12 }} />
            {uploadingIcon && <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Uploading…</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Diamonds</label>
                <input value={rewardDiamonds} onChange={(e) => setRewardDiamonds(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Spins</label>
                <input value={rewardSpins} onChange={(e) => setRewardSpins(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />
              </div>
            </div>

            {['invite_count', 'spin_count', 'level_reach'].includes(taskType) && (
              <>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Target count</label>
                <input value={targetCount} onChange={(e) => setTargetCount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />
              </>
            )}

            {taskType === 'external_link' && (
              <>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Action URL</label>
                <input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />
              </>
            )}

            {taskType === 'telegram_channel' && (
              <>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Channel @username or Chat ID</label>
                <input
                  value={selectedChatId === 'custom' ? customChannelId : selectedChatId}
                  onChange={(e) => {
                    setSelectedChatId('custom');
                    setCustomChannelId(e.target.value);
                  }}
                  placeholder="@mychannel or -100..."
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }}
                />
                <button type="button" onClick={() => handleVerifyChannelLive()} disabled={verifyingChannel} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0369a1', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {verifyingChannel ? 'Verifying…' : 'Verify Channel'}
                </button>
                {channelVerifyResult && (
                  <div style={{ marginBottom: 10, fontSize: 12, color: channelVerifyResult.verified ? '#6ee7b7' : '#f87171' }}>
                    {channelVerifyResult.verified
                      ? `✓ Live Verified: "${channelVerifyResult.title}" (${channelVerifyResult.username})`
                      : channelVerifyResult.error}
                  </div>
                )}
              </>
            )}

            <button type="submit" disabled={submitting} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'linear-gradient(90deg,#059669,#10b981)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
              {submitting ? 'Saving…' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      {showChatModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleLinkChat} style={{ width: '100%', maxWidth: 400, background: '#0f172a', borderRadius: 16, padding: 16, border: '1px solid rgba(148,163,184,0.25)' }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>Link Channel</h3>
            <input value={newChatId} onChange={(e) => setNewChatId(e.target.value)} placeholder="@channel or -100..." style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#020617', color: '#fff' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowChatModal(false)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8' }}>Cancel</button>
              <button type="submit" disabled={linkingChat} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700 }}>{linkingChat ? '…' : 'Link'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TasksModule;
