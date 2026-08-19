import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  Globe, 
  Smartphone, 
  Laptop, 
  Tablet, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  X, 
  ExternalLink,
  AlertTriangle,
  Radio,
  UserCheck
} from 'lucide-react';

interface GpsExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeviceAndConnectionDetails {
  ipAddress: string;
  dateStr: string;
  timeStr: string;
  timezone: string;
  connectionId: string;
  userId: string;
  userName: string;
  deviceType: 'Téléphone' | 'Tablette' | 'Ordinateur';
  os: string;
  browser: string;
  screenResolution: string;
  userAgent: string;
  gps: {
    status: 'loading' | 'success' | 'denied' | 'error' | 'unsupported';
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
    errorMessage?: string;
  };
}

export default function GpsExtractionModal({ isOpen, onClose }: GpsExtractionModalProps) {
  const [details, setDetails] = useState<DeviceAndConnectionDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Helper to detect device category
  const getDeviceType = (ua: string, width: number): 'Téléphone' | 'Tablette' | 'Ordinateur' => {
    if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
      return 'Tablette';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'Téléphone';
    }
    if (width <= 768) {
      return 'Téléphone';
    }
    if (width > 768 && width <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      return 'Tablette';
    }
    return 'Ordinateur';
  };

  // Helper to parse OS
  const getOS = (ua: string): string => {
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS / iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Système inconnu';
  };

  // Helper to parse Browser
  const getBrowser = (ua: string): string => {
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    if (ua.includes('Trident')) return 'Internet Explorer';
    if (ua.includes('Edge') || ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Chrome')) return 'Google Chrome';
    if (ua.includes('Safari')) return 'Apple Safari';
    return 'Navigateur standard';
  };

  // Extract all details
  const extractAllDetails = async () => {
    setLoading(true);
    setCopied(false);

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const ua = navigator.userAgent;
    const width = window.screen?.width || window.innerWidth;
    const height = window.screen?.height || window.innerHeight;
    const deviceType = getDeviceType(ua, width);
    const os = getOS(ua);
    const browser = getBrowser(ua);
    const screenResolution = `${width}x${height} px`;

    // Session / Connection identifier
    let connectionId = sessionStorage.getItem('pharmintl_connection_id');
    if (!connectionId) {
      const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
      connectionId = `CONN-${dateTag}-${randHex}`;
      sessionStorage.setItem('pharmintl_connection_id', connectionId);
    }

    // User identifier from storage if logged in
    let userId = 'PUBLIC-INVITE';
    let userName = 'Visiteur (Espace Public)';
    try {
      const storedUser = localStorage.getItem('pharmintl_logged_in_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.username) {
          userId = parsed.username;
          userName = parsed.name || parsed.username;
        }
      }
    } catch (e) {
      // fallback
    }

    // Fetch IP Address
    let ipAddress = 'Détection en cours...';
    try {
      const res = await fetch('/api/client-info');
      if (res.ok) {
        const data = await res.json();
        if (data.ip) {
          ipAddress = data.ip;
        }
      } else {
        throw new Error('Fallback to public IP');
      }
    } catch (err) {
      try {
        const resIp = await fetch('https://api.ipify.org?format=json');
        if (resIp.ok) {
          const dataIp = await resIp.json();
          ipAddress = dataIp.ip || 'Non disponible';
        }
      } catch (e) {
        ipAddress = '127.0.0.1 (IP locale)';
      }
    }

    // Initial details state
    const currentDetails: DeviceAndConnectionDetails = {
      ipAddress,
      dateStr,
      timeStr,
      timezone,
      connectionId,
      userId,
      userName,
      deviceType,
      os,
      browser,
      screenResolution,
      userAgent: ua,
      gps: {
        status: 'loading',
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        speed: null
      }
    };

    setDetails(currentDetails);

    // Geolocation extraction
    if (!('geolocation' in navigator)) {
      setDetails(prev => prev ? {
        ...prev,
        gps: {
          status: 'unsupported',
          latitude: null,
          longitude: null,
          accuracy: null,
          altitude: null,
          speed: null,
          errorMessage: 'La géolocalisation n’est pas supportée par votre appareil/navigateur.'
        }
      } : null);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetails(prev => prev ? {
          ...prev,
          gps: {
            status: 'success',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed
          }
        } : null);
        setLoading(false);
      },
      (error) => {
        let msg = 'Erreur lors de la récupération du signal GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Autorisation de géolocalisation refusée par l’utilisateur ou le navigateur.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS ou position indisponible actuellement.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Délai d’attente dépassé pour la capture GPS.';
        }

        setDetails(prev => prev ? {
          ...prev,
          gps: {
            status: error.code === error.PERMISSION_DENIED ? 'denied' : 'error',
            latitude: null,
            longitude: null,
            accuracy: null,
            altitude: null,
            speed: null,
            errorMessage: msg
          }
        } : null);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (isOpen) {
      extractAllDetails();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate complete text report
  const getFormattedReport = (): string => {
    if (!details) return '';
    const gpsText = details.gps.status === 'success'
      ? `Latitude : ${details.gps.latitude}\nLongitude : ${details.gps.longitude}\nPrécision : +/- ${Math.round(details.gps.accuracy || 0)} mètres${details.gps.altitude ? `\nAltitude : ${details.gps.altitude} m` : ''}`
      : `GPS Status : ${details.gps.status} (${details.gps.errorMessage || 'Indisponible'})`;

    return `====================================================
ATTESTATION D'EXTRACTION DE CONNEXION & GÉOLOCALISATION
Pharmacie Internationale - Portail de Redevabilité
====================================================
📅 DATE : ${details.dateStr}
⏰ HEURE : ${details.timeStr} (${details.timezone})

👤 IDENTIFIANT UTILISATEUR : ${details.userName} (${details.userId})
🔑 IDENTIFIANT CONNEXION : ${details.connectionId}
🌐 ADRESSE IP DU TERMINAL : ${details.ipAddress}

💻 APPAREIL UTILISÉ : ${details.deviceType}
🖥️ SYSTÈME D'EXPLOITATION : ${details.os}
🌐 NAVIGATEUR : ${details.browser}
📐 RÉSOLUTION ÉCRAN : ${details.screenResolution}

📍 COORDONNÉES GPS EXTRAITES :
${gpsText}
====================================================`;
  };

  const handleCopyReport = () => {
    const text = getFormattedReport();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadReport = () => {
    const text = getFormattedReport();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attestation_GPS_Connexion_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: 'Téléphone' | 'Tablette' | 'Ordinateur') => {
    if (type === 'Téléphone') return <Smartphone className="w-5 h-5 text-blue-600" />;
    if (type === 'Tablette') return <Tablet className="w-5 h-5 text-purple-600" />;
    return <Laptop className="w-5 h-5 text-emerald-600" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <Radio className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-white/30">
                  Diagnostic & Audit
                </span>
                <h3 className="text-xl font-extrabold tracking-tight mt-1">
                  Extraction Coordonnées GPS & Connexion
                </h3>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {loading && (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                <div>
                  <h4 className="font-extrabold text-gray-800 text-base">Extraction automatique en cours...</h4>
                  <p className="text-xs text-gray-500 mt-1">Acquisition de la position GPS, adresse IP et identifiants de l'appareil.</p>
                </div>
              </div>
            )}

            {!loading && details && (
              <>
                {/* Notice banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Extraction Certifiée & Horodatée</span>
                    Les données de géolocalisation, date, heure, identifiant et adresse IP ont été récupérées automatiquement pour ce terminal.
                  </div>
                </div>

                {/* Grid 1: GPS Coordinates */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5 text-red-500" />
                      Coordonnées GPS
                    </h4>
                    {details.gps.status === 'success' && (
                      <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full border border-green-200">
                        GPS Actif (+/- {Math.round(details.gps.accuracy || 0)}m)
                      </span>
                    )}
                  </div>

                  {details.gps.status === 'success' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Latitude</span>
                          <span className="font-mono font-extrabold text-gray-900 text-sm">{details.gps.latitude}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Longitude</span>
                          <span className="font-mono font-extrabold text-gray-900 text-sm">{details.gps.longitude}</span>
                        </div>
                      </div>

                      {details.gps.latitude && details.gps.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${details.gps.latitude},${details.gps.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          <ExternalLink size={14} />
                          Afficher l'emplacement sur Google Maps
                        </a>
                      )}
                    </div>
                  )}

                  {(details.gps.status === 'denied' || details.gps.status === 'error' || details.gps.status === 'unsupported') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{details.gps.errorMessage || 'Impossible de lire le signal GPS.'} (Veuillez autoriser l'accès à la localisation dans les paramètres du navigateur)</span>
                    </div>
                  )}
                </div>

                {/* Grid 2: Date, Time & IP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date & Time */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Horodatage Officiel
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900 capitalize">{details.dateStr}</p>
                      <p className="text-xl font-mono font-black text-emerald-700">{details.timeStr}</p>
                      <p className="text-[10px] text-gray-400 font-mono">Fuseau : {details.timezone}</p>
                    </div>
                  </div>

                  {/* IP Address */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Adresse IP du Terminal
                    </h4>
                    <div className="space-y-1">
                      <p className="text-lg font-mono font-black text-gray-900">{details.ipAddress}</p>
                      <span className="inline-block text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        Réseau public / Connexion active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid 3: Identifiers & Device info */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    {getDeviceIcon(details.deviceType)}
                    Identifiants & Appareil de Connexion
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Type d'appareil</span>
                      <span className="font-extrabold text-gray-900 flex items-center gap-1.5 mt-0.5">
                        {details.deviceType} ({details.os})
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">ID de Connexion Unique</span>
                      <span className="font-mono font-extrabold text-emerald-700 text-xs mt-0.5 block">{details.connectionId}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Utilisateur / Session</span>
                      <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {details.userName}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Navigateur & Écran</span>
                      <span className="font-medium text-gray-700 text-xs mt-0.5 block truncate">
                        {details.browser} ({details.screenResolution})
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 p-4 md:px-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={extractAllDetails}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Re-extraire
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyReport}
                disabled={loading || !details}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copié !' : 'Copier'}
              </button>

              <button
                onClick={handleDownloadReport}
                disabled={loading || !details}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={14} />
                Télécharger (.txt)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
