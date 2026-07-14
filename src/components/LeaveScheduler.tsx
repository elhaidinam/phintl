import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  UserCheck, 
  History, 
  ClipboardList, 
  Sliders, 
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  UserCircle,
  Lock,
  LogOut,
  CalendarDays,
  Briefcase,
  ShieldAlert,
  Edit3,
  Search,
  Eye,
  Info,
  ChevronRight,
  Fingerprint,
  Upload,
  Image as ImageIcon,
  Database,
  Download,
  Camera,
  Bell,
  MessageSquare,
  CheckCheck,
  Mail,
  Key,
  Inbox,
  RefreshCw,
  Trash2,
  Save
} from 'lucide-react';
import { Employee, LeaveRequest, JournalArticle, DailySchedule, ChatMessage, Task, Notification, TaskMilestone, TaskComment, CalendarMarking, CalendarMarkings, MarkingType } from '../types';
import { DEFAULT_EMPLOYEES } from '../data';
import { subscribeToDoc, saveToDoc } from '../lib/firebase';

const DEFAULT_CALENDAR_MARKINGS: CalendarMarkings = {
  "2026-01-01": { type: 'ferie', label: "Jour de l'An" },
  "2026-04-04": { type: 'ferie', label: "Fête de l'Indépendance" },
  "2026-04-13": { type: 'ferie', label: "Lundi de Pâques" },
  "2026-05-01": { type: 'ferie', label: "Fête du Travail" },
  "2026-05-21": { type: 'ferie', label: "Ascension" },
  "2026-06-01": { type: 'ferie', label: "Lundi de Pentecôte" },
  "2026-08-15": { type: 'ferie', label: "Fête de l'Assomption" }
};

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_SHORT_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

const MARKING_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  entier: {
    bg: '#92D050',
    text: 'text-slate-950 font-black',
    border: 'border-[#76bd37]',
    label: 'Jour Entier'
  },
  demi: {
    bg: '#D5FC79',
    text: 'text-slate-950 font-extrabold',
    border: 'border-[#b5e051]',
    label: 'Demi-Journée'
  },
  ferie: {
    bg: '#BFA96C',
    text: 'text-slate-950 font-extrabold',
    border: 'border-[#a89255]',
    label: 'Jour Férié'
  },
  garde: {
    bg: '#FF9300',
    text: 'text-white font-extrabold',
    border: 'border-[#d47b00]',
    label: 'Jour de Garde'
  },
  unmarked: {
    bg: '#E6F8D9',
    text: 'text-emerald-950 font-medium',
    border: 'border-[#c4eab0]',
    label: 'Jour Normal'
  }
};

import CompanyChat from './CompanyChat';
import TaskManager from './TaskManager';
import NotificationPanel from './NotificationPanel';

// Helper to generate daily schedules dynamically for backward-compatibility
export const getEmployeeDailySchedules = (emp: Employee): DailySchedule[] => {
  if (emp.dailySchedules && Array.isArray(emp.dailySchedules) && emp.dailySchedules.length === 7) {
    return emp.dailySchedules;
  }
  
  const days = [
    { name: 'Lundi', short: 'Lun' },
    { name: 'Mardi', short: 'Mar' },
    { name: 'Mercredi', short: 'Mer' },
    { name: 'Jeudi', short: 'Jeu' },
    { name: 'Vendredi', short: 'Ven' },
    { name: 'Samedi', short: 'Sam' },
    { name: 'Dimanche', short: 'Dim' }
  ];
  
  const scheduleDaysStr = emp.scheduleDays || 'Lun - Ven';
  return days.map(d => {
    let isActive = false;
    if (scheduleDaysStr.includes('Lun - Ven')) {
      isActive = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].includes(d.name);
    } else if (scheduleDaysStr.includes('Lun - Sam')) {
      isActive = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].includes(d.name);
    } else if (scheduleDaysStr.includes('Lun - Dim') || scheduleDaysStr.includes('7j/7')) {
      isActive = true;
    } else {
      // customized active check
      const cleanDays = scheduleDaysStr.split(',').map(s => s.trim().toLowerCase());
      isActive = cleanDays.some(cd => cd === d.name.toLowerCase() || cd === d.short.toLowerCase());
    }
    return {
      dayName: d.name,
      dayShort: d.short,
      isActive,
      startHour: emp.scheduleStartHour !== undefined ? emp.scheduleStartHour : 8,
      endHour: emp.scheduleEndHour !== undefined ? emp.scheduleEndHour : 17
    };
  });
};

// Helper to get last name of an employee (assumes last word in name string)
export const getEmployeeLastName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
};

// Sort function for employees by last name
export const compareEmployeesByLastName = (a: Employee, b: Employee): number => {
  const nameA = getEmployeeLastName(a.name).toLowerCase();
  const nameB = getEmployeeLastName(b.name).toLowerCase();
  return nameA.localeCompare(nameB, 'fr');
};

interface LeaveSchedulerProps {
  currentSpace: 'public' | 'private' | 'planning';
  onSpaceChange: (space: 'public' | 'private' | 'planning') => void;
  journalArticles: JournalArticle[];
  onUpdateJournal: (articles: JournalArticle[]) => void;
  setJournalArticles?: React.Dispatch<React.SetStateAction<JournalArticle[]>>;
  featuredText: string;
  onUpdateFeaturedText: (text: string) => void;
  setFeaturedText?: React.Dispatch<React.SetStateAction<string>>;
  featuredImage: string;
  onUpdateFeaturedImage: (image: string) => void;
  setFeaturedImage?: React.Dispatch<React.SetStateAction<string>>;
}

export default function LeaveScheduler({ 
  currentSpace, 
  onSpaceChange, 
  journalArticles, 
  onUpdateJournal,
  setJournalArticles,
  featuredText,
  onUpdateFeaturedText,
  setFeaturedText,
  featuredImage,
  onUpdateFeaturedImage,
  setFeaturedImage
}: LeaveSchedulerProps) {
  // State
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const stored = localStorage.getItem('pharmintl_employees');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((emp: any) => ({
            ...emp,
            dailySchedules: emp.dailySchedules || getEmployeeDailySchedules(emp)
          }));
        }
      } catch (e) {
        console.error("Error loading employees on startup", e);
      }
    }
    const withDaily = DEFAULT_EMPLOYEES.map(emp => ({
      ...emp,
      dailySchedules: emp.dailySchedules || getEmployeeDailySchedules(emp)
    }));
    try {
      localStorage.setItem('pharmintl_employees', JSON.stringify(withDaily));
    } catch (e) {
      console.error(e);
    }
    return withDaily;
  });
  const [localFeaturedText, setLocalFeaturedText] = useState(featuredText);
  const [isDragOver, setIsDragOver] = useState(false);
  const [featuredUpdateSuccess, setFeaturedUpdateSuccess] = useState(false);

  useEffect(() => {
    setLocalFeaturedText(featuredText);
  }, [featuredText]);

  const handleFeaturedImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        onUpdateFeaturedImage(e.target.result);
        setFeaturedUpdateSuccess(true);
        setTimeout(() => {
          setFeaturedUpdateSuccess(false);
        }, 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFeatured = () => {
    onUpdateFeaturedText(localFeaturedText);
    setFeaturedUpdateSuccess(true);
    setTimeout(() => {
      setFeaturedUpdateSuccess(false);
    }, 4000);
  };

  const handleDownloadDatabase = () => {
    const backupData = {
      employees: employees,
      journal: journalArticles,
      featured_text: featuredText,
      featured_image: featuredImage,
      exported_at: new Date().toISOString()
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `pharmintl_database_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportDatabase = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (e.target?.result && typeof e.target.result === 'string') {
          const imported = JSON.parse(e.target.result);
          if (imported && typeof imported === 'object') {
            let restoredCount = 0;
            if (Array.isArray(imported.employees)) {
              saveToStorage(imported.employees);
              restoredCount++;
            }
            if (Array.isArray(imported.journal)) {
              onUpdateJournal(imported.journal);
              restoredCount++;
            }
            if (typeof imported.featured_text === 'string') {
              onUpdateFeaturedText(imported.featured_text);
              restoredCount++;
            }
            if (typeof imported.featured_image === 'string') {
              onUpdateFeaturedImage(imported.featured_image);
              restoredCount++;
            }
            if (restoredCount > 0) {
              alert("Base de données synchronisée et restaurée avec succès !");
            } else {
              alert("Le fichier d'importation ne contient pas de données valides.");
            }
          }
        }
      } catch (err) {
        alert("Erreur lors de la lecture du fichier de sauvegarde : " + err);
      }
    };
    reader.readAsText(file);
  };
  
  // Authentication State
  const [loggedInUser, setLoggedInUser] = useState<{
    type: 'employee' | 'supervisor' | 'owner';
    employeeId?: string; // set if type is employee or supervisor
    username: string;
    name: string;
  } | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Owner Password Reset / Lost States
  const [ownerPassword, setOwnerPassword] = useState<string>(() => {
    return localStorage.getItem('pharmintl_owner_password') || 'github';
  });
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  // Simulated inbox notification
  const [showSimulatedNotification, setShowSimulatedNotification] = useState(false);
  const [isSimulatedInboxOpen, setIsSimulatedInboxOpen] = useState(false);

  const [isCreatePasswordOpen, setIsCreatePasswordOpen] = useState(false);
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [confirmNewOwnerPassword, setConfirmNewOwnerPassword] = useState('');
  const [createPasswordError, setCreatePasswordError] = useState('');
  const [createPasswordSuccess, setCreatePasswordSuccess] = useState(false);

  const handleDeclareLostPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordLoading(true);

    const emailClean = forgotPasswordEmail.trim().toLowerCase();
    if (emailClean !== 'elhaidinam@gmail.com') {
      setTimeout(() => {
        setForgotPasswordError("Seule l'adresse e-mail officielle du Propriétaire (elhaidinam@gmail.com) est autorisée à déclarer un mot de passe perdu.");
        setForgotPasswordLoading(false);
      }, 800);
      return;
    }

    setTimeout(() => {
      setForgotPasswordLoading(false);
      setForgotPasswordSuccess(true);
      // Trigger the interactive simulated email notification toast in 1 second
      setTimeout(() => {
        setShowSimulatedNotification(true);
      }, 1000);
    }, 1200);
  };

  const handleCreateNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePasswordError('');

    const p1 = newOwnerPassword.trim();
    const p2 = confirmNewOwnerPassword.trim();

    if (!p1) {
      setCreatePasswordError('Le mot de passe ne peut pas être vide.');
      return;
    }

    if (p1.length < 4) {
      setCreatePasswordError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    if (p1 !== p2) {
      setCreatePasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    // Update state & persist
    setOwnerPassword(p1);
    localStorage.setItem('pharmintl_owner_password', p1);
    saveToDoc('owner', 'password', p1);
    setCreatePasswordSuccess(true);

    setTimeout(() => {
      // Clean up and close all screens
      setIsCreatePasswordOpen(false);
      setIsForgotPasswordOpen(false);
      setShowSimulatedNotification(false);
      setIsSimulatedInboxOpen(false);
      setCreatePasswordSuccess(false);
      setNewOwnerPassword('');
      setConfirmNewOwnerPassword('');
      // Autocomplete the username in login form
      setLoginUsername('elhaidinam@gmail.com');
      setLoginPassword('');
    }, 2000);
  };

  // Logged-in Owner Password Modification States & Handler
  const [isOwnerChangePasswordOpen, setIsOwnerChangePasswordOpen] = useState(false);
  const [ownerChangePasswordCurrent, setOwnerChangePasswordCurrent] = useState('');
  const [ownerChangePasswordNew, setOwnerChangePasswordNew] = useState('');
  const [ownerChangePasswordConfirm, setOwnerChangePasswordConfirm] = useState('');
  const [ownerChangePasswordError, setOwnerChangePasswordError] = useState('');
  const [ownerChangePasswordSuccess, setOwnerChangePasswordSuccess] = useState(false);

  const handleOwnerChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerChangePasswordError('');
    setOwnerChangePasswordSuccess(false);

    const currentClean = ownerChangePasswordCurrent.trim();
    const newClean = ownerChangePasswordNew.trim();
    const confirmClean = ownerChangePasswordConfirm.trim();

    if (currentClean !== ownerPassword) {
      setOwnerChangePasswordError("Le mot de passe actuel saisi est incorrect.");
      return;
    }

    if (!newClean) {
      setOwnerChangePasswordError("Le nouveau mot de passe ne peut pas être vide.");
      return;
    }

    if (newClean.length < 4) {
      setOwnerChangePasswordError("Le nouveau mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    if (newClean === 'admin') {
      setOwnerChangePasswordError("Le mot de passe 'admin' n'est plus autorisé pour le Propriétaire.");
      return;
    }

    if (newClean !== confirmClean) {
      setOwnerChangePasswordError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    // Save state & persist to cloud
    setOwnerPassword(newClean);
    localStorage.setItem('pharmintl_owner_password', newClean);
    saveToDoc('owner', 'password', newClean);
    setOwnerChangePasswordSuccess(true);

    setTimeout(() => {
      setIsOwnerChangePasswordOpen(false);
      setOwnerChangePasswordCurrent('');
      setOwnerChangePasswordNew('');
      setOwnerChangePasswordConfirm('');
      setOwnerChangePasswordSuccess(false);
    }, 2000);
  };

  // Selected Employee for Bio Popup / Details
  const [selectedBioEmployee, setSelectedBioEmployee] = useState<Employee | null>(null);
  
  // Special Owner credential management editing state
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [expandedDailyEmpId, setExpandedDailyEmpId] = useState<string | null>(null);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedPassword, setEditedPassword] = useState('');
  const [editedCnss, setEditedCnss] = useState('');
  const [editedDateEmbauche, setEditedDateEmbauche] = useState('');
  const [editedIsSupervisor, setEditedIsSupervisor] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedRole, setEditedRole] = useState('');

  // Create Employee Form State (Owner only)
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpCnss, setNewEmpCnss] = useState('');
  const [newEmpDateEmbauche, setNewEmpDateEmbauche] = useState('');
  const [newEmpIsSupervisor, setNewEmpIsSupervisor] = useState(false);
  const [newEmpAllocatedLeaves, setNewEmpAllocatedLeaves] = useState(30);

  // Chat, Tasks and Notifications State with LocalStorage persistence
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const stored = localStorage.getItem('pharmintl_chat_messages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error loading chat messages", e);
      }
    }
    return [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem('pharmintl_tasks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error loading tasks", e);
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = localStorage.getItem('pharmintl_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error loading notifications", e);
      }
    }
    return [];
  });

  const [calendarMarkings, setCalendarMarkings] = useState<CalendarMarkings>(() => {
    const stored = localStorage.getItem('pharmintl_calendar_markings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error loading calendar markings from localstorage", e);
      }
    }
    return DEFAULT_CALENDAR_MARKINGS;
  });

  const [localCalendarMarkings, setLocalCalendarMarkings] = useState<CalendarMarkings | null>(() => {
    const stored = localStorage.getItem('pharmintl_calendar_markings_draft');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    if (localCalendarMarkings === null) {
      localStorage.removeItem('pharmintl_calendar_markings_draft');
    } else {
      localStorage.setItem('pharmintl_calendar_markings_draft', JSON.stringify(localCalendarMarkings));
    }
  }, [localCalendarMarkings]);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeBrush, setActiveBrush] = useState<MarkingType | 'unmarked'>('entier');
  const [customBrushLabel, setCustomBrushLabel] = useState<string>('');
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ date: string; type: MarkingType | 'unmarked'; label: string } | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const employeesRef = useRef(employees);
  const chatMessagesRef = useRef(chatMessages);
  const tasksRef = useRef(tasks);
  const notificationsRef = useRef(notifications);
  const calendarMarkingsRef = useRef(calendarMarkings);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    calendarMarkingsRef.current = calendarMarkings;
  }, [calendarMarkings]);

  const saveChatMessages = (updated: ChatMessage[]) => {
    const ts = Date.now();
    setChatMessages(updated);
    localStorage.setItem('pharmintl_chat_messages', JSON.stringify(updated));
    localStorage.setItem('pharmintl_chat_messages_updated_at', String(ts));
    saveToDoc('chat', 'chatMessages', updated, ts);
  };

  const saveTasks = (updated: Task[]) => {
    const ts = Date.now();
    setTasks(updated);
    localStorage.setItem('pharmintl_tasks', JSON.stringify(updated));
    localStorage.setItem('pharmintl_tasks_updated_at', String(ts));
    saveToDoc('tasks', 'tasks', updated, ts);
  };

  const saveNotifications = (updated: Notification[]) => {
    const ts = Date.now();
    setNotifications(updated);
    localStorage.setItem('pharmintl_notifications', JSON.stringify(updated));
    localStorage.setItem('pharmintl_notifications_updated_at', String(ts));
    saveToDoc('notifications', 'notifications', updated, ts);
  };

  const saveCalendarMarkings = (updated: CalendarMarkings) => {
    const ts = Date.now();
    setCalendarMarkings(updated);
    localStorage.setItem('pharmintl_calendar_markings', JSON.stringify(updated));
    localStorage.setItem('pharmintl_calendar_markings_updated_at', String(ts));
    saveToDoc('calendar_markings', 'markings', updated, ts);
  };

  const firestoreSyncedRef = useRef({
    employees: false,
    chat: false,
    tasks: false,
    notifications: false,
    markings: false
  });

  // Setup real-time Firestore listeners for employees, chat messages, tasks, and notifications
  useEffect(() => {
    // Dual-sync: Fetch initial state from local Express server database to handle any Firestore sync limitations
    const syncFromExpress = () => {
      fetch('/api/sync')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch from Express server');
          return res.json();
        })
        .then((data) => {
          if (data) {
            if (!firestoreSyncedRef.current.employees && Array.isArray(data.employees) && data.employees.length > 0) {
              const localTime = parseInt(localStorage.getItem('pharmintl_employees_updated_at') || '0', 10);
              const incomingTime = data.employees_updatedAt || 0;
              if (incomingTime >= localTime) {
                const withDaily = data.employees.map((emp: any) => ({
                  ...emp,
                  dailySchedules: emp.dailySchedules || getEmployeeDailySchedules(emp)
                }));
                setEmployees(withDaily);
                localStorage.setItem('pharmintl_employees', JSON.stringify(withDaily));
                localStorage.setItem('pharmintl_employees_updated_at', String(incomingTime));
              }
            }
            if (!firestoreSyncedRef.current.chat && Array.isArray(data.chatMessages)) {
              const localTime = parseInt(localStorage.getItem('pharmintl_chat_messages_updated_at') || '0', 10);
              const incomingTime = data.chatMessages_updatedAt || 0;
              if (incomingTime >= localTime) {
                setChatMessages(data.chatMessages);
                localStorage.setItem('pharmintl_chat_messages', JSON.stringify(data.chatMessages));
                localStorage.setItem('pharmintl_chat_messages_updated_at', String(incomingTime));
              }
            }
            if (!firestoreSyncedRef.current.tasks && Array.isArray(data.tasks)) {
              const localTime = parseInt(localStorage.getItem('pharmintl_tasks_updated_at') || '0', 10);
              const incomingTime = data.tasks_updatedAt || 0;
              if (incomingTime >= localTime) {
                setTasks(data.tasks);
                localStorage.setItem('pharmintl_tasks', JSON.stringify(data.tasks));
                localStorage.setItem('pharmintl_tasks_updated_at', String(incomingTime));
              }
            }
            if (!firestoreSyncedRef.current.notifications && Array.isArray(data.notifications)) {
              const localTime = parseInt(localStorage.getItem('pharmintl_notifications_updated_at') || '0', 10);
              const incomingTime = data.notifications_updatedAt || 0;
              if (incomingTime >= localTime) {
                setNotifications(data.notifications);
                localStorage.setItem('pharmintl_notifications', JSON.stringify(data.notifications));
                localStorage.setItem('pharmintl_notifications_updated_at', String(incomingTime));
              }
            }
            if (!firestoreSyncedRef.current.markings && data.calendarMarkings && typeof data.calendarMarkings === 'object') {
              const localTime = parseInt(localStorage.getItem('pharmintl_calendar_markings_updated_at') || '0', 10);
              const incomingTime = data.calendarMarkings_updatedAt || 0;
              if (incomingTime >= localTime) {
                setCalendarMarkings(data.calendarMarkings);
                localStorage.setItem('pharmintl_calendar_markings', JSON.stringify(data.calendarMarkings));
                localStorage.setItem('pharmintl_calendar_markings_updated_at', String(incomingTime));
              }
            }
          }
        })
        .catch((err) => {
          console.warn("Could not sync from local server database:", err);
        });
    };

    // Run initial Express sync immediately
    syncFromExpress();

    // Set up a periodic 10-second fallback sync to keep different sessions fully aligned
    const syncInterval = setInterval(syncFromExpress, 10000);

    // 1. Employees Listener
    const unsubEmployees = subscribeToDoc<Employee[]>(
      'employees',
      'employees',
      (data, updatedAt) => {
        firestoreSyncedRef.current.employees = true;
        const stored = localStorage.getItem('pharmintl_employees');
        let localEmployees = DEFAULT_EMPLOYEES;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localEmployees = parsed;
            }
          } catch (e) {}
        }

        const localTime = parseInt(localStorage.getItem('pharmintl_employees_updated_at') || '0', 10);
        const incomingTime = updatedAt || 0;

        if (incomingTime >= localTime) {
          if ((!data || data.length === 0) && localEmployees.length > 0) {
            console.log("Employees Firestore state is empty. Seeding with local state.");
            saveToStorage(localEmployees);
          } else if (data) {
            const withDaily = data.map((emp: any) => ({
              ...emp,
              dailySchedules: emp.dailySchedules || getEmployeeDailySchedules(emp)
            }));
            setEmployees(withDaily);
            localStorage.setItem('pharmintl_employees', JSON.stringify(withDaily));
            if (updatedAt) {
              localStorage.setItem('pharmintl_employees_updated_at', String(updatedAt));
            }
          }
        } else {
          console.log("Firestore employees are outdated. Seeding with newer local state.");
          saveToStorage(localEmployees);
        }
      },
      () => {
        const stored = localStorage.getItem('pharmintl_employees');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((emp: any) => ({
                ...emp,
                dailySchedules: emp.dailySchedules || getEmployeeDailySchedules(emp)
              }));
            }
          } catch (e) {
            console.error(e);
          }
        }
        return DEFAULT_EMPLOYEES.map(emp => ({
          ...emp,
          dailySchedules: emp.dailySchedules || getEmployeeDailySchedules(emp)
        }));
      }
    );

    // 2. Chat Messages Listener
    const unsubChat = subscribeToDoc<ChatMessage[]>(
      'chat',
      'chatMessages',
      (data, updatedAt) => {
        firestoreSyncedRef.current.chat = true;
        const stored = localStorage.getItem('pharmintl_chat_messages');
        let localChat: ChatMessage[] = [];
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) localChat = parsed;
          } catch (e) {}
        }

        const localTime = parseInt(localStorage.getItem('pharmintl_chat_messages_updated_at') || '0', 10);
        const incomingTime = updatedAt || 0;

        if (incomingTime >= localTime) {
          if ((!data || data.length === 0) && localChat.length > 0) {
            console.log("Chat messages Firestore state is empty. Seeding with local state.");
            saveChatMessages(localChat);
          } else if (data) {
            const sorted = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setChatMessages(sorted);
            localStorage.setItem('pharmintl_chat_messages', JSON.stringify(sorted));
            if (updatedAt) {
              localStorage.setItem('pharmintl_chat_messages_updated_at', String(updatedAt));
            }
          }
        } else {
          console.log("Firestore chat is outdated. Seeding with newer local state.");
          saveChatMessages(localChat);
        }
      },
      () => {
        const stored = localStorage.getItem('pharmintl_chat_messages');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            console.error(e);
          }
        }
        return [];
      }
    );

    // 3. Tasks Listener
    const unsubTasks = subscribeToDoc<Task[]>(
      'tasks',
      'tasks',
      (data, updatedAt) => {
        firestoreSyncedRef.current.tasks = true;
        const stored = localStorage.getItem('pharmintl_tasks');
        let localTasks: Task[] = [];
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) localTasks = parsed;
          } catch (e) {}
        }

        const localTime = parseInt(localStorage.getItem('pharmintl_tasks_updated_at') || '0', 10);
        const incomingTime = updatedAt || 0;

        if (incomingTime >= localTime) {
          if ((!data || data.length === 0) && localTasks.length > 0) {
            console.log("Tasks Firestore state is empty. Seeding with local state.");
            saveTasks(localTasks);
          } else if (data) {
            setTasks(data);
            localStorage.setItem('pharmintl_tasks', JSON.stringify(data));
            if (updatedAt) {
              localStorage.setItem('pharmintl_tasks_updated_at', String(updatedAt));
            }
          }
        } else {
          console.log("Firestore tasks are outdated. Seeding with newer local state.");
          saveTasks(localTasks);
        }
      },
      () => {
        const stored = localStorage.getItem('pharmintl_tasks');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            console.error(e);
          }
        }
        return [];
      }
    );

    // 4. Notifications Listener
    const unsubNotifications = subscribeToDoc<Notification[]>(
      'notifications',
      'notifications',
      (data, updatedAt) => {
        firestoreSyncedRef.current.notifications = true;
        const stored = localStorage.getItem('pharmintl_notifications');
        let localNotifications: Notification[] = [];
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) localNotifications = parsed;
          } catch (e) {}
        }

        const localTime = parseInt(localStorage.getItem('pharmintl_notifications_updated_at') || '0', 10);
        const incomingTime = updatedAt || 0;

        if (incomingTime >= localTime) {
          if ((!data || data.length === 0) && localNotifications.length > 0) {
            console.log("Notifications Firestore state is empty. Seeding with local state.");
            saveNotifications(localNotifications);
          } else if (data) {
            const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setNotifications(sorted);
            localStorage.setItem('pharmintl_notifications', JSON.stringify(sorted));
            if (updatedAt) {
              localStorage.setItem('pharmintl_notifications_updated_at', String(updatedAt));
            }
          }
        } else {
          console.log("Firestore notifications are outdated. Seeding with newer local state.");
          saveNotifications(localNotifications);
        }
      },
      () => {
        const stored = localStorage.getItem('pharmintl_notifications');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            console.error(e);
          }
        }
        return [];
      }
    );

    // 5. Owner Password Listener
    const unsubOwnerPassword = subscribeToDoc<string>(
      'owner',
      'password',
      (data) => {
        if (data && typeof data === 'string') {
          setOwnerPassword(data);
          localStorage.setItem('pharmintl_owner_password', data);
        }
      },
      () => {
        return localStorage.getItem('pharmintl_owner_password') || 'github';
      }
    );

    // 6. Calendar Markings Listener
    const unsubCalendarMarkings = subscribeToDoc<CalendarMarkings>(
      'calendar_markings',
      'markings',
      (data, updatedAt) => {
        firestoreSyncedRef.current.markings = true;
        if (data && typeof data === 'object') {
          const stored = localStorage.getItem('pharmintl_calendar_markings');
          let localObj = DEFAULT_CALENDAR_MARKINGS;
          if (stored) {
            try {
              localObj = JSON.parse(stored);
            } catch (e) {}
          }

          const localTime = parseInt(localStorage.getItem('pharmintl_calendar_markings_updated_at') || '0', 10);
          const incomingTime = updatedAt || 0;

          if (incomingTime >= localTime) {
            const firestoreKeysCount = Object.keys(data).length;
            const localKeysCount = Object.keys(localObj).length;

            if (firestoreKeysCount === 0 && localKeysCount > 0) {
              console.log("Firestore calendar markings are empty. Seeding with local markings.");
              saveCalendarMarkings(localObj);
            } else {
              setCalendarMarkings(data);
              localStorage.setItem('pharmintl_calendar_markings', JSON.stringify(data));
              if (updatedAt) {
                localStorage.setItem('pharmintl_calendar_markings_updated_at', String(updatedAt));
              }
            }
          } else {
            console.log("Firestore calendar markings are outdated. Seeding with newer local state.");
            saveCalendarMarkings(localObj);
          }
        }
      },
      () => {
        const stored = localStorage.getItem('pharmintl_calendar_markings');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {
            console.error(e);
          }
        }
        return DEFAULT_CALENDAR_MARKINGS;
      }
    );

    return () => {
      unsubEmployees();
      unsubChat();
      unsubTasks();
      unsubNotifications();
      unsubOwnerPassword();
      unsubCalendarMarkings();
      clearInterval(syncInterval);
    };
  }, []);

  // Helper functions for notification interactions
  const handleMarkNotifRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    saveNotifications(updated);
  };

  const handleMarkAllNotifsRead = () => {
    const isSupervisorOrOwner = loggedInUser?.type === 'supervisor' || loggedInUser?.type === 'owner';
    const empId = currentLoggedInEmployee?.id || null;
    const updated = notifications.map(n => {
      const isTarget = n.recipientId === 'all_supervisors' ? isSupervisorOrOwner : (empId && n.recipientId === empId);
      if (isTarget) {
        return { ...n, isRead: true };
      }
      return n;
    });
    saveNotifications(updated);
  };

  // Handle Send Chat Message
  const handleSendMessage = (recipientId: string, content: string) => {
    if (!currentLoggedInEmployee) return;
    const newMessage: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: currentLoggedInEmployee.id,
      senderName: currentLoggedInEmployee.name,
      senderAvatar: currentLoggedInEmployee.avatar,
      recipientId,
      content,
      timestamp: new Date().toISOString()
    };
    saveChatMessages([...chatMessages, newMessage]);
  };

  // Handle Supervisor Assign Task
  const handleAssignTask = (title: string, description: string, milestoneTitles: string[], deadline: string, assignedToId: string) => {
    const assignedEmp = employees.find(e => e.id === assignedToId);
    if (!assignedEmp) return;

    const creatorId = loggedInUser?.employeeId || 'owner';
    const creatorName = loggedInUser?.employeeId ? (employees.find(e => e.id === loggedInUser.employeeId)?.name || 'Superviseur') : 'Direction (Owner)';

    const initialMilestones: TaskMilestone[] = milestoneTitles.map((mTitle, index) => ({
      id: `milestone-${Date.now()}-${index}`,
      title: mTitle,
      isCompleted: false,
      addedBy: 'supervisor',
      createdAt: new Date().toISOString()
    }));

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      milestones: initialMilestones,
      comments: [],
      assignedToId,
      assignedToName: assignedEmp.name,
      assignedById: creatorId,
      assignedByName: creatorName,
      deadline,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };

    saveTasks([newTask, ...tasks]);

    // Send task assignment notification
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      recipientId: assignedToId,
      senderId: creatorId,
      senderName: creatorName,
      title: 'Nouvelle tâche assignée',
      message: `Vous avez reçu une nouvelle tâche : "${title}" avec ${initialMilestones.length} jalons. Date limite : ${deadline}.`,
      type: 'task_assign',
      isRead: false,
      timestamp: new Date().toISOString(),
      relatedId: newTask.id
    };
    saveNotifications([newNotif, ...notifications]);
  };

  // Handle Employee Complete Task
  const handleCompleteTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        // Mark all milestones as completed as well
        const updatedMilestones = t.milestones.map(m => ({ ...m, isCompleted: true }));
        return {
          ...t,
          status: 'completed' as const,
          milestones: updatedMilestones
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  // Handle Toggle Milestone
  const handleToggleMilestone = (taskId: string, milestoneId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const updatedMilestones = (t.milestones || []).map(m =>
          m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
        );
        const hasMilestones = updatedMilestones.length > 0;
        const allCompleted = hasMilestones && updatedMilestones.every(m => m.isCompleted);

        return {
          ...t,
          milestones: updatedMilestones,
          status: allCompleted ? ('completed' as const) : ('pending' as const)
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  // Handle Add Milestone Dynamically (Supervisor or Assignee)
  const handleAddMilestone = (taskId: string, milestoneTitle: string, addedBy: 'supervisor' | 'assignee') => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const newMilestone: TaskMilestone = {
          id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: milestoneTitle,
          isCompleted: false,
          addedBy,
          createdAt: new Date().toISOString()
        };
        const updatedMilestones = [...(t.milestones || []), newMilestone];

        return {
          ...t,
          milestones: updatedMilestones,
          status: 'pending' as const // resetting completion status if a new uncompleted milestone is added
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  // Handle Add Task Comment
  const handleAddComment = (taskId: string, content: string) => {
    if (!loggedInUser) return;

    const authorId = loggedInUser.employeeId || 'owner';
    const authorName = loggedInUser.name;
    const authorAvatar = currentLoggedInEmployee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100';

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const newComment: TaskComment = {
          id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          authorId,
          authorName,
          authorAvatar,
          content,
          timestamp: new Date().toISOString()
        };
        return {
          ...t,
          comments: [...(t.comments || []), newComment]
        };
      }
      return t;
    });
    saveTasks(updated);
  };


  // Handle Supervisor Acknowledge Task Completion
  const handleAcknowledgeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isAcknowledged: true
        };
      }
      return t;
    });
    saveTasks(updated);

    // Send "Grand Merci" notification to the assignee
    const creatorId = loggedInUser?.employeeId || 'owner';
    const creatorName = loggedInUser?.employeeId ? (employees.find(e => e.id === loggedInUser.employeeId)?.name || 'Superviseur') : 'Direction (Owner)';
    
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      recipientId: task.assignedToId,
      senderId: creatorId,
      senderName: creatorName,
      title: 'Tâche acquittée',
      message: `Grand Merci`,
      type: 'task_acknowledge',
      isRead: false,
      timestamp: new Date().toISOString(),
      relatedId: task.id
    };
    saveNotifications([newNotif, ...notifications]);
  };

  // Handle Supervisor Delete Task
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    saveTasks(updated);
  };


  // Create Journal Article Form State (Owner only)
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');

  // Bio editing state (Normal logged-in user in Private Space)
  const [bioText, setBioText] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileCnss, setProfileCnss] = useState('');
  const [profileDateEmbauche, setProfileDateEmbauche] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [lastLoggedInEmpId, setLastLoggedInEmpId] = useState<string | null>(null);

  // Avatar editing state (Logged-in employee in Private Space)
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [avatarDragOver, setAvatarDragOver] = useState(false);

  const handleSaveAvatar = (newAvatarUrl: string) => {
    if (!currentLoggedInEmployee) return;
    const updated = employees.map(emp => {
      if (emp.id === currentLoggedInEmployee.id) {
        return { ...emp, avatar: newAvatarUrl };
      }
      return emp;
    });
    saveToStorage(updated);
  };

  const handleAvatarFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (PNG, JPEG, etc.).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        handleSaveAvatar(e.target.result);
        alert("Photo de profil mise à jour avec succès !");
      }
    };
    reader.readAsDataURL(file);
  };

  // Public Space Timetable day filter
  const [selectedSlicerDay, setSelectedSlicerDay] = useState<string>('Tous');

  // Leave Request Form State (in Private Space)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveSuccessMessage, setLeaveSuccessMessage] = useState('');



  const saveToStorage = (updated: Employee[]) => {
    const ts = Date.now();
    setEmployees(updated);
    localStorage.setItem('pharmintl_employees', JSON.stringify(updated));
    localStorage.setItem('pharmintl_employees_updated_at', String(ts));
    saveToDoc('employees', 'employees', updated, ts);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const userClean = loginUsername.trim().toLowerCase();
    const passClean = loginPassword.trim();

    if (!userClean || !passClean) {
      setLoginError('Veuillez remplir tous les champs.');
      return;
    }

    // 1. Owner Login check
    if (userClean === 'elhaidinam@gmail.com') {
      // Check against github password
      if (passClean === ownerPassword) {
        setLoggedInUser({
          type: 'owner',
          username: 'elhaidinam@gmail.com',
          name: 'Propriétaire Pharmintl'
        });
        onSpaceChange('planning'); // auto transition to Planning / Owner space
        setLoginUsername('');
        setLoginPassword('');
        return;
      } else {
        setLoginError('Mot de passe incorrect pour le compte Propriétaire.');
        return;
      }
    }

    // 2. Employee or Supervisor Login Check
    const foundEmp = employees.find(
      emp => (emp.username || '').toLowerCase() === userClean && emp.password === passClean
    );

    if (foundEmp) {
      setLoggedInUser({
        type: foundEmp.isSupervisor ? 'supervisor' : 'employee',
        employeeId: foundEmp.id,
        username: foundEmp.username,
        name: foundEmp.name
      });
      
      // Auto switch to private space upon successful login
      onSpaceChange('private');
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Identifiant ou mot de passe incorrect.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (localCalendarMarkings !== null) {
      saveCalendarMarkings(localCalendarMarkings);
    }
    setLoggedInUser(null);
    setLocalCalendarMarkings(null);
    onSpaceChange('public');
    setSelectedBioEmployee(null);
    setLeaveFormError('');
    setLeaveSuccessMessage('');
  };

  // Helpers for leave calculations
  const calculateDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getApprovedDays = (emp: Employee): number => {
    return emp.leaveHistory
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + l.days, 0);
  };

  // Current active employee for the logged in view
  const currentLoggedInEmployee = loggedInUser && loggedInUser.employeeId
    ? employees.find(e => e.id === loggedInUser.employeeId)
    : null;

  // Sync biography and profile input states with active employee's stored details
  useEffect(() => {
    if (currentLoggedInEmployee) {
      if (currentLoggedInEmployee.id !== lastLoggedInEmpId) {
        setBioText(currentLoggedInEmployee.bio || '');
        setProfileName(currentLoggedInEmployee.name || '');
        setProfileRole(currentLoggedInEmployee.role || '');
        setProfileCnss(currentLoggedInEmployee.cnss || '');
        setProfileDateEmbauche(currentLoggedInEmployee.dateEmbauche || '');
        setProfileUsername(currentLoggedInEmployee.username || '');
        setProfilePassword(currentLoggedInEmployee.password || '');
        setLastLoggedInEmpId(currentLoggedInEmployee.id);
      }
    } else {
      setLastLoggedInEmpId(null);
    }
  }, [loggedInUser, employees, lastLoggedInEmpId, currentLoggedInEmployee]);

  // Submit Leave Request
  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveFormError('');
    setLeaveSuccessMessage('');

    if (!currentLoggedInEmployee) return;

    if (!startDate || !endDate) {
      setLeaveFormError('Spécifiez la date de début et de fin.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      setLeaveFormError('La date de début ne peut pas être dans le passé.');
      return;
    }

    if (end < start) {
      setLeaveFormError('La date de fin doit être après la date de début.');
      return;
    }

    const daysCount = calculateDays(startDate, endDate);
    const approved = getApprovedDays(currentLoggedInEmployee);
    const remaining = currentLoggedInEmployee.allocatedLeaves - approved;

    if (daysCount > remaining) {
      setLeaveFormError(`Solde insuffisant ! Vous demandez ${daysCount} jours, mais il ne vous reste que ${remaining} jours.`);
      return;
    }

    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      startDate,
      endDate,
      days: daysCount,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0]
    };

    const updated = employees.map(emp => {
      if (emp.id === currentLoggedInEmployee.id) {
        return {
          ...emp,
          leaveHistory: [newRequest, ...emp.leaveHistory]
        };
      }
      return emp;
    });

    saveToStorage(updated);

    // Trigger notification when an employee submits a leave request
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      recipientId: 'all_supervisors',
      senderId: currentLoggedInEmployee.id,
      senderName: currentLoggedInEmployee.name,
      title: 'Nouvelle demande de congé 📅',
      message: `${currentLoggedInEmployee.name} a soumis une demande de congé de ${daysCount} jours (du ${startDate} au ${endDate}).`,
      type: 'leave_submit',
      isRead: false,
      timestamp: new Date().toISOString(),
      relatedId: newRequest.id
    };
    saveNotifications([newNotif, ...notifications]);

    setLeaveSuccessMessage(`Votre demande de congé de ${daysCount} jours a été enregistrée et est en attente d'approbation.`);
    setStartDate('');
    setEndDate('');
  };

  // Supervisor Action: Approve/Reject Leaves
  const handleUpdateLeaveStatus = (empId: string, reqId: string, newStatus: 'approved' | 'rejected') => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const history = emp.leaveHistory.map(req => {
          if (req.id === reqId) {
            return { ...req, status: newStatus };
          }
          return req;
        });
        return { ...emp, leaveHistory: history };
      }
      return emp;
    });
    saveToStorage(updated);

    // Trigger notification when a supervisor approves or rejects a leave request
    const targetEmp = employees.find(e => e.id === empId);
    const targetReq = targetEmp?.leaveHistory.find(r => r.id === reqId);
    if (targetEmp && targetReq) {
      const creatorId = loggedInUser?.employeeId || 'owner';
      const creatorName = loggedInUser?.employeeId ? (employees.find(e => e.id === loggedInUser.employeeId)?.name || 'Superviseur') : 'Direction (Owner)';
      
      const approvalNotif: Notification = {
        id: `notif-${Date.now()}`,
        recipientId: empId,
        senderId: creatorId,
        senderName: creatorName,
        title: newStatus === 'approved' ? 'Demande de congé approuvée ✅' : 'Demande de congé refusée ❌',
        message: `Votre demande de congé de ${targetReq.days} jours (du ${targetReq.startDate} au ${targetReq.endDate}) a été ${newStatus === 'approved' ? 'approuvée' : 'refusée'} par ${creatorName}.`,
        type: newStatus === 'approved' ? 'leave_approve' : 'leave_reject',
        isRead: false,
        timestamp: new Date().toISOString(),
        relatedId: reqId
      };
      saveNotifications([approvalNotif, ...notifications]);
    }
  };

  // Supervisor Action: Modify Working Hours schedule for a specific day and specific slot (1, 2, or 3)
  const handleUpdateDailyScheduleHour = (empId: string, dayName: string, slotIndex: 1 | 2 | 3, type: 'start' | 'end', action: 'inc' | 'dec') => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const daily = getEmployeeDailySchedules(emp);
        const dailyUpdated = daily.map(d => {
          if (d.dayName === dayName) {
            if (slotIndex === 1) {
              let { startHour, endHour } = d;
              if (type === 'start') {
                if (action === 'inc' && startHour < endHour - 1) {
                  startHour += 1;
                } else if (action === 'dec' && startHour > 0) {
                  startHour -= 1;
                }
              } else {
                if (action === 'inc' && endHour < 24) {
                  endHour += 1;
                } else if (action === 'dec' && endHour > startHour + 1) {
                  endHour -= 1;
                }
              }
              return { ...d, startHour, endHour };
            } else if (slotIndex === 2) {
              let startHour2 = d.startHour2 !== undefined ? d.startHour2 : 14;
              let endHour2 = d.endHour2 !== undefined ? d.endHour2 : 18;
              if (type === 'start') {
                if (action === 'inc' && startHour2 < endHour2 - 1) {
                  startHour2 += 1;
                } else if (action === 'dec' && startHour2 > 0) {
                  startHour2 -= 1;
                }
              } else {
                if (action === 'inc' && endHour2 < 24) {
                  endHour2 += 1;
                } else if (action === 'dec' && endHour2 > startHour2 + 1) {
                  endHour2 -= 1;
                }
              }
              return { ...d, startHour2, endHour2 };
            } else {
              let startHour3 = d.startHour3 !== undefined ? d.startHour3 : 19;
              let endHour3 = d.endHour3 !== undefined ? d.endHour3 : 21;
              if (type === 'start') {
                if (action === 'inc' && startHour3 < endHour3 - 1) {
                  startHour3 += 1;
                } else if (action === 'dec' && startHour3 > 0) {
                  startHour3 -= 1;
                }
              } else {
                if (action === 'inc' && endHour3 < 24) {
                  endHour3 += 1;
                } else if (action === 'dec' && endHour3 > startHour3 + 1) {
                  endHour3 -= 1;
                }
              }
              return { ...d, startHour3, endHour3 };
            }
          }
          return d;
        });

        const activeDays = dailyUpdated.filter(d => d.isActive);
        const scheduleStartHour = activeDays.length > 0 ? activeDays[0].startHour : emp.scheduleStartHour;
        const scheduleEndHour = activeDays.length > 0 ? activeDays[0].endHour : emp.scheduleEndHour;

        const activeShorts = activeDays.map(d => d.dayShort);
        let scheduleDays = emp.scheduleDays;
        if (activeShorts.length === 7) {
          scheduleDays = "7j/7";
        } else if (activeShorts.length > 0) {
          if (activeShorts.length === 5 && activeShorts.includes('Lun') && activeShorts.includes('Ven') && !activeShorts.includes('Sam') && !activeShorts.includes('Dim')) {
            scheduleDays = "Lun - Ven";
          } else if (activeShorts.length === 6 && activeShorts.includes('Lun') && activeShorts.includes('Sam') && !activeShorts.includes('Dim')) {
            scheduleDays = "Lun - Sam";
          } else {
            scheduleDays = activeShorts.join(', ');
          }
        } else {
          scheduleDays = "Aucun";
        }

        return {
          ...emp,
          dailySchedules: dailyUpdated,
          scheduleStartHour,
          scheduleEndHour,
          scheduleDays
        };
      }
      return emp;
    });
    saveToStorage(updated);
  };

  // Supervisor Action: Toggle a supplementary schedule slot on/off
  const handleToggleDailyScheduleSlotActive = (empId: string, dayName: string, slotIndex: 2 | 3) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const daily = getEmployeeDailySchedules(emp);
        const dailyUpdated = daily.map(d => {
          if (d.dayName === dayName) {
            if (slotIndex === 2) {
              const isActive2 = !d.isActive2;
              const startHour2 = d.startHour2 !== undefined ? d.startHour2 : 14;
              const endHour2 = d.endHour2 !== undefined ? d.endHour2 : 18;
              return { ...d, isActive2, startHour2, endHour2 };
            } else {
              const isActive3 = !d.isActive3;
              const startHour3 = d.startHour3 !== undefined ? d.startHour3 : 19;
              const endHour3 = d.endHour3 !== undefined ? d.endHour3 : 21;
              return { ...d, isActive3, startHour3, endHour3 };
            }
          }
          return d;
        });

        return {
          ...emp,
          dailySchedules: dailyUpdated
        };
      }
      return emp;
    });
    saveToStorage(updated);
  };

  // Supervisor Action: Toggle Day Active/Inactive status
  const handleToggleDailyScheduleActive = (empId: string, dayName: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        const daily = getEmployeeDailySchedules(emp);
        const dailyUpdated = daily.map(d => {
          if (d.dayName === dayName) {
            return { ...d, isActive: !d.isActive };
          }
          return d;
        });

        const activeDays = dailyUpdated.filter(d => d.isActive);
        const scheduleStartHour = activeDays.length > 0 ? activeDays[0].startHour : emp.scheduleStartHour;
        const scheduleEndHour = activeDays.length > 0 ? activeDays[0].endHour : emp.scheduleEndHour;

        const activeShorts = activeDays.map(d => d.dayShort);
        let scheduleDays = emp.scheduleDays;
        if (activeShorts.length === 7) {
          scheduleDays = "7j/7";
        } else if (activeShorts.length > 0) {
          if (activeShorts.length === 5 && activeShorts.includes('Lun') && activeShorts.includes('Ven') && !activeShorts.includes('Sam') && !activeShorts.includes('Dim')) {
            scheduleDays = "Lun - Ven";
          } else if (activeShorts.length === 6 && activeShorts.includes('Lun') && activeShorts.includes('Sam') && !activeShorts.includes('Dim')) {
            scheduleDays = "Lun - Sam";
          } else {
            scheduleDays = activeShorts.join(', ');
          }
        } else {
          scheduleDays = "Aucun";
        }

        return {
          ...emp,
          dailySchedules: dailyUpdated,
          scheduleStartHour,
          scheduleEndHour,
          scheduleDays
        };
      }
      return emp;
    });
    saveToStorage(updated);
  };

  // Supervisor Action: Modify Working Hours schedule
  const handleUpdateScheduleHour = (empId: string, type: 'start' | 'end', action: 'inc' | 'dec') => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        let { scheduleStartHour, scheduleEndHour } = emp;
        if (type === 'start') {
          if (action === 'inc' && scheduleStartHour < scheduleEndHour - 1) {
            scheduleStartHour += 1;
          } else if (action === 'dec' && scheduleStartHour > 0) {
            scheduleStartHour -= 1;
          }
        } else {
          if (action === 'inc' && scheduleEndHour < 24) {
            scheduleEndHour += 1;
          } else if (action === 'dec' && scheduleEndHour > scheduleStartHour + 1) {
            scheduleEndHour -= 1;
          }
        }
        
        // Also sync all active days in dailySchedules if present
        const daily = getEmployeeDailySchedules(emp);
        const dailyUpdated = daily.map(d => {
          if (d.isActive) {
            return { ...d, startHour: scheduleStartHour, endHour: scheduleEndHour };
          }
          return d;
        });

        return { ...emp, scheduleStartHour, scheduleEndHour, dailySchedules: dailyUpdated };
      }
      return emp;
    });
    saveToStorage(updated);
  };

  // Supervisor Action: Toggle timetable public visibility approval
  const handleToggleScheduleApproval = (empId: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, isScheduleApproved: !emp.isScheduleApproved };
      }
      return emp;
    });
    saveToStorage(updated);
  };

  // Owner Action: Save credentials modifications
  const handleStartEditingCredentials = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditedUsername(emp.username || '');
    setEditedPassword(emp.password || '');
    setEditedCnss(emp.cnss || '');
    setEditedDateEmbauche(emp.dateEmbauche || '');
    setEditedIsSupervisor(emp.isSupervisor || false);
    setEditedName(emp.name || '');
    setEditedRole(emp.role || '');
  };

  const handleSaveCredentials = (empId: string) => {
    if (!editedUsername.trim() || !editedPassword.trim()) {
      alert('L’identifiant et le mot de passe ne peuvent pas être vides.');
      return;
    }
    if (!editedName.trim() || !editedRole.trim()) {
      alert('Le nom et le rôle ne peuvent pas être vides.');
      return;
    }

    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return {
          ...emp,
          name: editedName.trim(),
          role: editedRole.trim(),
          username: editedUsername.trim(),
          password: editedPassword.trim(),
          cnss: editedCnss.trim(),
          dateEmbauche: editedDateEmbauche.trim(),
          isSupervisor: editedIsSupervisor
        };
      }
      return emp;
    });

    saveToStorage(updated);
    setEditingEmployeeId(null);
  };

  // Owner Action: Create a new user (Employee)
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpRole.trim() || !newEmpUsername.trim() || !newEmpPassword.trim()) {
      alert('Veuillez remplir les champs obligatoires (Nom, Rôle, Identifiant, Mot de passe).');
      return;
    }
    
    // Check for unique username
    if (employees.some(emp => (emp.username || '').toLowerCase() === newEmpUsername.trim().toLowerCase())) {
      alert('Cet identifiant est déjà utilisé par un autre collaborateur.');
      return;
    }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: newEmpName.trim(),
      role: newEmpRole.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newEmpName.trim())}`,
      allocatedLeaves: newEmpAllocatedLeaves || 30,
      leaveHistory: [],
      scheduleStartHour: 8,
      scheduleEndHour: 17,
      scheduleDays: "Lun - Ven",
      cnss: newEmpCnss.trim(),
      dateEmbauche: newEmpDateEmbauche || new Date().toISOString().split('T')[0],
      username: newEmpUsername.trim(),
      password: newEmpPassword.trim(),
      isSupervisor: newEmpIsSupervisor,
      bio: "",
      isScheduleApproved: true
    };

    const updated = [...employees, newEmp];
    saveToStorage(updated);
    
    // Reset fields
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpUsername('');
    setNewEmpPassword('');
    setNewEmpCnss('');
    setNewEmpDateEmbauche('');
    setNewEmpIsSupervisor(false);
    setNewEmpAllocatedLeaves(30);
    alert(`Compte de ${newEmp.name} créé avec succès !`);
  };

  // Owner Action: Revoke/delete a user
  const handleRevokeEmployee = (empId: string, empName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir révoquer (supprimer) le compte de ${empName} ? cette action est irréversible.`)) {
      const updated = employees.filter(emp => emp.id !== empId);
      saveToStorage(updated);
      alert(`Compte de ${empName} révoqué.`);
    }
  };

  // Owner Action: Populate Journal Officiel
  const handleCreateJournalArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalTitle.trim() || !journalContent.trim()) {
      alert('Veuillez spécifier un titre et un contenu pour la publication.');
      return;
    }

    const newArticle: JournalArticle = {
      id: `journal-${Date.now()}`,
      title: journalTitle.trim(),
      content: journalContent.trim(),
      date: new Date().toISOString().split('T')[0],
      author: "Direction (Owner)"
    };

    onUpdateJournal([newArticle, ...journalArticles]);
    setJournalTitle('');
    setJournalContent('');
    alert('Annonce officielle publiée avec succès !');
  };

  // Owner Action: Delete Journal Article
  const handleDeleteJournalArticle = (articleId: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette publication du Journal Officiel ?')) {
      onUpdateJournal(journalArticles.filter(a => a.id !== articleId));
    }
  };

  // Employee/Supervisor Action: Update biography and profile details
  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLoggedInEmployee) return;

    if (!profileName.trim()) {
      alert("Le nom ne peut pas être vide.");
      return;
    }
    if (!profileUsername.trim()) {
      alert("Le nom d'utilisateur ne peut pas être vide.");
      return;
    }

    // Check if username is taken
    const usernameTaken = employees.some(emp => 
      emp.id !== currentLoggedInEmployee.id && 
      emp.username.trim().toLowerCase() === profileUsername.trim().toLowerCase()
    );
    if (usernameTaken) {
      alert("Ce nom d'utilisateur est déjà utilisé par un autre collaborateur.");
      return;
    }

    const updated = employees.map(emp => {
      if (emp.id === currentLoggedInEmployee.id) {
        return { 
          ...emp, 
          bio: bioText.trim(),
          name: profileName.trim(),
          role: profileRole.trim(),
          cnss: profileCnss.trim(),
          dateEmbauche: profileDateEmbauche.trim(),
          username: profileUsername.trim().toLowerCase(),
          password: profilePassword.trim()
        };
      }
      return emp;
    });

    saveToStorage(updated);

    // Sync loggedInUser state
    setLoggedInUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        username: profileUsername.trim().toLowerCase(),
        name: profileName.trim()
      };
    });

    alert('Votre profil et votre biographie ont été mis à jour avec succès !');
  };

  // Total pending leave requests for supervisor/owner badge
  const totalPendingRequestsCount = employees.reduce((acc, emp) => {
    return acc + emp.leaveHistory.filter(r => r.status === 'pending').length;
  }, 0);

  // TimeBar rendering helper (supports both single start/end or array of active ranges)
  const renderScheduleTimeBar = (
    startOrRanges: number | { start: number; end: number; isActive?: boolean }[],
    endOrApproved?: number | boolean,
    isApprovedVal?: boolean
  ) => {
    let ranges: { start: number; end: number; isActive: boolean }[] = [];
    let approved = false;

    if (Array.isArray(startOrRanges)) {
      ranges = startOrRanges.map(r => ({
        start: r.start,
        end: r.end,
        isActive: r.isActive !== undefined ? r.isActive : true
      }));
      approved = typeof endOrApproved === 'boolean' ? endOrApproved : true;
    } else {
      const start = startOrRanges;
      const end = typeof endOrApproved === 'number' ? endOrApproved : 0;
      approved = typeof isApprovedVal === 'boolean' ? isApprovedVal : true;
      ranges = [{ start, end, isActive: true }];
    }

    const activeRanges = ranges.filter(r => r.isActive && r.end > r.start);
    const totalHours = activeRanges.reduce((acc, r) => acc + (r.end - r.start), 0);

    return (
      <div className="w-full">
        <div className="relative h-7 bg-gray-100 rounded-xl overflow-hidden shadow-inner flex border border-gray-200">
          {/* Working period segments */}
          {activeRanges.map((range, index) => (
            <div 
              key={index}
              className={`absolute top-0 bottom-0 bg-gradient-to-r shadow-md transition-all duration-300 ${
                approved 
                  ? 'from-emerald-500 to-green-600' 
                  : 'from-amber-400 to-amber-500'
              }`}
              style={{ 
                left: `${(range.start / 24) * 100}%`, 
                width: `${((range.end - range.start) / 24) * 100}%` 
              }}
            />
          ))}
          {/* Ticks */}
          {[6, 12, 18].map((tick) => (
            <div 
              key={tick} 
              className="absolute top-0 bottom-0 border-l border-gray-400/20" 
              style={{ left: `${(tick / 24) * 100}%` }}
            />
          ))}
          {/* Interactive labels */}
          <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-bold text-gray-700 pointer-events-none select-none z-10">
            <span className="font-mono text-gray-400">00h</span>
            <span className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded shadow text-[10px] text-gray-800 flex items-center gap-1 font-semibold border border-gray-100 max-w-[85%] truncate">
              <Clock size={11} className="text-green-600 flex-shrink-0" />
              {activeRanges.length > 0 ? (
                <span>
                  {activeRanges.map(r => `${r.start}h-${r.end}h`).join(' | ')} ({totalHours}h/j)
                </span>
              ) : (
                <span className="text-gray-400 italic">Aucune heure</span>
              )}
            </span>
            <span className="font-mono text-gray-400">24h</span>
          </div>
        </div>
      </div>
    );
  };

  const getUnreadNotificationsCount = () => {
    if (!loggedInUser) return 0;
    const isSupervisorOrOwner = loggedInUser.type === 'supervisor' || loggedInUser.type === 'owner';
    const empId = currentLoggedInEmployee?.id || null;
    return notifications.filter((notif) => {
      if (notif.isRead) return false;
      if (notif.recipientId === 'all_supervisors') {
        return isSupervisorOrOwner;
      }
      return !!(empId && notif.recipientId === empId);
    }).length;
  };
  const unreadCount = getUnreadNotificationsCount();

  const renderWeeklyTimetable = () => {
    return (
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#539F06]" />
              Emploi du temps hebdomadaire
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Horaires d'ouverture et plannings hebdomadaires validés par la supervision. Sélectionnez un jour pour filtrer la présence.
            </p>
          </div>
          {/* Visual day count indicator */}
          <div className="bg-[#EDFCE8] border border-green-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold text-green-800">
            <span>📅</span>
            <span>7 Jours Actifs (Lun - Dim)</span>
          </div>
        </div>

        {/* Slicer Buttons (interactive day filters) */}
        <div className="bg-gray-50 p-2 rounded-2xl border border-gray-200/60 flex flex-wrap gap-1.5">
          {[
            { value: 'Tous', label: '📊 Tous les jours' },
            { value: 'Lundi', label: 'Lun' },
            { value: 'Mardi', label: 'Mar' },
            { value: 'Mercredi', label: 'Mer' },
            { value: 'Jeudi', label: 'Jeu' },
            { value: 'Vendredi', label: 'Ven' },
            { value: 'Samedi', label: 'Sam' },
            { value: 'Dimanche', label: 'Dim' }
          ].map((day) => (
            <button
              key={day.value}
              onClick={() => setSelectedSlicerDay(day.value)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedSlicerDay === day.value
                  ? 'bg-[#22c55e] text-white shadow-md shadow-green-100 scale-[1.03]'
                  : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Filter employees where timetable is approved */}
        {employees.filter(emp => emp.isScheduleApproved).length === 0 ? (
          <div className="text-center py-12 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-amber-800 text-xs italic flex flex-col items-center justify-center gap-2">
            <span>⏳ Aucun horaire n'est encore validé ou approuvé par le superviseur pour l'affichage public.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* If filter day is 'Tous' (Show compact 7-day timeline for each employee) */}
            {selectedSlicerDay === 'Tous' ? (
              <div className="space-y-4">
                {[...employees]
                  .filter(emp => emp.isScheduleApproved)
                  .sort(compareEmployeesByLastName)
                  .map((emp) => {
                    const dailySchedules = getEmployeeDailySchedules(emp);
                    return (
                      <div 
                        key={emp.id}
                        className="bg-white border border-gray-100 hover:border-gray-200 p-5 rounded-3xl shadow-sm space-y-4 transition-all"
                      >
                        {/* Top Profile Summary */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-50">
                          <div className="flex items-center gap-3">
                            <img 
                              src={emp.avatar} 
                              alt={emp.name} 
                              className="w-10 h-10 rounded-full border border-gray-200 shadow-sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-xs text-gray-900">{emp.name}</h5>
                              </div>
                              <p className="text-[10px] text-gray-500 font-semibold">{emp.role}</p>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold font-mono bg-gray-50 px-3 py-1 rounded-full border">
                            Général : {emp.scheduleDays} ({emp.scheduleStartHour}h - {emp.scheduleEndHour}h)
                          </div>
                        </div>

                        {/* 7-Day Matrix for this Employee */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                          {dailySchedules.map((day) => (
                            <div 
                              key={day.dayName}
                              className={`p-3 rounded-2xl border text-center transition-all ${
                                day.isActive 
                                  ? 'bg-[#EDFCE8]/80 border-green-200 shadow-sm' 
                                  : 'bg-gray-50/50 border-gray-100 text-gray-400 opacity-65'
                              }`}
                            >
                              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                {day.dayName}
                              </div>
                              <div className="mt-1.5">
                                {day.isActive ? (
                                  <div className="space-y-0.5">
                                    <span className="block text-xs font-black leading-tight text-green-800">
                                      {day.startHour}h-{day.endHour}h
                                      {day.isActive2 && <span className="block text-[10px] text-green-700">/ {day.startHour2}h-{day.endHour2}h</span>}
                                      {day.isActive3 && <span className="block text-[10px] text-green-700">/ {day.startHour3}h-{day.endHour3}h</span>}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-black uppercase font-mono mt-1 bg-green-100 text-green-800">
                                      Actif
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="block text-xs font-bold text-gray-400 italic">
                                      Repos
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                                      Off
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Specific day view: slice timetable only for employees scheduled on that day */
              <div className="space-y-4">
                {(() => {
                  const activeEmployees = employees.filter(emp => {
                    if (!emp.isScheduleApproved) return false;
                    const daily = getEmployeeDailySchedules(emp);
                    const daySched = daily.find(d => d.dayName === selectedSlicerDay);
                    return daySched ? daySched.isActive : false;
                  });

                  const sortedActiveEmployees = [...activeEmployees].sort(compareEmployeesByLastName);

                  if (sortedActiveEmployees.length === 0) {
                    return (
                      <div className="text-center py-12 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-amber-800 text-xs italic">
                        😴 Aucun collaborateur n'est programmé ou actif le <strong>{selectedSlicerDay}</strong>.
                      </div>
                    );
                  }

                  return sortedActiveEmployees.map((emp) => {
                    const daily = getEmployeeDailySchedules(emp);
                    const daySched = daily.find(d => d.dayName === selectedSlicerDay)!;
                    return (
                      <div 
                        key={emp.id}
                        className="p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border bg-[#EDFCE8]/40 border-green-100"
                      >
                        {/* Left Profile details */}
                        <div className="flex items-center gap-3 w-full md:w-1/4">
                          <img 
                            src={emp.avatar} 
                            alt={emp.name} 
                            className="w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-xs text-gray-900">{emp.name}</h5>
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold">{emp.role}</p>
                            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded font-bold font-mono mt-1 leading-tight bg-green-100 text-green-800">
                              {selectedSlicerDay} : {daySched.startHour}h-{daySched.endHour}h
                              {daySched.isActive2 && ` / ${daySched.startHour2}h-${daySched.endHour2}h`}
                              {daySched.isActive3 && ` / ${daySched.startHour3}h-${daySched.endHour3}h`}
                            </span>
                          </div>
                        </div>

                        {/* Right interactive daily timeline bar */}
                        <div className="w-full md:w-3/4">
                          {renderScheduleTimeBar([
                            { start: daySched.startHour, end: daySched.endHour, isActive: true },
                            { start: daySched.startHour2 || 0, end: daySched.endHour2 || 0, isActive: !!daySched.isActive2 },
                            { start: daySched.startHour3 || 0, end: daySched.endHour3 || 0, isActive: !!daySched.isActive3 }
                          ], true)}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAnnualCalendar = () => {
    const isSupervisorOnly = loggedInUser?.type === 'supervisor' || loggedInUser?.type === 'owner';
    const currentMarkings = localCalendarMarkings !== null ? localCalendarMarkings : calendarMarkings;

    const getDaysInMonthGrid = (year: number, monthIndex: number) => {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const firstDay = new Date(year, monthIndex, 1).getDay(); // 0 = Sun, 1 = Mon, ...
      const startOffset = firstDay === 0 ? 6 : firstDay - 1;
      
      const cells: { dateStr: string | null; dayNumber: number | null }[] = [];
      
      for (let i = 0; i < startOffset; i++) {
        cells.push({ dateStr: null, dayNumber: null });
      }
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ dateStr, dayNumber: d });
      }
      
      return cells;
    };

    const handleClearAll = () => {
      if (window.confirm("Êtes-vous sûr de vouloir effacer TOUS les marquages du calendrier ? (Ces modifications devront être enregistrées)")) {
        setLocalCalendarMarkings({});
        setSelectedDayInfo(null);
      }
    };

    const handleResetToDefault = () => {
      if (window.confirm("Voulez-vous restaurer les jours fériés par défaut ? (Ces modifications devront être enregistrées)")) {
        setLocalCalendarMarkings(DEFAULT_CALENDAR_MARKINGS);
        setSelectedDayInfo(null);
      }
    };

    const formatDateFr = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } catch (e) {
        return dateStr;
      }
    };

    const currentYearHolidaysCount = Object.entries(currentMarkings).filter(([date, marking]) => {
      const m = marking as { type: string; label?: string } | undefined;
      return date.startsWith(`${selectedYear}-`) && m?.type === 'ferie';
    }).length;

    return (
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        {/* Title and Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              📅 Calendrier Annuel de l'Officine
            </span>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mt-1.5 flex items-center flex-wrap gap-2">
              <CalendarDays className="w-6 h-6 text-emerald-600" />
              Calendrier Annuel {selectedYear}
            </h3>
            <p className="text-xs text-gray-500">
              {isSupervisorOnly 
                ? "Mode superviseur actif : cliquez sur un marqueur ci-dessous puis tamponnez les jours pour planifier."
                : "Consultez l'organisation, les gardes, les demi-journées et les jours fériés de notre officine (validés par la supervision)."}
            </p>
          </div>

          {/* Year Selector & Reset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              {[2026, 2027].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === yr 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {isSupervisorOnly && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleResetToDefault}
                  title="Restaurer les jours fériés par défaut"
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <RefreshCw size={13} />
                  Défauts
                </button>
                <button
                  onClick={handleClearAll}
                  title="Tout effacer"
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  Vider
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unsaved Changes Banner */}
        {isSupervisorOnly && localCalendarMarkings !== null && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-amber-900">Modifications non enregistrées</h4>
                <p className="text-xs text-amber-700">
                  Vous avez modifié le calendrier. Veuillez enregistrer vos modifications pour qu'elles soient visibles par les autres utilisateurs et sur l'espace public.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  saveCalendarMarkings(localCalendarMarkings);
                  setLocalCalendarMarkings(null);
                  alert("Le calendrier a été mis à jour avec succès et est maintenant visible par tous !");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Enregistrer les modifications
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Voulez-vous annuler toutes vos modifications non enregistrées ?")) {
                    setLocalCalendarMarkings(null);
                    setSelectedDayInfo(null);
                  }
                }}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Supervisor Drawing Controls Panel */}
        {isSupervisorOnly && (
          <div className="bg-emerald-50/40 border border-emerald-100/80 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                🖌️ Outil de Marquage Actif :
              </span>
              
              {/* Optional custom text input */}
              <div className="flex items-center gap-2 w-full md:w-auto max-w-xs">
                <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">Texte / Label :</span>
                <input
                  type="text"
                  value={customBrushLabel}
                  onChange={(e) => setCustomBrushLabel(e.target.value)}
                  placeholder="Ex: Lundi de Pâques, Garde..."
                  className="w-full bg-white text-gray-800 px-3 py-1.5 text-[11px] font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Brushes list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {(['entier', 'demi', 'ferie', 'garde', 'unmarked'] as const).map((type) => {
                const config = MARKING_CONFIG[type];
                const isActive = activeBrush === type;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveBrush(type)}
                    style={{ backgroundColor: config.bg }}
                    className={`px-3 py-2.5 rounded-xl text-[11px] font-black transition-all border flex items-center justify-center gap-2 relative shadow-sm ${
                      config.border
                    } ${config.text} ${
                      isActive 
                        ? 'ring-2 ring-slate-900 ring-offset-2 scale-[1.03] z-10' 
                        : 'opacity-75 hover:opacity-100 hover:scale-[1.01]'
                    }`}
                  >
                    <span className="text-sm">
                      {type === 'entier' && '🟢'}
                      {type === 'demi' && '🟡'}
                      {type === 'ferie' && '🟤'}
                      {type === 'garde' && '🟠'}
                      {type === 'unmarked' && '⚪'}
                    </span>
                    {config.label}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black shadow-md">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Static Legend Panel */}
        <div className="bg-gray-50 p-3.5 rounded-2xl flex flex-wrap items-center justify-center gap-4 border border-gray-100">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Légende :</span>
          {Object.entries(MARKING_CONFIG).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded border ${value.border}`} style={{ backgroundColor: value.bg }} />
              <span className="text-xs font-bold text-gray-700">{value.label}</span>
            </div>
          ))}
        </div>

        {/* Error message banner */}
        <AnimatePresence mode="wait">
          {calendarError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl text-xs font-black flex items-center justify-between shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                ⚠️ {calendarError}
              </span>
              <button 
                onClick={() => setCalendarError(null)} 
                className="ml-4 hover:underline text-rose-700 font-extrabold shrink-0"
              >
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {MONTHS_FR.map((monthName, monthIdx) => {
            const cells = getDaysInMonthGrid(selectedYear, monthIdx);
            
            return (
              <div key={monthIdx} className="bg-gray-50/50 border border-gray-100/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div className="text-center font-extrabold text-sm text-gray-800 uppercase tracking-wide border-b border-gray-200/50 pb-2 mb-3">
                  {monthName}
                </div>
                
                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 text-[10px] font-black text-gray-400 text-center mb-1.5">
                  {DAYS_SHORT_FR.map((d, dIdx) => (
                    <div key={dIdx}>{d}</div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1 text-[11px] text-center">
                  {cells.map((dayCell, dayCellIdx) => {
                    if (dayCell.dayNumber === null || !dayCell.dateStr) {
                      return <div key={`empty-${monthIdx}-${dayCellIdx}`} className="aspect-square" />;
                    }

                    const dateStr = dayCell.dateStr;
                    const marking = currentMarkings[dateStr];
                    const markingType = marking?.type || 'unmarked';
                    const config = MARKING_CONFIG[markingType];
                    const isSelected = selectedDayInfo?.date === dateStr;

                    return (
                      <motion.button
                        key={dateStr}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (isSupervisorOnly) {
                            const updated = localCalendarMarkings !== null ? { ...localCalendarMarkings } : { ...calendarMarkings };
                            const cellYearStr = dateStr.split('-')[0];

                            // Enforce maximum of 7 holidays per year
                            if (activeBrush === 'ferie' && markingType !== 'ferie') {
                              const existingHolidaysCount = Object.entries(updated).filter(([date, m]) => {
                                const markingItem = m as { type: string; label?: string } | undefined;
                                return date.startsWith(`${cellYearStr}-`) && markingItem?.type === 'ferie';
                              }).length;

                              if (existingHolidaysCount >= 7) {
                                setCalendarError(`Limite atteinte : Un maximum de 7 jours fériés est autorisé pour l'année ${cellYearStr}. Veuillez en retirer un avant d'en ajouter un nouveau.`);
                                return;
                              }
                            }

                            // Reset error if marking is successful or not holiday
                            setCalendarError(null);

                            if (activeBrush === 'unmarked') {
                              delete updated[dateStr];
                            } else {
                              updated[dateStr] = { 
                                type: activeBrush, 
                                label: customBrushLabel.trim() || undefined 
                              };
                            }
                            setLocalCalendarMarkings(updated);
                            setSelectedDayInfo({
                              date: dateStr,
                              type: activeBrush,
                              label: customBrushLabel.trim()
                            });
                          } else {
                            setSelectedDayInfo({
                              date: dateStr,
                              type: markingType,
                              label: marking?.label || ''
                            });
                          }
                        }}
                        style={{ backgroundColor: config.bg }}
                        className={`aspect-square w-full flex flex-col items-center justify-center rounded-lg font-extrabold transition-all border ${
                          config.border
                        } ${config.text} cursor-pointer relative ${
                          isSelected ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 z-10' : ''
                        }`}
                        title={marking?.label || `${dayCell.dayNumber} {monthName} - ${config.label}`}
                      >
                        <span>{dayCell.dayNumber}</span>
                        {marking?.label && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Info Banner */}
        <AnimatePresence>
          {selectedDayInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm shrink-0"
                  style={{ backgroundColor: MARKING_CONFIG[selectedDayInfo.type]?.bg }}
                >
                  {selectedDayInfo.type === 'entier' && '🟢'}
                  {selectedDayInfo.type === 'demi' && '🟡'}
                  {selectedDayInfo.type === 'ferie' && '🟤'}
                  {selectedDayInfo.type === 'garde' && '🟠'}
                  {selectedDayInfo.type === 'unmarked' && '⚪'}
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                    Statut du Jour Sélectionné
                  </h4>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    <span className="capitalize">{formatDateFr(selectedDayInfo.date)}</span> :{' '}
                    <span className="font-extrabold text-emerald-700">
                      {MARKING_CONFIG[selectedDayInfo.type]?.label}
                    </span>
                    {selectedDayInfo.label && (
                      <span className="ml-1 text-slate-600 italic">
                        ("{selectedDayInfo.label}")
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayInfo(null)}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-[11px] font-extrabold transition-all"
              >
                Masquer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderNavigationBar = () => {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="text-[#22c55e] w-6 h-6" />
          <span className="font-black text-gray-800 text-sm tracking-wide uppercase">
            Espaces d'accès du Portail
          </span>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => onSpaceChange('public')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentSpace === 'public'
                ? 'bg-[#22c55e] text-white shadow-lg shadow-green-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            🌍 Espace Public
          </button>
          
          <button
            onClick={() => {
              if (loggedInUser) {
                onSpaceChange('private');
              } else {
                onSpaceChange('private');
              }
            }}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              currentSpace === 'private'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            🔒 Espace Privé
            {loggedInUser && (
              <span className="ml-1 bg-white/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                Moi
              </span>
            )}
          </button>

          {(loggedInUser?.type === 'supervisor' || loggedInUser?.type === 'owner') && (
            <button
              onClick={() => onSpaceChange('planning')}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                currentSpace === 'planning'
                  ? 'bg-[#E17522] text-white shadow-lg shadow-orange-200'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100/80'
              }`}
            >
              📅 Espace Planning
              {totalPendingRequestsCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ml-1">
                  {totalPendingRequestsCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Auth Status & LogOut */}
        {loggedInUser ? (
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Notification Bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={`relative p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
                  showNotificationsDropdown
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500'
                }`}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification drop-down panel */}
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2.5 z-[100] w-80 md:w-96">
                  <NotificationPanel
                    notifications={notifications}
                    currentEmployeeId={currentLoggedInEmployee?.id || null}
                    isSupervisorOrOwner={loggedInUser.type === 'supervisor' || loggedInUser.type === 'owner'}
                    onMarkRead={handleMarkNotifRead}
                    onMarkAllRead={handleMarkAllNotifsRead}
                    onClose={() => setShowNotificationsDropdown(false)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-green-50 border border-green-100 px-4 py-1.5 rounded-xl flex-1 md:flex-initial justify-between">
              <div className="text-left">
                <p className="text-[10px] text-green-700 font-extrabold uppercase tracking-widest">
                  Session Active : {loggedInUser.type}
                </p>
                <p className="text-xs font-bold text-gray-800 truncate max-w-[120px]">
                  {loggedInUser.name}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                title="Se déconnecter"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">
            💡 Connectez-vous pour voir vos espaces sécurisés.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Dynamic Navigation Tabs between Spaces */}
      {isMounted && document.getElementById('top-nav-bar-portal')
        ? createPortal(renderNavigationBar(), document.getElementById('top-nav-bar-portal')!)
        : renderNavigationBar()
      }

      {/* Main Content Areas based on selected current space */}
      <AnimatePresence mode="wait">
        {currentSpace === 'public' && (
          <motion.div
            key="public-space"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-12"
          >

            {/* 2. Section: Work Force (LIST EMPLOYEES) */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-[#22c55e]" />
                    Work Force
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Découvrez nos collaborateurs engagés. Cliquez sur un profil pour afficher son historique, sa biographie et accéder à l'espace de connexion.
                  </p>
                </div>
                <div className="text-[11px] bg-emerald-50 text-emerald-800 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-100">
                  Total : {employees.length} Collaborateurs
                </div>
              </div>

              {/* Grid of employees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...employees].sort(compareEmployeesByLastName).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedBioEmployee(emp)}
                    className="group text-left p-4 bg-gray-50 hover:bg-green-50/50 rounded-2xl border border-gray-200/80 hover:border-green-300 transition-all duration-300 hover:shadow-md flex flex-col items-center text-center space-y-3 relative"
                  >
                    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-gray-200 group-hover:bg-green-100 group-hover:text-green-800 transition-colors">
                      <Eye size={12} className="text-gray-400 group-hover:text-green-700" />
                    </div>
                    
                    <img 
                      src={emp.avatar} 
                      alt={emp.name} 
                      className="w-16 h-16 rounded-full border border-gray-200 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h5 className="font-black text-sm text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1">
                        {emp.name}
                      </h5>
                      <p className="text-[11px] text-gray-500 font-semibold line-clamp-1">
                        {emp.role}
                      </p>
                    </div>

                    <div className="bg-white/80 px-2 py-1.5 rounded-lg border border-gray-200/50 w-full text-[10px] text-gray-600 text-center font-semibold flex items-center justify-center gap-1">
                      <Info size={11} className="text-green-600" />
                      Voir Biographie
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Float-like or Bottom-Right Bio Popup & Login Prompt whenever clicked */}
            <AnimatePresence>
              {selectedBioEmployee && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-green-100 overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    {/* Header profile background */}
                    <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-6 text-white relative">
                      <button 
                        onClick={() => setSelectedBioEmployee(null)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                      >
                        <X size={16} />
                      </button>

                      <div className="flex items-center gap-4 mt-2">
                        <img 
                          src={selectedBioEmployee.avatar} 
                          alt={selectedBioEmployee.name} 
                          className="w-16 h-16 rounded-full border-2 border-white/50 shadow-md bg-white"
                        />
                        <div>
                          <h4 className="text-xl font-black tracking-tight">{selectedBioEmployee.name}</h4>
                          <p className="text-xs text-green-100 font-bold">{selectedBioEmployee.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bio content */}
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                      <div className="space-y-2">
                        <h5 className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Profil & Biographie
                        </h5>
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                          "{selectedBioEmployee.bio || "Aucune biographie disponible pour ce collaborateur."}"
                        </p>
                      </div>

                      {/* General metadata in non-private space (just hired and schedule) */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#EDFCE8]/40 p-3 rounded-xl border border-green-100">
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Jours de Travail</span>
                          <span className="font-bold text-gray-800">{selectedBioEmployee.scheduleDays}</span>
                        </div>
                        <div className="bg-[#EDFCE8]/40 p-3 rounded-xl border border-green-100">
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Amplitude</span>
                          <span className="font-bold text-gray-800">
                            {selectedBioEmployee.scheduleStartHour}h - {selectedBioEmployee.scheduleEndHour}h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Right Prompt to Login to Private Space */}
                    <div className="bg-emerald-50 p-5 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-left w-full sm:w-auto">
                        <div className="bg-emerald-600 text-white p-2 rounded-xl">
                          <Lock size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-900 uppercase tracking-tight">
                            Accès Restreint
                          </p>
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            Authentifiez-vous pour accéder à son Espace Privé.
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedBioEmployee(null);
                          onSpaceChange('private');
                        }}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1"
                      >
                        Se connecter <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Public Section: Operational Tasks Monitoring */}
            <div id="public-tasks-section" className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <TaskManager
                currentEmployee={currentLoggedInEmployee}
                loggedInUser={loggedInUser}
                employees={employees}
                tasks={tasks}
                onAssignTask={handleAssignTask}
                onCompleteTask={handleCompleteTask}
                onToggleMilestone={handleToggleMilestone}
                onAddMilestone={handleAddMilestone}
                onAddComment={handleAddComment}
                viewMode="public"
                onAcknowledgeTask={handleAcknowledgeTask}
                onDeleteTask={handleDeleteTask}
              />
            </div>

            {/* Public Section: Chat Discussion Room */}
            <div id="public-chat-section" className="space-y-6">
              <div className="bg-white/80 p-6 md:p-8 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    Parloir
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Discutez en temps réel avec toute l'équipe de l'officine. Connectez-vous à votre Espace Privé pour participer activement !
                  </p>
                </div>
                <CompanyChat
                  currentEmployee={currentLoggedInEmployee}
                  employees={employees}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </div>

            {/* Public Section: Weekly Timetable */}
            {renderWeeklyTimetable()}

            {/* Public Section: Annual Calendar */}
            {renderAnnualCalendar()}
          </motion.div>
        )}

        {/* =========================================================================
            🔒 PRIVATE SPACE (Requires employee or supervisor credentials)
            ========================================================================= */}
        {currentSpace === 'private' && (
          <motion.div
            key="private-space"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* If NOT logged in, show the beautiful Login Panel */}
            {!loggedInUser ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden mt-6">
                <div className="bg-gradient-to-r from-emerald-700 to-green-600 p-6 text-white text-center">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                    <Lock size={20} className="text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">Portail de Connexion Sécurisé</h3>
                  <p className="text-xs text-green-100 mt-1">
                    Saisissez vos identifiants pour accéder à votre Espace Privé et de congé.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase mb-1">
                      Identifiant (Nom d'utilisateur ou Email)
                    </label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Ex: awa.diop ou koffi.mensah"
                      className="w-full text-xs p-3 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase mb-1">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Saisissez votre mot de passe"
                      className="w-full text-xs p-3 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordEmail('');
                        setForgotPasswordError('');
                        setForgotPasswordSuccess(false);
                        setIsForgotPasswordOpen(true);
                      }}
                      className="text-xs text-green-700 hover:text-green-800 font-bold hover:underline transition-all cursor-pointer"
                    >
                      Déclarer mot de passe perdu ?
                    </button>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#22c55e] hover:bg-green-600 text-white text-xs font-black rounded-xl shadow-md transition-all uppercase tracking-wider"
                  >
                    Se connecter à l'Espace Privé
                  </button>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <Info size={12} /> Aide pour les tests :
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                      <li><strong>Superviseur:</strong> koffi.mensah / kof</li>
                      <li><strong>Employé:</strong> awa.diop / awa</li>
                    </ul>
                  </div>
                </form>
              </div>
            ) : (
              // If Logged in but is Owner (Owner doesn't have an employee profile directly, let's offer to view employee's private spaces or show an elegant welcome screen with user editing capabilities!)
              loggedInUser.type === 'owner' ? (
                <div className="space-y-8">
                  {/* Owner Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                    <div className="space-y-2">
                      <span className="bg-blue-800 text-blue-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        Rôle de Contrôle : Propriétaire (Owner)
                      </span>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                        <span>🛡️</span> Portail d'Administration Pharmintl
                      </h3>
                      <p className="text-sm text-blue-100 max-w-xl">
                        En tant que propriétaire connecté avec le compte Google <strong className="text-white font-mono">{loggedInUser.username}</strong>, vous disposez d'un contrôle total sur les utilisateurs, les habilitations de supervision et les annonces officielles de la pharmacie.
                      </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/20 shadow-inner text-center shrink-0">
                      <span className="block text-2xl">⚡</span>
                      <span className="text-xs font-bold text-blue-200 uppercase tracking-widest block mt-1">Console Racine</span>
                      <button
                        type="button"
                        onClick={() => {
                          setOwnerChangePasswordCurrent('');
                          setOwnerChangePasswordNew('');
                          setOwnerChangePasswordConfirm('');
                          setOwnerChangePasswordError('');
                          setOwnerChangePasswordSuccess(false);
                          setIsOwnerChangePasswordOpen(true);
                        }}
                        className="mt-3 px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Key size={11} /> Modifier le mot de passe
                      </button>
                    </div>
                  </div>

                  {/* Employé à l'affiche Management Card */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-red-500" />
                          Gestion de l'Employé à l'Affiche
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Mettez à jour l'image <code className="bg-gray-100 text-red-600 font-mono px-1.5 py-0.5 rounded text-[11px]">employe.png</code> et le message de l'employé à l'affiche sur l'accueil public de l'officine.
                        </p>
                      </div>
                      
                      {featuredUpdateSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-800 font-bold text-xs flex items-center gap-1.5 animate-bounce">
                          <span>✅</span> Mise à jour publiée avec succès !
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left side: Form for text and image upload */}
                      <div className="lg:col-span-7 space-y-5">
                        {/* Text description editor */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            Message / Texte de l'employé à l'affiche *
                          </label>
                          <textarea
                            rows={4}
                            value={localFeaturedText}
                            onChange={(e) => setLocalFeaturedText(e.target.value)}
                            className="w-full p-3.5 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 font-medium text-xs leading-relaxed"
                            placeholder="Saisissez le texte à afficher..."
                          />
                        </div>

                        {/* Image Uploader supporting Drag & Drop and click */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            Téléverser l'image (employe.png) *
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragOver(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFeaturedImageUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                              isDragOver 
                                ? 'border-red-500 bg-red-50/50' 
                                : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
                            }`}
                            onClick={() => document.getElementById('featured-image-file-input')?.click()}
                          >
                            <input
                              type="file"
                              id="featured-image-file-input"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFeaturedImageUpload(e.target.files[0]);
                                }
                              }}
                            />
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-700">
                                Glissez-déposez l'image employe.png ici
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                ou cliquez pour parcourir vos fichiers
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <button
                          type="button"
                          onClick={handleSaveFeatured}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                        >
                          <span>💾</span> Enregistrer les modifications
                        </button>
                      </div>

                      {/* Right side: Real-time Preview in Home Tile card styling */}
                      <div className="lg:col-span-5 space-y-3">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          Aperçu en Temps Réel (Page d'accueil)
                        </span>

                        <div className="bg-white border-2 border-red-100 rounded-3xl p-6 shadow-md relative overflow-hidden space-y-4">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-8 -mt-8 opacity-60 pointer-events-none" />
                          
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full border-2 border-red-200 overflow-hidden bg-gray-50 shadow-sm shrink-0">
                              <img 
                                src={featuredImage} 
                                alt="Employé à l'affiche" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <span className="bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                À l'affiche
                              </span>
                              <h5 className="font-extrabold text-sm text-gray-950 mt-1">
                                Employé à l'affiche
                              </h5>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 italic leading-relaxed whitespace-pre-wrap font-medium">
                            "{localFeaturedText}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Row: User Management Dashboard (2-Column Bento Grid) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left: Register New Employee (xl:col-span-4) */}
                    <div className="xl:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="border-b pb-3">
                        <h4 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                          <PlusCircle className="w-5 h-5 text-blue-600" />
                          Créer un Nouveau Compte
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Inscrivez un nouveau collaborateur et générez immédiatement ses accès de connexion sécurisés.
                        </p>
                      </div>

                      <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Nom Complet *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex. Aminata Diallo"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Poste / Rôle de travail *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex. Caissière Adjointe"
                            value={newEmpRole}
                            onChange={(e) => setNewEmpRole(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-semibold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Identifiant unique *</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: aminata.d"
                              value={newEmpUsername}
                              onChange={(e) => setNewEmpUsername(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-semibold text-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Mot de passe *</label>
                            <input
                              type="text"
                              required
                              placeholder="Mot de passe"
                              value={newEmpPassword}
                              onChange={(e) => setNewEmpPassword(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Numéro CNSS</label>
                            <input
                              type="text"
                              placeholder="Ex. 12345678-90"
                              value={newEmpCnss}
                              onChange={(e) => setNewEmpCnss(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Date d'embauche</label>
                            <input
                              type="date"
                              value={newEmpDateEmbauche}
                              onChange={(e) => setNewEmpDateEmbauche(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                            <input
                              type="checkbox"
                              id="newEmpIsSupervisor"
                              checked={newEmpIsSupervisor}
                              onChange={(e) => setNewEmpIsSupervisor(e.target.checked)}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                            <label htmlFor="newEmpIsSupervisor" className="text-[10px] font-black text-gray-700 uppercase cursor-pointer">
                              Superviseur ?
                            </label>
                          </div>

                          <div>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={newEmpAllocatedLeaves}
                              onChange={(e) => setNewEmpAllocatedLeaves(parseInt(e.target.value) || 0)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-semibold text-center"
                              placeholder="Congés alloués (ex: 30)"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider transition-colors"
                        >
                          Enregistrer le Collaborateur
                        </button>
                      </form>
                    </div>

                    {/* Right: Register of Accounts and Credentials table (xl:col-span-8) */}
                    <div className="xl:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                          <Edit3 className="w-5 h-5 text-blue-600" />
                          Registre Actif des Collaborateurs & Habilitations
                        </h4>
                        <p className="text-xs text-gray-500">
                          Gérez en toute sécurité les identifiants de connexion, affectez la qualité de Superviseur ou révoquez définitivement un compte.
                        </p>
                      </div>

                      <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500 font-bold bg-gray-50/50">
                              <th className="p-3">Employé</th>
                              <th className="p-3">CNSS</th>
                              <th className="p-3">Embauche</th>
                              <th className="p-3">Identifiant / MDP</th>
                              <th className="p-3 text-center">Habilitation</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                            {employees.map((emp) => {
                              const isEditing = editingEmployeeId === emp.id;
                              return (
                                <tr key={emp.id} className="hover:bg-gray-50/30">
                                  {/* Employee block */}
                                  <td className="p-3">
                                    <div className="flex items-center gap-3">
                                      <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full border bg-gray-50" />
                                      {isEditing ? (
                                        <div className="space-y-1">
                                          <input
                                            type="text"
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            className="p-1 rounded border border-gray-300 w-28 text-xs font-semibold block"
                                            placeholder="Nom complet"
                                          />
                                          <input
                                            type="text"
                                            value={editedRole}
                                            onChange={(e) => setEditedRole(e.target.value)}
                                            className="p-1 rounded border border-gray-300 w-28 text-[10px] font-semibold block"
                                            placeholder="Rôle"
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="font-extrabold text-gray-900 leading-tight">{emp.name}</p>
                                          <p className="text-[10px] text-gray-500">{emp.role}</p>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* CNSS */}
                                  <td className="p-3">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editedCnss}
                                        onChange={(e) => setEditedCnss(e.target.value)}
                                        className="p-1 rounded border border-gray-300 w-24 text-xs font-semibold font-mono"
                                      />
                                    ) : (
                                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 text-[10px]">
                                        {emp.cnss || "Néant"}
                                      </span>
                                    )}
                                  </td>

                                  {/* Hire Date */}
                                  <td className="p-3">
                                    {isEditing ? (
                                      <input
                                        type="date"
                                        value={editedDateEmbauche}
                                        onChange={(e) => setEditedDateEmbauche(e.target.value)}
                                        className="p-1 rounded border border-gray-300 w-28 text-[10px] font-semibold"
                                      />
                                    ) : (
                                      <span className="text-[11px] font-semibold text-gray-600">
                                        {emp.dateEmbauche || "Néant"}
                                      </span>
                                    )}
                                  </td>

                                  {/* Username & Password */}
                                  <td className="p-3">
                                    {isEditing ? (
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          value={editedUsername}
                                          onChange={(e) => setEditedUsername(e.target.value)}
                                          className="p-1 rounded border border-gray-300 w-28 text-xs font-semibold text-blue-600 block"
                                        />
                                        <input
                                          type="text"
                                          value={editedPassword}
                                          onChange={(e) => setEditedPassword(e.target.value)}
                                          className="p-1 rounded border border-gray-300 w-28 text-xs font-mono block"
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                                          {emp.username || "Non défini"}
                                        </span>
                                        <p className="text-[10px] text-gray-400 font-mono">pass: <span className="text-gray-700 font-semibold">{emp.password}</span></p>
                                      </div>
                                    )}
                                  </td>

                                  {/* isSupervisor Habilitation Toggle */}
                                  <td className="p-3 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center justify-center gap-1.5 bg-orange-50 p-1.5 rounded-lg border border-orange-100">
                                        <input
                                          type="checkbox"
                                          id={`edit-super-${emp.id}`}
                                          checked={editedIsSupervisor}
                                          onChange={(e) => setEditedIsSupervisor(e.target.checked)}
                                          className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <label htmlFor={`edit-super-${emp.id}`} className="text-[10px] font-black text-orange-800 cursor-pointer">
                                          Superviseur
                                        </label>
                                      </div>
                                    ) : (
                                      emp.isSupervisor ? (
                                        <span className="bg-orange-100 text-orange-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          🛡️ Superviseur
                                        </span>
                                      ) : (
                                        <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                          Collaborateur
                                        </span>
                                      )
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="p-3 text-right">
                                    {isEditing ? (
                                      <div className="flex gap-1 justify-end">
                                        <button
                                          onClick={() => handleSaveCredentials(emp.id)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-2 py-1 rounded shadow"
                                        >
                                          Sauver
                                        </button>
                                        <button
                                          onClick={() => setEditingEmployeeId(null)}
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[9px] px-2 py-1 rounded"
                                        >
                                          Annuler
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-1 justify-end items-center">
                                        <button
                                          onClick={() => handleStartEditingCredentials(emp)}
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-800 font-extrabold text-[10px] px-2.5 py-1 rounded flex items-center gap-1 shadow-sm transition-all"
                                          title="Éditer le profil et les accès"
                                        >
                                          <Edit3 size={10} /> Éditer
                                        </button>
                                        <button
                                          onClick={() => handleRevokeEmployee(emp.id, emp.name)}
                                          className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] px-2.5 py-1 rounded flex items-center gap-1 shadow-sm transition-all"
                                          title="Révoquer / Supprimer le compte"
                                        >
                                          <X size={11} /> Révoquer
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Journal Officiel Management Section */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                      <h4 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        Gestion du Journal Officiel
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Publiez des communiqués, notes de service ou directives de direction qui seront affichés directement pour tout le public.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: Publication form (lg:col-span-5) */}
                      <form onSubmit={handleCreateJournalArticle} className="lg:col-span-5 space-y-4">
                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-3">
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                            Nouvelle Publication
                          </span>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Titre de l'Annonce *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Note de Service - Horaires du Ramadan"
                              value={journalTitle}
                              onChange={(e) => setJournalTitle(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Contenu / Message Officiel *</label>
                            <textarea
                              required
                              rows={4}
                              placeholder="Écrivez ici le corps de la directive..."
                              value={journalContent}
                              onChange={(e) => setJournalContent(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-xs leading-relaxed"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow transition-colors uppercase tracking-wider"
                          >
                            Publier au Journal Officiel
                          </button>
                        </div>
                      </form>

                      {/* Right: Published articles list (lg:col-span-7) */}
                      <div className="lg:col-span-7 space-y-3.5">
                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Articles Publiés en Ligne ({journalArticles.length})</h5>
                        
                        {journalArticles.length === 0 ? (
                          <div className="text-center py-12 text-xs text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">
                            Aucun article n'est actuellement publié au Journal Officiel.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                            {journalArticles.map((art) => (
                              <div key={art.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-start justify-between gap-4 hover:border-gray-200 transition-all">
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-400 font-mono font-bold flex items-center gap-1.5">
                                    <span>📅 {art.date}</span> • <span>👤 {art.author}</span>
                                  </p>
                                  <h6 className="text-sm font-black text-gray-900">{art.title}</h6>
                                  <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-relaxed mt-1">
                                    {art.content}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteJournalArticle(art.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-xl transition-all shrink-0"
                                  title="Supprimer cette publication"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Database Backup & Import Management Panel */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                      <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                        <Database className="w-5 h-5 text-red-600" />
                        Synchronisation & Sauvegarde Intégrale
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Téléchargez l'intégralité de la base de données locale (Collaborateurs, Plannings, Journal Officiel, Employé à l'affiche) sous forme de fichier JSON, ou restaurez une sauvegarde existante.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: Download Action */}
                      <div className="lg:col-span-6 bg-red-50/20 p-6 rounded-3xl border border-red-100/50 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                            Exportation de Sécurité
                          </span>
                          <h5 className="text-sm font-black text-gray-900">Sauvegarder les données de l'officine</h5>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Générez instantanément un fichier de sauvegarde JSON. Ce fichier contient l'ensemble des fiches collaborateurs, de l'historique des congés approuvés, de l'emploi du temps et du journal d'actualités.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleDownloadDatabase}
                          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger la Sauvegarde (.JSON)
                        </button>
                      </div>

                      {/* Right: Upload/Import Action */}
                      <div className="lg:col-span-6 bg-blue-50/20 p-6 rounded-3xl border border-blue-100/50 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                            Restauration & Importation
                          </span>
                          <h5 className="text-sm font-black text-gray-900">Restaurer ou synchroniser la base</h5>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Glissez ou sélectionnez un fichier de sauvegarde JSON précédemment exporté pour synchroniser et rétablir instantanément tous les collaborateurs, leurs historiques de congés et le journal.
                          </p>
                        </div>

                        <div>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleImportDatabase(e.dataTransfer.files[0]);
                              }
                            }}
                            className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-white/50 rounded-2xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all"
                            onClick={() => document.getElementById('database-import-file-input')?.click()}
                          >
                            <input
                              type="file"
                              id="database-import-file-input"
                              accept=".json"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImportDatabase(e.target.files[0]);
                                }
                              }}
                            />
                            <Upload className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="text-xs font-black text-gray-700">Importer un fichier .JSON</p>
                              <p className="text-[10px] text-gray-400">Cliquez ou glissez-déposez ici</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Action Button at Bottom Right (specifically requested) */}
                  <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-gray-200 flex items-center gap-3.5 transition-all hover:border-red-300">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <Database className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-800">Base Pharmintl</h5>
                        <p className="text-[9px] text-gray-400 font-bold">Synchronisation active</p>
                      </div>
                      <button
                        onClick={handleDownloadDatabase}
                        className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                        title="Télécharger la Base de données"
                      >
                        <Download className="w-3 h-3" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular Employee or Supervisor Private Space Profile View
                currentLoggedInEmployee && (
                  <div className="space-y-8">
                    {/* Private Space Header Info */}
                    <div className="bg-[#EDFCE8] border border-green-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="relative group shrink-0">
                          <img 
                            src={currentLoggedInEmployee.avatar} 
                            alt={currentLoggedInEmployee.name} 
                            className="w-16 h-16 rounded-full border-2 border-green-600 shadow-md bg-white object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAvatarEditor(!showAvatarEditor)}
                            className="absolute -bottom-1 -right-1 bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full shadow-lg border border-white transition-all scale-95 hover:scale-105 flex items-center justify-center cursor-pointer"
                            title="Modifier ma photo de profil"
                          >
                            <Camera size={12} />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                            🔒 Mon Espace Privé Sécurisé
                          </span>
                          <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                            {currentLoggedInEmployee.name}
                          </h3>
                          <p className="text-xs text-gray-500 font-bold">
                            {currentLoggedInEmployee.role}
                          </p>
                        </div>
                      </div>

                      {/* Requirement: identified by: Name, ID, CNSS, "Date d'embauche" */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                        <div className="bg-white p-3 rounded-2xl border border-green-100 shadow-sm text-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">ID Employé</span>
                          <span className="text-xs font-mono font-black text-gray-800 mt-0.5 block">{currentLoggedInEmployee.id}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-green-100 shadow-sm text-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">N° CNSS</span>
                          <span className="text-xs font-mono font-black text-gray-800 mt-0.5 block">
                            {currentLoggedInEmployee.cnss || "Non renseigné"}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-green-100 shadow-sm text-center col-span-2">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Date d'embauche</span>
                          <span className="text-xs font-bold text-emerald-800 mt-0.5 block">
                            {currentLoggedInEmployee.dateEmbauche || "Non spécifiée"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Collapsible Avatar Editor */}
                    <AnimatePresence>
                      {showAvatarEditor && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white border border-green-100 rounded-3xl p-6 shadow-md space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                              <div>
                                <h4 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                                  <Camera className="w-5 h-5 text-emerald-600" />
                                  Modifier ma photo de profil
                                </h4>
                                <p className="text-xs text-gray-500">
                                  Choisissez un style parmi nos modèles, importez votre propre image ou saisissez un lien web.
                                </p>
                              </div>
                              <button
                                onClick={() => setShowAvatarEditor(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-all"
                              >
                                <X size={18} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                              {/* Option 1: File Upload (Drag & Drop) */}
                              <div className="md:col-span-5 space-y-3">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                  Option 1: Téléverser une image locale
                                </label>
                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setAvatarDragOver(true);
                                  }}
                                  onDragLeave={() => setAvatarDragOver(false)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setAvatarDragOver(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                      handleAvatarFileChange(e.dataTransfer.files[0]);
                                    }
                                  }}
                                  onClick={() => document.getElementById('avatar-file-input-private')?.click()}
                                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${
                                    avatarDragOver 
                                      ? 'border-emerald-500 bg-emerald-50/50 animate-pulse' 
                                      : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/10'
                                  }`}
                                >
                                  <input
                                    type="file"
                                    id="avatar-file-input-private"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleAvatarFileChange(e.target.files[0]);
                                      }
                                    }}
                                  />
                                  <Upload className={`w-8 h-8 ${avatarDragOver ? 'text-emerald-600' : 'text-gray-400'}`} />
                                  <div>
                                    <p className="text-xs font-black text-gray-700">Glissez-déposez une image</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">ou cliquez pour parcourir vos fichiers</p>
                                  </div>
                                </div>
                              </div>

                              {/* Divider for desktop */}
                              <div className="hidden md:flex md:col-span-1 items-center justify-center">
                                <div className="h-full w-px bg-gray-100" />
                              </div>

                              {/* Option 2: Presets & URL */}
                              <div className="md:col-span-6 space-y-5">
                                {/* Presets */}
                                <div className="space-y-2.5">
                                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                    Option 2: Modèles d'avatars illustrés
                                  </label>
                                  <div className="flex flex-wrap gap-2.5">
                                    {['Felix', 'Aneka', 'Oliver', 'Maya', 'Jack', 'Sophia', 'Leo', 'Mia'].map((seed) => {
                                      const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                                      const isSelected = currentLoggedInEmployee.avatar === url;
                                      return (
                                        <button
                                          key={seed}
                                          onClick={() => {
                                            handleSaveAvatar(url);
                                            alert("Photo de profil mise à jour avec succès !");
                                          }}
                                          className={`relative w-12 h-12 rounded-full border-2 overflow-hidden bg-gray-50 transition-all hover:scale-105 active:scale-95 ${
                                            isSelected ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-gray-300'
                                          }`}
                                          title={`Utiliser le modèle ${seed}`}
                                        >
                                          <img src={url} alt={seed} className="w-full h-full object-cover" />
                                          {isSelected && (
                                            <div className="absolute inset-0 bg-emerald-600/10 flex items-center justify-center">
                                              <div className="bg-emerald-600 text-white rounded-full p-0.5">
                                                <Check size={8} className="stroke-[4]" />
                                              </div>
                                            </div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Custom URL */}
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                    Option 3: Lien d'image externe (URL)
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="url"
                                      placeholder="https://exemple.com/ma-photo.jpg"
                                      value={avatarInputUrl}
                                      onChange={(e) => setAvatarInputUrl(e.target.value)}
                                      className="flex-1 text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-medium"
                                    />
                                    <button
                                      onClick={() => {
                                        if (!avatarInputUrl.trim()) {
                                          alert("Veuillez entrer une URL valide.");
                                          return;
                                        }
                                        handleSaveAvatar(avatarInputUrl.trim());
                                        setAvatarInputUrl('');
                                        alert("Photo de profil mise à jour avec succès !");
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm"
                                    >
                                      Appliquer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Leave Accounts (Allocated, Taken, Remaining) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                          <CalendarDays size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Congés Alloués (An)</p>
                          <p className="text-2xl font-black text-gray-800 mt-0.5">{currentLoggedInEmployee.allocatedLeaves} Jours</p>
                        </div>
                      </div>

                      <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest">Congés Consommés</p>
                          <p className="text-2xl font-black text-emerald-900 mt-0.5">
                            {getApprovedDays(currentLoggedInEmployee)} Jours
                          </p>
                        </div>
                      </div>

                      <div className="bg-green-100 p-5 rounded-2xl border border-green-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center text-[#539F06]">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] text-green-800 uppercase font-black tracking-widest">Jours Restants</p>
                          <p className="text-2xl font-black text-[#539F06] mt-0.5">
                            {currentLoggedInEmployee.allocatedLeaves - getApprovedDays(currentLoggedInEmployee)} Jours
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Leave Request Form */}
                      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h4 className="text-base font-extrabold text-gray-800 flex items-center gap-2 border-b pb-2">
                          <PlusCircle className="w-5 h-5 text-emerald-600" />
                          Nouvelle Demande de Congé
                        </h4>
                        
                        <form onSubmit={handleSubmitLeave} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                Date de Début
                              </label>
                              <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 font-medium"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                Date de Fin
                              </label>
                              <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 font-medium"
                                required
                              />
                            </div>
                          </div>

                          {startDate && endDate && (
                            <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3 text-xs font-bold text-center border border-emerald-100">
                              Nombre de jours de congé demandé : {calculateDays(startDate, endDate)} jour(s)
                            </div>
                          )}

                          {leaveFormError && (
                            <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              {leaveFormError}
                            </div>
                          )}

                          {leaveSuccessMessage && (
                            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              {leaveSuccessMessage}
                            </div>
                          )}

                          <button
                            type="submit"
                            className="w-full py-3 bg-[#22c55e] hover:bg-green-600 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider"
                          >
                            Soumettre la demande
                          </button>
                        </form>
                      </div>

                      {/* Leave History List */}
                      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h4 className="text-base font-extrabold text-gray-800 flex items-center gap-2 border-b pb-2">
                          <History className="w-5 h-5 text-emerald-600" />
                          Historique de mes demandes de congé
                        </h4>

                        {currentLoggedInEmployee.leaveHistory.length === 0 ? (
                          <div className="text-center py-12 text-xs text-gray-400 italic">
                            Aucun congé demandé pour le moment. Votre solde est entièrement disponible.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-bold bg-gray-50/50">
                                  <th className="p-3">Date de Demande</th>
                                  <th className="p-3">Dates (Début - Fin)</th>
                                  <th className="p-3 text-center">Nombre de jours</th>
                                  <th className="p-3 text-right">Statut de validation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                                {currentLoggedInEmployee.leaveHistory.map((req) => (
                                  <tr key={req.id} className="hover:bg-gray-50/20">
                                    <td className="p-3 font-mono text-gray-400">{req.requestDate}</td>
                                    <td className="p-3 text-gray-900">
                                      Du <strong className="font-extrabold">{req.startDate}</strong> au <strong className="font-extrabold">{req.endDate}</strong>
                                    </td>
                                    <td className="p-3 text-center font-bold text-gray-800">{req.days} jours</td>
                                    <td className="p-3 text-right">
                                      {req.status === 'pending' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-800">
                                          ⏳ En attente
                                        </span>
                                      )}
                                      {req.status === 'approved' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                          ✅ Approuvé
                                        </span>
                                      )}
                                      {req.status === 'rejected' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                                          ❌ Refusé
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Biography & Profile Section (Requirement: "Allow every participant in his private space to edit his own biography and his profile including the photo") */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                      <div className="border-b border-gray-100 pb-4">
                        <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                          <User className="w-5 h-5 text-emerald-600" />
                          Mon Profil, Photo & Biographie Professionnelle
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Gérez vos informations personnelles, votre identifiant de connexion, votre mot de passe et votre biographie publique. 💡 Pour modifier votre photo de profil, cliquez sur le bouton appareil photo 📷 situé sur votre image en haut de la page.
                        </p>
                      </div>

                      <form onSubmit={handleSaveBio} className="space-y-6">
                        {/* Grid for core fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                              Nom complet
                            </label>
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold text-gray-800"
                              placeholder="Ex: Awa Diop"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                              Rôle / Poste
                            </label>
                            <input
                              type="text"
                              value={profileRole}
                              onChange={(e) => setProfileRole(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold text-gray-800"
                              placeholder="Ex: Pharmacienne Adjointe"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                              N° CNSS
                            </label>
                            <input
                              type="text"
                              value={profileCnss}
                              onChange={(e) => setProfileCnss(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold text-gray-800"
                              placeholder="Ex: CNSS-129-873"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                              Date d'embauche
                            </label>
                            <input
                              type="date"
                              value={profileDateEmbauche}
                              onChange={(e) => setProfileDateEmbauche(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold text-gray-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                              Identifiant de connexion (Username)
                            </label>
                            <input
                              type="text"
                              value={profileUsername}
                              onChange={(e) => setProfileUsername(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold text-gray-800 font-mono"
                              placeholder="Ex: awa.diop"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                              Mot de passe
                            </label>
                            <input
                              type="text"
                              value={profilePassword}
                              onChange={(e) => setProfilePassword(e.target.value)}
                              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold text-gray-800 font-mono"
                              placeholder="Mot de passe"
                              required
                            />
                          </div>
                        </div>

                        {/* Biography */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            Ma Biographie Professionnelle
                          </label>
                          <textarea
                            rows={4}
                            maxLength={500}
                            placeholder="Racontez votre parcours, votre expertise ou une citation inspirante (Max 500 caractères)..."
                            value={bioText}
                            onChange={(e) => setBioText(e.target.value)}
                            className="w-full text-xs p-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 font-medium text-gray-800 leading-relaxed"
                          />
                          <div className="flex justify-end">
                            <span className="text-[10px] font-semibold text-gray-400">
                              {bioText.length}/500 caractères
                            </span>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            className="px-6 py-3 bg-[#22c55e] hover:bg-green-600 text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check size={14} className="stroke-[3]" />
                            Enregistrer mon profil & biographie
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Private Space: My Assigned Tasks Board */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                      <TaskManager
                        currentEmployee={currentLoggedInEmployee}
                        loggedInUser={loggedInUser}
                        employees={employees}
                        tasks={tasks}
                        onAssignTask={handleAssignTask}
                        onCompleteTask={handleCompleteTask}
                        onToggleMilestone={handleToggleMilestone}
                        onAddMilestone={handleAddMilestone}
                        onAddComment={handleAddComment}
                        viewMode="private"
                        onAcknowledgeTask={handleAcknowledgeTask}
                        onDeleteTask={handleDeleteTask}
                      />
                    </div>

                    {/* Private Space: Secure Chat Box */}
                    <div className="space-y-6">
                      <div className="bg-white/80 p-6 md:p-8 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
                        <div className="border-b border-gray-100 pb-4">
                          <h4 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-emerald-600" />
                            Messagerie Sécurisée Pharmintl
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Échangez en direct avec vos collègues de l'officine de manière chiffrée et privée.
                          </p>
                        </div>
                        <CompanyChat
                          currentEmployee={currentLoggedInEmployee}
                          employees={employees}
                          messages={chatMessages}
                          onSendMessage={handleSendMessage}
                        />
                      </div>
                    </div>
                  </div>
                )
              )
            )}

            {/* If logged in, also show the official annual calendar in the private space */}
            {loggedInUser && (
              <div className="mt-12">
                {renderAnnualCalendar()}
              </div>
            )}
          </motion.div>
        )}

        {/* =========================================================================
            📅 PLANNING SPACE (Accessible only to supervisors or owner)
            ========================================================================= */}
        {currentSpace === 'planning' && (loggedInUser?.type === 'supervisor' || loggedInUser?.type === 'owner') && (
          <motion.div
            key="planning-space"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Planning space header banner */}
            <div className="bg-[#FFF4E5] border border-orange-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5">
                <span className="bg-orange-200 text-orange-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                  Espace Planification & Validation
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
                  Espace de Supervision (Planning Space)
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                  Gérez l'approbation des congés des collaborateurs et configurez l'emploi du temps de l'officine.
                </p>
              </div>
              <div className="bg-white/80 p-4 rounded-2xl border border-orange-200/50 shadow-sm text-center">
                <span className="block text-xl">📆</span>
                <span className="text-[10px] font-bold text-orange-700 uppercase block mt-1">Habilitation</span>
                <span className="text-xs font-black text-gray-800 block">Superviseur actif</span>
              </div>
            </div>

            {/* Feature: Supervisor Task Assignment Form */}
            <TaskManager
              currentEmployee={currentLoggedInEmployee}
              loggedInUser={loggedInUser}
              employees={employees}
              tasks={tasks}
              onAssignTask={handleAssignTask}
              onCompleteTask={handleCompleteTask}
              onToggleMilestone={handleToggleMilestone}
              onAddMilestone={handleAddMilestone}
              onAddComment={handleAddComment}
              viewMode="supervisor"
              onAcknowledgeTask={handleAcknowledgeTask}
              onDeleteTask={handleDeleteTask}
            />

            {/* Feature 1: Leave Approval Form (Table or cards of pending leaves) */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h4 className="text-lg font-extrabold text-gray-800 flex items-center gap-2 border-b pb-3">
                  <UserCheck className="w-5 h-5 text-orange-500" />
                  Demandes de Congés en Attente d'Approbation ({totalPendingRequestsCount})
                </h4>
              </div>

              {totalPendingRequestsCount === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed text-gray-400 text-xs italic">
                  Aucune demande de congé n'est en attente d'approbation.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {employees.flatMap(emp => 
                    emp.leaveHistory
                      .filter(req => req.status === 'pending')
                      .map(req => {
                        const approved = getApprovedDays(emp);
                        const remaining = emp.allocatedLeaves - approved;
                        
                        return (
                          <div 
                            key={`${emp.id}-${req.id}`}
                            className="bg-amber-50/20 border border-amber-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-3 mb-4 border-b border-amber-100 pb-3">
                                <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full border bg-white" />
                                <div>
                                  <h5 className="font-extrabold text-sm text-gray-900">{emp.name}</h5>
                                  <p className="text-[10px] text-gray-500">{emp.role}</p>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs text-gray-700">
                                <p className="flex justify-between">
                                  <span className="text-gray-400">Période :</span>
                                  <span className="font-bold">Du {req.startDate} au {req.endDate}</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400">Durée demandée :</span>
                                  <span className="font-black text-gray-900">{req.days} jours</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400">Solde restant s'il est approuvé :</span>
                                  <span className="font-extrabold text-[#539F06]">{remaining - req.days} jours</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-5 pt-3 border-t border-amber-100/50">
                              <button
                                onClick={() => handleUpdateLeaveStatus(emp.id, req.id, 'approved')}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1"
                              >
                                <Check size={14} /> Approuver
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(emp.id, req.id, 'rejected')}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1"
                              >
                                <X size={14} /> Rejeter
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>

            {/* Feature 2: Planning Management Slicer / Weekly Hours Scheduler */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h4 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-orange-500" />
                  Slicer de Planification de l'Emploi du Temps Hebdomadaire
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Réglez interactivement la plage horaire journalière, validez et activez la visibilité publique de l'emploi du temps de chaque collaborateur.
                </p>
              </div>

              <div className="space-y-4">
                {employees.map((emp) => {
                  const dailySchedules = getEmployeeDailySchedules(emp);
                  return (
                    <div 
                      key={emp.id}
                      className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 hover:bg-gray-50/50 transition-all space-y-4"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Name Card */}
                        <div className="lg:col-span-3 flex items-center gap-3">
                          <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full border bg-white shadow-sm" />
                          <div>
                            <h5 className="font-extrabold text-sm text-gray-900">{emp.name}</h5>
                            <p className="text-[10px] text-gray-500">{emp.role}</p>
                            <span className="inline-block text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono font-bold mt-1">
                              {emp.scheduleDays}
                            </span>
                          </div>
                        </div>

                        {/* Interactive TimeBar Slicer preview */}
                        <div className="lg:col-span-5 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <span>Aperçu global (ou premier jour actif)</span>
                            <span className="text-[#539F06] font-mono bg-white px-2 py-0.5 rounded border shadow-sm">
                              Planning Slicer Overview
                            </span>
                          </div>
                          {renderScheduleTimeBar(emp.scheduleStartHour, emp.scheduleEndHour, emp.isScheduleApproved)}
                        </div>

                        {/* Adjust sliders buttons */}
                        <div className="lg:col-span-4 flex flex-col sm:flex-row gap-3">
                          {/* Granular day expander button */}
                          <button
                            type="button"
                            onClick={() => setExpandedDailyEmpId(expandedDailyEmpId === emp.id ? null : emp.id)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                              expandedDailyEmpId === emp.id 
                                ? 'bg-orange-100 text-orange-900 border border-orange-300' 
                                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            <span>⚙️</span>
                            {expandedDailyEmpId === emp.id ? "Masquer Détails Jours" : "Planifier par Jour (Lun-Dim)"}
                          </button>

                          {/* Public Space Visibility Approved Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleScheduleApproval(emp.id)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                              emp.isScheduleApproved
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
                            }`}
                          >
                            {emp.isScheduleApproved ? (
                              <>
                                <CheckCircle2 size={13} />
                                Visuel Public (Actif)
                              </>
                            ) : (
                              <>
                                <XCircle size={13} />
                                Masqué Public
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanding granular daily planner (Monday to Sunday) */}
                      <AnimatePresence>
                        {expandedDailyEmpId === emp.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-gray-200/80 pt-4 space-y-4 overflow-hidden"
                          >
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                              <div className="flex items-center justify-between border-b pb-2">
                                <h6 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>📅</span> Modification du planning par jour de la semaine
                                </h6>
                                <span className="text-[10px] bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded font-black font-mono">
                                  Samedi & Dimanche Disponibles
                                </span>
                              </div>

                              <div className="space-y-3.5 divide-y divide-gray-100">
                                {dailySchedules.map((day, idx) => (
                                  <div 
                                    key={day.dayName} 
                                    className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3.5 ${idx === 0 ? '!pt-0' : ''}`}
                                  >
                                    {/* Left: day name + toggle active checkbox */}
                                    <div className="flex items-center gap-4 md:w-1/4">
                                      <span className="text-xs font-black text-gray-800 w-24 flex items-center gap-1">
                                        <span className={day.isActive ? 'text-green-600' : 'text-gray-300'}>●</span>
                                        {day.dayName}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleDailyScheduleActive(emp.id, day.dayName)}
                                        className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center gap-1 ${
                                          day.isActive 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                                        }`}
                                      >
                                        {day.isActive ? "🟢 En Service" : "⚪ Repos"}
                                      </button>
                                    </div>

                                    {/* Middle: Daily Start/End Hour adjusters */}
                                    <div className="flex items-center gap-3 md:w-2/4 justify-start md:pl-6">
                                      {day.isActive ? (
                                        <div className="flex flex-col gap-2.5 w-full">
                                          {/* Slot 1 */}
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono w-14 text-center">Plage 1</span>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 shadow-inner">
                                              <span className="text-[9px] font-bold text-gray-400 uppercase">Début</span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 1, 'start', 'dec')}
                                                className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-orange-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                              >
                                                -
                                              </button>
                                              <span className="text-[10px] font-mono font-black text-gray-800 w-7 text-center">{day.startHour}h</span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 1, 'start', 'inc')}
                                                className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-orange-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                              >
                                                +
                                              </button>
                                            </div>
                                            
                                            <span className="text-gray-400 text-xs font-bold">à</span>

                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 shadow-inner">
                                              <span className="text-[9px] font-bold text-gray-400 uppercase">Fin</span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 1, 'end', 'dec')}
                                                className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-orange-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                              >
                                                -
                                              </button>
                                              <span className="text-[10px] font-mono font-black text-gray-800 w-7 text-center">{day.endHour}h</span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 1, 'end', 'inc')}
                                                className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-orange-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                              >
                                                +
                                              </button>
                                            </div>

                                            {/* Action Toggles for Plage 2 & 3 */}
                                            <div className="flex items-center gap-1.5 ml-2">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleDailyScheduleSlotActive(emp.id, day.dayName, 2)}
                                                className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-1 ${
                                                  day.isActive2
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
                                                }`}
                                                title="Ajouter ou supprimer une deuxième plage horaire"
                                              >
                                                {day.isActive2 ? "❌ Plage 2" : "➕ Plage 2"}
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleToggleDailyScheduleSlotActive(emp.id, day.dayName, 3)}
                                                className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase transition-all flex items-center gap-1 ${
                                                  day.isActive3
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
                                                }`}
                                                title="Ajouter ou supprimer une troisième plage horaire"
                                              >
                                                {day.isActive3 ? "❌ Plage 3" : "➕ Plage 3"}
                                              </button>
                                            </div>
                                          </div>

                                          {/* Slot 2 (discontinuous) */}
                                          {day.isActive2 && (
                                            <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-gray-100 pt-2">
                                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono w-14 text-center">Plage 2</span>
                                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 shadow-inner">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Début</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 2, 'start', 'dec')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  -
                                                </button>
                                                <span className="text-[10px] font-mono font-black text-gray-800 w-7 text-center">{day.startHour2 !== undefined ? day.startHour2 : 14}h</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 2, 'start', 'inc')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  +
                                                </button>
                                              </div>
                                              
                                              <span className="text-gray-400 text-xs font-bold">à</span>

                                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 shadow-inner">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Fin</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 2, 'end', 'dec')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  -
                                                </button>
                                                <span className="text-[10px] font-mono font-black text-gray-800 w-7 text-center">{day.endHour2 !== undefined ? day.endHour2 : 18}h</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 2, 'end', 'inc')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Slot 3 (discontinuous) */}
                                          {day.isActive3 && (
                                            <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-gray-100 pt-2">
                                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono w-14 text-center">Plage 3</span>
                                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 shadow-inner">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Début</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 3, 'start', 'dec')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  -
                                                </button>
                                                <span className="text-[10px] font-mono font-black text-gray-800 w-7 text-center">{day.startHour3 !== undefined ? day.startHour3 : 19}h</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 3, 'start', 'inc')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  +
                                                </button>
                                              </div>
                                              
                                              <span className="text-gray-400 text-xs font-bold">à</span>

                                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 shadow-inner">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Fin</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 3, 'end', 'dec')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  -
                                                </button>
                                                <span className="text-[10px] font-mono font-black text-gray-800 w-7 text-center">{day.endHour3 !== undefined ? day.endHour3 : 21}h</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateDailyScheduleHour(emp.id, day.dayName, 3, 'end', 'inc')}
                                                  className="w-4 h-4 rounded bg-white border border-gray-200 hover:bg-indigo-100 text-gray-700 font-black text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">Aucune heure programmée (Journée de repos/congé)</span>
                                      )}
                                    </div>

                                    {/* Right: Daily micro-timeline preview */}
                                    <div className="md:w-1/4">
                                      {renderScheduleTimeBar([
                                        { start: day.startHour, end: day.endHour, isActive: day.isActive },
                                        { start: day.startHour2 || 0, end: day.endHour2 || 0, isActive: day.isActive && !!day.isActive2 },
                                        { start: day.startHour3 || 0, end: day.endHour3 || 0, isActive: day.isActive && !!day.isActive3 }
                                      ], day.isActive)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature 3: Supervisor Annual Calendar Configuration */}
            {renderAnnualCalendar()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          🔑 OWNER PASSWORD RECOVERY & CREATION MODALS
          ========================================================================= */}
      
      {/* 1. Declare Lost Password Modal */}
      <AnimatePresence>
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="bg-gradient-to-r from-emerald-800 to-green-700 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider">Perte de mot de passe</h4>
                    <p className="text-[10px] text-green-100 font-medium">Propriétaire Pharmintl</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                {!forgotPasswordSuccess ? (
                  <form onSubmit={handleDeclareLostPassword} className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Saisissez l'adresse e-mail officielle de votre compte propriétaire. Un lien sécurisé et interactif de création de mot de passe sera généré.
                    </p>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
                        Votre adresse e-mail propriétaire
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          placeholder="Ex: elhaidinam@gmail.com"
                          className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                          disabled={forgotPasswordLoading}
                        />
                        <Mail className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                      </div>
                    </div>

                    {forgotPasswordError && (
                      <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-xs font-bold flex items-center gap-1.5 leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        {forgotPasswordError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-black rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {forgotPasswordLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Génération du lien en cours...
                        </>
                      ) : (
                        "Déclarer et recevoir le lien de création"
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-sm">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-gray-800">Demande enregistrée avec succès !</h5>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Un lien de création de mot de passe a été envoyé à l'adresse <strong className="text-gray-700">{forgotPasswordEmail}</strong>.
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-2">
                      <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                        <Inbox size={14} /> Simulation d'Email Activée :
                      </p>
                      <p className="text-[10px] text-blue-700 leading-relaxed">
                        Comme nous sommes dans un environnement de prévisualisation sécurisé, un widget de notification interactif est apparu en bas à droite. Cliquez dessus pour ouvrir l'e-mail simulé et définir votre mot de passe !
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      className="text-xs text-gray-600 hover:text-gray-800 font-bold underline cursor-pointer"
                    >
                      Fermer la fenêtre
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Simulated Webmail Received Notification Toast */}
      <AnimatePresence>
        {showSimulatedNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 overflow-hidden flex flex-col space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center justify-center text-green-400">
                  <Inbox size={18} />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full" />
                </div>
                <div>
                  <h6 className="text-xs font-black text-slate-200 uppercase tracking-wider">📬 Simulation d'Email</h6>
                  <p className="text-[10px] text-slate-400">Nouveau message pour elhaidinam@gmail.com</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatedNotification(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <p className="text-[11px] font-bold text-slate-200">
                Sujet : Pharmintl - Création de votre mot de passe propriétaire
              </p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                Vous avez déclaré votre mot de passe perdu. Cliquez sur le lien ci-joint pour créer...
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSimulatedInboxOpen(true);
                  setShowSimulatedNotification(false);
                }}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-slate-950 text-[10px] font-black uppercase rounded-lg transition-all text-center cursor-pointer shadow-md"
              >
                Ouvrir l'E-mail interactif
              </button>
              <button
                type="button"
                onClick={() => setShowSimulatedNotification(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
              >
                Ignorer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Simulated Webmail Client Modal */}
      <AnimatePresence>
        {isSimulatedInboxOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-50 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-200 flex flex-col h-[500px]"
            >
              {/* Window Header */}
              <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500 block" />
                    <span className="w-3 h-3 rounded-full bg-green-500 block" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest font-black">
                    Simulateur de Messagerie Sécurisée
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSimulatedInboxOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Email Content Box */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Email Metadata */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-xs font-black text-slate-900">
                        Sujet : 🔐 Pharmintl : Création de votre mot de passe propriétaire
                      </h5>
                      <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                        <p>
                          <strong className="text-gray-700 font-semibold">De :</strong> Portail Pharmintl &lt;system@pharmintl.com&gt;
                        </p>
                        <p>
                          <strong className="text-gray-700 font-semibold">À :</strong> elhaidinam@gmail.com
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Sécurisé
                    </span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm leading-relaxed text-gray-700 text-xs space-y-4">
                  <p className="font-bold text-gray-900 text-sm">Bonjour Monsieur elhaidinam,</p>
                  
                  <p>
                    Vous avez déclaré votre mot de passe perdu pour votre compte de contrôle administrateur propriétaire sur le portail <strong className="text-emerald-700 font-bold">Pharmintl</strong>.
                  </p>
                  
                  <p>
                    Afin d'assurer la confidentialité et la protection de vos données, nous vous invitons à cliquer sur le lien sécurisé ci-dessous pour procéder immédiatement à la création de votre nouveau mot de passe personnalisé.
                  </p>

                  <div className="py-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatePasswordOpen(true);
                        setIsSimulatedInboxOpen(false);
                      }}
                      className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Key size={14} /> Créer mon nouveau mot de passe
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">
                      Lien sécurisé à usage unique : https://pharmintl.com/auth/create?token=a982f1b8a739d4b...
                    </p>
                  </div>

                  <p className="text-gray-500 text-[11px] border-t pt-3">
                    Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail. Vos anciens identifiants resteront inchangés.
                  </p>
                  
                  <p className="text-gray-500 font-semibold text-[11px]">
                    L'Équipe d'Administration Sécurisée Pharmintl.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Create/Reset Password Form Modal */}
      <AnimatePresence>
        {isCreatePasswordOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="bg-gradient-to-r from-emerald-800 to-green-700 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                    <Key size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider font-sans">Création de mot de passe</h4>
                    <p className="text-[10px] text-green-100 font-medium font-mono">elhaidinam@gmail.com</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatePasswordOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                {!createPasswordSuccess ? (
                  <form onSubmit={handleCreateNewPassword} className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Saisissez et confirmez le nouveau mot de passe pour votre compte Propriétaire. Ce mot de passe remplacera le mot de passe actuel.
                    </p>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newOwnerPassword}
                          onChange={(e) => setNewOwnerPassword(e.target.value)}
                          placeholder="Minimum 4 caractères"
                          className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                        />
                        <Key className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
                        Confirmer le mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmNewOwnerPassword}
                          onChange={(e) => setConfirmNewOwnerPassword(e.target.value)}
                          placeholder="Saisissez de nouveau le mot de passe"
                          className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                        />
                        <Lock className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                      </div>
                    </div>

                    {createPasswordError && (
                      <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-xs font-bold flex items-center gap-1.5 leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        {createPasswordError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-sans"
                    >
                      Enregistrer mon nouveau mot de passe
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-sm animate-bounce">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-gray-800">Mot de passe créé avec succès !</h5>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Votre nouveau mot de passe a été configuré et enregistré.
                      </p>
                      <p className="text-[11px] text-green-700 font-bold mt-1 bg-green-50 rounded-xl py-1 px-3 inline-block">
                        Redirection vers la connexion...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Logged-in Owner Password Modification Modal */}
      <AnimatePresence>
        {isOwnerChangePasswordOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/10">
                    <Key size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider font-sans">Changer mon mot de passe</h4>
                    <p className="text-[10px] text-blue-200 font-medium font-mono">elhaidinam@gmail.com (Propriétaire)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOwnerChangePasswordOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                {!ownerChangePasswordSuccess ? (
                  <form onSubmit={handleOwnerChangePassword} className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Saisissez votre mot de passe propriétaire actuel ainsi que votre nouveau mot de passe sécurisé (minimum 4 caractères).
                    </p>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
                        Mot de passe actuel
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={ownerChangePasswordCurrent}
                          onChange={(e) => setOwnerChangePasswordCurrent(e.target.value)}
                          placeholder="Saisissez votre mot de passe actuel"
                          className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <Lock className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={ownerChangePasswordNew}
                          onChange={(e) => setOwnerChangePasswordNew(e.target.value)}
                          placeholder="Minimum 4 caractères"
                          className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <Key className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
                        Confirmer le nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={ownerChangePasswordConfirm}
                          onChange={(e) => setOwnerChangePasswordConfirm(e.target.value)}
                          placeholder="Saisissez de nouveau le mot de passe"
                          className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <Lock className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                      </div>
                    </div>

                    {ownerChangePasswordError && (
                      <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-xs font-bold flex items-center gap-1.5 leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        {ownerChangePasswordError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer font-sans"
                    >
                      Enregistrer le mot de passe
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-sm animate-bounce">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-gray-800">Mot de passe modifié avec succès !</h5>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Votre nouveau mot de passe propriétaire a été sauvegardé dans la base sécurisée Pharmintl.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
