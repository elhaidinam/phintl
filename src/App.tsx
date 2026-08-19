import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Pill, ExternalLink, Download, Database, Mic } from 'lucide-react';
import LeaveScheduler from './components/LeaveScheduler';
import GpsExtractionModal from './components/GpsExtractionModal';
import AttendanceModal from './components/AttendanceModal';
import { PfQualiteAccessModal } from './components/PfQualiteAccessModal';
import ClientFeedbackPortal from './components/ClientFeedbackPortal';
import FeaturedEmployeeModal from './components/FeaturedEmployeeModal';
import JournalPublishModal from './components/JournalPublishModal';
import { JournalArticle, ActivePage, CustomerFeedback, StaffEvaluation, Employee, LoggedInUser } from './types';
import { initialCustomerFeedbacks, DEFAULT_GOOGLE_FORM_URL, initialStaffEvaluations, DEFAULT_EMPLOYEES } from './data';
import { subscribeToDoc, saveToDoc } from './lib/firebase';
import { registerRealtimeSync, pushRealtimeUpdate } from './lib/realtimeSync';
import { mergeEmployeesWithPreservedLeaves, syncAllLeavesToCloud, mergeLeaveHistories } from './lib/leaveSyncHelper';

interface TileProps {
  href?: string;
  onClick?: () => void;
  title: string;
  description: string;
  avatar: string;
  type: 'red' | 'green' | 'gold' | 'blue' | 'purple';
  actionText?: string;
  key?: string | number;
  badge?: {
    text: string;
    variant: 'active' | 'lock' | 'info';
  };
}

const colorMap = {
  red: {
    border: 'border border-red-500/50 hover:border-red-600 ring-1 ring-red-500/10 hover:ring-red-500/25',
    accentBorder: 'border-l-4 border-l-red-500',
    text: 'text-red-700',
    bg: 'hover:bg-[#FAF5F2]'
  },
  green: {
    border: 'border border-emerald-600/50 hover:border-emerald-700 ring-1 ring-emerald-600/10 hover:ring-emerald-600/25',
    accentBorder: 'border-l-4 border-l-emerald-600',
    text: 'text-emerald-800',
    bg: 'hover:bg-[#F5F8F1]'
  },
  gold: {
    border: 'border border-amber-500/50 hover:border-amber-600 ring-1 ring-amber-500/10 hover:ring-amber-500/25',
    accentBorder: 'border-l-4 border-l-amber-500',
    text: 'text-amber-800',
    bg: 'hover:bg-[#FAF7ED]'
  },
  blue: {
    border: 'border border-blue-500/50 hover:border-blue-600 ring-1 ring-blue-500/10 hover:ring-blue-500/25',
    accentBorder: 'border-l-4 border-l-blue-500',
    text: 'text-blue-700',
    bg: 'hover:bg-[#F2F6FA]'
  },
  purple: {
    border: 'border border-purple-500/50 hover:border-purple-600 ring-1 ring-purple-500/10 hover:ring-purple-500/25',
    accentBorder: 'border-l-4 border-l-purple-500',
    text: 'text-purple-800',
    bg: 'hover:bg-[#F8F4FA]'
  }
};

const Tile = ({ href, onClick, title, description, avatar, type, actionText, badge }: TileProps) => {
  const colors = colorMap[type];

  const content = (
    <>
      <div className="w-20 h-20 flex items-center justify-center overflow-hidden shrink-0 bg-[#FAF7F0] border border-[#EBE6DA] rounded-xl p-1 relative shadow-inner">
        <img 
          src={avatar} 
          alt={title} 
          className="w-full h-full object-contain rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=9333ea&color=fff`;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className={`text-base font-extrabold uppercase tracking-tight truncate ${colors.text}`}>
            {title}
          </h2>
          {badge && (
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
              badge.variant === 'active' 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                : (badge.variant === 'lock' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-100 text-gray-700')
            }`}>
              {badge.text}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">
          "{description}"
        </p>
        {onClick && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-700 font-black uppercase bg-purple-100/80 w-fit px-2 py-0.5 rounded-md">
            <span>⚡ {actionText || "Extraire automatiquement"}</span>
          </div>
        )}
        {href && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-semibold uppercase">
            En savoir plus <ExternalLink size={10} />
          </div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ x: 6, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`flex flex-row items-center text-left p-5 gap-5 bg-[#FCFBF7] rounded-2xl shadow-sm transition-all duration-300 cursor-pointer ${colors.border} ${colors.accentBorder} ${colors.bg}`}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.a
      href={href || undefined}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer" : undefined}
      whileHover={{ x: 6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`flex flex-row items-center text-left p-5 gap-5 bg-[#FCFBF7] rounded-2xl shadow-sm transition-all duration-300 ${colors.border} ${colors.accentBorder} ${colors.bg}`}
    >
      {content}
    </motion.a>
  );
};

export default function App() {
  const [currentSpace, setCurrentSpace] = useState<'public' | 'private' | 'planning'>('public');
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [pfQualiteModalInfo, setPfQualiteModalInfo] = useState<{
    isOpen: boolean;
    tileTitle: string;
  } | null>(null);

  const [isClientFeedbackMode, setIsClientFeedbackMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('feedback') === 'client' || params.get('feedback') === '1' || params.get('page') === 'feedback';
    }
    return false;
  });

  // Synchronized authenticated user across the application
  const [loggedInUser, setLoggedInUser] = useState<{
    type: string;
    employeeId?: string;
    username: string;
    name: string;
    isPfQualite?: boolean;
    isSupervisor?: boolean;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('pharmintl_logged_in_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isPfQualite = Boolean(
    loggedInUser && (loggedInUser.isPfQualite || loggedInUser.type === 'owner')
  );

  const isSupervisor = Boolean(
    loggedInUser && (
      loggedInUser.type === 'owner' || 
      loggedInUser.type === 'supervisor' || 
      loggedInUser.isSupervisor ||
      (loggedInUser.username && (
        loggedInUser.username.toLowerCase().includes('edinam') || 
        loggedInUser.username.toLowerCase().trim() === 'elhaidinam@gmail.com'
      )) ||
      (loggedInUser.name && loggedInUser.name.toLowerCase().includes('edinam'))
    )
  );

  const isEdinamUser = Boolean(
    loggedInUser && (
      loggedInUser.type === 'owner' || 
      loggedInUser.type === 'supervisor' || 
      loggedInUser.isSupervisor ||
      (loggedInUser.username && (
        loggedInUser.username.toLowerCase().includes('edinam') || 
        loggedInUser.username.toLowerCase().trim() === 'elhaidinam@gmail.com'
      )) ||
      (loggedInUser.name && loggedInUser.name.toLowerCase().includes('edinam')) ||
      ((loggedInUser as any).email && (loggedInUser as any).email.toLowerCase().trim() === 'elhaidinam@gmail.com') ||
      ((loggedInUser as any).userId && (loggedInUser as any).userId.toLowerCase().trim() === 'elhaidinam@gmail.com')
    )
  );

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const stored = localStorage.getItem('pharmintl_logged_in_user');
        setLoggedInUser(stored ? JSON.parse(stored) : null);
      } catch {
        setLoggedInUser(null);
      }
    };

    window.addEventListener('pharmintl_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('pharmintl_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const handlePageChange = (page: ActivePage) => {
    setActivePage(page);
  };

  const handleSpaceChange = (space: 'public' | 'private' | 'planning') => {
    setCurrentSpace(space);
  };

  const DEFAULT_FEATURED_TEXT = "J'informe ceux qui ne m'ont pas encore fait de cadeau à l'occasion de mon anniversaire que je suis encore à l'affiche pour quelques jours. Tous vos dons en nature et en espèce sont bienvenus.";
  const DEFAULT_FEATURED_IMAGE = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

  const [featuredText, setFeaturedText] = useState<string>(() => {
    const stored = localStorage.getItem('pharmintl_featured_text');
    return (stored && stored.trim()) ? stored : DEFAULT_FEATURED_TEXT;
  });

  const [featuredImage, setFeaturedImage] = useState<string>(() => {
    const stored = localStorage.getItem('pharmintl_featured_image');
    return (stored && stored.trim()) ? stored : DEFAULT_FEATURED_IMAGE;
  });

  const [isFeaturedModalOpen, setIsFeaturedModalOpen] = useState<boolean>(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);

  const [employeesList, setEmployeesList] = useState<Employee[]>(() => {
    try {
      const stored = localStorage.getItem('pharmintl_employees');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_EMPLOYEES;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedEmp = localStorage.getItem('pharmintl_employees');
        if (storedEmp) {
          const parsed = JSON.parse(storedEmp);
          if (Array.isArray(parsed) && parsed.length > 0) setEmployeesList(parsed);
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [customerFeedbacks, setCustomerFeedbacks] = useState<CustomerFeedback[]>(() => {
    const stored = localStorage.getItem('pharmintl_customer_feedbacks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return initialCustomerFeedbacks;
  });

  const [googleFormUrl, setGoogleFormUrl] = useState<string>(() => {
    return localStorage.getItem('pharmintl_google_form_url') || DEFAULT_GOOGLE_FORM_URL;
  });

  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>(() => {
    const stored = localStorage.getItem('pharmintl_evaluations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return initialStaffEvaluations;
  });

  const DEFAULT_JOURNAL_ARTICLES: JournalArticle[] = [
    {
      id: 'journal-default-1',
      title: 'Note de Direction - Lancement du Nouveau Portail',
      content: "Bienvenue sur le Portail de Redevabilité de la Pharmacie Internationale. Ce portail centralise l'ensemble de nos règlements, organigrammes, outils de pointage et déclarations financières. Utilisez votre espace privé sécurisé pour soumettre vos demandes de congés et mettre à jour votre biographie.",
      date: '2026-08-15',
      author: 'Direction (Owner)'
    }
  ];

  const [journalArticles, setJournalArticles] = useState<JournalArticle[]>(() => {
    try {
      const stored = localStorage.getItem('pharmintl_journal') || localStorage.getItem('pharmintl_journal_articles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Fallback to defaults
    }
    return DEFAULT_JOURNAL_ARTICLES;
  });

  useEffect(() => {
    // 1. Instant Real-Time Multi-User & Multi-Tab Sync (SSE + BroadcastChannel)
    const unsubRealtime = registerRealtimeSync({
      onEmployees: (employees) => {
        if (Array.isArray(employees) && employees.length > 0) {
          setEmployeesList(employees);
          localStorage.setItem('pharmintl_employees', JSON.stringify(employees));
        }
      },
      onJournal: (articles) => {
        if (Array.isArray(articles) && articles.length > 0) {
          setJournalArticles(prev => {
            const map = new Map<string, JournalArticle>();
            prev.forEach(a => map.set(a.id, a));
            articles.forEach(a => map.set(a.id, a));
            const merged = Array.from(map.values());
            localStorage.setItem('pharmintl_journal', JSON.stringify(merged));
            localStorage.setItem('pharmintl_journal_articles', JSON.stringify(merged));
            return merged;
          });
        }
      },
      onFeatured: (text, image) => {
        if (typeof text === 'string' && text) {
          setFeaturedText(text);
          localStorage.setItem('pharmintl_featured_text', text);
        }
        if (typeof image === 'string' && image) {
          setFeaturedImage(image);
          localStorage.setItem('pharmintl_featured_image', image);
        }
      },
      onCustomerFeedbacks: (feedbacks) => {
        if (Array.isArray(feedbacks)) {
          setCustomerFeedbacks(feedbacks);
          localStorage.setItem('pharmintl_customer_feedbacks', JSON.stringify(feedbacks));
        }
      },
      onGoogleFormUrl: (url) => {
        if (typeof url === 'string' && url) {
          setGoogleFormUrl(url);
          localStorage.setItem('pharmintl_google_form_url', url);
        }
      },
      onEvaluations: (evals) => {
        if (Array.isArray(evals)) {
          setEvaluations(evals);
          localStorage.setItem('pharmintl_evaluations', JSON.stringify(evals));
        }
      }
    });

    // 2. Cloud Firestore Listeners as additional cloud fallback
    const unsubEmployees = subscribeToDoc<Employee[]>(
      'employees',
      'employeesList',
      (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployeesList(prev => {
            const merged = mergeEmployeesWithPreservedLeaves(prev, data);
            localStorage.setItem('pharmintl_employees', JSON.stringify(merged));
            return merged;
          });
        }
      },
      () => {
        try {
          const stored = localStorage.getItem('pharmintl_employees');
          return stored ? JSON.parse(stored) : DEFAULT_EMPLOYEES;
        } catch {
          return DEFAULT_EMPLOYEES;
        }
      }
    );

    // Initial fetch to recover any unsynced employee profiles, leave requests, journal, or featured data
    const recoverUnsyncedData = async () => {
      try {
        // Fetch server employees
        const empRes = await fetch('/api/employees').catch(() => null);
        if (empRes && empRes.ok) {
          const json = await empRes.json();
          if (json && Array.isArray(json.employees) && json.employees.length > 0) {
            setEmployeesList(prev => {
              const merged = mergeEmployeesWithPreservedLeaves(prev, json.employees);
              localStorage.setItem('pharmintl_employees', JSON.stringify(merged));
              return merged;
            });
          }
        }

        // Fetch server featured employee
        const featRes = await fetch('/api/featured').catch(() => null);
        if (featRes && featRes.ok) {
          const fData = await featRes.json();
          const localTs = parseInt(localStorage.getItem('pharmintl_featured_updated_at') || '0', 10);
          if (fData.updatedAt && fData.updatedAt >= localTs) {
            if (typeof fData.featuredText === 'string' && fData.featuredText.trim()) {
              setFeaturedText(fData.featuredText);
              localStorage.setItem('pharmintl_featured_text', fData.featuredText);
            }
            if (typeof fData.featuredImage === 'string' && fData.featuredImage.trim()) {
              setFeaturedImage(fData.featuredImage);
              localStorage.setItem('pharmintl_featured_image', fData.featuredImage);
            }
            localStorage.setItem('pharmintl_featured_updated_at', String(fData.updatedAt));
          }
        }

        // Fetch server leave requests
        const leaveRes = await fetch('/api/leave-requests').catch(() => null);
        if (leaveRes && leaveRes.ok) {
          const json = await leaveRes.json();
          if (json && Array.isArray(json.leaveRequests) && json.leaveRequests.length > 0) {
            // Merge incoming leaves into employeesList
            setEmployeesList(prev => {
              const updated = prev.map(emp => {
                const empId = String(emp.id).toLowerCase();
                const empUsername = String(emp.username || '').toLowerCase();
                const empName = String(emp.name || '').toLowerCase();

                const empLeaves = json.leaveRequests.filter((lr: any) => {
                  const rId = String(lr.employeeId || lr.userId || '').toLowerCase();
                  const rName = String(lr.employeeName || lr.userName || '').toLowerCase();
                  return (rId && (rId === empId || rId === empUsername)) || (rName && rName === empName);
                });

                if (empLeaves.length > 0) {
                  return {
                    ...emp,
                    leaveHistory: mergeLeaveHistories(emp.leaveHistory || [], empLeaves)
                  };
                }
                return emp;
              });
              localStorage.setItem('pharmintl_employees', JSON.stringify(updated));
              return updated;
            });
          }
        }
        // Fetch server journal articles
        const journalRes = await fetch('/api/journal').catch(() => null);
        if (journalRes && journalRes.ok) {
          const jData = await journalRes.json();
          if (jData && Array.isArray(jData.journalArticles) && jData.journalArticles.length > 0) {
            setJournalArticles(prev => {
              const map = new Map<string, JournalArticle>();
              prev.forEach(a => map.set(a.id, a));
              jData.journalArticles.forEach((a: JournalArticle) => map.set(a.id, a));
              const merged = Array.from(map.values());
              localStorage.setItem('pharmintl_journal', JSON.stringify(merged));
              localStorage.setItem('pharmintl_journal_articles', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Initial data recovery non-blocking error:', err);
      }
    };

    recoverUnsyncedData();

    const unsubJournal = subscribeToDoc<JournalArticle[]>(
      'journal',
      'journalArticles',
      (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setJournalArticles(prev => {
            const map = new Map<string, JournalArticle>();
            prev.forEach(a => map.set(a.id, a));
            data.forEach(a => map.set(a.id, a));
            const merged = Array.from(map.values());
            localStorage.setItem('pharmintl_journal', JSON.stringify(merged));
            localStorage.setItem('pharmintl_journal_articles', JSON.stringify(merged));
            return merged;
          });
        }
      },
      () => {
        const local = localStorage.getItem('pharmintl_journal') || localStorage.getItem('pharmintl_journal_articles');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch (e) {
            console.error(e);
          }
        }
        return DEFAULT_JOURNAL_ARTICLES;
      }
    );

    const unsubFeaturedText = subscribeToDoc<string>(
      'featured_text',
      'featuredText',
      (data, updatedAt) => {
        const localTs = parseInt(localStorage.getItem('pharmintl_featured_updated_at') || '0', 10);
        if (updatedAt && updatedAt < localTs) {
          // Local edit by Edinam is newer! Keep it and sync back to cloud
          const currentText = localStorage.getItem('pharmintl_featured_text');
          if (currentText) {
            saveToDoc('featured_text', 'featuredText', currentText, localTs);
          }
          return;
        }
        if (typeof data === 'string' && data.trim()) {
          setFeaturedText(data);
          localStorage.setItem('pharmintl_featured_text', data);
          if (updatedAt) {
            localStorage.setItem('pharmintl_featured_updated_at', String(updatedAt));
          }
        }
      },
      () => localStorage.getItem('pharmintl_featured_text') || DEFAULT_FEATURED_TEXT
    );

    const unsubFeaturedImage = subscribeToDoc<string>(
      'featured_image',
      'featuredImage',
      (data, updatedAt) => {
        const localTs = parseInt(localStorage.getItem('pharmintl_featured_updated_at') || '0', 10);
        if (updatedAt && updatedAt < localTs) {
          // Local edit by Edinam is newer! Keep it and sync back to cloud
          const currentImage = localStorage.getItem('pharmintl_featured_image');
          if (currentImage) {
            saveToDoc('featured_image', 'featuredImage', currentImage, localTs);
          }
          return;
        }
        if (typeof data === 'string' && data.trim()) {
          setFeaturedImage(data);
          localStorage.setItem('pharmintl_featured_image', data);
          if (updatedAt) {
            localStorage.setItem('pharmintl_featured_updated_at', String(updatedAt));
          }
        }
      },
      () => localStorage.getItem('pharmintl_featured_image') || DEFAULT_FEATURED_IMAGE
    );

    const unsubFeedbacks = subscribeToDoc<CustomerFeedback[]>(
      'customer_feedbacks',
      'customerFeedbacks',
      (data) => {
        if (Array.isArray(data)) {
          setCustomerFeedbacks(data);
          localStorage.setItem('pharmintl_customer_feedbacks', JSON.stringify(data));
        }
      },
      () => initialCustomerFeedbacks
    );

    const unsubGoogleFormUrl = subscribeToDoc<string>(
      'google_form_url',
      'googleFormUrl',
      (data) => {
        if (typeof data === 'string' && data) {
          setGoogleFormUrl(data);
          localStorage.setItem('pharmintl_google_form_url', data);
        }
      },
      () => DEFAULT_GOOGLE_FORM_URL
    );

    const unsubEvaluations = subscribeToDoc<StaffEvaluation[]>(
      'evaluations',
      'evaluations',
      (data) => {
        if (Array.isArray(data)) {
          setEvaluations(data);
          localStorage.setItem('pharmintl_evaluations', JSON.stringify(data));
        }
      },
      () => initialStaffEvaluations
    );

    return () => {
      unsubRealtime();
      unsubEmployees();
      unsubJournal();
      unsubFeaturedText();
      unsubFeaturedImage();
      unsubFeedbacks();
      unsubGoogleFormUrl();
      unsubEvaluations();
    };
  }, []);

  const handleUpdateFeatured = (text: string, image: string) => {
    const ts = Date.now();
    localStorage.setItem('pharmintl_featured_updated_at', String(ts));
    if (text && text.trim()) {
      setFeaturedText(text);
      localStorage.setItem('pharmintl_featured_text', text);
    }
    if (image && image.trim()) {
      setFeaturedImage(image);
      localStorage.setItem('pharmintl_featured_image', image);
    }
    // Atomic push to cloud Firestore and Express realtime server
    const currentT = (text && text.trim()) || featuredText;
    const currentI = (image && image.trim()) || featuredImage;
    saveToDoc('featured_text', 'featuredText', currentT, ts);
    saveToDoc('featured_image', 'featuredImage', currentI, ts);
    pushRealtimeUpdate('featured', 'featured', { text: currentT, image: currentI, updatedAt: ts }, ts);
  };

  const handleUpdateFeaturedText = (text: string) => {
    handleUpdateFeatured(text, featuredImage);
  };

  const handleUpdateFeaturedImage = (image: string) => {
    handleUpdateFeatured(featuredText, image);
  };

  const handleUpdateJournal = (updated: JournalArticle[]) => {
    const ts = Date.now();
    setJournalArticles(updated);
    localStorage.setItem('pharmintl_journal', JSON.stringify(updated));
    localStorage.setItem('pharmintl_journal_articles', JSON.stringify(updated));
    localStorage.setItem('pharmintl_journal_updated_at', String(ts));
    saveToDoc('journal', 'journalArticles', updated, ts);
    pushRealtimeUpdate('journal', 'journalArticles', updated, ts);
    fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journalArticles: updated, updatedAt: ts })
    }).catch(() => {});
  };

  const handleDeleteJournalArticle = async (articleId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette publication du Journal Officiel ?")) {
      const updated = journalArticles.filter((a) => a.id !== articleId);
      handleUpdateJournal(updated);
      try {
        await fetch(`/api/journal/${articleId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Error deleting journal article via API:', err);
      }
    }
  };

  const handleUpdateFeedbacks = (updated: CustomerFeedback[]) => {
    setCustomerFeedbacks(updated);
    localStorage.setItem('pharmintl_customer_feedbacks', JSON.stringify(updated));
    saveToDoc('customer_feedbacks', 'customerFeedbacks', updated);
  };

  const handleUpdateGoogleFormUrl = (url: string) => {
    setGoogleFormUrl(url);
    localStorage.setItem('pharmintl_google_form_url', url);
    saveToDoc('google_form_url', 'googleFormUrl', url);
  };

  const handleUpdateEvaluations = (updated: StaffEvaluation[]) => {
    setEvaluations(updated);
    localStorage.setItem('pharmintl_evaluations', JSON.stringify(updated));
    saveToDoc('evaluations', 'evaluations', updated);
    pushRealtimeUpdate('evaluations', 'evaluations', updated);
  };

  const tiles: TileProps[] = [
    {
      type: 'red',
      title: "Employé à l'affiche",
      avatar: featuredImage,
      onClick: () => {
        setIsFeaturedModalOpen(true);
      },
      actionText: isEdinamUser ? "Éditer l'affiche (Fenêtre volante)" : "Consulter / Éditer l'affiche",
      badge: isEdinamUser ? { text: "Direction Edinam", variant: 'active' } : undefined,
      description: featuredText
    },
    {
      type: 'gold',
      title: "Micros Clients",
      avatar: "client.gif",
      onClick: () => {
        handlePageChange('micros_clients');
      },
      actionText: "Voir les retours & Diapo Slido",
      description: "Retours et avis clients collectés via Google Forms et affichés en direct sous forme de diapositive dynamique interactive."
    },
    {
      type: 'red',
      title: "Règlement Intérieur",
      avatar: "https://lh6.googleusercontent.com/proxy/19sIt7MqbjZ2A0eYSEGodRwnKySoVaOWSCWBccbU-lgQyYpAdkpRnMoc5bpUfewDEasnXFDm-pL5kRWNlLRuVRn6jgyhGepYINTRu4-Ja-w8kuEB_6gUtwxM6vkPIIVBbu7mzSd7cQ",
      href: "https://www.dropbox.com/scl/fi/iev2ws0yaxepr2y3xxhni/R-glement-Int-rieur.pdf?rlkey=c64cszhmcet4u6zao185pfhwj&dl=0",
      description: "Il est plus simple de connaître le règlement et s'y conformer que d'en subir le jugement!"
    },
    {
      type: 'green',
      title: "Organigramme",
      avatar: "https://www.slideegg.com/image/catalog/slideegg-75029-best-organization-chart-template.png",
      href: "https://www.dropbox.com/scl/fi/77zrryu8c58ke32wql2c1/PHINTLORG.ppsx?rlkey=lav6ekqz3mstfxwdopyo1pv4f&dl=0",
      description: "Consulter l'organisation fonctionnelle pour savoir se positionner et être au contrôle de ses tâches. Consulter les procédures pour être précis dans la réalisation des tâches."
    },
    {
      type: 'green',
      title: "Pointage",
      avatar: "https://www.accu-time.com/wp-content/uploads/2024/10/ezgif.com-animated-gif-maker.gif",
      onClick: () => {
        setIsAttendanceModalOpen(true);
      },
      actionText: loggedInUser ? "Pointer maintenant (Arrivée / Départ)" : "Se connecter pour pointer",
      badge: loggedInUser 
        ? { text: `Connecté : ${loggedInUser.name}`, variant: 'active' }
        : { text: "Connexion requise", variant: 'lock' },
      description: "Toute personne travaillant à la pharmacie doit pointer à l'arrivée et au départ. Le formulaire détecte automatiquement votre identité, date, heure et localisation GPS."
    },
    ...(loggedInUser ? [
      {
        type: 'gold' as const,
        title: "Redditions",
        avatar: "https://png.pngtree.com/png-clipart/20240814/original/pngtree-gold-coins-rain-png-image_15769382.png",
        href: isPfQualite ? "https://docs.google.com/forms/d/e/1FAIpQLSew-cj-PrJXh_yhNj1jZf_4jEBI-4Y1p5M5t_tOOzZ_NO-NDA/viewform?usp=sharing&ouid=103023564871234901533" : undefined,
        onClick: !isPfQualite ? () => setPfQualiteModalInfo({ isOpen: true, tileTitle: "Redditions" }) : undefined,
        actionText: isPfQualite ? "Accéder au formulaire (PF qualité)" : "Accès réservé au PF qualité",
        badge: isPfQualite
          ? { text: "PF Qualité Actif", variant: 'active' as const }
          : { text: "🔒 Réservé PF qualité", variant: 'lock' as const },
        description: "Au PFQ d'enregistrer toutes les redditions (sans le fond de caisse) conformément à ce qui est affiché dans Pharmasoft."
      },
      {
        type: 'gold' as const,
        title: "Versements",
        avatar: "https://i.pinimg.com/originals/a7/b6/7d/a7b67d486eccb0f7c6e4503b92c70fc6.gif",
        href: isPfQualite ? "https://docs.google.com/forms/d/e/1FAIpQLSfaBsU7BAsd9VbNXyoB3xG4P316dTYj8Vmd2hYlq-T08-b8UQ/viewform?usp=sharing&ouid=103023564871234901533" : undefined,
        onClick: !isPfQualite ? () => setPfQualiteModalInfo({ isOpen: true, tileTitle: "Versements" }) : undefined,
        actionText: isPfQualite ? "Accéder au formulaire (PF qualité)" : "Accès réservé au PF qualité",
        badge: isPfQualite
          ? { text: "PF Qualité Actif", variant: 'active' as const }
          : { text: "🔒 Réservé PF qualité", variant: 'lock' as const },
        description: "Au PFQ d'enregistrer tous les versements en banque effectués par les caissiers, conformément à ce qui est affiché sur les bordereaux de versement."
      },
      {
        type: 'blue' as const,
        title: "Factures",
        avatar: "https://media.tenor.com/5KzghxNeCFYAAAAM/past-due-final-notice.gif",
        href: isPfQualite ? "https://docs.google.com/forms/d/e/1FAIpQLSfL7oTByk4XuMxDkdJKo5mqyHC51bw3QBsyWTpGk-Cd2VM8VQ/viewform?usp=sharing&ouid=103023564871234901533" : undefined,
        onClick: !isPfQualite ? () => setPfQualiteModalInfo({ isOpen: true, tileTitle: "Factures" }) : undefined,
        actionText: isPfQualite ? "Accéder au formulaire (PF qualité)" : "Accès réservé au PF qualité",
        badge: isPfQualite
          ? { text: "PF Qualité Actif", variant: 'active' as const }
          : { text: "🔒 Réservé PF qualité", variant: 'lock' as const },
        description: "Au PFQ d'enregistrer toutes les factures devant être payées par la pharmacie dès leur arrivée."
      },
      {
        type: 'blue' as const,
        title: "Règlements",
        avatar: "https://www.citizensbank.com/assets/CB_resources/images/content_2_0/Date.gif",
        href: isPfQualite ? "https://docs.google.com/forms/d/e/1FAIpQLSe6b-3Oy9AjPJmhq8P2o8J6oks45sMRHbCUUe5YPhm9hiyVHQ/viewform?usp=sharing&ouid=103023564871234901533" : undefined,
        onClick: !isPfQualite ? () => setPfQualiteModalInfo({ isOpen: true, tileTitle: "Règlements" }) : undefined,
        actionText: isPfQualite ? "Accéder au formulaire (PF qualité)" : "Accès réservé au PF qualité",
        badge: isPfQualite
          ? { text: "PF Qualité Actif", variant: 'active' as const }
          : { text: "🔒 Réservé PF qualité", variant: 'lock' as const },
        description: "Au PFQ d'enregistrer tous les règlements effectués par la pharmacie dès leur émission."
      }
    ] : [])
  ];

  if (isClientFeedbackMode) {
    return (
      <ClientFeedbackPortal
        onAddFeedback={(fb) => {
          handleUpdateFeedbacks([fb, ...customerFeedbacks]);
        }}
        onClose={() => {
          setIsClientFeedbackMode(false);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('feedback');
            url.searchParams.delete('page');
            window.history.replaceState({}, '', url.pathname);
          }
        }}
        isStandalone={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5EE] selection:bg-green-200">
      <header className="sticky top-0 z-50 bg-[#FCFBF7] border-b border-[#E8E4D8] shadow-xs px-4 md:px-8 py-3 space-y-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-white shadow-xs border border-[#E8E4D8] overflow-hidden p-1 shrink-0">
              <img 
                src="Pharmintl.png" 
                alt="Pharmacie Internationale Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = "w-10 h-10 bg-[#22c55e] rounded-xl flex items-center justify-center text-white shadow-lg";
                    const fallbackIcon = document.createElement('span');
                    fallbackIcon.innerText = "💊";
                    fallbackIcon.className = "text-xl";
                    parent.appendChild(fallbackIcon);
                  }
                }}
              />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#22c55e] uppercase tracking-tighter">
              Pharmacie Internationale
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <h2 className="text-base md:text-lg font-bold text-[#E17522] leading-tight">
                Portail de Redevabilité
              </h2>
            </div>
            <button
              type="button"
              disabled={!isSupervisor}
              onClick={() => {
                if (!isSupervisor) return;
                const backupData = {
                  employees: localStorage.getItem('pharmintl_employees') ? JSON.parse(localStorage.getItem('pharmintl_employees') || '[]') : [],
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
              }}
              className={`font-black text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider shrink-0 border ${
                isSupervisor
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 border-emerald-500'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-75'
              }`}
              title={
                isSupervisor
                  ? "Télécharger l'intégralité de la base de données (Backup .JSON)"
                  : "Téléchargement de la base réservé aux superviseurs"
              }
            >
              <Download className="w-4 h-4" />
              <span>Télécharger la Base</span>
              {!isSupervisor && (
                <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold lowercase">
                  superviseurs
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Floating navbar portal attached directly to the header band */}
        <div id="top-nav-bar-portal" className="w-full pt-1" />
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* Page 1: Home / Quick Access Tiles */}
        {activePage === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {tiles.map((tile, index) => (
                <Tile 
                  key={index} 
                  href={tile.href}
                  onClick={tile.onClick}
                  title={tile.title}
                  description={tile.description}
                  avatar={tile.avatar}
                  type={tile.type}
                  actionText={tile.actionText}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Page 2: Official Journal Directives */}
        {activePage === 'journal' && (
          <motion.div
            id="journal-officiel-section"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FCFBF7] p-6 md:p-8 rounded-3xl border border-indigo-400/50 shadow-sm space-y-6"
          >
            <div className="border-b border-[#EBE6DA] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  Journal Officiel de la Pharmacie Internationale
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Retrouvez ici l'ensemble des communiqués de service officiels de la Direction Générale.
                </p>
              </div>

              <button
                type="button"
                disabled={!loggedInUser}
                onClick={() => {
                  if (loggedInUser) {
                    setIsJournalModalOpen(true);
                  }
                }}
                className={`self-start md:self-auto text-xs font-extrabold px-4 py-2.5 rounded-xl border transition-colors flex items-center gap-2 shadow-xs ${
                  loggedInUser
                    ? 'bg-[#FAF8F2] hover:bg-[#F3EFE6] text-indigo-800 border-indigo-300 cursor-pointer active:scale-95'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-75'
                }`}
                title={loggedInUser ? "Mettre en ligne une note ou une directive au Journal Officiel" : "Publication réservée aux utilisateurs connectés"}
              >
                <span>📝</span>
                <span>Publier une Note</span>
                {!loggedInUser && <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">🔒 Connexion requise</span>}
              </button>
            </div>

            {journalArticles.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400 italic bg-[#FAF8F2] rounded-2xl border border-dashed border-[#DDD7C7]">
                Aucun communiqué officiel n'est publié actuellement au Journal Officiel.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {journalArticles.map((art) => (
                  <div key={art.id} className="p-6 rounded-2xl border border-indigo-200/80 bg-[#FAF8F2] hover:bg-[#F6F3EB] hover:border-indigo-400 transition-all space-y-3 shadow-xs relative group">
                    <div className="flex items-center justify-between gap-4 text-[10px] text-gray-400 font-mono font-bold">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>📅 {art.date}</span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                          👤 {art.author}
                        </span>
                      </div>
                      
                      {/* Delete button available for Edinam / Supervisor */}
                      {isEdinamUser && (
                        <button
                          type="button"
                          onClick={() => handleDeleteJournalArticle(art.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all text-xs font-black flex items-center gap-1 cursor-pointer border border-transparent hover:border-red-200"
                          title="Supprimer cette publication du Journal Officiel"
                        >
                          <span>🗑️</span>
                          <span>Supprimer</span>
                        </button>
                      )}
                    </div>
                    <h4 className="text-base font-black text-gray-900 leading-snug">
                      {art.title}
                    </h4>
                    <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">
                      {art.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Dynamic Leave & Work Schedule Management Module */}
        <LeaveScheduler 
          currentSpace={currentSpace} 
          onSpaceChange={handleSpaceChange} 
          activePage={activePage}
          onPageChange={handlePageChange}
          journalArticles={journalArticles}
          onUpdateJournal={handleUpdateJournal}
          setJournalArticles={setJournalArticles}
          featuredText={featuredText}
          onUpdateFeaturedText={handleUpdateFeaturedText}
          setFeaturedText={setFeaturedText}
          featuredImage={featuredImage}
          onUpdateFeaturedImage={handleUpdateFeaturedImage}
          setFeaturedImage={setFeaturedImage}
          onOpenGpsModal={() => setIsGpsModalOpen(true)}
          customerFeedbacks={customerFeedbacks}
          onUpdateFeedbacks={handleUpdateFeedbacks}
          googleFormUrl={googleFormUrl}
          onUpdateGoogleFormUrl={handleUpdateGoogleFormUrl}
          evaluations={evaluations}
          onUpdateEvaluations={handleUpdateEvaluations}
        />
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Pharmacie Internationale - Système de Gestion Intégré</p>
      </footer>

      {/* GPS & Connection Details Extraction Modal */}
      <GpsExtractionModal 
        isOpen={isGpsModalOpen} 
        onClose={() => setIsGpsModalOpen(false)} 
      />

      {/* Pointage Automatisé Modal (Google Form style avec identité, date, heure, GPS & 2 boutons) */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        loggedInUser={loggedInUser}
        employees={employeesList}
        onOpenLoginModal={() => {
          handlePageChange('workforce');
          handleSpaceChange('private');
          setTimeout(() => {
            document.getElementById('private-space-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }}
      />

      {/* Featured Employee Flying Modal (Édition par Edinam / Direction) */}
      <FeaturedEmployeeModal
        isOpen={isFeaturedModalOpen}
        onClose={() => setIsFeaturedModalOpen(false)}
        currentText={featuredText}
        currentImage={featuredImage}
        onSave={(text, image) => {
          handleUpdateFeatured(text, image);
        }}
        loggedInUser={loggedInUser}
        employees={employeesList}
        onOpenLogin={() => {
          handlePageChange('workforce');
          handleSpaceChange('private');
          setTimeout(() => {
            document.getElementById('private-space-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }}
      />

      {/* Journal Officiel Publication Modal (Édition par Edinam / Direction) */}
      <JournalPublishModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        journalArticles={journalArticles}
        onSaveArticles={handleUpdateJournal}
        loggedInUser={loggedInUser}
      />

      {/* PF Qualité Access Restriction Modal */}
      <PfQualiteAccessModal
        isOpen={!!pfQualiteModalInfo?.isOpen}
        onClose={() => setPfQualiteModalInfo(null)}
        tileTitle={pfQualiteModalInfo?.tileTitle || ''}
        loggedInUser={loggedInUser}
        onOpenLogin={() => {
          handlePageChange('workforce');
          handleSpaceChange('private');
          setTimeout(() => {
            document.getElementById('private-space-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }}
      />
    </div>
  );
}
