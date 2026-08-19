import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Calendar, 
  Users, 
  Filter, 
  Sparkles,
  BarChart3,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Employee, StaffEvaluation } from '../types';

// Curated high-contrast, beautiful palette to ensure every staff has a distinct color
export const STAFF_COLORS = [
  '#059669', // Emerald - emp-1 (Awa Diop)
  '#2563eb', // Royal Blue - emp-2 (Mamadou Diallo)
  '#7c3aed', // Purple - emp-3 (Koffi Mensah)
  '#d97706', // Amber / Dark Orange - emp-4 (Fatou Bensouda)
  '#db2777', // Pink - emp-5 (Youssouf Koné)
  '#0891b2', // Cyan
  '#dc2626', // Red
  '#4f46e5', // Indigo
  '#16a34a', // Forest Green
  '#ea580c', // Tangerine
  '#0284c7', // Sky Blue
  '#c026d3', // Fuchsia
  '#ca8a04', // Gold
];

export function getStaffColor(empId: string, index: number): string {
  return STAFF_COLORS[index % STAFF_COLORS.length];
}

interface StaffEvaluationMonthlyChartProps {
  employees: Employee[];
  evaluations: StaffEvaluation[];
  onSelectEmployee?: (empId: string) => void;
  onSelectMonth?: (monthStr: string) => void;
}

export default function StaffEvaluationMonthlyChart({
  employees,
  evaluations,
  onSelectEmployee,
  onSelectMonth
}: StaffEvaluationMonthlyChartProps) {
  // Only non-supervisors are evaluated
  const evaluatedEmployees = useMemo(() => {
    return employees.filter(emp => !emp.isSupervisor);
  }, [employees]);

  // Mode: "monthly_net" (points of each specific month) vs "cumulative_annual" (running total across months)
  const [chartMode, setChartMode] = useState<'monthly_net' | 'cumulative_annual'>('monthly_net');
  // Selected employee to highlight (or 'all')
  const [highlightedEmpId, setHighlightedEmpId] = useState<string>('all');
  // Time span filter: 'recent4' | 'recent6' | 'all'
  const [timeRange, setTimeRange] = useState<'recent4' | 'recent6' | 'all'>('recent6');

  // Map employee ID to index & color (among evaluated non-supervisors)
  const employeeColorMap = useMemo(() => {
    const map: Record<string, { color: string; employee: Employee; index: number }> = {};
    evaluatedEmployees.forEach((emp, idx) => {
      map[emp.id] = {
        color: getStaffColor(emp.id, idx),
        employee: emp,
        index: idx
      };
    });
    return map;
  }, [evaluatedEmployees]);

  // Extract all chronological months present in evaluations or last 6 months
  const allChronologicalMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Scan evaluations
    evaluations.forEach(ev => {
      if (ev.date && ev.date.length >= 7) {
        monthsSet.add(ev.date.substring(0, 7));
      }
    });

    // Ensure at least the last 4 months are present if no evals exist
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const sorted = Array.from(monthsSet).sort(); // YYYY-MM ascending

    if (timeRange === 'recent4') {
      return sorted.slice(-4);
    } else if (timeRange === 'recent6') {
      return sorted.slice(-6);
    }
    return sorted;
  }, [evaluations, timeRange]);

  // Format month into readable French abbreviation: "Août 2026" or "Août 26"
  const formatMonthShort = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  const formatMonthFull = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Build chart dataset
  // Format: [{ month: '2026-05', monthLabel: 'Mai 2026', [empId]: points, [empId_name]: points, ... }, ...]
  const chartData = useMemo(() => {
    const runningTotals: Record<string, number> = {};
    evaluatedEmployees.forEach(emp => {
      runningTotals[emp.id] = 0;
    });

    return allChronologicalMonths.map(monthStr => {
      // Find all validated evaluations for this month
      const monthEvals = evaluations.filter(ev => {
        return ev.isValidated && ev.date && ev.date.startsWith(monthStr);
      });

      const entry: Record<string, any> = {
        month: monthStr,
        monthLabel: formatMonthShort(monthStr),
        monthFull: formatMonthFull(monthStr)
      };

      evaluatedEmployees.forEach(emp => {
        const empEvals = monthEvals.filter(ev => ev.employeeId === emp.id);
        const monthlySum = empEvals.reduce((acc, ev) => acc + ev.points, 0);

        if (chartMode === 'monthly_net') {
          entry[emp.id] = monthlySum;
        } else {
          // cumulative
          runningTotals[emp.id] = (runningTotals[emp.id] || 0) + monthlySum;
          entry[emp.id] = runningTotals[emp.id];
        }
      });

      return entry;
    });
  }, [allChronologicalMonths, evaluations, evaluatedEmployees, chartMode]);

  // Overall min and max points for smart Y-Axis bounds
  const { minY, maxY } = useMemo(() => {
    let min = 0;
    let max = 4;

    chartData.forEach(item => {
      evaluatedEmployees.forEach(emp => {
        const val = item[emp.id];
        if (typeof val === 'number') {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });

    const paddedMin = Math.floor(min - 1);
    const paddedMax = Math.ceil(max + 1);
    return { minY: paddedMin, maxY: Math.max(paddedMax, 3) };
  }, [chartData, evaluatedEmployees]);

  // Best performer of the latest month in data
  const latestMonthBestPerformer = useMemo(() => {
    if (chartData.length === 0) return null;
    const lastItem = chartData[chartData.length - 1];
    let topEmp: Employee | null = null;
    let topScore = -999;

    evaluatedEmployees.forEach(emp => {
      const val = lastItem[emp.id] || 0;
      if (val > topScore) {
        topScore = val;
        topEmp = emp;
      }
    });

    if (!topEmp || topScore <= 0) return null;
    return {
      employee: topEmp as Employee,
      score: topScore,
      monthLabel: lastItem.monthFull
    };
  }, [chartData, evaluatedEmployees]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const fullLabel = payload[0]?.payload?.monthFull || label;

      // Sort staff by points desc for this month
      const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

      return (
        <div className="bg-gray-950/95 text-white p-4 rounded-2xl shadow-2xl border border-gray-700/60 backdrop-blur-md min-w-[240px] text-xs">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <span className="font-black text-amber-300 flex items-center gap-1.5 capitalize text-sm">
              <Calendar className="w-4 h-4 text-amber-400" />
              {fullLabel}
            </span>
            <span className="text-[10px] uppercase font-bold text-gray-400">
              {chartMode === 'monthly_net' ? 'Cumul Mensuel' : 'Cumul Progressif'}
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedPayload.map((entry: any) => {
              const empInfo = employeeColorMap[entry.dataKey];
              const empName = empInfo?.employee.name || entry.name;
              const avatar = empInfo?.employee.avatar;
              const val = entry.value ?? 0;
              const isPositive = val > 0;
              const isNegative = val < 0;

              return (
                <div 
                  key={entry.dataKey}
                  className={`flex items-center justify-between gap-3 p-1.5 rounded-xl transition-all ${
                    highlightedEmpId === entry.dataKey ? 'bg-white/10 ring-1 ring-white/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: entry.color }}
                    />
                    {avatar && (
                      <img
                        src={avatar}
                        alt={empName}
                        className="w-5 h-5 rounded-full bg-white/20 object-cover shrink-0"
                      />
                    )}
                    <span className="font-bold text-gray-200 truncate">{empName}</span>
                  </div>

                  <span
                    className={`font-black px-2 py-0.5 rounded-lg text-xs shrink-0 ${
                      isPositive
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                        : isNegative
                        ? 'text-rose-400 bg-rose-950/60 border border-rose-500/30'
                        : 'text-gray-400 bg-gray-900'
                    }`}
                  >
                    {isPositive ? `+${val}` : val} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="staff-evaluation-monthly-chart" className="bg-[#FCFBF7] rounded-3xl p-6 md:p-8 border border-emerald-600/40 shadow-sm space-y-6">
      {/* Chart Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EBE6DA] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-black uppercase tracking-wider mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
            Évolution Chronologique des Points
          </div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            Courbe Comparative des Cumuls Mensuels
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Visualisation des points validés par Edinam au fil des mois pour chaque membre du personnel (chaque personnel est représenté par une couleur distinctive).
          </p>
        </div>

        {/* Controls: Mode & Time Range */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-[#FAF8F2] rounded-2xl border border-emerald-500/30">
            <button
              id="btn-chart-mode-monthly"
              onClick={() => setChartMode('monthly_net')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                chartMode === 'monthly_net'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cumul Mensuel Net
            </button>
            <button
              id="btn-chart-mode-cumulative"
              onClick={() => setChartMode('cumulative_annual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                chartMode === 'cumulative_annual'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Progression Cumulée
            </button>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#FAF8F2] border border-emerald-500/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            <option value="recent4">4 derniers mois</option>
            <option value="recent6">6 derniers mois</option>
            <option value="all">Tout l'historique</option>
          </select>
        </div>
      </div>

      {/* Interactive Staff Chips (Legend & Filter) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black uppercase text-gray-500 tracking-wider">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            Légende & Collaborateurs (Cliquez pour mettre en évidence) :
          </span>
          {highlightedEmpId !== 'all' && (
            <button
              onClick={() => setHighlightedEmpId('all')}
              className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
            >
              Afficher toutes les courbes
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setHighlightedEmpId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              highlightedEmpId === 'all'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>👥</span>
            <span>Tous ({evaluatedEmployees.length})</span>
          </button>

          {evaluatedEmployees.map((emp, idx) => {
            const color = getStaffColor(emp.id, idx);
            const isHighlighted = highlightedEmpId === emp.id;
            const isDimmed = highlightedEmpId !== 'all' && !isHighlighted;

            return (
              <button
                key={emp.id}
                id={`btn-legend-emp-${emp.id}`}
                onClick={() => {
                  setHighlightedEmpId(highlightedEmpId === emp.id ? 'all' : emp.id);
                  if (onSelectEmployee) onSelectEmployee(emp.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isHighlighted
                    ? 'ring-2 shadow-md bg-white'
                    : isDimmed
                    ? 'opacity-40 bg-gray-50 border-gray-200'
                    : 'bg-gray-50/80 hover:bg-white border-gray-200/80 hover:shadow-xs'
                }`}
                style={{
                  borderColor: isHighlighted ? color : undefined,
                  ringColor: isHighlighted ? `${color}40` : undefined
                }}
              >
                {/* Distinct Color Indicator */}
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                  style={{ backgroundColor: color }}
                />
                <img
                  src={emp.avatar}
                  alt={emp.name}
                  className="w-4 h-4 rounded-full bg-gray-200 object-cover shrink-0"
                />
                <span className="font-black text-gray-800">{emp.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Graphic Canvas */}
      <div className="w-full h-[360px] md:h-[420px] pt-4 pb-2 bg-gradient-to-b from-gray-50/40 to-white rounded-2xl border border-gray-150 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            {/* Background Grid */}
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

            {/* X Axis: Mois en abscisse */}
            <XAxis
              dataKey="monthLabel"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              dy={10}
              tick={{ fontWeight: 600 }}
            />

            {/* Y Axis: Nombre de points en ordonnée */}
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              domain={[minY, maxY]}
              dx={-5}
              tickFormatter={(val) => `${val > 0 ? `+${val}` : val} pt`}
              tick={{ fontWeight: 600 }}
            />

            {/* Reference Line at Y=0 (Neutral Baseline) */}
            <ReferenceLine
              y={0}
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: 'Seuil 0',
                position: 'insideBottomRight',
                fill: '#9ca3af',
                fontSize: 10,
                fontWeight: 700
              }}
            />

            {/* Custom Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Multi-Line Curves for each Non-Supervisor Employee */}
            {evaluatedEmployees.map((emp, idx) => {
              const color = getStaffColor(emp.id, idx);
              const isSelected = highlightedEmpId === emp.id;
              const isAll = highlightedEmpId === 'all';
              const opacity = isSelected || isAll ? 1 : 0.15;
              const strokeWidth = isSelected ? 4 : 2.5;

              return (
                <Line
                  key={emp.id}
                  type="monotone"
                  dataKey={emp.id}
                  name={emp.name}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  activeDot={{
                    r: 7,
                    stroke: '#fff',
                    strokeWidth: 2,
                    fill: color,
                    className: 'shadow-lg'
                  }}
                  dot={{
                    r: isSelected ? 5 : 3.5,
                    strokeWidth: 1.5,
                    stroke: '#fff',
                    fill: color,
                    opacity: opacity
                  }}
                  connectNulls
                  isAnimationActive={true}
                  animationDuration={800}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>

        {/* Axis descriptive labels for clarity */}
        <div className="absolute top-2 left-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">
          ▲ Ordonnée : Nombre de points (+1 / -1)
        </div>
        <div className="absolute bottom-1 right-6 text-[10px] font-black uppercase text-gray-400 tracking-wider">
          Abscisse : Mois ▶
        </div>
      </div>

      {/* Footer Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {/* Highlight 1: Best Performer */}
        {latestMonthBestPerformer && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              <Award className="w-6 h-6 text-amber-100" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                Top Score — {latestMonthBestPerformer.monthLabel}
              </span>
              <p className="text-sm font-black text-gray-900 truncate">
                {latestMonthBestPerformer.employee.name}
              </p>
              <p className="text-xs text-amber-900 font-black">
                +{latestMonthBestPerformer.score} points validés
              </p>
            </div>
          </div>
        )}

        {/* Highlight 2: Total Months Tracked */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
            <Calendar className="w-6 h-6 text-emerald-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Période Analysée
            </span>
            <p className="text-sm font-black text-gray-900 truncate">
              {allChronologicalMonths.length} mois sous surveillance
            </p>
            <p className="text-xs text-emerald-700 font-bold">
              Du {formatMonthShort(allChronologicalMonths[0] || '')} au {formatMonthShort(allChronologicalMonths[allChronologicalMonths.length - 1] || '')}
            </p>
          </div>
        </div>

        {/* Highlight 3: Staff Evaluated */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-center gap-3.5 sm:col-span-2 lg:col-span-1">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
              Personnel Non-Superviseur
            </span>
            <p className="text-sm font-black text-gray-900 truncate">
              {evaluatedEmployees.length} collaborateurs évalués
            </p>
            <p className="text-xs text-blue-700 font-bold">
              Incréments de 1 pt • Contrôle d'Edinam
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
