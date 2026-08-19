import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  Moon, 
  Sun, 
  Info,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';

interface AttendanceCurveChartProps {
  records: AttendanceRecord[];
  employees: Employee[];
  loggedInUser: {
    type: string;
    employeeId?: string;
    username: string;
    name: string;
  } | null;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
}

// Distinct vibrant, high-contrast palette for employees
const STAFF_COLORS = [
  '#059669', // Emerald
  '#2563eb', // Blue
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#16a34a', // Green
  '#dc2626', // Red
  '#9333ea', // Violet
  '#0d9488', // Teal
  '#ca8a04', // Gold
  '#64748b'  // Slate
];

export type PresenceLineType = 
  | 'complete'         // Both arrival & departure on same day
  | 'overnight_start'  // Arrival in evening -> goes up to 24h (midnight)
  | 'overnight_end'    // Starts at 0h (midnight) -> goes up to morning departure
  | 'missing_departure'// Only arrival is present -> '?' placed at arrival point
  | 'missing_arrival'; // Only departure is present -> '?' placed at departure point

export interface PresenceSegment {
  id: string;
  employeeId: string;
  employeeName: string;
  color: string;
  dateStr: string;
  dayLabel: string;
  type: PresenceLineType;
  startHour: number; // 0 to 24
  endHour: number;   // 0 to 24
  arrivalRecord?: AttendanceRecord;
  departureRecord?: AttendanceRecord;
  elapsedMinutes?: number;
  incidentType?: 'missing_departure' | 'missing_arrival';
  incidentHour?: number;
  isActiveToday?: boolean;
}

export default function AttendanceCurveChart({
  records,
  employees,
  loggedInUser,
  selectedDate: propSelectedDate,
  onSelectDate
}: AttendanceCurveChartProps) {
  // Period Mode: 'day' (1 jour - Noms des utilisateurs en abscisse) or 'custom' (> 1 jour - Dates en abscisse & Utilisateurs en légende)
  const [period, setPeriod] = useState<'day' | 'custom'>('day');
  
  // Single day selected date for 'day' mode (defaults to prop or today's date)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (propSelectedDate) return propSelectedDate;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Synchronize internal selected date whenever propSelectedDate changes from parent
  useEffect(() => {
    if (propSelectedDate && propSelectedDate !== selectedDate) {
      setSelectedDate(propSelectedDate);
    }
  }, [propSelectedDate]);

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<string>('all');
  const [hoveredSegment, setHoveredSegment] = useState<PresenceSegment | null>(null);

  // Navigation handlers for 1-day mode
  const handlePrevDay = () => {
    try {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const newDate = d.toISOString().split('T')[0];
      setSelectedDate(newDate);
      if (onSelectDate) onSelectDate(newDate);
    } catch {}
  };

  const handleNextDay = () => {
    try {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const newDate = d.toISOString().split('T')[0];
      setSelectedDate(newDate);
      if (onSelectDate) onSelectDate(newDate);
    } catch {}
  };

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    if (onSelectDate) onSelectDate(today);
  };

  // Map employee IDs/names to consistent vibrant colors
  const employeeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((emp, index) => {
      const color = STAFF_COLORS[index % STAFF_COLORS.length];
      map.set(emp.username || emp.id, color);
      map.set(emp.name.toLowerCase(), color);
      map.set(emp.id, color);
    });
    return map;
  }, [employees]);

  // Generate Date Range according to period
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    if (period === 'day') {
      const d = new Date(selectedDate + 'T12:00:00');
      const dateStr = selectedDate;
      const isToday = dateStr === todayStr;

      const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' });
      const dayNum = d.getDate();
      const monthStr = d.toLocaleDateString('fr-FR', { month: 'long' });
      const year = d.getFullYear();

      const label = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dayNum} ${monthStr} ${year}`;
      const shortLabel = `${d.toLocaleDateString('fr-FR', { weekday: 'short' })} ${dayNum} ${d.toLocaleDateString('fr-FR', { month: 'short' })}`;

      return [{ dateStr, label, shortLabel, isToday }];
    }

    if (period === 'custom') {
      if (!customStartDate || !customEndDate) return [];
      let s = new Date(customStartDate + 'T00:00:00');
      let e = new Date(customEndDate + 'T00:00:00');
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return [];
      if (s > e) {
        const temp = s;
        s = e;
        e = temp;
      }
      const days: { dateStr: string; label: string; shortLabel: string; isToday: boolean }[] = [];
      const diffDays = Math.min(180, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(s);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;

        const weekday = d.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dayNum = d.getDate();
        const monthNum = d.getMonth() + 1;
        const monthShort = d.toLocaleDateString('fr-FR', { month: 'short' });

        let label = `${weekday} ${dayNum} ${monthShort}`;
        let shortLabel = `${dayNum}/${monthNum}`;
        if (diffDays <= 7) {
          shortLabel = `${weekday.slice(0, 3)} ${dayNum}`;
        }

        days.push({ dateStr, label, shortLabel, isToday });
      }
      return days;
    }

    return [];
  }, [period, selectedDate, customStartDate, customEndDate]);

  const isMultiDay = dateRange.length > 1;

  // Helper to parse HH:MM or HH:MM:SS to decimal hour (e.g. "07:30" => 7.5)
  const parseTimeToDecimalHour = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    return h + m / 60 + s / 3600;
  };

  // Format decimal hour to HHhMM
  const formatDecimalHour = (val: number): string => {
    const clamped = Math.max(0, Math.min(24, val));
    if (clamped >= 24) return '24h00';
    if (clamped <= 0) return '00h00';
    const h = Math.floor(clamped);
    const m = Math.round((clamped - h) * 60);
    return `${String(h).padStart(2, '0')}h${m > 0 ? String(m).padStart(2, '0') : '00'}`;
  };

  // Format elapsed minutes to "Xh Ym"
  const formatElapsedMinutes = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  // Helper: number of days between two YYYY-MM-DD dates
  const getDaysBetween = (dateStr1: string, dateStr2: string): number => {
    const d1 = new Date(dateStr1 + 'T12:00:00Z');
    const d2 = new Date(dateStr2 + 'T12:00:00Z');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDayLabel = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Extract all presence segments for each employee across the date range
  const presenceSegments = useMemo(() => {
    const staffMap = new Map<string, { id: string; name: string; role: string; avatar?: string; color: string }>();
    
    employees.forEach((emp, index) => {
      const id = emp.username || emp.id;
      const color = employeeColorMap.get(id) || STAFF_COLORS[index % STAFF_COLORS.length];
      staffMap.set(id.toLowerCase(), {
        id,
        name: emp.name,
        role: emp.role,
        avatar: emp.avatar,
        color
      });
      staffMap.set(emp.name.toLowerCase(), {
        id,
        name: emp.name,
        role: emp.role,
        avatar: emp.avatar,
        color
      });
    });

    // Also include any users found in records to guarantee 0 missing records
    records.forEach((r) => {
      const id = r.userId || r.userName;
      const key = id.toLowerCase();
      const nameKey = (r.userName || '').toLowerCase();
      if (!staffMap.has(key) && !staffMap.has(nameKey)) {
        const color = STAFF_COLORS[staffMap.size % STAFF_COLORS.length];
        const newStaff = {
          id: r.userId || r.userName,
          name: r.userName,
          role: r.userRole || 'Personnel',
          color
        };
        staffMap.set(key, newStaff);
        staffMap.set(nameKey, newStaff);
      }
    });

    // Get unique staff instances
    const uniqueStaffList = Array.from(new Set(Array.from(staffMap.values())));
    const segments: PresenceSegment[] = [];

    uniqueStaffList.forEach(staff => {
      const sId = staff.id.toLowerCase();
      const sName = staff.name.toLowerCase();

      const staffRecords = records
        .filter(r => {
          const rId = (r.userId || '').toLowerCase();
          const rName = (r.userName || '').toLowerCase();
          return rId === sId || rName === sName || rId === sName || rName === sId;
        })
        .slice()
        .sort((a, b) => {
          const timeA = a.timestamp || `${a.dateStr}T${a.timeStr || '00:00:00'}`;
          const timeB = b.timestamp || `${b.dateStr}T${b.timeStr || '00:00:00'}`;
          return new Date(timeA).getTime() - new Date(timeB).getTime();
        });

      let i = 0;
      while (i < staffRecords.length) {
        const current = staffRecords[i];

        if (current.type === 'arrival') {
          const next = staffRecords[i + 1];

          if (next && next.type === 'departure') {
            const daysDiff = getDaysBetween(current.dateStr, next.dateStr);

            if (daysDiff === 0) {
              // 1. Same-day complete presence segment
              const arrHour = parseTimeToDecimalHour(current.timeStr);
              const depHour = parseTimeToDecimalHour(next.timeStr);
              const elapsedMins = Math.max(0, Math.round((depHour - arrHour) * 60));

              segments.push({
                id: `seg-comp-${current.id}-${next.id}`,
                employeeId: staff.id,
                employeeName: staff.name,
                color: staff.color,
                dateStr: current.dateStr,
                dayLabel: getDayLabel(current.dateStr),
                type: 'complete',
                startHour: arrHour,
                endHour: depHour,
                arrivalRecord: current,
                departureRecord: next,
                elapsedMinutes: elapsedMins
              });

              i += 2;
              continue;
            } else if (daysDiff === 1) {
              // 2. Overnight shift across midnight
              const arrHour = parseTimeToDecimalHour(current.timeStr);
              const depHour = parseTimeToDecimalHour(next.timeStr);
              const totalElapsedMins = Math.max(0, Math.round(((24 - arrHour) + depHour) * 60));

              // Segment on Day D (Veille) : from arrival time to 24h (Minuit)
              segments.push({
                id: `seg-overnight-start-${current.id}`,
                employeeId: staff.id,
                employeeName: staff.name,
                color: staff.color,
                dateStr: current.dateStr,
                dayLabel: getDayLabel(current.dateStr),
                type: 'overnight_start',
                startHour: arrHour,
                endHour: 24,
                arrivalRecord: current,
                departureRecord: next,
                elapsedMinutes: totalElapsedMins
              });

              // Segment on Day D+1 (Jour du départ) : from 0h to morning departure
              segments.push({
                id: `seg-overnight-end-${next.id}`,
                employeeId: staff.id,
                employeeName: staff.name,
                color: staff.color,
                dateStr: next.dateStr,
                dayLabel: getDayLabel(next.dateStr),
                type: 'overnight_end',
                startHour: 0,
                endHour: depHour,
                arrivalRecord: current,
                departureRecord: next,
                elapsedMinutes: totalElapsedMins
              });

              i += 2;
              continue;
            }
          }

          // 3. Arrival without matching departure
          const arrHour = parseTimeToDecimalHour(current.timeStr);
          const isTodayRecord = current.dateStr === (new Date().toISOString().split('T')[0]);
          segments.push({
            id: `seg-missing-dep-${current.id}`,
            employeeId: staff.id,
            employeeName: staff.name,
            color: staff.color,
            dateStr: current.dateStr,
            dayLabel: getDayLabel(current.dateStr),
            type: 'missing_departure',
            startHour: arrHour,
            endHour: arrHour,
            arrivalRecord: current,
            incidentType: 'missing_departure',
            incidentHour: arrHour,
            isActiveToday: isTodayRecord
          });

          i += 1;
        } else {
          // Departure without matching arrival
          const depHour = parseTimeToDecimalHour(current.timeStr);
          segments.push({
            id: `seg-missing-arr-${current.id}`,
            employeeId: staff.id,
            employeeName: staff.name,
            color: staff.color,
            dateStr: current.dateStr,
            dayLabel: getDayLabel(current.dateStr),
            type: 'missing_arrival',
            startHour: depHour,
            endHour: depHour,
            departureRecord: current,
            incidentType: 'missing_arrival',
            incidentHour: depHour
          });

          i += 1;
        }
      }
    });

    return segments;
  }, [records, employees, employeeColorMap]);

  // Visible segments in the selected period and optional employee filter
  const visibleSegments = useMemo(() => {
    const validDates = new Set(dateRange.map(d => d.dateStr));
    return presenceSegments.filter(s => 
      validDates.has(s.dateStr) &&
      (highlightedEmployeeId === 'all' || s.employeeId === highlightedEmployeeId)
    );
  }, [presenceSegments, dateRange, highlightedEmployeeId]);

  // List of all active employees to display on the X-axis when in 1-day mode
  const singleDayStaffList = useMemo(() => {
    if (isMultiDay) return [];
    const staffMap = new Map<string, Employee>();
    employees.forEach(emp => {
      staffMap.set((emp.username || emp.id).toLowerCase(), emp);
      staffMap.set(emp.name.toLowerCase(), emp);
    });

    // Add any from records for this date
    records.forEach(r => {
      if (r.dateStr === selectedDate) {
        const key = (r.userId || r.userName).toLowerCase();
        if (!staffMap.has(key)) {
          staffMap.set(key, {
            id: r.userId || r.userName,
            name: r.userName,
            role: r.userRole || 'Personnel',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName)}&background=059669&color=fff`,
            allocatedLeaves: 30,
            leaveHistory: [],
            scheduleStartHour: 8,
            scheduleEndHour: 17,
            scheduleDays: 'Lun - Sam',
            cnss: '000000',
            dateEmbauche: '2024-01-01',
            username: r.userId || r.userName,
            password: '',
            isSupervisor: false,
            bio: '',
            isScheduleApproved: true
          });
        }
      }
    });

    const allStaff = Array.from(new Set(Array.from(staffMap.values())));
    if (highlightedEmployeeId !== 'all') {
      const found = allStaff.find(e => 
        (e.username || e.id) === highlightedEmployeeId || 
        e.id === highlightedEmployeeId ||
        e.name.toLowerCase() === highlightedEmployeeId.toLowerCase()
      );
      return found ? [found] : allStaff;
    }
    return allStaff;
  }, [isMultiDay, highlightedEmployeeId, employees, records, selectedDate]);

  // Multi-day mapping: active staff per day for side-by-side positioning without overlapping
  const dayStaffMap = useMemo(() => {
    const map = new Map<string, string[]>();
    dateRange.forEach(day => {
      const daySegs = visibleSegments.filter(s => s.dateStr === day.dateStr);
      const staffIds: string[] = [];
      daySegs.forEach(s => {
        if (!staffIds.includes(s.employeeId)) {
          staffIds.push(s.employeeId);
        }
      });
      map.set(day.dateStr, staffIds);
    });
    return map;
  }, [dateRange, visibleSegments]);

  // Aggregate statistics
  const chartStats = useMemo(() => {
    const completeSegments = visibleSegments.filter(s => s.type === 'complete' || s.type === 'overnight_start');
    const totalShifts = completeSegments.length;
    const totalMinutes = completeSegments.reduce((sum, s) => sum + (s.elapsedMinutes || 0), 0);
    const incidents = visibleSegments.filter(s => s.type === 'missing_departure' || s.type === 'missing_arrival').length;
    const uniqueEmployees = new Set(visibleSegments.map(s => s.employeeId)).size;

    return {
      totalShifts,
      totalMinutes,
      incidents,
      uniqueEmployees,
      avgMinutesPerShift: totalShifts > 0 ? Math.round(totalMinutes / totalShifts) : 0
    };
  }, [visibleSegments]);

  // =========================================================================
  // SVG Chart Geometry & Calculations
  // ORDONNÉES (Y): 0h en bas (00h00) -> 24h en haut (Minuit / 24h00)
  // ABSCISSE (X) 1 Jour: Noms des utilisateurs
  // ABSCISSE (X) > 1 Jour: Dates, et Utilisateurs en légende
  // =========================================================================
  const svgWidth = 1040;
  const svgHeight = 580;
  const padLeft = 100;
  const padRight = 50;
  const padTop = 60;
  const padBottom = 85;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Y-Scale: 0h is at bottom (padTop + plotHeight), 24h is at top (padTop)
  const getY = (hour: number): number => {
    const clamped = Math.max(0, Math.min(24, hour));
    return padTop + plotHeight * (1 - (clamped / 24));
  };

  // X calculation for 1-Day View: User column on X axis
  const getSingleDayUserX = (userIndex: number, totalUsers: number): number => {
    if (totalUsers <= 1) return padLeft + plotWidth / 2;
    const step = plotWidth / (totalUsers + 1);
    return padLeft + (userIndex + 1) * step;
  };

  // X calculation for Multi-Day View: Date column on X axis
  const getMultiDayBaseX = (dateIndex: number): number => {
    if (dateRange.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (dateIndex / (dateRange.length - 1)) * plotWidth;
  };

  // Multi-day side-by-side offset for each staff on a given date
  const getMultiDayStaffX = (dateIndex: number, dateStr: string, staffId: string): number => {
    const baseX = getMultiDayBaseX(dateIndex);
    const staffListOnDay = dayStaffMap.get(dateStr) || [];
    const total = staffListOnDay.length;
    if (total <= 1) return baseX;

    const staffIndex = staffListOnDay.indexOf(staffId);
    if (staffIndex === -1) return baseX;

    const colWidth = plotWidth / Math.max(1, dateRange.length - 1);
    const maxSpread = Math.min(colWidth * 0.78, (total - 1) * 16);
    const step = maxSpread / (total - 1);
    return baseX - (maxSpread / 2) + staffIndex * step;
  };

  // Master X coordinate resolver for any segment
  const getSegmentX = (segment: PresenceSegment): number => {
    if (!isMultiDay) {
      // 1-Day View: Find index of employee in singleDayStaffList
      const idx = singleDayStaffList.findIndex(e => 
        (e.username || e.id) === segment.employeeId || 
        e.id === segment.employeeId ||
        e.name.toLowerCase() === segment.employeeName.toLowerCase()
      );
      if (idx !== -1) {
        return getSingleDayUserX(idx, singleDayStaffList.length);
      }
      return padLeft + plotWidth / 2;
    } else {
      // Multi-Day View: Date index
      const dayIdx = dateRange.findIndex(d => d.dateStr === segment.dateStr);
      if (dayIdx === -1) return padLeft + plotWidth / 2;
      return getMultiDayStaffX(dayIdx, segment.dateStr, segment.employeeId);
    }
  };

  // Hourly grid ticks (Every 2 hours from 0h to 24h)
  const hourTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

  return (
    <div className="bg-[#FAF8F2] p-5 md:p-7 rounded-3xl border-2 border-emerald-600/30 shadow-sm space-y-5">
      {/* 1. Header & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EBE6DA] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-300">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Courbe Temporelle des Pointages</span>
          </div>
          <h4 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>Graphique Chronologique des Présences</span>
          </h4>
          <p className="text-xs text-gray-600 max-w-2xl">
            {isMultiDay 
              ? "Affichage multi-jours : Dates en abscisse, utilisateurs en légende, 0h (en bas) à 24h (en haut)."
              : "Affichage journalier : Noms des utilisateurs en abscisse, 0h (en bas) à 24h (en haut)."
            }
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-emerald-100/70 border border-emerald-300 rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod('day')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                period === 'day'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-950 hover:bg-emerald-200/60'
              }`}
            >
              👤 1 Jour (Utilisateurs en abscisse)
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                period === 'custom'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-950 hover:bg-emerald-200/60'
              }`}
            >
              📅 Période & Multi-jours (Dates en abscisse)
            </button>
          </div>
        </div>
      </div>

      {/* Date Controls for 1-Day View */}
      {period === 'day' && (
        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-300/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              title="Afficher le jour précédent"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Jour précédent</span>
            </button>

            <div className="flex items-center gap-1.5 bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
              <label htmlFor="curve-single-date" className="text-[11px] font-bold text-gray-600">
                Date :
              </label>
              <input
                id="curve-single-date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    if (onSelectDate) onSelectDate(e.target.value);
                  }
                }}
                className="text-xs font-mono font-black text-gray-900 focus:outline-none bg-transparent cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              title="Afficher le jour suivant"
            >
              <span>Jour suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
              title="Revenir à la date d'aujourd'hui"
            >
              Aujourd'hui
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-900 bg-emerald-100/90 px-3.5 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
              <span>📅</span>
              <span>{dateRange[0]?.label || selectedDate}</span>
              {dateRange[0]?.isToday && (
                <span className="bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  Aujourd'hui
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Custom Date Range Selector Inputs (Visible when 'custom' is active) */}
      {period === 'custom' && (
        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-300/80 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Intervalle de dates (Dates en abscisse, Utilisateurs en légende) :
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
              <label htmlFor="curve-start-date" className="text-[11px] font-bold text-gray-600">
                Du :
              </label>
              <input
                id="curve-start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs font-mono font-bold text-gray-900 focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
              <label htmlFor="curve-end-date" className="text-[11px] font-bold text-gray-600">
                Au :
              </label>
              <input
                id="curve-end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs font-mono font-bold text-gray-900 focus:outline-none bg-transparent"
              />
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
              {dateRange.length} jour{dateRange.length > 1 ? 's' : ''} affiché{dateRange.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* 2. Key Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-500 block">Vacations & Plages</span>
          <p className="text-xl font-black font-mono text-gray-900">{chartStats.totalShifts}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-emerald-800 block">Temps Cumulé Total</span>
          <p className="text-xl font-black font-mono text-emerald-900">{formatElapsedMinutes(chartStats.totalMinutes)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-blue-800 block">Moyenne / Vacation</span>
          <p className="text-xl font-black font-mono text-blue-900">{formatElapsedMinutes(chartStats.avgMinutesPerShift)}</p>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-2xs ${
          chartStats.incidents > 0
            ? 'bg-red-50/90 border-red-200 text-red-900'
            : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-red-800 block">Pointages Incomplets</span>
            {chartStats.incidents > 0 && (
              <span className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-xs animate-pulse">
                ?
              </span>
            )}
          </div>
          <p className="text-xl font-black font-mono mt-0.5 text-red-950">
            {chartStats.incidents}
          </p>
        </div>
      </div>

      {/* 3. MULTI-DAY USERS LEGEND (Visible when displaying > 1 day) */}
      {isMultiDay && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-gray-700 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-700" />
              Légende des Utilisateurs ({employees.length})
            </span>
            {highlightedEmployeeId !== 'all' && (
              <button
                type="button"
                onClick={() => setHighlightedEmployeeId('all')}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
              >
                Afficher tous les utilisateurs
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHighlightedEmployeeId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                highlightedEmployeeId === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tous ({employees.length})</span>
            </button>

            {employees.map(emp => {
              const empId = emp.username || emp.id;
              const color = employeeColorMap.get(empId) || employeeColorMap.get(emp.name.toLowerCase()) || '#059669';
              const isSelected = highlightedEmployeeId === empId;

              const empSegments = visibleSegments.filter(s => s.employeeId === empId);
              const totalMins = empSegments.reduce((s, seg) => s + (seg.elapsedMinutes || 0), 0);
              const hasMissing = empSegments.some(s => s.type === 'missing_departure' || s.type === 'missing_arrival');

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setHighlightedEmployeeId(isSelected ? 'all' : empId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 shadow-md bg-white text-gray-900 font-black'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                  style={{
                    borderLeftColor: color,
                    borderLeftWidth: 4
                  }}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <span>{emp.name}</span>
                  {totalMins > 0 && (
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {formatElapsedMinutes(totalMins)}
                    </span>
                  )}
                  {hasMissing && (
                    <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse" title="Pointage incomplet">
                      ?
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Interactive SVG Attendance Curve Chart */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-auto select-none"
              style={{ overflow: 'visible' }}
            >
              {/* Chart Background Canvas */}
              <rect 
                x={padLeft} 
                y={padTop} 
                width={plotWidth} 
                height={plotHeight} 
                fill="#FAF9F5" 
                rx={12}
                stroke="#E8E4D8"
              />

              {/* Y-Axis Label Title */}
              <text
                x={padLeft - 70}
                y={padTop - 15}
                className="text-[10px] font-extrabold fill-gray-500 uppercase tracking-wider"
              >
                Heures (0h → 24h)
              </text>

              {/* Horizontal Hour Grid Lines & Y-Axis Labels: 0h at BOTTOM -> 24h at TOP */}
              {hourTicks.map(hour => {
                const y = getY(hour);
                const isKeyHour = hour === 0 || hour === 12 || hour === 24;

                return (
                  <g key={`hour-grid-${hour}`}>
                    <line 
                      x1={padLeft} 
                      y1={y} 
                      x2={padLeft + plotWidth} 
                      y2={y} 
                      stroke={isKeyHour ? '#D5CDBF' : '#EBE6DA'} 
                      strokeDasharray={isKeyHour ? 'none' : '3 3'} 
                      strokeWidth={isKeyHour ? 1.5 : 1}
                    />
                    <text 
                      x={padLeft - 12} 
                      y={y + 4} 
                      textAnchor="end" 
                      className={`text-[11px] font-mono ${
                        isKeyHour ? 'fill-gray-900 font-black' : 'fill-gray-500 font-semibold'
                      }`}
                    >
                      {hour === 24 ? '24h00 (Minuit)' : hour === 0 ? '00h00 (Minuit)' : hour === 12 ? '12h00 (Midi)' : `${String(hour).padStart(2, '0')}h00`}
                    </text>
                  </g>
                );
              })}

              {/* ===================================================================
                  CASE A: 1-DAY VIEW -> X-AXIS = NOMS DES UTILISATEURS
                 =================================================================== */}
              {!isMultiDay && singleDayStaffList.map((staff, userIdx) => {
                const posX = getSingleDayUserX(userIdx, singleDayStaffList.length);
                const color = employeeColorMap.get(staff.username || staff.id) || employeeColorMap.get(staff.name.toLowerCase()) || '#059669';
                const firstName = staff.name.split(' ')[0];

                return (
                  <g key={`user-col-x-${staff.id}`}>
                    {/* Vertical guideline for this user */}
                    <line 
                      x1={posX} 
                      y1={padTop} 
                      x2={posX} 
                      y2={padTop + plotHeight} 
                      stroke={color} 
                      strokeWidth={1} 
                      strokeDasharray="2 4"
                      opacity={0.35}
                    />

                    {/* Bottom User Indicator & Name */}
                    <circle 
                      cx={posX} 
                      y={padTop + plotHeight + 14} 
                      r={5} 
                      fill={color} 
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                    <text 
                      x={posX} 
                      y={padTop + plotHeight + 30} 
                      textAnchor="middle" 
                      className="text-[11px] font-black fill-gray-900"
                    >
                      {firstName}
                    </text>
                    <text 
                      x={posX} 
                      y={padTop + plotHeight + 44} 
                      textAnchor="middle" 
                      className="text-[9px] font-semibold fill-gray-500"
                    >
                      {staff.role?.split(' ')[0] || ''}
                    </text>
                  </g>
                );
              })}

              {/* ===================================================================
                  CASE B: MULTI-DAY VIEW -> X-AXIS = DATES
                 =================================================================== */}
              {isMultiDay && dateRange.map((day, dayIdx) => {
                const baseX = getMultiDayBaseX(dayIdx);
                return (
                  <g key={`multiday-grid-${day.dateStr}`}>
                    <line 
                      x1={baseX} 
                      y1={padTop} 
                      x2={baseX} 
                      y2={padTop + plotHeight} 
                      stroke={day.isToday ? '#10b981' : '#EAE6D8'} 
                      strokeWidth={day.isToday ? 2 : 1}
                      strokeDasharray={day.isToday ? 'none' : '2 2'}
                    />
                    <text 
                      x={baseX} 
                      y={padTop + plotHeight + 20} 
                      textAnchor="middle" 
                      className={`text-[10px] font-bold ${
                        day.isToday ? 'fill-emerald-800 font-black' : 'fill-gray-600'
                      }`}
                    >
                      {day.shortLabel}
                    </text>
                    {day.isToday && (
                      <rect 
                        x={baseX - 16} 
                        y={padTop + plotHeight + 26} 
                        width={32} 
                        height={13} 
                        rx={3.5} 
                        fill="#10b981" 
                      />
                    )}
                    {day.isToday && (
                      <text 
                        x={baseX} 
                        y={padTop + plotHeight + 36} 
                        textAnchor="middle" 
                        className="text-[8px] font-black fill-white uppercase"
                      >
                        Auj.
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Empty state notice */}
              {visibleSegments.length === 0 && (
                <g>
                  <text 
                    x={padLeft + plotWidth / 2} 
                    y={padTop + plotHeight / 2 - 10} 
                    textAnchor="middle" 
                    className="text-sm font-black fill-gray-400"
                  >
                    Aucun pointage enregistré pour {isMultiDay ? 'cette période' : `cette date (${dateRange[0]?.label || selectedDate})`}
                  </text>
                  <text 
                    x={padLeft + plotWidth / 2} 
                    y={padTop + plotHeight / 2 + 16} 
                    textAnchor="middle" 
                    className="text-xs font-bold fill-gray-400"
                  >
                    Utilisez les boutons de sélection pour naviguer dans l'historique
                  </text>
                </g>
              )}

              {/* ===================================================================
                  RENDER ALL PRESENCE SEGMENTS ON THE CHART
                  - ARRIVÉE = LOSANGE (◆) at exact arrival hour
                  - DÉPART = POINT (●) at exact departure hour
                 =================================================================== */}
              {visibleSegments.map((segment) => {
                const posX = getSegmentX(segment);
                const yStart = getY(segment.startHour);
                const yEnd = getY(segment.endHour);
                const isHovered = hoveredSegment?.id === segment.id;
                const dSize = isHovered ? 8.5 : 7;
                const pRadius = isHovered ? 7.5 : 6;

                // 1. COMPLETE SAME-DAY SHIFT: Losange at Arrival (yStart) and Point at Departure (yEnd)
                if (segment.type === 'complete') {
                  const arrTime = segment.arrivalRecord?.timeStr?.slice(0, 5) || formatDecimalHour(segment.startHour);
                  const depTime = segment.departureRecord?.timeStr?.slice(0, 5) || formatDecimalHour(segment.endHour);

                  return (
                    <g 
                      key={segment.id}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSelectDate?.(segment.dateStr)}
                    >
                      {/* Vertical connector line representing the presence shift */}
                      <line 
                        x1={posX} 
                        y1={yStart} 
                        x2={posX} 
                        y2={yEnd} 
                        stroke={segment.color} 
                        strokeWidth={isHovered ? 3 : 2} 
                        strokeDasharray="none"
                        opacity={isHovered ? 1 : 0.75}
                        className="transition-all"
                      />

                      {/* POINTAGE ARRIVÉE: LOSANGE (◆) */}
                      <polygon 
                        points={`${posX},${yStart - dSize} ${posX + dSize},${yStart} ${posX},${yStart + dSize} ${posX - dSize},${yStart}`} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={2}
                        className="transition-all drop-shadow-xs"
                      />

                      {/* POINTAGE DÉPART: POINT (●) */}
                      <circle 
                        cx={posX} 
                        cy={yEnd} 
                        r={pRadius} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={2}
                        className="transition-all drop-shadow-xs"
                      />

                      {/* Hover time badges */}
                      {isHovered && (
                        <g>
                          <rect x={posX + 10} y={Math.max(10, yStart - 10)} width={58} height={20} rx={5} fill="#111827" />
                          <text x={posX + 39} y={Math.max(10, yStart - 10) + 14} textAnchor="middle" className="text-[10px] font-mono font-black fill-emerald-300">
                            {arrTime}
                          </text>

                          <rect x={posX + 10} y={Math.max(10, yEnd - 10)} width={58} height={20} rx={5} fill="#111827" />
                          <text x={posX + 39} y={Math.max(10, yEnd - 10) + 14} textAnchor="middle" className="text-[10px] font-mono font-black fill-amber-300">
                            {depTime}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // 2. OVERNIGHT SHIFT START (Veille): Losange at Arrival -> Line going up to 24h (Minuit, Haut)
                if (segment.type === 'overnight_start') {
                  const yMidnight = getY(24);
                  const arrTime = segment.arrivalRecord?.timeStr?.slice(0, 5) || formatDecimalHour(segment.startHour);

                  return (
                    <g 
                      key={segment.id}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSelectDate?.(segment.dateStr)}
                    >
                      <line 
                        x1={posX} 
                        y1={yStart} 
                        x2={posX} 
                        y2={yMidnight} 
                        stroke={segment.color} 
                        strokeWidth={isHovered ? 3 : 2} 
                        strokeDasharray="4 2"
                        opacity={isHovered ? 1 : 0.8}
                      />

                      {/* ARRIVÉE: LOSANGE (◆) */}
                      <polygon 
                        points={`${posX},${yStart - dSize} ${posX + dSize},${yStart} ${posX},${yStart + dSize} ${posX - dSize},${yStart}`} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={2}
                        className="drop-shadow-xs"
                      />

                      {/* Midnight indicator dot at 24h */}
                      <circle 
                        cx={posX} 
                        cy={yMidnight} 
                        r={4} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={1.5}
                      />

                      {isHovered && (
                        <g>
                          <rect x={posX + 10} y={Math.max(10, yStart - 10)} width={58} height={20} rx={5} fill="#111827" />
                          <text x={posX + 39} y={Math.max(10, yStart - 10) + 14} textAnchor="middle" className="text-[10px] font-mono font-black fill-emerald-300">
                            {arrTime}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // 3. OVERNIGHT SHIFT END (Lendemain matin): Line from 0h (Bas) -> Point at Departure (yEnd)
                if (segment.type === 'overnight_end') {
                  const yZero = getY(0);
                  const depTime = segment.departureRecord?.timeStr?.slice(0, 5) || formatDecimalHour(segment.endHour);

                  return (
                    <g 
                      key={segment.id}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSelectDate?.(segment.dateStr)}
                    >
                      <line 
                        x1={posX} 
                        y1={yZero} 
                        x2={posX} 
                        y2={yEnd} 
                        stroke={segment.color} 
                        strokeWidth={isHovered ? 3 : 2} 
                        strokeDasharray="4 2"
                        opacity={isHovered ? 1 : 0.8}
                      />

                      {/* Zero hour indicator dot at 0h */}
                      <circle 
                        cx={posX} 
                        cy={yZero} 
                        r={4} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={1.5}
                      />

                      {/* DÉPART: POINT (●) */}
                      <circle 
                        cx={posX} 
                        cy={yEnd} 
                        r={pRadius} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={2}
                        className="drop-shadow-xs"
                      />

                      {isHovered && (
                        <g>
                          <rect x={posX + 10} y={Math.max(10, yEnd - 10)} width={58} height={20} rx={5} fill="#111827" />
                          <text x={posX + 39} y={Math.max(10, yEnd - 10) + 14} textAnchor="middle" className="text-[10px] font-mono font-black fill-amber-300">
                            {depTime}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // 4. ARRIVAL WITHOUT DEPARTURE:
                // If today -> Losange (◆) with active in-progress halo "En poste"
                // If past date -> Losange (◆) with prominent ? indicator
                if (segment.type === 'missing_departure' && segment.incidentHour !== undefined) {
                  const yIncident = getY(segment.incidentHour);

                  return (
                    <g 
                      key={segment.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSelectDate?.(segment.dateStr)}
                    >
                      {/* Halo pulsant si présence en cours aujourd'hui */}
                      {segment.isActiveToday && (
                        <circle 
                          cx={posX} 
                          cy={yIncident} 
                          r={dSize + 7} 
                          fill="#10b981" 
                          fillOpacity={0.25}
                          stroke="#10b981" 
                          strokeWidth={1.5}
                          className="animate-ping"
                        />
                      )}

                      {/* ARRIVÉE: LOSANGE (◆) */}
                      <polygon 
                        points={`${posX},${yIncident - dSize} ${posX + dSize},${yIncident} ${posX},${yIncident + dSize} ${posX - dSize},${yIncident}`} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={2.5}
                      />

                      {/* Indicateur : badge 'En poste' pour aujourd'hui, ou '?' rouge pour date passée */}
                      {segment.isActiveToday ? (
                        <circle 
                          cx={posX + 7} 
                          cy={yIncident - 7} 
                          r={5} 
                          fill="#10b981" 
                          stroke="#ffffff" 
                          strokeWidth={1.5}
                        />
                      ) : (
                        <>
                          <circle 
                            cx={posX + 8} 
                            cy={yIncident - 8} 
                            r={8} 
                            fill="#dc2626" 
                            stroke="#ffffff" 
                            strokeWidth={1.5}
                            className="animate-pulse"
                          />
                          <text 
                            x={posX + 8} 
                            y={yIncident - 5} 
                            textAnchor="middle" 
                            className="text-[10px] font-black fill-white"
                          >
                            ?
                          </text>
                        </>
                      )}
                    </g>
                  );
                }

                // 5. MISSING ARRIVAL: Only departure is present -> Point (●) with prominent ? indicator
                if (segment.type === 'missing_arrival' && segment.incidentHour !== undefined) {
                  const yIncident = getY(segment.incidentHour);

                  return (
                    <g 
                      key={segment.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => onSelectDate?.(segment.dateStr)}
                    >
                      {/* DÉPART: POINT (●) */}
                      <circle 
                        cx={posX} 
                        cy={yIncident} 
                        r={pRadius} 
                        fill={segment.color} 
                        stroke="#ffffff" 
                        strokeWidth={2.5}
                      />

                      {/* ❓ PROMINENT RED QUESTION MARK */}
                      <circle 
                        cx={posX + 8} 
                        cy={yIncident - 8} 
                        r={8} 
                        fill="#dc2626" 
                        stroke="#ffffff" 
                        strokeWidth={1.5}
                        className="animate-pulse"
                      />
                      <text 
                        x={posX + 8} 
                        y={yIncident - 5} 
                        textAnchor="middle" 
                        className="text-[10px] font-black fill-white"
                      >
                        ?
                      </text>
                    </g>
                  );
                }

                return null;
              })}
            </svg>
          </div>
        </div>

        {/* Legend Explanations at the bottom of the curve */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold text-gray-500 mt-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rotate-45 border border-white bg-emerald-600 inline-block shadow-2xs" />
              <span>◆ Losange = Arrivée (à l'heure exacte en ordonnée)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-white bg-emerald-600 inline-block shadow-2xs" />
              <span>● Point = Départ (à l'heure exacte en ordonnée)</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-700">
              <Moon size={13} className="text-indigo-600 inline" />
              <span>Garde de nuit : Arrivée → 24h & 0h → Départ</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-red-600 font-extrabold">
            <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black inline-flex">?</span>
            <span>Point d'interrogation rouge = Pointage incomplet</span>
          </div>
        </div>

        {/* Dynamic Interactive Tooltip Card */}
        {hoveredSegment && (
          <div className="mt-4 p-4 rounded-2xl bg-gray-900 text-white shadow-xl border border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <span 
                className="w-4 h-4 rounded-full border-2 border-white shrink-0" 
                style={{ backgroundColor: hoveredSegment.color }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-extrabold text-sm text-white">{hoveredSegment.employeeName}</h5>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono">{hoveredSegment.dayLabel}</span>
                  {hoveredSegment.type.includes('overnight') && (
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      <Moon size={11} /> Garde de Nuit
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 mt-1">
                  <span>
                    🟢 Arrivée (◆ Losange) : <strong className="text-white font-mono">
                      {hoveredSegment.arrivalRecord?.timeStr || (hoveredSegment.type === 'overnight_end' ? '20h.. la veille (0h)' : 'NON POINTÉE ❓')}
                    </strong>
                  </span>
                  <span>
                    🟠 Départ (● Point) : <strong className="text-white font-mono">
                      {hoveredSegment.departureRecord?.timeStr || (hoveredSegment.type === 'overnight_start' ? '07h.. le lendemain (24h)' : 'NON POINTÉ ❓')}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hoveredSegment.elapsedMinutes !== undefined ? (
                <div className="bg-emerald-600/90 text-white px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                  <span className="text-[9px] uppercase font-bold block text-emerald-200">Temps de Présence</span>
                  <span className="text-sm font-black font-mono">{formatElapsedMinutes(hoveredSegment.elapsedMinutes)}</span>
                </div>
              ) : hoveredSegment.isActiveToday ? (
                <div className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-center flex items-center gap-2 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold block text-emerald-200">Présence Active</span>
                    <span className="text-xs font-black">
                      En poste (Arrivée à {hoveredSegment.arrivalRecord?.timeStr})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-600 text-white px-3.5 py-1.5 rounded-xl text-center flex items-center gap-2 shadow-xs">
                  <span className="text-base font-black">❓</span>
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold block text-red-200">Pointage Incomplet</span>
                    <span className="text-xs font-black">
                      {hoveredSegment.type === 'missing_departure' 
                        ? `Départ non pointé (Arrivée à ${hoveredSegment.arrivalRecord?.timeStr})`
                        : `Arrivée non pointée (Départ à ${hoveredSegment.departureRecord?.timeStr})`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Palette des Utilisateurs en bas de section (pour filtrage / isolation) */}
      {!isMultiDay && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-gray-700 uppercase tracking-wider">
            <span>Filtre rapide par Collaborateur ({employees.length})</span>
            {highlightedEmployeeId !== 'all' && (
              <button
                type="button"
                onClick={() => setHighlightedEmployeeId('all')}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
              >
                Afficher tous les collaborateurs
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHighlightedEmployeeId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                highlightedEmployeeId === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tous ({employees.length})</span>
            </button>

            {employees.map(emp => {
              const empId = emp.username || emp.id;
              const color = employeeColorMap.get(empId) || employeeColorMap.get(emp.name.toLowerCase()) || '#059669';
              const isSelected = highlightedEmployeeId === empId;

              const empSegments = visibleSegments.filter(s => s.employeeId === empId);
              const totalMins = empSegments.reduce((s, seg) => s + (seg.elapsedMinutes || 0), 0);
              const hasMissing = empSegments.some(s => s.type === 'missing_departure' || s.type === 'missing_arrival');

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setHighlightedEmployeeId(isSelected ? 'all' : empId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 shadow-md bg-white text-gray-900'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                  style={{
                    borderLeftColor: color,
                    borderLeftWidth: 4
                  }}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-extrabold">{emp.name}</span>
                  {totalMins > 0 && (
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {formatElapsedMinutes(totalMins)}
                    </span>
                  )}
                  {hasMissing && (
                    <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse" title="Pointage incomplet">
                      ?
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
