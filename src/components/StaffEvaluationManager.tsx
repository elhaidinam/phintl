import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Minus, 
  Calendar, 
  User, 
  ShieldCheck, 
  MessageSquare, 
  Search, 
  Sparkles,
  Trash2,
  Edit3,
  CheckCheck,
  LineChart as LineChartIcon,
  LayoutGrid,
  ListOrdered
} from 'lucide-react';
import { Employee, StaffEvaluation } from '../types';
import StaffEvaluationMonthlyChart, { getStaffColor } from './StaffEvaluationMonthlyChart';

interface StaffEvaluationManagerProps {
  employees: Employee[];
  evaluations: StaffEvaluation[];
  onUpdateEvaluations: (evaluations: StaffEvaluation[]) => void;
  currentEmployee: Employee | null;
  loggedInUser: {
    type: 'employee' | 'supervisor' | 'owner';
    employeeId?: string;
    username: string;
    name: string;
  } | null;
}

const COMMON_MOTIFS = [
  { label: "Ponctualité exemplaire & assiduité", points: 1, type: 'plus' },
  { label: "Accueil patient chaleureux, souriant & bienveillant", points: 1, type: 'plus' },
  { label: "Conseil pharmaceutique & écoute active", points: 1, type: 'plus' },
  { label: "Tenue de caisse sans aucun écart", points: 1, type: 'plus' },
  { label: "Inventaire et rangement méthodique des rayons", points: 1, type: 'plus' },
  { label: "Préparation magistrale d'urgence réussie", points: 1, type: 'plus' },
  { label: "Entraide d'équipe et flexibilité de service", points: 1, type: 'plus' },
  { label: "Alerte précoce sur date courte de péremption", points: 1, type: 'plus' },
  { label: "Retard injustifié à la prise de service", points: -1, type: 'minus' },
  { label: "Écart ou erreur de comptage en caisse", points: -1, type: 'minus' },
  { label: "Manquement aux règles de tenue vestimentaire", points: -1, type: 'minus' },
  { label: "Erreur de rangement de stock au dépôt", points: -1, type: 'minus' },
  { label: "Absence non justifiée à une réunion ou formation", points: -1, type: 'minus' },
];

export default function StaffEvaluationManager({
  employees,
  evaluations,
  onUpdateEvaluations,
  currentEmployee,
  loggedInUser
}: StaffEvaluationManagerProps) {
  // Only non-supervisors are subject to evaluation
  const nonSupervisorEmployees = useMemo(() => {
    return employees.filter(emp => !emp.isSupervisor);
  }, [employees]);

  // Filters & State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'validated' | 'pending'>('all');
  const [activeSectionView, setActiveSectionView] = useState<'all' | 'chart' | 'cards' | 'table'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false);
  const [activeEvalForJustification, setActiveEvalForJustification] = useState<StaffEvaluation | null>(null);
  const [staffJustificationInput, setStaffJustificationInput] = useState('');

  // Add Operation Form state - strictly 1 point at a time
  const defaultSupervisorName = loggedInUser 
    ? (loggedInUser.type === 'owner' ? 'Direction (Edinam)' : (currentEmployee?.name || loggedInUser.name))
    : 'Direction (Edinam)';

  // Check if the current authenticated user is Edinam (Owner / Edinam account)
  const isEdinamUser = useMemo(() => {
    if (!loggedInUser) return false;
    if (loggedInUser.type === 'owner') return true;
    const username = (loggedInUser.username || '').toLowerCase();
    const name = (loggedInUser.name || '').toLowerCase();
    const empName = (currentEmployee?.name || '').toLowerCase();
    const empUsername = (currentEmployee?.username || '').toLowerCase();
    return username.includes('edinam') || name.includes('edinam') || empName.includes('edinam') || empUsername.includes('edinam');
  }, [loggedInUser, currentEmployee]);

  // Check if current authenticated user is a supervisor (or owner / direction / Edinam)
  const isSupervisorUser = useMemo(() => {
    if (!loggedInUser) return false;
    if (loggedInUser.type === 'owner' || loggedInUser.type === 'supervisor') return true;
    if (currentEmployee?.isSupervisor) return true;
    
    // Check if loggedInUser matches any employee record that is a supervisor
    const foundEmp = employees.find(e => 
      (loggedInUser.employeeId && e.id === loggedInUser.employeeId) || 
      (loggedInUser.username && e.username && e.username.toLowerCase() === loggedInUser.username.toLowerCase())
    );
    if (foundEmp?.isSupervisor) return true;

    // Check if user is Edinam
    const username = (loggedInUser.username || '').toLowerCase();
    const name = (loggedInUser.name || '').toLowerCase();
    const empName = (currentEmployee?.name || '').toLowerCase();
    const empUsername = (currentEmployee?.username || '').toLowerCase();
    if (username.includes('edinam') || name.includes('edinam') || empName.includes('edinam') || empUsername.includes('edinam')) {
      return true;
    }

    return false;
  }, [loggedInUser, currentEmployee, employees]);

  const [formEmployeeId, setFormEmployeeId] = useState<string>(() => nonSupervisorEmployees[0]?.id || employees[0]?.id || '');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formPointsType, setFormPointsType] = useState<'plus' | 'minus'>('plus');
  const [formMotif, setFormMotif] = useState<string>('Ponctualité exemplaire & assiduité');
  const [formSupervisor, setFormSupervisor] = useState<string>(defaultSupervisorName);
  const [formStaffJustification, setFormStaffJustification] = useState<string>('');
  const [formAutoValidate, setFormAutoValidate] = useState<boolean>(true);

  // Sync formEmployeeId if nonSupervisorEmployees changes
  useEffect(() => {
    if (!formEmployeeId || !nonSupervisorEmployees.some(e => e.id === formEmployeeId)) {
      if (nonSupervisorEmployees.length > 0) {
        setFormEmployeeId(nonSupervisorEmployees[0].id);
      }
    }
  }, [nonSupervisorEmployees, formEmployeeId]);

  // Month list available from data or recent 6 months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    evaluations.forEach(e => {
      if (e.date) {
        months.add(e.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [evaluations]);

  // Format month string into readable French e.g. "Août 2026"
  const formatMonthLabel = (monthStr: string) => {
    if (monthStr === 'all') return 'Tous les mois';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Helper to compute cumulative points for an employee in a given month
  const getEmployeeMonthlyCumul = (empId: string, monthStr: string, onlyValidated = true) => {
    return evaluations
      .filter(ev => {
        const matchesEmp = ev.employeeId === empId;
        const matchesMonth = monthStr === 'all' || (ev.date && ev.date.startsWith(monthStr));
        const matchesValidation = onlyValidated ? ev.isValidated : true;
        return matchesEmp && matchesMonth && matchesValidation;
      })
      .reduce((sum, ev) => sum + ev.points, 0);
  };

  // Helper to compute breakdown for stats
  const getEmployeeStats = (empId: string, monthStr: string) => {
    const list = evaluations.filter(ev => {
      const matchesEmp = ev.employeeId === empId;
      const matchesMonth = monthStr === 'all' || (ev.date && ev.date.startsWith(monthStr));
      return matchesEmp && matchesMonth;
    });

    const plusPoints = list.filter(e => e.isValidated && e.points > 0).reduce((sum, e) => sum + e.points, 0);
    const minusPoints = list.filter(e => e.isValidated && e.points < 0).reduce((sum, e) => sum + e.points, 0);
    const totalValidated = plusPoints + minusPoints;
    const pendingCount = list.filter(e => !e.isValidated).length;
    const totalOps = list.length;

    return { plusPoints, minusPoints, totalValidated, pendingCount, totalOps };
  };

  // Global month summary
  const monthGlobalStats = useMemo(() => {
    const filteredByMonth = evaluations.filter(ev => {
      return selectedMonth === 'all' || (ev.date && ev.date.startsWith(selectedMonth));
    });
    const validated = filteredByMonth.filter(ev => ev.isValidated);
    const plus = validated.filter(ev => ev.points > 0).reduce((acc, ev) => acc + ev.points, 0);
    const minus = validated.filter(ev => ev.points < 0).reduce((acc, ev) => acc + ev.points, 0);
    const pending = filteredByMonth.filter(ev => !ev.isValidated).length;
    return {
      totalPoints: plus + minus,
      plusPoints: plus,
      minusPoints: minus,
      pendingCount: pending,
      totalCount: filteredByMonth.length
    };
  }, [evaluations, selectedMonth]);

  // Filtered evaluations list for the table
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      // Exclude supervisor evaluations
      const targetEmp = employees.find(e => e.id === ev.employeeId);
      if (targetEmp?.isSupervisor) return false;

      // Month filter
      if (selectedMonth !== 'all' && (!ev.date || !ev.date.startsWith(selectedMonth))) {
        return false;
      }
      // Employee filter
      if (selectedEmployeeFilter !== 'all' && ev.employeeId !== selectedEmployeeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'validated' && !ev.isValidated) return false;
      if (statusFilter === 'pending' && ev.isValidated) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = ev.employeeName.toLowerCase();
        const motif = ev.motif.toLowerCase();
        const supervisor = ev.supervisor.toLowerCase();
        const justif = (ev.staffJustification || '').toLowerCase();
        if (!empName.includes(q) && !motif.includes(q) && !supervisor.includes(q) && !justif.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort by date desc
      return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
    });
  }, [evaluations, selectedMonth, selectedEmployeeFilter, statusFilter, searchQuery, employees]);

  // Handler: Open Add Modal preconfigured
  const openAddModal = (employeeId?: string, type?: 'plus' | 'minus') => {
    if (!isSupervisorUser) return;
    setFormDate(new Date().toISOString().split('T')[0]);
    if (employeeId && nonSupervisorEmployees.some(e => e.id === employeeId)) {
      setFormEmployeeId(employeeId);
    } else if (nonSupervisorEmployees.length > 0) {
      setFormEmployeeId(nonSupervisorEmployees[0].id);
    }
    if (type) {
      setFormPointsType(type);
      setFormMotif(type === 'plus' ? 'Ponctualité exemplaire & assiduité' : 'Retard injustifié à la prise de service');
    }
    setFormSupervisor(defaultSupervisorName);
    setFormAutoValidate(isEdinamUser);
    setIsAddModalOpen(true);
  };

  // Handler: Validate click (only active for Edinam)
  const handleValidateClick = (evalId: string) => {
    if (!isEdinamUser) return;
    const updated = evaluations.map(ev => {
      if (ev.id === evalId) {
        const nextState = !ev.isValidated;
        return {
          ...ev,
          isValidated: nextState,
          validatedBy: nextState ? 'Edinam' : undefined,
          validatedAt: nextState ? new Date().toISOString() : undefined
        };
      }
      return ev;
    });
    onUpdateEvaluations(updated);
  };

  // Handler: Validate all pending in selected month (only active for Edinam)
  const handleValidateAllPending = () => {
    if (!isEdinamUser) return;
    const updated = evaluations.map(ev => {
      const matchesMonth = selectedMonth === 'all' || (ev.date && ev.date.startsWith(selectedMonth));
      if (matchesMonth && !ev.isValidated) {
        return {
          ...ev,
          isValidated: true,
          validatedBy: 'Edinam',
          validatedAt: new Date().toISOString()
        };
      }
      return ev;
    });
    onUpdateEvaluations(updated);
  };

  // Handler: Add new evaluation (STRICTLY +1 or -1 point)
  const handleCreateEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupervisorUser) return;
    const targetEmp = nonSupervisorEmployees.find(emp => emp.id === formEmployeeId);
    if (!targetEmp) return;

    // Strictly 1 point added (+1) or 1 point subtracted (-1)
    const pointsNumber = formPointsType === 'plus' ? 1 : -1;
    const isValidatedAtCreation = isEdinamUser ? formAutoValidate : false;

    const newEval: StaffEvaluation = {
      id: `eval-${Date.now()}`,
      date: formDate,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      points: pointsNumber,
      motif: formMotif.trim() || (formPointsType === 'plus' ? 'Bonus performance (+1 pt)' : 'Malus manquement (-1 pt)'),
      supervisor: formSupervisor.trim() || defaultSupervisorName,
      staffJustification: formStaffJustification.trim() || undefined,
      isValidated: isValidatedAtCreation,
      validatedBy: isValidatedAtCreation ? 'Edinam' : undefined,
      validatedAt: isValidatedAtCreation ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    onUpdateEvaluations([newEval, ...evaluations]);
    setIsAddModalOpen(false);
    // Reset inputs
    setFormStaffJustification('');
  };

  // Handler: Delete evaluation (only supervisors or Edinam)
  const handleDeleteEvaluation = (evalId: string) => {
    if (!isSupervisorUser) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette ligne d'évaluation ?")) {
      const updated = evaluations.filter(ev => ev.id !== evalId);
      onUpdateEvaluations(updated);
    }
  };

  // Handler: Open justification modal
  const handleOpenJustificationModal = (ev: StaffEvaluation) => {
    setActiveEvalForJustification(ev);
    setStaffJustificationInput(ev.staffJustification || '');
    setIsJustificationModalOpen(true);
  };

  // Handler: Save justification
  const handleSaveJustification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvalForJustification) return;

    const updated = evaluations.map(ev => {
      if (ev.id === activeEvalForJustification.id) {
        return {
          ...ev,
          staffJustification: staffJustificationInput.trim() || undefined
        };
      }
      return ev;
    });

    onUpdateEvaluations(updated);
    setIsJustificationModalOpen(false);
    setActiveEvalForJustification(null);
  };

  return (
    <div id="staff-evaluation-manager" className="space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-[#FCFBF7] rounded-3xl p-6 md:p-8 text-gray-900 shadow-sm border border-emerald-600/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider">
              <Award className="w-4 h-4 text-emerald-700" />
              Système d'Évaluation & Points du Personnel
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              Évaluation Mensuelle du Personnel
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Attribution et décompte des points par les superviseurs. Chaque opération est validée par <strong>Edinam</strong> pour actualiser immédiatement le cumul mensuel devant chaque membre du personnel.
            </p>
          </div>

          {/* Action buttons on header */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-new-evaluation-operation"
              disabled={!isSupervisorUser}
              onClick={() => isSupervisorUser && openAddModal()}
              className={`px-4 py-2.5 font-black rounded-2xl shadow-sm transition-all flex items-center gap-2 text-sm border ${
                isSupervisorUser
                  ? 'bg-amber-500 hover:bg-amber-400 text-white cursor-pointer hover:scale-105 active:scale-95 border-amber-400'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-75'
              }`}
              title={
                isSupervisorUser
                  ? "Attribuer ou retrancher 1 point à un collaborateur"
                  : "Action réservée aux superviseurs (connectez-vous en tant que superviseur)"
              }
            >
              <Plus className="w-4 h-4" />
              <span>Attribuer / Retrancher 1 pt</span>
              {!isSupervisorUser && (
                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                  Superviseurs
                </span>
              )}
            </button>

            {monthGlobalStats.pendingCount > 0 && (
              <button
                id="btn-validate-all-edinam"
                disabled={!isEdinamUser}
                onClick={handleValidateAllPending}
                className={`px-4 py-2.5 font-black rounded-2xl shadow-sm transition-all flex items-center gap-2 text-sm border ${
                  isEdinamUser
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer hover:scale-105 active:scale-95 border-emerald-500'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                title={
                  isEdinamUser
                    ? `Valider toutes les ${monthGlobalStats.pendingCount} opérations en attente pour ce mois`
                    : `En attente (${monthGlobalStats.pendingCount}) • Action réservée à l'utilisateur Edinam`
                }
              >
                <CheckCheck className="w-4 h-4" />
                <span>Valider tout ({monthGlobalStats.pendingCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Month Selector & Global KPI Strip */}
        <div className="mt-6 pt-6 border-t border-[#EBE6DA] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-black uppercase text-gray-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Mois d'évaluation :
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#FAF8F2] border border-emerald-500/40 text-gray-900 text-sm font-black rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer capitalize shadow-2xs"
            >
              <option value="all">📅 Tous les mois confondus</option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className="text-gray-900 bg-white">
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <span className="text-gray-600">Cumul Total Validé :</span>
              <span className={`text-sm font-black ${monthGlobalStats.totalPoints >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {monthGlobalStats.totalPoints > 0 ? `+${monthGlobalStats.totalPoints}` : monthGlobalStats.totalPoints} pts
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-gray-600">Bonus (+) :</span>
              <span className="text-emerald-800 font-black">+{monthGlobalStats.plusPoints} pts</span>
            </div>

            <div className="flex items-center gap-2 bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-rose-400/30">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-gray-600">Malus (-) :</span>
              <span className="text-rose-700 font-black">{monthGlobalStats.minusPoints} pts</span>
            </div>

            {monthGlobalStats.pendingCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300 text-amber-900">
                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                <span>{monthGlobalStats.pendingCount} en attente de validation</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 md:p-3 rounded-2xl border border-gray-150 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-eval-view-all"
            onClick={() => setActiveSectionView('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionView === 'all'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Vue Complète
          </button>

          <button
            id="tab-eval-view-chart"
            onClick={() => setActiveSectionView('chart')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionView === 'chart'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5 text-amber-400" />
            Courbe Mensuelle des Points
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-400/30 text-amber-900 rounded font-black">
              Graphique
            </span>
          </button>

          <button
            id="tab-eval-view-cards"
            onClick={() => setActiveSectionView('cards')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionView === 'cards'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cumul par Personnel Non-Superviseur
          </button>

          <button
            id="tab-eval-view-table"
            onClick={() => setActiveSectionView('table')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionView === 'table'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Journal & Validations Edinam
          </button>
        </div>

        <div className="text-xs text-gray-500 font-bold px-2 hidden sm:block">
          {filteredEvaluations.length} opérations • Validation : Direction Edinam
        </div>
      </div>

      {/* 2. Monthly Curve Chart: Mois en Abscisse, Points en Ordonnée, Couleurs distinctes par personnel */}
      {(activeSectionView === 'all' || activeSectionView === 'chart') && (
        <StaffEvaluationMonthlyChart
          employees={employees}
          evaluations={evaluations}
          onSelectEmployee={(empId) => {
            setSelectedEmployeeFilter(empId);
          }}
          onSelectMonth={(month) => {
            setSelectedMonth(month);
          }}
        />
      )}

      {/* 3. Executive Personnel Summary Board ("Cumul du mois affiché devant chaque personnel") */}
      {(activeSectionView === 'all' || activeSectionView === 'cards') && (
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase mb-1.5">
              <span>👤</span> Personnel Non-Superviseur • Règle : 1 point à la fois
            </div>
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Cumul des Points par Personnel — {formatMonthLabel(selectedMonth)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Affichage du cumul mensuel validé par Edinam devant chaque collaborateur non-superviseur de l'officine.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start">
            {nonSupervisorEmployees.length} collaborateurs sous évaluation
          </span>
        </div>

        {/* Cards Grid of evaluated non-supervisor staff members */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nonSupervisorEmployees.map((emp, idx) => {
            const stats = getEmployeeStats(emp.id, selectedMonth);
            const staffColor = getStaffColor(emp.id, idx);

            return (
              <div
                key={emp.id}
                id={`staff-eval-card-${emp.id}`}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  selectedEmployeeFilter === emp.id 
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/20'
                    : 'border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-xs object-cover"
                      />
                      <span
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: staffColor }}
                        title="Couleur sur la courbe"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-gray-900 truncate">
                        {emp.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">{emp.role}</p>
                    </div>
                  </div>

                  {/* CUMUL MENSUEL BADGE */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-black uppercase text-gray-400">
                      Cumul Validé
                    </div>
                    <div
                      className={`text-lg font-black px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1 ${
                        stats.totalValidated > 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : stats.totalValidated < 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {stats.totalValidated > 0 ? `+${stats.totalValidated}` : stats.totalValidated}
                      <span className="text-xs font-normal">pts</span>
                    </div>
                  </div>
                </div>

                {/* Micro stats & Quick +1 / -1 actions */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-150/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <span className="text-emerald-600 font-black">+{stats.plusPoints}</span>
                    <span>/</span>
                    <span className="text-rose-600 font-black">{stats.minusPoints}</span>
                    {stats.pendingCount > 0 && (
                      <span className="text-amber-600 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                        {stats.pendingCount} en attente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick +1 pt */}
                    <button
                      disabled={!isSupervisorUser}
                      onClick={() => isSupervisorUser && openAddModal(emp.id, 'plus')}
                      className={`px-2 py-1 rounded-lg font-black text-[11px] transition-all flex items-center gap-0.5 shadow-xs border ${
                        isSupervisorUser
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      }`}
                      title={
                        isSupervisorUser
                          ? "Ajouter 1 point (+1 pt) à ce collaborateur"
                          : "Attribution de point réservée aux superviseurs"
                      }
                    >
                      <Plus className="w-3 h-3" />
                      1 pt
                    </button>

                    {/* Quick -1 pt */}
                    <button
                      disabled={!isSupervisorUser}
                      onClick={() => isSupervisorUser && openAddModal(emp.id, 'minus')}
                      className={`px-2 py-1 rounded-lg font-black text-[11px] transition-all flex items-center gap-0.5 shadow-xs border ${
                        isSupervisorUser
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      }`}
                      title={
                        isSupervisorUser
                          ? "Retrancher 1 point (-1 pt) à ce collaborateur"
                          : "Attribution de point réservée aux superviseurs"
                      }
                    >
                      <Minus className="w-3 h-3" />
                      1 pt
                    </button>

                    <button
                      onClick={() => {
                        setSelectedEmployeeFilter(selectedEmployeeFilter === emp.id ? 'all' : emp.id);
                      }}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        selectedEmployeeFilter === emp.id
                          ? 'bg-gray-800 text-white'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                      title="Filtrer l'historique sur ce collaborateur"
                    >
                      {selectedEmployeeFilter === emp.id ? 'Tous' : 'Filtrer'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 4. Detailed Operations Table & Filter Controls */}
      {(activeSectionView === 'all' || activeSectionView === 'table') && (
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Journal des Opérations d'Évaluation
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Détail chronologique de chaque attribution (+1 pt) ou retrait (-1 pt) avec validation par Edinam.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher personnel, motif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Employee Filter - only non-supervisors */}
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">👥 Tous les collaborateurs non-superviseurs</option>
              {nonSupervisorEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tout statut</option>
              <option value="validated">✅ Validé</option>
              <option value="pending">⏳ En attente de validation</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-150">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-150 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Personnel</th>
                <th className="py-3.5 px-4 text-center">Points (+ / -)</th>
                <th className="py-3.5 px-4 text-center">Cumul du Mois</th>
                <th className="py-3.5 px-4">Motif de l'opération</th>
                <th className="py-3.5 px-4">Superviseur</th>
                <th className="py-3.5 px-4">Justification du Staff</th>
                <th className="py-3.5 px-4 text-center">Validation</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-sm text-gray-500">Aucune opération d'évaluation trouvée</p>
                    <p className="text-xs mt-1">
                      {isSupervisorUser
                        ? "Utilisez le bouton ci-dessus pour attribuer ou retrancher des points (+1 / -1 pt)."
                        : "L'attribution ou le retrait de points est réservé aux superviseurs."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev) => {
                  const empIndex = employees.findIndex(e => e.id === ev.employeeId);
                  const emp = empIndex !== -1 ? employees[empIndex] : undefined;
                  const staffColor = getStaffColor(ev.employeeId, empIndex !== -1 ? empIndex : 0);
                  const monthOfEval = ev.date ? ev.date.substring(0, 7) : selectedMonth;
                  const currentEmpCumul = getEmployeeMonthlyCumul(ev.employeeId, monthOfEval, true);

                  return (
                    <tr
                      key={ev.id}
                      id={`eval-row-${ev.id}`}
                      className="hover:bg-emerald-50/20 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-bold text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {ev.date}
                        </div>
                      </td>

                      {/* Personnel */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <img
                              src={emp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ev.employeeName}`}
                              alt={ev.employeeName}
                              className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 shrink-0 object-cover"
                            />
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white"
                              style={{ backgroundColor: staffColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 truncate flex items-center gap-1">
                              {ev.employeeName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{emp?.role || 'Collaborateur'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Points (+ or -) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs ${
                            ev.points > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {ev.points > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          {ev.points > 0 ? `+${ev.points}` : ev.points} pts
                        </span>
                      </td>

                      {/* Cumul du mois (calculé pour ce collaborateur) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-black px-2 py-0.5 rounded-lg text-xs ${
                            currentEmpCumul > 0
                              ? 'bg-emerald-50 text-emerald-700 font-black'
                              : currentEmpCumul < 0
                              ? 'bg-rose-50 text-rose-700 font-black'
                              : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {currentEmpCumul > 0 ? `+${currentEmpCumul}` : currentEmpCumul} pts
                        </span>
                      </td>

                      {/* Motif */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-gray-800 leading-snug">{ev.motif}</p>
                      </td>

                      {/* Superviseur */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-bold bg-gray-50 px-2 py-1 rounded-md text-[11px] border border-gray-150">
                          <User className="w-3 h-3 text-purple-600" />
                          {ev.supervisor}
                        </span>
                      </td>

                      {/* Justification du Staff */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {ev.staffJustification ? (
                          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl text-[11px] text-amber-900 leading-relaxed relative group">
                            <p className="italic">"{ev.staffJustification}"</p>
                            <button
                              onClick={() => handleOpenJustificationModal(ev)}
                              className="mt-1 text-[10px] font-black text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              Modifier justification
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenJustificationModal(ev)}
                            className="text-gray-400 hover:text-emerald-700 text-[11px] font-bold italic flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            + Ajouter justification
                          </button>
                        )}
                      </td>

                      {/* Validation (Bouton visible pour tous mais seulement actif pour Edinam) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {ev.isValidated ? (
                          <button
                            id={`btn-validate-status-${ev.id}`}
                            disabled={!isEdinamUser}
                            onClick={() => isEdinamUser && handleValidateClick(ev.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                              isEdinamUser
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 shadow-xs cursor-pointer hover:scale-105 active:scale-95'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-not-allowed opacity-90'
                            }`}
                            title={
                              isEdinamUser
                                ? "Statut : Validé. Cliquez pour annuler ou modifier la validation"
                                : "Statut : Validé (Action réservée à l'utilisateur Edinam)"
                            }
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Validé</span>
                          </button>
                        ) : (
                          <button
                            id={`btn-validate-click-${ev.id}`}
                            disabled={!isEdinamUser}
                            onClick={() => isEdinamUser && handleValidateClick(ev.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                              isEdinamUser
                                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-500 shadow-md cursor-pointer hover:scale-105 active:scale-95 animate-pulse'
                                : 'bg-amber-50 text-amber-800 border-amber-200/80 cursor-not-allowed opacity-85'
                            }`}
                            title={
                              isEdinamUser
                                ? "Cliquez pour valider cette opération (Compte Edinam)"
                                : "En attente de validation (Action réservée à l'utilisateur Edinam)"
                            }
                          >
                            <ShieldCheck className={`w-4 h-4 shrink-0 ${isEdinamUser ? 'text-amber-950' : 'text-amber-600'}`} />
                            <span>{isEdinamUser ? 'Valider' : 'En attente'}</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isSupervisorUser ? (
                          <button
                            onClick={() => handleDeleteEvaluation(ev.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer cette opération"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="p-1.5 text-gray-200 cursor-not-allowed inline-block" title="Suppression réservée aux superviseurs">
                            <Trash2 className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 5. MODAL: AJOUTER / RETRANCHER DES POINTS */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Award className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">Attribuer / Retrancher des Points</h3>
                    <p className="text-xs text-emerald-100">Enregistrer une opération d'évaluation du personnel</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateEvaluation} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Rule info callout */}
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
                  <span className="text-base">📌</span>
                  <div className="text-xs text-emerald-950 leading-relaxed">
                    <p className="font-black">Règle d'évaluation de l'officine :</p>
                    <p className="text-emerald-800">
                      L'évaluation concerne <strong>uniquement le personnel non-superviseur</strong>. Le nombre de points attribuable ou déductible est fixé à <strong>exactement 1 point</strong> à la fois (+1 pt ou -1 pt).
                    </p>
                  </div>
                </div>

                {/* Personnel Selection */}
                <div>
                  <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                    1. Personnel Concerné (Non-Superviseur)
                  </label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {nonSupervisorEmployees.map((emp) => {
                      const empMonthCumul = getEmployeeMonthlyCumul(emp.id, selectedMonth, true);
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.role} (Cumul actuel : {empMonthCumul > 0 ? `+${empMonthCumul}` : empMonthCumul} pts)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Date & Type Operation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                      2. Date de l'opération
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                      3. Opération de Point (Fixé à 1 pt)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormPointsType('plus');
                          setFormMotif('Ponctualité exemplaire & assiduité');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          formPointsType === 'plus'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        +1 pt (Bonus)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormPointsType('minus');
                          setFormMotif('Retard injustifié à la prise de service');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          formPointsType === 'minus'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                        -1 pt (Malus)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Point summary banner */}
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                  formPointsType === 'plus' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-xs font-bold">
                    Valeur appliquée à l'évaluation :
                  </span>
                  <span className={`text-base font-black px-3 py-0.5 rounded-xl ${
                    formPointsType === 'plus' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {formPointsType === 'plus' ? '+1 point' : '-1 point'}
                  </span>
                </div>

                {/* Motif with suggestions */}
                <div>
                  <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                    4. Motif de l'évaluation
                  </label>
                  <input
                    type="text"
                    value={formMotif}
                    onChange={(e) => setFormMotif(e.target.value)}
                    required
                    placeholder="Ex: Ponctualité exemplaire, Accueil remarquable..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-2"
                  />

                  {/* Common motifs pills */}
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-gray-50/50 rounded-xl border border-gray-150">
                    {COMMON_MOTIFS.filter(m => m.type === formPointsType).map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormMotif(m.label);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-gray-700 border border-gray-200 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span className={m.points > 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                          {m.points > 0 ? '+1' : '-1'}
                        </span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Superviseur */}
                <div>
                  <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                    5. Superviseur émetteur
                  </label>
                  <input
                    type="text"
                    value={formSupervisor}
                    onChange={(e) => setFormSupervisor(e.target.value)}
                    required
                    placeholder="Nom du superviseur"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Justification du Staff (Optionnel) */}
                <div>
                  <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                    6. Justification / Observations du Collaborateur (Optionnel)
                  </label>
                  <textarea
                    rows={2}
                    value={formStaffJustification}
                    onChange={(e) => setFormStaffJustification(e.target.value)}
                    placeholder="Observations, explications ou remarques du collaborateur..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Validation Switch */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  isEdinamUser ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 opacity-85'
                }`}>
                  <div>
                    <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      Validation immédiate
                    </p>
                    <p className="text-[11px] text-gray-600">
                      {isEdinamUser
                        ? "Actualise directement le cumul mensuel validé devant le personnel"
                        : "Nécessite la validation par l'utilisateur Edinam pour être validé"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEdinamUser ? formAutoValidate : false}
                    disabled={!isEdinamUser}
                    onChange={(e) => isEdinamUser && setFormAutoValidate(e.target.checked)}
                    className={`w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 accent-emerald-600 ${
                      isEdinamUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!isSupervisorUser}
                    className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                      isSupervisorUser
                        ? 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Enregistrer l'opération ({formPointsType === 'plus' ? '+1 pt' : '-1 pt'})
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: JUSTIFICATION DU STAFF */}
      <AnimatePresence>
        {isJustificationModalOpen && activeEvalForJustification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <MessageSquare className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Justification du Staff</h3>
                    <p className="text-xs text-amber-100">{activeEvalForJustification.employeeName} — {activeEvalForJustification.motif}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsJustificationModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveJustification} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                    Commentaire / Explications du collaborateur
                  </label>
                  <textarea
                    rows={4}
                    value={staffJustificationInput}
                    onChange={(e) => setStaffJustificationInput(e.target.value)}
                    required
                    placeholder="Saisissez la justification, le contexte ou la remarque du collaborateur..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsJustificationModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Enregistrer la justification
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
