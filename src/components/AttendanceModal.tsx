import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  UserCheck, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  X, 
  AlertCircle, 
  Sparkles,
  ShieldCheck,
  Compass,
  FileSpreadsheet,
  Calendar,
  Lock,
  ChevronRight,
  Globe,
  Wifi,
  Radio,
  Loader2,
  Users,
  Search,
  User
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';
import { 
  getInternetGmtInfo, 
  getExactPointageGmtTime, 
  syncInternetGmtTime, 
  InternetGmtInfo 
} from '../lib/internetTime';
import { pushRealtimeUpdate, registerRealtimeSync } from '../lib/realtimeSync';
import { getDeviceIdentifier } from '../lib/deviceHelper';
import { DEFAULT_EMPLOYEES } from '../data';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  loggedInUser: {
    type: string;
    employeeId?: string;
    username: string;
    name: string;
  } | null;
  employees?: Employee[];
  onOpenLoginModal?: () => void;
}

export default function AttendanceModal({ 
  isOpen, 
  onClose, 
  loggedInUser,
  employees = [],
  onOpenLoginModal
}: AttendanceModalProps) {
  // Available employees list
  const staffList = employees.length > 0 ? employees : DEFAULT_EMPLOYEES;

  // Selected employee for pointage (defaults to loggedInUser if available)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  // Live Internet GMT Time state (calibrated independently from device clock)
  const [gmtInfo, setGmtInfo] = useState<InternetGmtInfo>(() => getInternetGmtInfo());
  
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    status: 'loading' | 'success' | 'denied' | 'error' | 'unavailable';
    errorMessage?: string;
  }>({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: 'loading'
  });

  const [submittingType, setSubmittingType] = useState<'arrival' | 'departure' | null>(null);
  const [lastSubmittedRecord, setLastSubmittedRecord] = useState<AttendanceRecord | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem('pharmintl_attendance_records');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep selectedStaffId in sync with loggedInUser or default
  useEffect(() => {
    if (loggedInUser) {
      const match = staffList.find(
        e => e.id === loggedInUser.employeeId || 
             e.username === loggedInUser.username || 
             e.name.toLowerCase() === loggedInUser.name.toLowerCase()
      );
      if (match) {
        setSelectedStaffId(match.id);
      } else {
        setSelectedStaffId(loggedInUser.username || loggedInUser.name);
      }
    } else if (staffList.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staffList[0].id);
    }
  }, [loggedInUser, staffList]);

  // Current active staff object
  const activeStaff = staffList.find(e => e.id === selectedStaffId || e.username === selectedStaffId) || (
    loggedInUser ? {
      id: loggedInUser.employeeId || loggedInUser.username,
      name: loggedInUser.name,
      username: loggedInUser.username,
      role: loggedInUser.type === 'owner' ? 'Direction' : (loggedInUser.type === 'supervisor' ? 'Superviseur' : 'Collaborateur'),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser.name)}&background=059669&color=fff`
    } : staffList[0]
  );

  // Listen to realtime attendance sync updates to always have the latest list
  useEffect(() => {
    const unsub = registerRealtimeSync({
      onAttendanceRecords: (incoming) => {
        if (Array.isArray(incoming) && incoming.length > 0) {
          setAttendanceHistory(incoming);
        }
      }
    });
    return () => unsub();
  }, []);

  // Keep live Internet GMT clock ticking every second
  useEffect(() => {
    if (!isOpen) return;

    // Immediately trigger a network resync to guarantee precision
    syncInternetGmtTime().then(() => {
      setGmtInfo(getInternetGmtInfo());
    });

    const interval = setInterval(() => {
      setGmtInfo(getInternetGmtInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Request GPS Location when modal opens
  useEffect(() => {
    if (!isOpen) {
      setShowSuccessScreen(false);
      setSubmittingType(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        status: 'unavailable',
        errorMessage: 'Géolocalisation non supportée par ce navigateur'
      });
      return;
    }

    setGpsLocation(prev => ({ ...prev, status: 'loading' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          status: 'success'
        });
      },
      (error) => {
        let msg = 'Position indisponible';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Autorisation GPS refusée';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS introuvable';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Délai GPS dépassé';
        }
        setGpsLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'error',
          errorMessage: msg
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [isOpen]);

  if (!isOpen) return null;

  // Execute pointage with authoritative Internet GMT time
  const handleRecordAttendance = async (type: 'arrival' | 'departure') => {
    if (!activeStaff) return;

    setSubmittingType(type);

    // Fetch authoritative instant GMT time over internet
    const exactGmt = await getExactPointageGmtTime();
    const dev = getDeviceIdentifier();

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      typeLabel: type === 'arrival' ? 'Arrivée à la pharmacie' : 'Départ de la pharmacie',
      userId: activeStaff.username || activeStaff.id || activeStaff.name,
      userName: activeStaff.name,
      userRole: (activeStaff as any).role || 'Personnel',
      timestamp: exactGmt.isoString, // Strict UTC / GMT ISO string
      dateStr: exactGmt.dateStr,     // Strict Internet GMT YYYY-MM-DD
      timeStr: exactGmt.timeStr,     // Strict Internet GMT HH:mm:ss
      deviceId: dev.id,
      deviceName: dev.name,
      location: {
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
        status: gpsLocation.status === 'success' ? 'success' : (gpsLocation.status === 'denied' ? 'denied' : 'unavailable')
      },
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        deviceId: dev.id,
        deviceName: dev.name,
        model: dev.model
      }
    };

    // Read the most recent records from local storage before appending
    let currentList: AttendanceRecord[] = [];
    try {
      const stored = localStorage.getItem('pharmintl_attendance_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) currentList = parsed;
      }
    } catch {}
    if (currentList.length === 0) {
      currentList = attendanceHistory;
    }

    // Save locally & broadcast across tabs and server
    const updated = [record, ...currentList.filter(r => r.id !== record.id)];
    setAttendanceHistory(updated);
    try {
      localStorage.setItem('pharmintl_attendance_records', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('pharmintl_attendance_changed', { detail: record }));
      
      // Dual-sync to server & SSE to make pointage available across all phones & devices
      pushRealtimeUpdate('attendance', 'records', updated);
    } catch (e) {
      console.error('Erreur de sauvegarde pointage:', e);
    }

    setLastSubmittedRecord(record);
    setShowSuccessScreen(true);
    setSubmittingType(null);
  };

  const formattedGmtDate = gmtInfo.gmtDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  const deviceDriftSeconds = Math.abs(gmtInfo.offsetSeconds);
  const hasSignificantDrift = deviceDriftSeconds >= 15;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6"
        >
          {/* Header style Google Forms / Pharmintl */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider text-emerald-100">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Heure Exacte Internet GMT • Officiel</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Pointage du Personnel</span>
                </h3>
                <p className="text-xs text-emerald-100/90 font-medium">
                  Pharmacie Internationale • Enregistrement GMT certifié & géolocalisé
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {showSuccessScreen && lastSubmittedRecord ? (
              /* Success View */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-5"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 uppercase tracking-wider inline-flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-700" />
                    Pointage certifié Internet GMT
                  </span>
                  <h4 className="text-2xl font-black text-gray-900 mt-2 flex items-center justify-center gap-2">
                    <span>{lastSubmittedRecord.type === 'arrival' ? '◆' : '●'}</span>
                    <span>{lastSubmittedRecord.typeLabel}</span>
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Merci <strong className="text-gray-800">{lastSubmittedRecord.userName}</strong>, votre déclaration a été enregistrée à <strong className="text-emerald-700 font-mono">{lastSubmittedRecord.timeStr} GMT</strong>.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-200/80 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Collaborateur :</span>
                    <span className="font-bold text-gray-900">{lastSubmittedRecord.userName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Type & Symbole Courbe :</span>
                    <span className="font-bold text-emerald-700">
                      {lastSubmittedRecord.type === 'arrival' ? '◆ Arrivée (Losange)' : '● Départ (Point)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Heure prélevée (GMT Internet) :</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {lastSubmittedRecord.timeStr} GMT
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Date officielle GMT :</span>
                    <span className="font-bold text-gray-900">{lastSubmittedRecord.dateStr}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Terminal / Téléphone :</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                      <span>📱</span>
                      <span>{lastSubmittedRecord.deviceId || 'TEL-DEVICE-OK'}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Géolocalisation :</span>
                    <span className="font-bold text-emerald-700">
                      {lastSubmittedRecord.location.latitude && lastSubmittedRecord.location.longitude
                        ? `${lastSubmittedRecord.location.latitude.toFixed(5)}, ${lastSubmittedRecord.location.longitude.toFixed(5)} (±${lastSubmittedRecord.location.accuracy || 0}m)`
                        : 'Signal enregistré'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900 flex items-center gap-2 text-left">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Heure extraite directement selon le réseau Internet GMT et synchronisée instantanément sur la courbe temporelle.
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSuccessScreen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Nouveau pointage
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Active Pointage Form View */
              <div className="space-y-6">
                {/* Employee Selector Bar */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-gray-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Personnel effectuant le pointage :</span>
                    </label>
                    {loggedInUser && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Connecté
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs">
                    {activeStaff?.avatar ? (
                      <img 
                        src={activeStaff.avatar} 
                        alt={activeStaff.name} 
                        className="w-10 h-10 rounded-full border border-emerald-200 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {activeStaff?.name?.charAt(0) || 'P'}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full bg-transparent font-black text-sm text-gray-900 focus:outline-hidden cursor-pointer"
                      >
                        {staffList.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-500 font-medium truncate">
                        {(activeStaff as any)?.role || 'Collaborateur de la Pharmacie'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-detected identity, time and location summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Date & Heure Internet GMT */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3 relative overflow-hidden">
                    <div className="p-2 bg-blue-600 text-white rounded-xl">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-blue-800">Heure GMT Internet</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Synchronisé Internet" />
                      </div>
                      <p className="text-sm font-black text-blue-950 font-mono tracking-tight flex items-baseline gap-1">
                        <span>{gmtInfo.timeStr}</span>
                        <span className="text-[10px] font-bold text-blue-600">GMT</span>
                      </p>
                      <p className="text-[10px] text-gray-500 truncate capitalize">{formattedGmtDate}</p>
                    </div>
                  </div>

                  {/* Localisation */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
                    <div className="p-2 bg-purple-600 text-white rounded-xl">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-purple-800">Localisation</p>
                      {gpsLocation.status === 'loading' ? (
                        <p className="text-xs font-bold text-purple-700 animate-pulse">Détection GPS...</p>
                      ) : gpsLocation.status === 'success' ? (
                        <div>
                          <p className="text-xs font-black text-purple-900 font-mono">
                            {gpsLocation.latitude?.toFixed(4)}, {gpsLocation.longitude?.toFixed(4)}
                          </p>
                          <p className="text-[10px] text-purple-600">Précision ±{gpsLocation.accuracy}m</p>
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-purple-900 truncate">
                          Position enregistrée
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info band regarding Internet GMT synchronization */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-700">
                  <Radio className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0 animate-pulse" />
                  <div className="space-y-0.5 leading-relaxed text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900 font-bold">Prélèvement officiel selon l'heure Internet GMT :</strong>
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                        Certifié
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      L'horodatage officiel est certifié selon le serveur GMT pour garantir l'exactitude de la courbe temporelle.
                    </p>
                  </div>
                </div>

                {/* Question & Instructions */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    Sélectionnez votre type d'action pour valider :
                  </h4>
                  <p className="text-xs text-gray-600">
                    Veuillez cliquer sur le bouton correspondant à votre pointage actuel.
                  </p>
                </div>

                {/* THE TWO EXCLUSIVE BUTTONS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Button 1: Arrivée à la pharmacie */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: submittingType ? 1 : 1.02 }}
                    whileTap={{ scale: submittingType ? 1 : 0.98 }}
                    disabled={submittingType !== null}
                    onClick={() => handleRecordAttendance('arrival')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black shadow-lg shadow-emerald-500/20 border-2 border-emerald-400/50 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all group disabled:opacity-75"
                  >
                    <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
                      {submittingType === 'arrival' ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <span className="text-2xl font-black">◆</span>
                      )}
                    </div>
                    <div>
                      <span className="text-base font-black tracking-tight block">
                        {submittingType === 'arrival' ? 'Validation en cours...' : 'Arrivée à la pharmacie'}
                      </span>
                      <span className="text-[11px] text-emerald-100 font-medium block mt-0.5">
                        Prise de service / Début de garde (Losange ◆)
                      </span>
                    </div>
                  </motion.button>

                  {/* Button 2: Départ de la pharmacie */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: submittingType ? 1 : 1.02 }}
                    whileTap={{ scale: submittingType ? 1 : 0.98 }}
                    disabled={submittingType !== null}
                    onClick={() => handleRecordAttendance('departure')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black shadow-lg shadow-orange-500/20 border-2 border-orange-400/50 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all group disabled:opacity-75"
                  >
                    <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
                      {submittingType === 'departure' ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <span className="text-2xl font-black">●</span>
                      )}
                    </div>
                    <div>
                      <span className="text-base font-black tracking-tight block">
                        {submittingType === 'departure' ? 'Validation en cours...' : 'Départ de la pharmacie'}
                      </span>
                      <span className="text-[11px] text-orange-100 font-medium block mt-0.5">
                        Fin de service / Fin de journée (Point ●)
                      </span>
                    </div>
                  </motion.button>
                </div>

                {/* Recent submissions info */}
                {attendanceHistory.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Derniers pointages récents ({attendanceHistory.length})</span>
                      <span className="text-emerald-700 font-mono text-[10px] font-bold">Horodatage GMT Internet</span>
                    </p>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {attendanceHistory.slice(0, 3).map((rec) => (
                        <div 
                          key={rec.id} 
                          className="p-2 rounded-xl bg-gray-50 border border-gray-200/70 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-gray-900">{rec.type === 'arrival' ? '◆' : '●'}</span>
                            <span className="font-bold text-gray-900">{rec.userName}</span>
                            <span className="text-gray-500">• {rec.typeLabel}</span>
                          </div>
                          <span className="font-mono text-gray-600 font-bold">{rec.dateStr} à {rec.timeStr} GMT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sécurité & synchronisation Internet GMT Pharmintl
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-700 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
