import api from '../api/client';

export type AdNetwork = 'adsgram' | 'gigapub' | 'monetag';

export interface AdsConfig {
  ads_enabled?: boolean;
  adsgram_enabled: boolean;
  primary_ad_network?: AdNetwork | string;
  ad_network?: AdNetwork | string;
  adsgram_block_id: string;
  gigapub_project_id?: string;
  monetag_zone_id?: string;
  monetag_sdk_fn?: string;
  monetag_script_url?: string;
  ads_require_spin?: boolean;
  ads_require_checkin?: boolean;
  ads_require_task?: boolean;
  ads_require_withdraw?: boolean;
  ads_require_direct?: boolean;
  ads_network_spin?: string;
  ads_network_checkin?: string;
  ads_network_task?: string;
  ads_network_withdraw?: string;
  ads_network_direct?: string;
  networks?: string[];
}

let cachedConfig: AdsConfig | null = null;
let adsgramSdkLoaded = false;

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean }) => {
        show: () => Promise<{ done: boolean; description?: string; state?: string }>;
      };
    };
    showGiga?: () => Promise<unknown>;
    [key: string]: any;
  }
}

export const fetchAdsConfig = async (force = false): Promise<AdsConfig> => {
  if (cachedConfig && !force) return cachedConfig;
  try {
    const res = await api.get<any>('/config/ads');
    if (res.success && res.data) {
      const d = res.data;
      cachedConfig = {
        ads_enabled: Boolean(d.ads_enabled ?? d.adsEnabled ?? d.adsgram_enabled ?? d.adsgramEnabled),
        adsgram_enabled: Boolean(d.adsgram_enabled ?? d.adsgramEnabled ?? d.ads_enabled),
        primary_ad_network: String(d.primary_ad_network ?? d.ad_network ?? 'adsgram').toLowerCase(),
        ad_network: String(d.primary_ad_network ?? d.ad_network ?? 'adsgram').toLowerCase(),
        adsgram_block_id: String(d.adsgram_block_id ?? d.adsgramBlockId ?? d.block_id ?? ''),
        gigapub_project_id: String(d.gigapub_project_id ?? d.gigapub_id ?? d.gigapubProjectId ?? ''),
        monetag_zone_id: String(d.monetag_zone_id ?? d.monetag_zone ?? d.monetagZoneId ?? ''),
        monetag_sdk_fn: String(d.monetag_sdk_fn ?? d.monetagSdkFn ?? ''),
        monetag_script_url: String(d.monetag_script_url ?? d.monetagScriptUrl ?? ''),
        ads_require_spin: Boolean(d.ads_require_spin ?? d.adsRequireSpin),
        ads_require_checkin: Boolean(d.ads_require_checkin ?? d.adsRequireCheckin),
        ads_require_task: Boolean(d.ads_require_task ?? d.adsRequireTask),
        ads_require_withdraw: Boolean(d.ads_require_withdraw ?? d.adsRequireWithdraw),
        ads_require_direct: Boolean(d.ads_require_direct ?? d.adsRequireDirect),
        ads_network_spin: d.ads_network_spin,
        ads_network_checkin: d.ads_network_checkin,
        ads_network_task: d.ads_network_task,
        ads_network_withdraw: d.ads_network_withdraw,
        ads_network_direct: d.ads_network_direct,
        networks: d.networks || ['adsgram', 'gigapub', 'monetag'],
      };
      return cachedConfig;
    }
  } catch (e) {
    console.warn('[Ads] Failed to fetch ads config:', e);
  }
  return {
    adsgram_enabled: false,
    adsgram_block_id: '',
    primary_ad_network: 'adsgram',
  };
};

function loadScript(src: string, attrs?: Record<string, string>): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    }
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export const loadAdsgramSDK = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (window.Adsgram) return true;
  if (adsgramSdkLoaded) return !!window.Adsgram;
  const ok = await loadScript('https://sad.adsgram.ai/js/sad.min.js');
  adsgramSdkLoaded = true;
  return ok && !!window.Adsgram;
};

export const loadGigaPubSDK = async (projectId: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (typeof window.showGiga === 'function') return true;
  if (!projectId) return false;
  const ok = await loadScript(`https://ad.gigapub.tech/script?id=${encodeURIComponent(projectId)}`);
  if (!ok) {
    await loadScript(`https://ru-ad.gigapub.tech/script?id=${encodeURIComponent(projectId)}`);
  }
  for (let i = 0; i < 20; i++) {
    if (typeof window.showGiga === 'function') return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return typeof window.showGiga === 'function';
};

export const loadMonetagSDK = async (
  zoneId: string,
  sdkFn: string,
  scriptUrl?: string
): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const fn = sdkFn || (zoneId ? `show_${zoneId}` : '');
  if (fn && typeof window[fn] === 'function') return true;
  if (!zoneId) return false;

  const candidates = [
    scriptUrl,
    `https://libtl.com/sdk.js`,
  ].filter(Boolean) as string[];

  for (const src of candidates) {
    const ok = await loadScript(src, {
      'data-zone': zoneId,
      'data-sdk': fn,
    });
    if (ok) break;
  }
  for (let i = 0; i < 25; i++) {
    if (fn && typeof window[fn] === 'function') return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return !!(fn && typeof window[fn] === 'function');
};

async function playAdsGram(blockId: string): Promise<{ success: boolean; error?: string }> {
  const ok = await loadAdsgramSDK();
  if (!ok || !window.Adsgram?.init) {
    return { success: false, error: 'AdsGram SDK unavailable' };
  }
  const adController = window.Adsgram.init({ blockId });
  const result = await adController.show();
  if (!result.done) {
    return { success: false, error: result.description || 'Watch the full ad to earn rewards' };
  }
  return { success: true };
}

async function playGigaPub(projectId: string): Promise<{ success: boolean; error?: string }> {
  const ok = await loadGigaPubSDK(projectId);
  if (!ok || typeof window.showGiga !== 'function') {
    return { success: false, error: 'GigaPub SDK unavailable' };
  }
  try {
    await window.showGiga();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'GigaPub ad failed or closed early' };
  }
}

async function playMonetag(
  zoneId: string,
  sdkFn: string,
  scriptUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const fn = sdkFn || `show_${zoneId}`;
  const ok = await loadMonetagSDK(zoneId, fn, scriptUrl);
  if (!ok || typeof window[fn] !== 'function') {
    return {
      success: false,
      error: 'Monetag SDK unavailable — set monetag_script_url + zone id in admin',
    };
  }
  try {
    await window[fn]();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Monetag ad failed or closed early' };
  }
}

export const showRewardedAd = async (
  purpose: string = 'direct',
  _customBlockId?: string
): Promise<{ success: boolean; session_id?: string; network?: string; error?: string }> => {
  try {
    const config = await fetchAdsConfig();
    if (!config.adsgram_enabled && !config.ads_enabled) {
      return { success: false, error: 'Advertising is currently disabled by administrator' };
    }

    const sess = await api.post<{
      session_id: string;
      network: string;
      block_id?: string;
      project_id?: string;
      zone_id?: string;
      sdk_fn?: string;
      script_url?: string;
    }>('/ads/session', { purpose });

    if (!sess.success || !sess.data?.session_id) {
      return { success: false, error: (sess as any).error || 'Could not start ad session' };
    }

    const sessionId = sess.data.session_id;
    const network = (sess.data.network || config.primary_ad_network || 'adsgram').toLowerCase();

    let play: { success: boolean; error?: string };
    if (network === 'gigapub') {
      const pid = sess.data.project_id || config.gigapub_project_id || '';
      play = await playGigaPub(pid);
    } else if (network === 'monetag') {
      const zone = sess.data.zone_id || config.monetag_zone_id || '';
      const fn = sess.data.sdk_fn || config.monetag_sdk_fn || `show_${zone}`;
      const script = sess.data.script_url || config.monetag_script_url;
      play = await playMonetag(zone, fn, script);
    } else {
      const blockId = _customBlockId || sess.data.block_id || config.adsgram_block_id;
      if (!blockId) {
        return { success: false, error: 'AdsGram block id not configured' };
      }
      play = await playAdsGram(blockId);
    }

    if (!play.success) {
      return { success: false, network, error: play.error };
    }

    const complete = await api.post('/ads/complete', {
      session_id: sessionId,
      purpose,
      done: true,
      network,
    });
    if (!complete.success) {
      return {
        success: false,
        network,
        error: (complete as any).error || 'Ad verification failed on server',
      };
    }

    return { success: true, session_id: sessionId, network };
  } catch (err: any) {
    console.warn('[Ads] Show ad error:', err);
    return { success: false, error: err?.message || 'Ad playback failed' };
  }
};

export const clearAdsConfigCache = () => {
  cachedConfig = null;
};
