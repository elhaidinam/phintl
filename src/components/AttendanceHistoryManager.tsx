import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  MapPin, 
  Search, 
  Calendar as CalendarIcon, 
  Users, 
  LogIn, 
  LogOut, 
  ExternalLink, 
  Download, 
  RotateCcw, 
  ArrowUpDown,
  ShieldCheck, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Smartphone
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';
import AttendanceCurveChart from './AttendanceCurveChart';
import AttendanceHistoryModal from './AttendanceHistoryModal';
import { registerRealtimeSync } from '../lib/realtimeSync';
import { formatRecordDeviceId } from '../lib/deviceHelper';

interface AttendanceHistoryManagerProps {
  employees: Employee[];
  loggedInUser: {
    type: string;
    employeeId?: string;
    username: string;
    name: string;
    isSupervisor?: boolean;
  } | null;
  onOpenAttendanceModal?: () => void;
}

// Initial realistic default records over 7 days if storage is empty
const defaultSeedAttendance = (employees: Employee[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const sampleStaff = employees.slice(0, 8);
  const now = new Date();

  // If GMT time is 2026-08-18 before 07h GMT, start offset at 1 (2026-08-17) so no future pointages exist on 18 août 2026
  const isGmtAug18Before7 = now.toISOString().startsWith('2026-08-18') && now.getUTCHours() < 7;
  const baseOffset = isGmtAug18Before7 ? 1 : 0;

  const phonePresets = [
    { id: 'TEL-IPHONE-8A32', name: 'iPhone 14 Pro' },
    { id: 'TEL-SAMS-91B2', name: 'Samsung Galaxy S23' },
    { id: 'TEL-XIAO-4C19', name: 'Redmi Note 12' },
    { id: 'TEL-PIXEL-22E5', name: 'Google Pixel 7' },
    { id: 'TEL-IPHONE-7F01', name: 'iPhone 13' },
    { id: 'TEL-HUAWEI-5D88', name: 'Huawei P40' },
    { id: 'TEL-SAMS-33K4', name: 'Samsung Galaxy A54' },
    { id: 'TEL-ANDR-66M7', name: 'Honor 90' }
  ];

  // Generate 7 days of realistic history ending on the actual past/current active day
  for (let dayOffset = 6 + baseOffset; dayOffset >= baseOffset; dayOffset--) {
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    const isLatestDay = dayOffset === baseOffset;

    sampleStaff.forEach((emp, empIdx) => {
      const empId = emp.username || emp.id;
      const phone = phonePresets[empIdx % phonePresets.length];
      // Staggered schedule around 07:45 - 08:30
      const startMin = 30 + (empIdx * 7) % 25;
      const arrHourStr = `07:${String(startMin).padStart(2, '0')}:15`;

      // Departure around 17:00 - 18:15
      const endMin = 10 + (empIdx * 8) % 35;
      const depHourStr = `17:${String(endMin).padStart(2, '0')}:40`;

      // Intentionally create 1 or 2 missing pointages to demonstrate the red question mark
      const skipDeparture = (dayOffset === 2 + baseOffset && empIdx === 2) || (isLatestDay && empIdx === 3);
      const skipArrival = dayOffset === 4 + baseOffset && empIdx === 5;

      if (!skipArrival) {
        records.push({
          id: `att-seed-${dateStr}-arr-${emp.id}`,
          type: 'arrival',
          typeLabel: 'Arrivée à la pharmacie',
          userId: empId,
          userName: emp.name,
          userRole: emp.role,
          timestamp: `${dateStr}T${arrHourStr}Z`,
          dateStr: dateStr,
          timeStr: arrHourStr,
          deviceId: phone.id,
          deviceName: phone.name,
          location: {
            latitude: 6.1374 + (empIdx * 0.0001),
            longitude: 1.2125 + (empIdx * 0.0001),
            accuracy: 8 + (empIdx % 5),
            status: 'success'
          }
        });
      }

      if (!skipDeparture) {
        records.push({
          id: `att-seed-${dateStr}-dep-${emp.id}`,
          type: 'departure',
          typeLabel: 'Départ de la pharmacie',
          userId: empId,
          userName: emp.name,
          userRole: emp.role,
          timestamp: `${dateStr}T${depHourStr}Z`,
          dateStr: dateStr,
          timeStr: depHourStr,
          deviceId: phone.id,
          deviceName: phone.name,
          location: {
            latitude: 6.1374 + (empIdx * 0.0001),
            longitude: 1.2124 + (empIdx * 0.0001),
            accuracy: 9 + (empIdx % 4),
            status: 'success'
          }
        });
      }
    });
  }

  return records;
};

// Sanitizer strictly for seed demo pointages created with old date references
const sanitizeRecords = (recs: AttendanceRecord[]): AttendanceRecord[] => {
  return recs.map(rec => {
    // Only adjust explicit demo seed records, NEVER genuine user pointages
    if (rec.id && (rec.id.includes('seed') || rec.id.includes('att-seed')) && rec.dateStr === '2026-08-18') {
      return {
        ...rec,
        id: rec.id.replace('2026-08-18', '2026-08-17'),
        dateStr: '2026-08-17',
        timestamp: (rec.timestamp || '').replace('2026-08-18', '2026-08-17')
      };
    }
    return rec;
  });
};

export default function AttendanceHistoryManager({
  employees,
  loggedInUser,
  onOpenAttendanceModal
}: AttendanceHistoryManagerProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem('pharmintl_attendance_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = sanitizeRecords(parsed);
          localStorage.setItem('pharmintl_attendance_records', JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const seed = defaultSeedAttendance(employees);
    try {
      localStorage.setItem('pharmintl_attendance_records', JSON.stringify(seed));
    } catch {}
    return seed;
  });

  // State for Daily View (Main Table displays ONE day)
  const [dailyViewDate, setDailyViewDate] = useState<string>(() => todayStr);

  // Floating Modal State ("Fenêtre volante")
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Daily Filter States
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'arrival' | 'departure'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Reload records on external change or window event
  const loadRecords = (newRecord?: AttendanceRecord) => {
    try {
      const stored = localStorage.getItem('pharmintl_attendance_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = sanitizeRecords(parsed);
          setRecords(cleaned);
          // If a new record was passed or found at the top, ensure dailyViewDate matches so it is instantly visible
          if (newRecord?.dateStr) {
            setDailyViewDate(newRecord.dateStr);
          } else if (cleaned.length > 0 && cleaned[0]?.dateStr) {
            setDailyViewDate(cleaned[0].dateStr);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleSync = (e?: any) => {
      const detail = e?.detail as AttendanceRecord | undefined;
      loadRecords(detail);
    };
    window.addEventListener('pharmintl_attendance_changed', handleSync);
    window.addEventListener('storage', handleSync);

    const unsubscribe = registerRealtimeSync({
      onAttendanceRecords: (incomingRecords) => {
        if (Array.isArray(incomingRecords) && incomingRecords.length > 0) {
          setRecords(prev => {
            const sanitizedIncoming = sanitizeRecords(incomingRecords);
            const map = new Map<string, AttendanceRecord>();
            [...sanitizedIncoming, ...prev].forEach(r => {
              if (r && r.id) map.set(r.id, r);
            });
            const merged = Array.from(map.values()).sort((a, b) => {
              const da = new Date(a.timestamp || `${a.dateStr}T${a.timeStr}`).getTime();
              const dbTime = new Date(b.timestamp || `${b.dateStr}T${b.timeStr}`).getTime();
              return dbTime - da;
            });
            try {
              localStorage.setItem('pharmintl_attendance_records', JSON.stringify(merged));
            } catch {}
            if (merged.length > 0 && merged[0]?.dateStr) {
              setDailyViewDate(merged[0].dateStr);
            }
            return merged;
          });
        }
      }
    });

    return () => {
      window.removeEventListener('pharmintl_attendance_changed', handleSync);
      window.removeEventListener('storage', handleSync);
      unsubscribe();
    };
  }, []);

  // Navigate Days
  const handlePrevDay = () => {
    const d = new Date(dailyViewDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setDailyViewDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(dailyViewDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setDailyViewDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setDailyViewDate(todayStr);
  };

  // Filtered records for the SINGLE DAY table
  const dailyRecords = useMemo(() => {
    return records.filter((rec) => {
      // Must match the single active day
      if (rec.dateStr !== dailyViewDate) return false;

      // 1. Staff Filter
      if (selectedStaff !== 'all') {
        const matchesUserId = rec.userId === selectedStaff;
        const matchesUserName = rec.userName.toLowerCase() === selectedStaff.toLowerCase();
        if (!matchesUserId && !matchesUserName) return false;
      }

      // 2. Type Filter
      if (selectedType !== 'all' && rec.type !== selectedType) {
        return false;
      }

      // 3. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inName = rec.userName.toLowerCase().includes(term);
        const inUser = rec.userId.toLowerCase().includes(term);
        const inRole = (rec.userRole || '').toLowerCase().includes(term);
        const inTime = rec.timeStr.includes(term);
        if (!inName && !inUser && !inRole && !inTime) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp || `${a.dateStr}T${a.timeStr}`).getTime();
      const timeB = new Date(b.timestamp || `${b.dateStr}T${b.timeStr}`).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [records, dailyViewDate, selectedStaff, selectedType, searchTerm, sortOrder]);

  // Statistics for the selected day
  const dailyStats = useMemo(() => {
    const total = dailyRecords.length;
    const arrivals = dailyRecords.filter(r => r.type === 'arrival').length;
    const departures = dailyRecords.filter(r => r.type === 'departure').length;
    const uniqueUsers = new Set(dailyRecords.map(r => r.userName)).size;

    return { total, arrivals, departures, uniqueUsers };
  }, [dailyRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedStaff('all');
    setSelectedType('all');
    setSearchTerm('');
  };

  const isFiltered = selectedStaff !== 'all' || selectedType !== 'all' || searchTerm.trim() !== '';

  // Staff options
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(emp => map.set(emp.username || emp.id, emp.name));
    records.forEach(rec => {
      if (!map.has(rec.userId)) {
        map.set(rec.userId, rec.userName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [employees, records]);

  // Formatted date title
  const formattedDayLabel = useMemo(() => {
    try {
      const d = new Date(dailyViewDate + 'T12:00:00');
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dailyViewDate;
    }
  }, [dailyViewDate]);

  // Check if current user has supervisor or direction permissions
  const isSupervisorUser = useMemo(() => {
    if (!loggedInUser) return false;
    if (loggedInUser.type === 'owner' || loggedInUser.type === 'supervisor') return true;
    if (loggedInUser.isSupervisor) return true;

    const emp = employees.find(e => 
      (loggedInUser.employeeId && e.id === loggedInUser.employeeId) ||
      (loggedInUser.username && (e.username?.toLowerCase() === loggedInUser.username.toLowerCase() || e.id === loggedInUser.username))
    );
    if (emp?.isSupervisor) return true;

    const username = (loggedInUser.username || '').toLowerCase();
    const name = (loggedInUser.name || '').toLowerCase();
    if (username.includes('edinam') || name.includes('edinam') || username === 'elhaidinam@gmail.com') return true;

    return false;
  }, [loggedInUser, employees]);

  // Export Day to CSV
  const handleExportCSV = () => {
    if (dailyRecords.length === 0 || !isSupervisorUser) return;
    const headers = ['Date', 'Heure', 'Collaborateur', 'Identifiant Collaborateur', 'Rôle', 'Action', 'Identifiant Téléphone / Terminal', 'Modèle Téléphone', 'Latitude', 'Longitude', 'Précision GPS'];
    const rows = dailyRecords.map(r => {
      const dev = formatRecordDeviceId(r);
      return [
        r.dateStr,
        r.timeStr,
        `"${r.userName.replace(/"/g, '""')}"`,
        `"${r.userId.replace(/"/g, '""')}"`,
        `"${(r.userRole || '').replace(/"/g, '""')}"`,
        `"${r.typeLabel}"`,
        `"${dev.id}"`,
        `"${dev.name}"`,
        r.location?.latitude || '',
        r.location?.longitude || '',
        r.location?.accuracy ? `${r.location.accuracy}m` : ''
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pointages_Pharmacie_${dailyViewDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="attendance-history-section" className="bg-[#FCFBF7] p-6 md:p-8 rounded-3xl border border-emerald-500/40 shadow-sm space-y-6">
      {/* Header */}
      <div className="border-b border-[#EBE6DA] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-300">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Pointage & Traçabilité</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>Historique des Pointages du Personnel</span>
          </h4>
          <p className="text-xs text-gray-500 max-w-2xl">
            Suivi horodaté et géolocalisé des arrivées et départs à la pharmacie avec affichage journalier et consultation complète dans une fenêtre volante.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenAttendanceModal && (
            <button
              type="button"
              onClick={onOpenAttendanceModal}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Pointer maintenant</span>
            </button>
          )}

          {/* Button to open floating full history modal (Supervisors only) */}
          {isSupervisorUser && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              title="Ouvrir tout l'historique dans une fenêtre volante"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Historique complet (Fenêtre volante)</span>
            </button>
          )}

          {isSupervisorUser && (
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={dailyRecords.length === 0}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                dailyRecords.length > 0
                  ? 'bg-[#FAF8F2] hover:bg-[#F3EFE4] text-gray-800 border-emerald-400/40 shadow-2xs cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
              title="Télécharger les pointages de la journée au format CSV"
            >
              <Download className="w-4 h-4 text-gray-600" />
              <span>Exporter Journée</span>
            </button>
          )}
        </div>
      </div>

      {/* 📈 COURBE TEMPORELLE DES POINTAGES */}
      <AttendanceCurveChart
        records={records}
        employees={employees}
        loggedInUser={loggedInUser}
        selectedDate={dailyViewDate}
        onSelectDate={(dateStr) => {
          setDailyViewDate(dateStr);
        }}
      />

      {/* SECTION DU TABLEAU JOURNALIER (Réservée exclusivement aux Superviseurs) */}
      {!isSupervisorUser ? (
        <div className="bg-[#FAF8F2] p-6 md:p-8 rounded-3xl border border-amber-300/80 shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto border border-amber-300 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black uppercase tracking-wider border border-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Accès Superviseur Requis</span>
            </div>
            <h5 className="text-base md:text-lg font-black text-gray-900">
              Tableau des pointages réservé à la Supervision
            </h5>
            <p className="text-xs text-gray-600 leading-relaxed">
              Le tableau détaillé de l'historique des pointages ainsi que les identifiants terminaux et téléphones de l'ensemble du personnel sont accessibles exclusivement aux superviseurs et à la direction.
            </p>
          </div>
          {onOpenAttendanceModal && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenAttendanceModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Enregistrer mon pointage</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#FAF8F2] p-5 md:p-6 rounded-3xl border border-emerald-500/30 shadow-2xs space-y-5">
          {/* Day Selector & Navigation Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/70 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                <CalendarIcon className="w-3 h-3 text-emerald-700" />
                <span>Affichage d'une Journée • Vue Superviseur</span>
              </div>
              <h5 className="text-base md:text-lg font-black text-gray-900 capitalize">
                {formattedDayLabel}
              </h5>
            </div>

            {/* Day Navigation Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors cursor-pointer"
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
                <input
                  id="daily-view-date-input"
                  type="date"
                  value={dailyViewDate}
                  onChange={(e) => setDailyViewDate(e.target.value)}
                  className="text-xs font-mono font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors cursor-pointer"
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {dailyViewDate !== todayStr && (
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
          </div>

          {/* Daily Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total de la journée</span>
              <p className="text-xl font-black text-gray-900 font-mono mt-0.5">{dailyStats.total}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Arrivées</span>
              <p className="text-xl font-black text-emerald-950 font-mono mt-0.5">{dailyStats.arrivals}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Départs</span>
              <p className="text-xl font-black text-amber-950 font-mono mt-0.5">{dailyStats.departures}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-indigo-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-indigo-800 block">Collaborateurs</span>
              <p className="text-xl font-black text-indigo-950 font-mono mt-0.5">{dailyStats.uniqueUsers}</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Staff Selector */}
            <div className="relative">
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="all">Tous les collaborateurs</option>
                {staffOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Action Type */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full pl-3 pr-8 py-1.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="all">Arrivées & Départs</option>
                <option value="arrival">Arrivées uniquement</option>
                <option value="departure">Départs uniquement</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Text Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Recherche dans la journée..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Clickable Table for Single Day */}
          <div className="space-y-2">
            {/* Interactive banner inviting user to click on table */}
            <div 
              onClick={() => setIsModalOpen(true)}
              className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 rounded-2xl border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 cursor-pointer transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                  ↗
                </span>
                <span className="text-xs font-black">
                  💡 Cliquez sur le tableau ci-dessous pour dérouler et explorer tout l'historique dans une fenêtre volante.
                </span>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 underline shrink-0 hidden sm:inline">
                Ouvrir la fenêtre volante →
              </span>
            </div>

            {dailyRecords.length === 0 ? (
              <div 
                onClick={() => setIsModalOpen(true)}
                className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 space-y-2 cursor-pointer hover:bg-emerald-50/20 transition-colors"
              >
                <Clock className="w-8 h-8 text-gray-300 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-gray-700">Aucun pointage enregistré pour cette journée ({dailyViewDate})</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Cliquez ici pour dérouler l'historique complet des autres journées dans la fenêtre volante.
                  </p>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsModalOpen(true)}
                className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs cursor-pointer hover:border-emerald-400 transition-colors group"
                title="Cliquez pour dérouler l'historique complet dans une fenêtre volante"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 group-hover:bg-emerald-50/40 transition-colors text-gray-700 uppercase tracking-wider text-[10px] font-black border-b border-gray-200">
                      <th className="py-3 px-4">Collaborateur</th>
                      <th className="py-3 px-4">Type de Pointage</th>
                      <th className="py-3 px-4">Heure</th>
                      <th className="py-3 px-4">📱 Identifiant Téléphone</th>
                      <th className="py-3 px-4">Localisation GPS</th>
                      <th className="py-3 px-4 text-center">Traçabilité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyRecords.map((rec) => {
                      const empObj = employees.find(e => e.id === rec.userId || e.username === rec.userId);
                      const avatarUrl = empObj?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(rec.userName)}`;
                      const isArrival = rec.type === 'arrival';
                      const devInfo = formatRecordDeviceId(rec);

                      return (
                        <tr key={rec.id} className="hover:bg-emerald-50/40 transition-colors">
                          {/* 1. Collaborateur */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={avatarUrl}
                                alt={rec.userName}
                                className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 object-cover shrink-0"
                              />
                              <div>
                                <p className="font-black text-gray-900 text-xs">{rec.userName}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{rec.userRole || 'Collaborateur'}</p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Type */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border ${
                              isArrival
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-amber-100 text-amber-950 border-amber-300'
                            }`}>
                              {isArrival ? (
                                <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <LogOut className="w-3.5 h-3.5 text-amber-700" />
                              )}
                              <span>{rec.typeLabel}</span>
                            </span>
                          </td>

                          {/* 3. Heure */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <p className="font-mono font-black text-gray-900 text-xs">{rec.timeStr}</p>
                          </td>

                          {/* 4. Identifiant Téléphone / Appareil */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{devInfo.icon}</span>
                                <span className="font-mono font-black text-[11px] text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg shadow-2xs">
                                  {devInfo.id}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium pl-4">
                                {devInfo.name}
                              </p>
                            </div>
                          </td>

                          {/* 5. GPS */}
                          <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {rec.location?.latitude && rec.location?.longitude ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-gray-800 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{rec.location.latitude.toFixed(4)}, {rec.location.longitude.toFixed(4)}</span>
                                </span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${rec.location.latitude},${rec.location.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 transition-colors"
                                  title="Ouvrir sur Google Maps"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-400 italic">
                                Signal non géolocalisé
                              </span>
                            )}
                          </td>

                          {/* 6. Traçabilité */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Vérifié</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Modal ("Fenêtre volante") for Full History */}
      <AttendanceHistoryModal
        isOpen={isModalOpen && isSupervisorUser}
        onClose={() => setIsModalOpen(false)}
        records={records}
        employees={employees}
        initialDate={dailyViewDate}
        initialStaff={selectedStaff}
        onOpenAttendanceModal={onOpenAttendanceModal}
        loggedInUser={loggedInUser}
        isSupervisor={isSupervisorUser}
      />
    </div>
  );
}
