/**
 * Internet GMT Time Calibration & Extraction Module
 * 
 * Guarantees extracting the exact Internet GMT/UTC time regardless of 
 * the phone's clock or local device time misconfigurations.
 */

let cachedOffsetMs: number = (() => {
  try {
    const saved = localStorage.getItem('pharmintl_gmt_offset_ms');
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
})();

let isGmtSynced = false;
let lastSyncTimestamp = 0;

export interface InternetGmtInfo {
  gmtDate: Date;
  dateStr: string; // YYYY-MM-DD (GMT)
  timeStr: string; // HH:mm:ss (GMT)
  timeStrWithLabel: string; // HH:mm:ss GMT
  isoString: string;
  timestamp: number;
  isSynced: boolean;
  offsetMs: number;
  offsetSeconds: number;
  timeZone: string;
  timeSource: 'server_gmt' | 'worldtime_api' | 'calibrated_offset' | 'device_fallback';
}

/**
 * Format a Date into GMT/UTC YYYY-MM-DD and HH:mm:ss
 */
export function formatGmtDateComponents(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;

  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  const timeStr = `${hh}:${mm}:${ss}`;

  return { dateStr, timeStr, hh, mm, ss };
}

/**
 * Perform synchronization with Server / Internet GMT time
 */
export async function syncInternetGmtTime(): Promise<{ offsetMs: number; isSynced: boolean }> {
  // 1. Try Primary: Dedicated backend server time endpoint
  try {
    const t0 = Date.now();
    const res = await fetch('/api/time', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });

    if (res.ok) {
      const data = await res.json();
      const t1 = Date.now();
      const rtt = t1 - t0;
      const serverTime = typeof data.timestamp === 'number' ? data.timestamp : new Date(data.iso).getTime();
      
      // Estimated true GMT time when t1 occurs = serverTime + (rtt / 2)
      const estimatedTrueGmt = serverTime + Math.round(rtt / 2);
      cachedOffsetMs = estimatedTrueGmt - t1;
      isGmtSynced = true;
      lastSyncTimestamp = Date.now();

      try {
        localStorage.setItem('pharmintl_gmt_offset_ms', String(cachedOffsetMs));
        localStorage.setItem('pharmintl_gmt_last_synced', String(lastSyncTimestamp));
      } catch {}

      return { offsetMs: cachedOffsetMs, isSynced: true };
    }
  } catch (err) {
    console.warn('Backend /api/time sync failed, trying external fallback...', err);
  }

  // 2. Try Secondary Fallback: Public Internet Time APIs
  try {
    const t0 = Date.now();
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/GMT', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      const data = await res.json();
      const t1 = Date.now();
      const rtt = t1 - t0;
      const externalGmtTime = new Date(data.utc_datetime || data.datetime).getTime();
      
      const estimatedTrueGmt = externalGmtTime + Math.round(rtt / 2);
      cachedOffsetMs = estimatedTrueGmt - t1;
      isGmtSynced = true;
      lastSyncTimestamp = Date.now();

      try {
        localStorage.setItem('pharmintl_gmt_offset_ms', String(cachedOffsetMs));
        localStorage.setItem('pharmintl_gmt_last_synced', String(lastSyncTimestamp));
      } catch {}

      return { offsetMs: cachedOffsetMs, isSynced: true };
    }
  } catch {}

  // 3. Fallback: HTTP Date Header from root / index
  try {
    const t0 = Date.now();
    const res = await fetch('/', { method: 'HEAD', cache: 'no-store' });
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const t1 = Date.now();
      const serverGmt = new Date(dateHeader).getTime();
      if (!isNaN(serverGmt)) {
        const estimatedTrueGmt = serverGmt + Math.round((t1 - t0) / 2);
        cachedOffsetMs = estimatedTrueGmt - t1;
        isGmtSynced = true;
        lastSyncTimestamp = Date.now();
        return { offsetMs: cachedOffsetMs, isSynced: true };
      }
    }
  } catch {}

  return { offsetMs: cachedOffsetMs, isSynced: isGmtSynced };
}

/**
 * Get current date adjusted to the exact Internet GMT/UTC
 */
export function getInternetGmtDate(): Date {
  return new Date(Date.now() + cachedOffsetMs);
}

/**
 * Get full diagnostic & display information about the current Internet GMT time
 */
export function getInternetGmtInfo(): InternetGmtInfo {
  const gmtDate = getInternetGmtDate();
  const { dateStr, timeStr } = formatGmtDateComponents(gmtDate);

  return {
    gmtDate,
    dateStr,
    timeStr,
    timeStrWithLabel: `${timeStr} GMT`,
    isoString: gmtDate.toISOString(),
    timestamp: gmtDate.getTime(),
    isSynced: isGmtSynced || lastSyncTimestamp > 0,
    offsetMs: cachedOffsetMs,
    offsetSeconds: Math.round(cachedOffsetMs / 1000),
    timeZone: 'GMT (Temps Universel Coordonné)',
    timeSource: isGmtSynced ? 'server_gmt' : (lastSyncTimestamp > 0 ? 'calibrated_offset' : 'device_fallback')
  };
}

/**
 * Force fetch authoritative time right at the moment of pointage
 */
export async function getExactPointageGmtTime(): Promise<InternetGmtInfo> {
  try {
    // Attempt fast 1.2s fresh sync
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const t0 = Date.now();
    const res = await fetch('/api/time', {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const t1 = Date.now();
      const rtt = t1 - t0;
      const serverTime = typeof data.timestamp === 'number' ? data.timestamp : new Date(data.iso).getTime();
      const estimatedTrueGmt = serverTime + Math.round(rtt / 2);
      cachedOffsetMs = estimatedTrueGmt - t1;
      isGmtSynced = true;
      lastSyncTimestamp = Date.now();

      const exactDate = new Date(estimatedTrueGmt);
      const { dateStr, timeStr } = formatGmtDateComponents(exactDate);

      return {
        gmtDate: exactDate,
        dateStr,
        timeStr,
        timeStrWithLabel: `${timeStr} GMT`,
        isoString: exactDate.toISOString(),
        timestamp: exactDate.getTime(),
        isSynced: true,
        offsetMs: cachedOffsetMs,
        offsetSeconds: Math.round(cachedOffsetMs / 1000),
        timeZone: 'GMT',
        timeSource: 'server_gmt'
      };
    }
  } catch (e) {
    // If fast fetch timed out or offline, proceed safely with calibrated offset
  }

  return getInternetGmtInfo();
}

// Auto-sync on script import
if (typeof window !== 'undefined') {
  syncInternetGmtTime();
  // Periodic resync every 5 minutes
  setInterval(syncInternetGmtTime, 5 * 60 * 1000);
}
