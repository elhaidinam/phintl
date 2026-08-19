import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
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
  X,
  Maximize2,
  Smartphone,
  Lock
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';
import { formatRecordDeviceId } from '../lib/deviceHelper';

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  employees: Employee[];
  initialDate?: string;
  initialStaff?: string;
  onOpenAttendanceModal?: () => void;
  loggedInUser?: {
    type: string;
    employeeId?: string;
    username: string;
    name: string;
    isSupervisor?: boolean;
  } | null;
  isSupervisor?: boolean;
}

export default function AttendanceHistoryModal({
  isOpen,
  onClose,
  records,
  employees,
  initialDate = '',
  initialStaff = 'all',
  onOpenAttendanceModal,
  loggedInUser,
  isSupervisor = true
}: AttendanceHistoryModalProps) {
  // Filters State
  const [selectedStaff, setSelectedStaff] = useState<string>(initialStaff);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedQuickDate, setSelectedQuickDate] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'arrival' | 'departure'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Synchronize when initial props change
  useEffect(() => {
    if (isOpen) {
      if (initialStaff) setSelectedStaff(initialStaff);
      if (initialDate) {
        setSelectedDate(initialDate);
        setSelectedQuickDate(initialDate === new Date().toISOString().split('T')[0] ? 'today' : 'custom');
      }
    }
  }, [isOpen, initialDate, initialStaff]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const handleQuickDateSelect = (preset: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setSelectedQuickDate(preset);
    if (preset === 'today') {
      setSelectedDate(todayStr);
    } else if (preset === 'yesterday') {
      setSelectedDate(yesterdayStr);
    } else if (preset === 'custom') {
      if (!customStartDate) {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        setCustomStartDate(d.toISOString().split('T')[0]);
      }
      if (!customEndDate) {
        setCustomEndDate(todayStr);
      }
      setSelectedDate('');
    } else {
      setSelectedDate('');
    }
  };

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
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

      // 3. Date Filter
      if (selectedDate) {
        if (rec.dateStr !== selectedDate) return false;
      } else if (selectedQuickDate === 'week') {
        const recDate = new Date(rec.dateStr);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (recDate < weekAgo) return false;
      } else if (selectedQuickDate === 'month') {
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!rec.dateStr.startsWith(currentYearMonth)) return false;
      } else if (selectedQuickDate === 'custom' && customStartDate && customEndDate) {
        if (rec.dateStr < customStartDate || rec.dateStr > customEndDate) return false;
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inName = rec.userName.toLowerCase().includes(term);
        const inUser = rec.userId.toLowerCase().includes(term);
        const inRole = (rec.userRole || '').toLowerCase().includes(term);
        const inDate = rec.dateStr.includes(term);
        const inTime = rec.timeStr.includes(term);
        if (!inName && !inUser && !inRole && !inDate && !inTime) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp || `${a.dateStr}T${a.timeStr}`).getTime();
      const timeB = new Date(b.timestamp || `${b.dateStr}T${b.timeStr}`).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [records, selectedStaff, selectedType, selectedDate, selectedQuickDate, customStartDate, customEndDate, searchTerm, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const arrivals = filteredRecords.filter(r => r.type === 'arrival').length;
    const departures = filteredRecords.filter(r => r.type === 'departure').length;
    const uniqueUsers = new Set(filteredRecords.map(r => r.userName)).size;

    return { total, arrivals, departures, uniqueUsers };
  }, [filteredRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedStaff('all');
    setSelectedDate('');
    setSelectedQuickDate('all');
    setSelectedType('all');
    setSearchTerm('');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const isFiltered = selectedStaff !== 'all' || selectedDate !== '' || selectedQuickDate !== 'all' || selectedType !== 'all' || searchTerm.trim() !== '';

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Date', 'Heure', 'Collaborateur', 'Identifiant Collaborateur', 'Rôle', 'Action', 'Identifiant Téléphone / Terminal', 'Modèle Téléphone', 'Latitude', 'Longitude', 'Précision GPS'];
    const rows = filteredRecords.map(r => {
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
    link.setAttribute('download', `Historique_Complet_Pointages_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#FCFBF7] w-full max-w-6xl max-h-[92vh] rounded-3xl border-2 border-emerald-600/40 shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 md:p-6 bg-white border-b border-[#EBE6DA] flex items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-300">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Fenêtre Volante</span>
            </div>
            <h3 className="text-lg md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <span>Historique Complet des Pointages</span>
            </h3>
            <p className="text-xs text-gray-500 hidden sm:block">
              Consultation exhaustive, filtrage multi-critères, recherche et exportation de toutes les arrivées et départs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenAttendanceModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAttendanceModal();
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pointer maintenant</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                filteredRecords.length > 0
                  ? 'bg-[#FAF8F2] hover:bg-[#F3EFE4] text-gray-800 border-emerald-400/40 shadow-2xs cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
              title="Exporter au format CSV"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              title="Fermer la fenêtre volante (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Filtré</span>
                <Clock className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-xl font-black text-gray-900 mt-1 font-mono">{stats.total}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Arrivées</span>
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-950 mt-1 font-mono">{stats.arrivals}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Départs</span>
                <LogOut className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-black text-amber-950 mt-1 font-mono">{stats.departures}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-blue-200 shadow-2xs">
              <div className="flex items-center justify-between text-blue-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Collaborateurs</span>
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xl font-black text-blue-950 mt-1 font-mono">{stats.uniqueUsers}</p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                Filtres de recherche dans l'historique
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Personnel */}
              <div className="space-y-1">
                <label htmlFor="modal-filter-staff" className="text-[11px] font-bold text-gray-600 block">
                  Collaborateur
                </label>
                <div className="relative">
                  <select
                    id="modal-filter-staff"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="all">Tous les collaborateurs ({employees.length})</option>
                    {staffOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label htmlFor="modal-filter-type" className="text-[11px] font-bold text-gray-600 block">
                  Type d'action
                </label>
                <div className="relative">
                  <select
                    id="modal-filter-type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="all">Tous (Arrivées & Départs)</option>
                    <option value="arrival">Arrivées uniquement</option>
                    <option value="departure">Départs uniquement</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label htmlFor="modal-filter-date" className="text-[11px] font-bold text-gray-600 block">
                  Date précise
                </label>
                <input
                  id="modal-filter-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (e.target.value) setSelectedQuickDate('custom');
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Search */}
              <div className="space-y-1">
                <label htmlFor="modal-filter-search" className="text-[11px] font-bold text-gray-600 block">
                  Recherche libre
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-filter-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nom, matricule, rôle..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Période :</span>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedQuickDate === 'all' && !selectedDate
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Toutes les dates
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('today')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedQuickDate === 'today'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('yesterday')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedQuickDate === 'yesterday'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Hier
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('week')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedQuickDate === 'week'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                7 derniers jours
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('month')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedQuickDate === 'month'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Ce mois-ci
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('custom')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedQuickDate === 'custom'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Intervalle (Du / Au)
              </button>
            </div>

            {/* Custom Interval inputs */}
            {selectedQuickDate === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                <span className="text-[11px] font-bold text-gray-600">Intervalle personnalisé :</span>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold">Du:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="font-mono text-xs font-bold text-gray-800 bg-transparent focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold">Au:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="font-mono text-xs font-bold text-gray-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table Header & Sort Toggle */}
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
            <span>{filteredRecords.length} pointage{filteredRecords.length > 1 ? 's' : ''} répertorié{filteredRecords.length > 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Tri : {sortOrder === 'desc' ? 'Plus récents en premier' : 'Plus anciens en premier'}</span>
            </button>
          </div>

          {/* Full Table */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 space-y-3">
              <Clock className="w-10 h-10 text-gray-300 mx-auto" />
              <div>
                <p className="text-sm font-bold text-gray-700">Aucun enregistrement trouvé</p>
                <p className="text-xs text-gray-400 mt-1">
                  Aucun pointage ne correspond aux filtres de date ou de collaborateur sélectionnés.
                </p>
              </div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 uppercase tracking-wider text-[10px] font-black border-b border-gray-200">
                    <th className="py-3 px-4">Collaborateur</th>
                    <th className="py-3 px-4">Type de Pointage</th>
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">📱 Identifiant Téléphone</th>
                    <th className="py-3 px-4">Localisation GPS</th>
                    <th className="py-3 px-4 text-center">Traçabilité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRecords.map((rec) => {
                    const empObj = employees.find(e => e.id === rec.userId || e.username === rec.userId);
                    const avatarUrl = empObj?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(rec.userName)}`;
                    const isArrival = rec.type === 'arrival';
                    const devInfo = formatRecordDeviceId(rec);

                    return (
                      <tr key={rec.id} className="hover:bg-emerald-50/30 transition-colors">
                        {/* 1. Collaborateur */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarUrl}
                              alt={rec.userName}
                              className="w-9 h-9 rounded-full border border-gray-200 bg-gray-50 object-cover shrink-0"
                            />
                            <div>
                              <p className="font-black text-gray-900 text-xs">{rec.userName}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{rec.userRole || 'Collaborateur'}</p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
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

                        {/* 3. Date & Heure */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-mono font-black text-gray-900 text-xs">{rec.timeStr}</p>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-gray-400" />
                              <span>{rec.dateStr}</span>
                            </p>
                          </div>
                        </td>

                        {/* 4. Identifiant Téléphone / Appareil */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
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

                        {/* 5. Localisation GPS */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rec.location?.latitude && rec.location?.longitude ? (
                            <div className="flex items-center gap-2">
                              <div className="space-y-0.5">
                                <p className="font-mono text-[11px] font-bold text-gray-800 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{rec.location.latitude.toFixed(4)}, {rec.location.longitude.toFixed(4)}</span>
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  Précision ±{rec.location.accuracy || 10}m
                                </p>
                              </div>
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
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
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

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-[#EBE6DA] flex items-center justify-between text-xs text-gray-500">
          <span>{records.length} enregistrements globaux enregistrés</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
