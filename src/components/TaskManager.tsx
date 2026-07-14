import React, { useState } from 'react';
import { Calendar, CheckCircle2, Plus, Clock, UserCheck, AlertCircle, CheckCircle, MessageSquare, Trash } from 'lucide-react';
import { Employee, Task, TaskMilestone, TaskComment } from '../types';

interface TaskManagerProps {
  currentEmployee: Employee | null;
  loggedInUser: { type: string; employeeId?: string; name: string } | null;
  employees: Employee[];
  tasks: Task[];
  onAssignTask: (title: string, description: string, milestoneTitles: string[], deadline: string, assignedToId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onAddMilestone: (taskId: string, milestoneTitle: string, addedBy: 'supervisor' | 'assignee') => void;
  onAddComment: (taskId: string, content: string) => void;
  viewMode: 'public' | 'private' | 'supervisor';
  onAcknowledgeTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function TaskManager({
  currentEmployee,
  loggedInUser,
  employees,
  tasks,
  onAssignTask,
  onCompleteTask,
  onToggleMilestone,
  onAddMilestone,
  onAddComment,
  viewMode,
  onAcknowledgeTask,
  onDeleteTask
}: TaskManagerProps) {
  // Task Creator Form States (For supervisor)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Local state for creator milestones
  const [milestonesInput, setMilestonesInput] = useState('');
  const [initialMilestones, setInitialMilestones] = useState<string[]>([]);

  // Local states for existing task cards (milestones & comments inputs)
  const [newMilestoneTexts, setNewMilestoneTexts] = useState<Record<string, string>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title.trim() || !assignedToId || !deadline) {
      setFormError('Veuillez remplir le titre, choisir un collaborateur et spécifier la date limite.');
      return;
    }

    if (initialMilestones.length === 0) {
      setFormError('La description doit contenir au moins un jalon d’avancement (milestone). Veuillez en ajouter un ci-dessous.');
      return;
    }

    onAssignTask(
      title.trim(),
      description.trim() || `Tâche avec ${initialMilestones.length} jalons d'avancement`,
      initialMilestones,
      deadline,
      assignedToId
    );

    // Reset fields
    setTitle('');
    setDescription('');
    setAssignedToId('');
    setDeadline('');
    setInitialMilestones([]);
    setFormSuccess('Tâche assignée et jalons notifiés avec succès !');
  };

  // Helper: check if task is overdue
  const isOverdue = (task: Task) => {
    if (task.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dlDate = new Date(task.deadline);
    return dlDate < today;
  };

  return (
    <div className="space-y-6">
      {/* 1. SUPERVISOR CREATOR VIEW (Rendered in planning/supervisor area) */}
      {viewMode === 'supervisor' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#E17522]" />
              Suivi des tâches
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Divisez le travail en jalons précis. Les collaborateurs pourront les valider un par un en temps réel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-50 border border-green-100 text-green-700 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Réassortir le rayon pédiatrie"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold"
                />
              </div>

              {/* Assign To Employee */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Assigner à (Collaborateur) *
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-black"
                >
                  <option value="">-- Choisir un employé --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Date Limite (Deadline) *
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold"
                />
              </div>

              {/* Description/Context */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Contexte ou note additionnelle (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Consignes complémentaires..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold"
                />
              </div>
            </div>

            {/* Milestones dynamic builder inside creation form */}
            <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/40 space-y-3">
              <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <span>🎯</span> Définir la Description sous forme de Jalons (Milestones) *
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Vérifier les dates de péremption de la rangée A"
                  value={milestonesInput}
                  onChange={(e) => setMilestonesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (milestonesInput.trim()) {
                        setInitialMilestones([...initialMilestones, milestonesInput.trim()]);
                        setMilestonesInput('');
                      }
                    }
                  }}
                  className="flex-1 text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (milestonesInput.trim()) {
                      setInitialMilestones([...initialMilestones, milestonesInput.trim()]);
                      setMilestonesInput('');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-3 rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter jalon
                </button>
              </div>

              {initialMilestones.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                    Jalons prévus pour cette tâche ({initialMilestones.length}) :
                  </span>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-white/50 rounded-xl border border-dashed border-emerald-200">
                    {initialMilestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs"
                      >
                        <span className="text-emerald-600 font-extrabold text-[10px]">#{idx + 1}</span>
                        <span className="truncate max-w-[200px]">{m}</span>
                        <button
                          type="button"
                          onClick={() => setInitialMilestones(initialMilestones.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 text-xs font-black ml-1.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-[#E17522] hover:bg-[#c95d10] text-white text-xs font-black px-6 py-3.5 rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Assigner la Tâche
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. TASK LIST (Rendered in Public or Private Space) */}
      <div className="space-y-4">
        {viewMode === 'private' && (
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Mes Missions & Jalons Assignés ({tasks.filter(t => t.assignedToId === currentEmployee?.id).length})
              </h4>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                Vous pouvez ajouter vos propres jalons de travail et cocher les étapes accomplies.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'public' && (
          <div className="border-b border-gray-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#E17522]" />
                Suivi des tâches
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Suivez en temps réel le taux de progression dynamique de chaque tâche via le slicer d'avancement.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] bg-amber-50 text-amber-800 font-extrabold px-2.5 py-1.5 rounded-lg border border-amber-100">
                ⌛ En cours : {tasks.filter(t => t.status === 'pending').length}
              </span>
              <span className="text-[10px] bg-green-50 text-green-800 font-extrabold px-2.5 py-1.5 rounded-lg border border-green-100">
                ✅ Terminées : {tasks.filter(t => t.status === 'completed').length}
              </span>
            </div>
          </div>
        )}

        {/* Task Cards Rendering */}
        {(() => {
          const filtered = viewMode === 'private'
            ? tasks.filter((t) => t.assignedToId === currentEmployee?.id)
            : tasks;

          if (filtered.length === 0) {
            return (
              <div className="text-center py-10 bg-gray-50 border border-dashed rounded-2xl text-xs text-gray-400 italic">
                {viewMode === 'private'
                  ? "Excellente nouvelle ! Vous n'avez aucune tâche assignée pour le moment."
                  : "Aucune tâche n'a été planifiée ou assignée pour l'instant."}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((task) => {
                const overdue = isOverdue(task);
                const isCompleted = task.status === 'completed';

                // Calculate Progress Slicer percentage
                const tMilestones = task.milestones || [];
                const completedCount = tMilestones.filter(m => m.isCompleted).length;
                const totalCount = tMilestones.length;
                const percentage = totalCount > 0
                  ? Math.round((completedCount / totalCount) * 100)
                  : (isCompleted ? 100 : 0);

                const isCreator = loggedInUser && (
                  (loggedInUser.type === 'owner' && task.assignedById === 'owner') ||
                  (loggedInUser.employeeId && task.assignedById === loggedInUser.employeeId)
                );

                const isSupervisorOrOwner = loggedInUser && (
                  loggedInUser.type === 'supervisor' || loggedInUser.type === 'owner'
                );

                return (
                  <div
                    key={task.id}
                    className={`p-6 rounded-3xl border transition-all relative flex flex-col justify-between gap-5 ${
                      isCompleted
                        ? 'bg-green-50/10 border-green-100 text-gray-500'
                        : overdue
                        ? 'bg-red-50/20 border-red-200'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top status bar */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                          isCompleted
                            ? 'bg-green-100 text-green-800'
                            : overdue
                            ? 'bg-red-100 text-red-800 animate-pulse'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCompleted ? 'Terminée' : overdue ? 'En retard !' : 'En cours'}
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400 font-bold">
                            <Calendar className="w-3 h-3" />
                            <span>Pour le : {task.deadline}</span>
                          </div>

                          {isCreator && onDeleteTask && (
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all cursor-pointer"
                              title="Supprimer la tâche"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h5 className={`text-base font-black text-gray-900 ${isCompleted ? 'line-through text-gray-400 font-bold' : ''}`}>
                          {task.title}
                        </h5>
                        {task.description && (
                          <p className="text-xs text-gray-500 leading-relaxed mt-1 font-semibold">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* 🚀 Dynamic Progress Slicer */}
                      <div className="space-y-1.5 bg-gray-50/60 p-3 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-500">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <span>⚡</span> Slicer d'Avancement
                          </span>
                          <span className="font-mono text-emerald-700">
                            {percentage}% ({completedCount}/{totalCount})
                          </span>
                        </div>

                        {/* Slicer Track */}
                        <div className="relative w-full h-3 bg-gray-200/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out shadow-sm relative"
                            style={{ width: `${percentage}%` }}
                          >
                            <div className="absolute top-0 right-0 h-full w-1.5 bg-white/40 animate-pulse" />
                          </div>
                        </div>
                      </div>

                      {/* 📋 Milestones Checklist */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                          📋 Jalons à franchir :
                        </span>
                        {tMilestones.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {tMilestones.map((milestone) => {
                              // Only assignee under private space or supervisor in planning can toggle
                              const canToggle = viewMode === 'private' && task.assignedToId === currentEmployee?.id && !isCompleted;
                              return (
                                <label
                                  key={milestone.id}
                                  className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                                    milestone.isCompleted
                                      ? 'bg-green-50/10 border-green-100/30 text-gray-400'
                                      : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                                  } ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={milestone.isCompleted}
                                    disabled={!canToggle}
                                    onChange={() => onToggleMilestone(task.id, milestone.id)}
                                    className={`w-4 h-4 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 transition-transform ${
                                      canToggle ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-70'
                                    }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold leading-tight break-words ${
                                      milestone.isCompleted ? 'line-through text-gray-400 font-medium' : 'text-gray-800'
                                    }`}>
                                      {milestone.title}
                                    </p>
                                    <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider block mt-0.5">
                                      Ajouté par : {milestone.addedBy === 'supervisor' ? 'Superviseur' : 'Assigné'}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Aucun jalon défini.</p>
                        )}

                        {/* Assignee Add Milestone (Only under private space) */}
                        {viewMode === 'private' && !isCompleted && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const text = newMilestoneTexts[task.id] || '';
                              if (text.trim()) {
                                onAddMilestone(task.id, text.trim(), 'assignee');
                                setNewMilestoneTexts({ ...newMilestoneTexts, [task.id]: '' });
                              }
                            }}
                            className="flex gap-1.5 mt-2 pt-1"
                          >
                            <input
                              type="text"
                              placeholder="+ Ajouter un jalon personnel..."
                              value={newMilestoneTexts[task.id] || ''}
                              onChange={(e) => setNewMilestoneTexts({ ...newMilestoneTexts, [task.id]: e.target.value })}
                              className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 font-semibold"
                            />
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter
                            </button>
                          </form>
                        )}
                      </div>

                      {/* 💬 Comments Section (filled by anyone logged in) */}
                      <div className="border-t border-gray-100 pt-3 mt-1 space-y-2.5">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                          Commentaires ({task.comments?.length || 0})
                        </span>

                        {/* Existing Comments list */}
                        {task.comments && task.comments.length > 0 && (
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1 bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100">
                            {task.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2 text-xs items-start">
                                <img
                                  src={comment.authorAvatar}
                                  alt={comment.authorName}
                                  referrerPolicy="no-referrer"
                                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100 mt-0.5"
                                />
                                <div className="flex-1 min-w-0 bg-white px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-3xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-[10px] text-gray-800 truncate">{comment.authorName}</span>
                                    <span className="font-mono text-[8px] text-gray-400">
                                      {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed break-words font-medium">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Leave a comment form (Anyone) */}
                        {loggedInUser ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const content = commentTexts[task.id] || '';
                              if (content.trim()) {
                                onAddComment(task.id, content.trim());
                                setCommentTexts({ ...commentTexts, [task.id]: '' });
                              }
                            }}
                            className="flex gap-1.5"
                          >
                            <input
                              type="text"
                              placeholder="Écrire un commentaire..."
                              value={commentTexts[task.id] || ''}
                              onChange={(e) => setCommentTexts({ ...commentTexts, [task.id]: e.target.value })}
                              className="flex-1 text-[11px] px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 font-semibold"
                            />
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer"
                            >
                              Envoyer
                            </button>
                          </form>
                        ) : (
                          <p className="text-[9px] text-gray-400 italic">Connectez-vous pour ajouter un commentaire.</p>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Complete task actions */}
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3 text-[10px] font-bold text-gray-400">
                      <div>
                        <span className="block text-[9px] text-gray-400">Assigné par :</span>
                        <span className="text-gray-700 font-extrabold">{task.assignedByName}</span>
                      </div>

                      {viewMode === 'public' && (
                        <div className="text-right">
                          <span className="block text-[9px] text-gray-400">Assigné à :</span>
                          <span className="text-emerald-600 font-extrabold">{task.assignedToName}</span>
                        </div>
                      )}

                      {/* Acknowledge or Complete controls */}
                      <div className="flex items-center gap-2">
                        {isCompleted && task.isAcknowledged && (
                          <div className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                            <span>🙏 Grand Merci</span>
                          </div>
                        )}

                        {isCompleted && !task.isAcknowledged && isSupervisorOrOwner && onAcknowledgeTask && (
                          <button
                            onClick={() => onAcknowledgeTask(task.id)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                            title="Acquitter la tâche (Grand Merci)"
                          >
                            <span>🙏 Acquitter (Grand Merci)</span>
                          </button>
                        )}

                        {viewMode === 'private' && !isCompleted && (
                          <button
                            onClick={() => {
                              onCompleteTask(task.id);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Tout Valider
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
