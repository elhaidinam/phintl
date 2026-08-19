import { AttendanceRecord } from '../types';

export interface DeviceInfoDetail {
  id: string;
  name: string;
  brand: string;
  model: string;
  isMobile: boolean;
  icon: string;
  fullLabel: string;
}

/**
 * Returns or generates a permanent unique device/phone identifier for this browser/device.
 */
export function getDeviceIdentifier(): DeviceInfoDetail {
  let storedId = '';
  try {
    storedId = localStorage.getItem('pharmintl_device_id') || '';
  } catch {}

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSamsung = /Samsung|SM-|GT-/i.test(ua);
  const isXiaomi = /Xiaomi|Redmi|POCO/i.test(ua);
  const isHuawei = /Huawei|HONOR/i.test(ua);
  const isPixel = /Pixel/i.test(ua);
  const isMac = /Macintosh/i.test(ua) && !isIPhone && !isIPad;
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let prefix = 'TEL-MOB';
  let brand = 'Smartphone';
  let model = 'Mobile';
  let isMobile = true;
  let icon = '📱';

  if (isIPhone) {
    prefix = 'TEL-IPHONE';
    brand = 'Apple';
    model = 'iPhone';
    isMobile = true;
    icon = '📱';
  } else if (isIPad) {
    prefix = 'TEL-IPAD';
    brand = 'Apple';
    model = 'iPad';
    isMobile = true;
    icon = '📱';
  } else if (isSamsung) {
    prefix = 'TEL-SAMSUNG';
    brand = 'Samsung';
    model = 'Galaxy';
    isMobile = true;
    icon = '📱';
  } else if (isPixel) {
    prefix = 'TEL-PIXEL';
    brand = 'Google';
    model = 'Pixel';
    isMobile = true;
    icon = '📱';
  } else if (isXiaomi) {
    prefix = 'TEL-XIAOMI';
    brand = 'Xiaomi';
    model = 'Redmi/Xiaomi';
    isMobile = true;
    icon = '📱';
  } else if (isHuawei) {
    prefix = 'TEL-HUAWEI';
    brand = 'Huawei';
    model = 'Huawei';
    isMobile = true;
    icon = '📱';
  } else if (isAndroid) {
    prefix = 'TEL-ANDROID';
    brand = 'Android';
    model = 'Smartphone';
    isMobile = true;
    icon = '📱';
  } else if (isMac) {
    prefix = 'PC-MAC';
    brand = 'Apple';
    model = 'MacBook/Mac';
    isMobile = false;
    icon = '💻';
  } else if (isWindows) {
    prefix = 'PC-WINDOWS';
    brand = 'Microsoft';
    model = 'PC Windows';
    isMobile = false;
    icon = '💻';
  } else if (isLinux) {
    prefix = 'PC-LINUX';
    brand = 'Linux';
    model = 'PC Linux';
    isMobile = false;
    icon = '💻';
  }

  if (!storedId) {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    storedId = `${prefix}-${randomHex}`;
    try {
      localStorage.setItem('pharmintl_device_id', storedId);
    } catch {}
  }

  const fullLabel = `${model} (${storedId})`;

  return {
    id: storedId,
    name: model,
    brand,
    model,
    isMobile,
    icon,
    fullLabel
  };
}

/**
 * Deterministic helper to get or display a device/phone identifier for any attendance record.
 */
export function formatRecordDeviceId(record: AttendanceRecord): { id: string; name: string; icon: string; fullLabel: string } {
  if (record.deviceId) {
    const isPhone = record.deviceId.startsWith('TEL-');
    const name = record.deviceName || (isPhone ? 'Smartphone' : 'Terminal');
    const icon = isPhone ? '📱' : '💻';
    return {
      id: record.deviceId,
      name,
      icon,
      fullLabel: `${name} • ${record.deviceId}`
    };
  }

  // If missing in older records, synthesize deterministic identifier per user
  const seed = (record.userId || record.userName || 'user')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const phoneTypes = [
    { prefix: 'TEL-IPHONE', name: 'iPhone 14', icon: '📱' },
    { prefix: 'TEL-SAMSUNG', name: 'Galaxy A54', icon: '📱' },
    { prefix: 'TEL-XIAOMI', name: 'Redmi Note 12', icon: '📱' },
    { prefix: 'TEL-PIXEL', name: 'Google Pixel 7', icon: '📱' },
    { prefix: 'TEL-IPHONE', name: 'iPhone 13 Pro', icon: '📱' },
    { prefix: 'TEL-HUAWEI', name: 'Huawei P40', icon: '📱' },
    { prefix: 'TEL-SAMSUNG', name: 'Galaxy S23', icon: '📱' }
  ];

  const chosen = phoneTypes[seed % phoneTypes.length];
  const hexSuffix = ((seed * 9301 + 49297) % 65536).toString(16).toUpperCase().padStart(4, '0');
  const syntheticId = `${chosen.prefix}-${hexSuffix}`;

  return {
    id: syntheticId,
    name: chosen.name,
    icon: chosen.icon,
    fullLabel: `${chosen.name} • ${syntheticId}`
  };
}
