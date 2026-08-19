import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Mic, 
  Send, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize, 
  Minimize, 
  Copy, 
  Check, 
  ExternalLink, 
  ThumbsUp, 
  Heart, 
  Sparkles, 
  Share2, 
  QrCode, 
  Plus, 
  Edit3, 
  Star, 
  MessageSquare, 
  Sliders, 
  RefreshCw,
  Search,
  Tag,
  Grid,
  Tv,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  Smartphone,
  Globe,
  HelpCircle,
  Eye
} from 'lucide-react';
import { CustomerFeedback } from '../types';
import { DEFAULT_GOOGLE_FORM_URL } from '../data';
import ClientFeedbackPortal from './ClientFeedbackPortal';

interface CustomerMicrophonesProps {
  feedbacks: CustomerFeedback[];
  onUpdateFeedbacks: (updated: CustomerFeedback[]) => void;
  googleFormUrl?: string;
  onUpdateGoogleFormUrl?: (url: string) => void;
  isSupervisorOrOwner?: boolean;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type SortOrderType = 'newest' | 'oldest' | 'popular';
type ViewModeType = 'slide' | 'grid';

export default function CustomerMicrophones({
  feedbacks,
  onUpdateFeedbacks,
  googleFormUrl = DEFAULT_GOOGLE_FORM_URL,
  onUpdateGoogleFormUrl,
  isSupervisorOrOwner = false,
}: CustomerMicrophonesProps) {
  // Navigation & View Modes
  const [viewMode, setViewMode] = useState<ViewModeType>('grid');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoPlayDuration, setAutoPlayDuration] = useState<number>(7); // seconds
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const qrSvgRef = useRef<SVGSVGElement>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('newest');

  // Modals & UI States
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showDirectSubmitModal, setShowDirectSubmitModal] = useState<boolean>(false);
  const [showConfigUrlModal, setShowConfigUrlModal] = useState<boolean>(false);
  const [showTestFormModal, setShowTestFormModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [tempGoogleFormUrl, setTempGoogleFormUrl] = useState<string>(googleFormUrl);
  const [urlMode, setUrlMode] = useState<'builtin' | 'external'>('builtin');

  // Direct submit form state
  const [newContent, setNewContent] = useState<string>('');
  const [newAuthor, setNewAuthor] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Accueil & Conseils');
  const [newRating, setNewRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Determine the effective operational URL
  const effectiveUrl = useMemo(() => {
    // Check if custom external url is set and not the broken default dummy
    if (
      googleFormUrl && 
      googleFormUrl.trim() !== '' && 
      !googleFormUrl.includes('1FAIpQLSeQ4gWb9_V_MICRO_CLIENTS_PHARMACIE_INTL')
    ) {
      return googleFormUrl.trim();
    }
    
    // Default to the built-in portal
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      return `${origin}${pathname}?feedback=client`;
    }
    return 'https://pharmacie-internationale.com?feedback=client';
  }, [googleFormUrl]);

  const isUsingBuiltinPortal = useMemo(() => {
    return effectiveUrl.includes('feedback=client') || effectiveUrl.includes('?feedback=');
  }, [effectiveUrl]);

  // Sync temp URL if prop changes
  useEffect(() => {
    setTempGoogleFormUrl(
      googleFormUrl.includes('1FAIpQLSeQ4gWb9_V_MICRO_CLIENTS_PHARMACIE_INTL') ? '' : googleFormUrl
    );
    setUrlMode(
      googleFormUrl.includes('1FAIpQLSeQ4gWb9_V_MICRO_CLIENTS_PHARMACIE_INTL') || !googleFormUrl ? 'builtin' : 'external'
    );
  }, [googleFormUrl]);

  // Categories extraction
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    feedbacks.forEach(f => {
      if (f.category) cats.add(f.category);
    });
    return ['all', ...Array.from(cats)];
  }, [feedbacks]);

  // Helper date matching
  const isDateMatching = (submittedAtIso: string): boolean => {
    if (!submittedAtIso) return true;
    const subDate = new Date(submittedAtIso);
    if (isNaN(subDate.getTime())) return true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    if (dateFilter === 'today') {
      return subDate >= todayStart;
    } else if (dateFilter === 'yesterday') {
      return subDate >= yesterdayStart && subDate < yesterdayEnd;
    } else if (dateFilter === 'week') {
      return subDate >= weekStart;
    } else if (dateFilter === 'month') {
      return subDate >= monthStart;
    } else if (dateFilter === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (subDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (subDate > end) return false;
      }
      return true;
    }
    return true;
  };

  // Filtered & Sorted Feedbacks
  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks.filter((item) => {
      // Date filter
      if (!isDateMatching(item.submittedAt)) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contentMatch = item.content?.toLowerCase().includes(q);
        const authorMatch = item.author?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        if (!contentMatch && !authorMatch && !catMatch) return false;
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortOrder === 'popular') {
        return (b.likes || 0) - (a.likes || 0);
      }
      const timeA = new Date(a.submittedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || 0).getTime();
      if (sortOrder === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA; // default newest
    });

    return result;
  }, [feedbacks, dateFilter, customStartDate, customEndDate, selectedCategory, searchQuery, sortOrder]);

  // Handle slide index bounds
  useEffect(() => {
    if (currentSlideIndex >= filteredFeedbacks.length) {
      setCurrentSlideIndex(Math.max(0, filteredFeedbacks.length - 1));
    }
  }, [filteredFeedbacks.length, currentSlideIndex]);

  // Slido Autoplay Carousel timer
  useEffect(() => {
    if (!isPlaying || filteredFeedbacks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % filteredFeedbacks.length);
    }, autoPlayDuration * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, autoPlayDuration, filteredFeedbacks.length]);

  // Keyboard navigation for Slido presentation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'slide' || filteredFeedbacks.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => (prev + 1) % filteredFeedbacks.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => (prev - 1 + filteredFeedbacks.length) % filteredFeedbacks.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, filteredFeedbacks.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (slideContainerRef.current?.requestFullscreen) {
        slideContainerRef.current.requestFullscreen().catch(err => console.warn(err));
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(effectiveUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = effectiveUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenFormLink = () => {
    if (isUsingBuiltinPortal) {
      setShowTestFormModal(true);
    } else {
      window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadQrPng = () => {
    const svg = document.getElementById('pharmintl-qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = 'QR_Code_Pharmacie_Internationale_Micros_Clients.png';
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintFlyer = () => {
    window.print();
  };

  const handleToggleLike = (feedbackId: string) => {
    const updated = feedbacks.map((item) => {
      if (item.id === feedbackId) {
        return { ...item, likes: (item.likes || 0) + 1 };
      }
      return item;
    });
    onUpdateFeedbacks(updated);
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    const newEntry: CustomerFeedback = {
      id: `fb-${Date.now()}`,
      content: newContent.trim(),
      author: newAuthor.trim() || 'Client Anonyme',
      category: newCategory || 'Général',
      rating: newRating,
      likes: 0,
      isPinned: false,
      submittedAt: new Date().toISOString(),
      formSource: 'comptoir_direct'
    };

    const updated = [newEntry, ...feedbacks];
    onUpdateFeedbacks(updated);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setNewContent('');
      setNewAuthor('');
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowDirectSubmitModal(false);
        setCurrentSlideIndex(0);
      }, 1200);
    }, 400);
  };

  const handleSaveGoogleFormUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlMode === 'builtin') {
      if (onUpdateGoogleFormUrl) {
        onUpdateGoogleFormUrl('');
      }
      setShowConfigUrlModal(false);
    } else if (tempGoogleFormUrl.trim()) {
      if (onUpdateGoogleFormUrl) {
        onUpdateGoogleFormUrl(tempGoogleFormUrl.trim());
      }
      setShowConfigUrlModal(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const currentSlide = filteredFeedbacks[currentSlideIndex] || null;

  return (
    <div className="space-y-8">
      {/* =========================================================================
          1. TOP CONTROLS & TOOLBAR: FILTERS, SEARCH & VIEW SWITCHER
          ========================================================================= */}
      <div className="bg-[#FCFBF7] p-5 md:p-6 rounded-3xl border border-amber-400/50 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Submission Date Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mr-1">
            <Calendar size={14} className="text-amber-600" />
            <span>Période :</span>
          </span>

          {[
            { id: 'all', label: 'Toutes' },
            { id: 'today', label: "Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: '7 jours' },
            { id: 'month', label: '30 jours' },
            { id: 'custom', label: 'Personnalisée...' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setDateFilter(f.id as DateFilterType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                dateFilter === f.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-xl border border-amber-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-amber-300 text-xs rounded-lg px-2 py-1 text-gray-800 font-bold"
                title="Date de début"
              />
              <span className="text-xs text-amber-700 font-bold">au</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-amber-300 text-xs rounded-lg px-2 py-1 text-gray-800 font-bold"
                title="Date de fin"
              />
            </div>
          )}
        </div>

        {/* Right: Search, Sort and View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher mot-clé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-40 sm:w-48"
            />
          </div>

          {/* Sort order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrderType)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="newest">🕒 Plus récents d'abord</option>
            <option value="oldest">⏳ Plus anciens d'abord</option>
            <option value="popular">❤️ Plus populaires (Likes)</option>
          </select>

          {/* View Mode Toggle Button */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid size={14} />
              <span>Mur ({filteredFeedbacks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'slide'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Tv size={14} />
              <span>Diapo Slido</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. LE MUR D'AFFICHAGE ET DIAPOSITIVE SLIDO (EN HAUT)
          ========================================================================= */}
      {viewMode === 'grid' ? (
        <div className="space-y-6">
          {/* Wall Header with Theme Filters and Live Status */}
          <div className="bg-[#FCFBF7] p-5 md:p-6 rounded-3xl border border-amber-400/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF8F2] border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs shrink-0">
                <Grid size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                    Mur d'Affichage Interactif
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                    {filteredFeedbacks.length} avis affichés
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  Mur des Retours & Suggestions Clients
                </h3>
              </div>
            </div>

            {/* Quick Themes Filter Tags right on top of the Wall */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mr-1">
                <Tag size={13} /> Thèmes :
              </span>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-[#FAF8F2] hover:bg-[#F4F0E4] text-gray-700 border border-amber-300/60'
                  }`}
                >
                  {cat === 'all' ? '✨ Tous' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Wall Grid: Displaying Multiple Reviews simultaneously */}
          {filteredFeedbacks.length === 0 ? (
            <div className="bg-[#FCFBF7] p-12 rounded-3xl border border-dashed border-amber-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-xl border border-amber-200">
                🎙️
              </div>
              <p className="text-sm font-bold text-gray-800">Aucun retour ne correspond à vos critères de recherche.</p>
              <p className="text-xs text-gray-500">Modifiez vos filtres de dates ou de thèmes ci-dessus.</p>
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeedbacks.map((fb) => (
                <motion.div
                  key={fb.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FCFBF7] p-6 rounded-3xl border border-amber-400/40 shadow-2xs hover:shadow-md hover:border-amber-500 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="bg-amber-50 text-amber-800 font-black text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider border border-amber-100">
                        🏷️ {fb.category || 'Général'}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono font-medium flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        {formatDate(fb.submittedAt)}
                      </span>
                    </div>

                    {/* Star Rating if available */}
                    {fb.rating && (
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={13} 
                            className={i < (fb.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Quote Content */}
                    <div className="relative pt-1">
                      <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                        « {fb.content} »
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {fb.author ? fb.author.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-800 block truncate max-w-[130px]">
                          {fb.author || 'Client Anonyme'}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-medium">
                          Source : {fb.formSource === 'comptoir_direct' ? 'Saisie Comptoir' : 'QR Code Client'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleLike(fb.id)}
                      className="flex items-center gap-1.5 text-xs font-black text-gray-600 hover:text-amber-700 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                      title="Voter / Apprécier ce retour"
                    >
                      <ThumbsUp size={13} className="text-amber-500" />
                      <span className="font-mono">{fb.likes || 0}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Presentation Slide Mode when toggled */
        <div 
          ref={slideContainerRef}
          className={`relative rounded-3xl transition-all duration-300 ${
            isFullscreen 
              ? 'bg-[#0f172a] text-white p-8 md:p-16 min-h-screen flex flex-col justify-between' 
              : 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 md:p-12 shadow-xl border border-slate-700'
          }`}
        >
          {filteredFeedbacks.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-3xl">
                🎙️
              </div>
              <h4 className="text-xl font-bold text-slate-200">Aucune entrée trouvée pour ce filtre</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Modifiez les filtres de date ou scannez le QR code au comptoir pour enregistrer un nouvel avis.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-8 flex-1 flex flex-col justify-between">
              {/* Slido Header Toolbar */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Slido Live Presentation • Pharmacie Internationale
                    </span>
                    <p className="text-xs text-slate-300 font-medium">
                      Question : « Exprimez-vous librement sur nos services, notre accueil et vos besoins »
                    </p>
                  </div>
                </div>

                {/* Presentation Controls */}
                <div className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700">
                  <span className="text-xs font-mono font-bold text-amber-400 mr-2">
                    {currentSlideIndex + 1} / {filteredFeedbacks.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + filteredFeedbacks.length) % filteredFeedbacks.length)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Diapo précédente (Flèche gauche)"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isPlaying ? 'bg-amber-500 text-white' : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title={isPlaying ? "Mettre en pause le carrousel (Espace)" : "Lancer le défilement automatique (Espace)"}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % filteredFeedbacks.length)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Diapo suivante (Flèche droite)"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <div className="h-4 w-px bg-slate-700 mx-1" />

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Plein écran (F)"
                  >
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
              </div>

              {/* Slido Main Slide Display */}
              <div className="my-auto py-6 md:py-10">
                <AnimatePresence mode="wait">
                  {currentSlide && (
                    <motion.div
                      key={currentSlide.id}
                      initial={{ opacity: 0, scale: 0.96, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -15 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="max-w-4xl mx-auto space-y-6"
                    >
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                            🏷️ {currentSlide.category || 'Avis Client'}
                          </span>
                          {currentSlide.rating && (
                            <div className="flex items-center gap-0.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 text-amber-400 text-xs">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={12} 
                                  className={i < (currentSlide.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} 
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <Clock size={13} className="text-amber-400" />
                          <span>Soumis le {formatDate(currentSlide.submittedAt)}</span>
                        </div>
                      </div>

                      {/* Giant Quote Text (Slido Presentation Typography) */}
                      <div className="relative bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 rounded-3xl border border-slate-700/80 shadow-2xl">
                        <span className="absolute -top-5 left-8 text-6xl md:text-7xl text-amber-500/30 select-none font-serif leading-none">
                          “
                        </span>

                        <p className="text-xl md:text-3xl lg:text-4xl font-extrabold text-white leading-relaxed tracking-tight font-sans whitespace-pre-wrap">
                          {currentSlide.content}
                        </p>

                        <span className="absolute -bottom-10 right-8 text-6xl md:text-7xl text-amber-500/30 select-none font-serif leading-none">
                          ”
                        </span>
                      </div>

                      {/* Footer Info: Author & Upvote */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                            {currentSlide.author ? currentSlide.author.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-base text-slate-100">
                              {currentSlide.author || 'Client Anonyme'}
                            </h5>
                            <span className="text-[11px] text-slate-400">
                              Source : Pharmacie Internationale
                            </span>
                          </div>
                        </div>

                        {/* Interactive Slido Upvote / Like Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(currentSlide.id)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500 text-slate-200 hover:text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95 group"
                          title="Voter pour ce retour client (Slido Like)"
                        >
                          <ThumbsUp size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                          <span>Apprécier cette suggestion</span>
                          <span className="bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-mono text-xs">
                            {currentSlide.likes || 0}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Slido Carousel Progress Bar and Thumbnails */}
              <div className="space-y-3 pt-4 border-t border-slate-700/60">
                {isPlaying && (
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <motion.div
                      key={currentSlideIndex}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: autoPlayDuration, ease: 'linear' }}
                      className="bg-amber-400 h-full"
                    />
                  </div>
                )}

                {/* Slide indicator dots */}
                <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
                  {filteredFeedbacks.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentSlideIndex 
                          ? 'w-8 bg-amber-400' 
                          : 'w-2 bg-slate-700 hover:bg-slate-500'
                      }`}
                      title={`Aller à la diapositive ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          3. DISPOSITIF DE COLLECTE D'AVIS DES PATIENTS (EN BAS) - VISIBLE AUX SUPERVISEURS UNIQUEMENT
          ========================================================================= */}
      {isSupervisorOrOwner && (
        <div className="bg-gradient-to-br from-[#FCFBF7] via-[#FAF7EE] to-[#F5EFE1] p-6 md:p-8 rounded-3xl border-2 border-amber-400/60 shadow-md">
          <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
            
            {/* Left: Explanations & URL status */}
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                  <Mic size={13} className="animate-pulse" />
                  Dispositif de Collecte des Retours Clients
                </span>
                <span className="bg-emerald-100 text-emerald-900 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  QR Code & Formulaire Opérationnels
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                  Dispositif de Collecte d'Avis des Patients
                </h2>
                <p className="text-xs sm:text-sm text-gray-700 mt-2 font-medium leading-relaxed">
                  Les patients scannent le QR Code depuis leur smartphone pour exprimer leurs suggestions et évaluer l'accueil. Les retours s'affichent automatiquement en temps réel sur le <strong>Mur Interactif</strong> ci-dessus.
                </p>
              </div>

              {/* Active Link Box with Copy & Test */}
              <div className="bg-white/95 p-3.5 rounded-2xl border border-amber-300 shadow-inner space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-gray-800 flex items-center gap-1.5">
                    <Globe size={14} className="text-amber-600" />
                    <span>URL active du formulaire :</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                    {isUsingBuiltinPortal ? 'Portail Intégré Officine (Recommandé)' : 'Formulaire Externe'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveUrl}
                    className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                    title="Copier le lien direct pour le partager"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleOpenFormLink}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Tester le formulaire client dans l'application"
                >
                  <Eye size={15} />
                  <span>Tester le Formulaire Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Agrandir et imprimer le QR Code"
                >
                  <QrCode size={15} className="text-amber-700" />
                  <span>Agrandir / Imprimer Flyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectSubmitModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Ajouter manuellement une remarque reçue au comptoir"
                >
                  <Plus size={15} className="text-emerald-700" />
                  <span>Saisie Manuelle Comptoir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfigUrlModal(true)}
                  className="px-3.5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Modifier l'URL ou passer en Google Form personnalisé"
                >
                  <Sliders size={14} className="text-indigo-600" />
                  <span>Paramétrer l'URL</span>
                </button>
              </div>
            </div>

            {/* Right: Live Crisp QR Code Box */}
            <div className="bg-white p-6 rounded-3xl border-2 border-amber-300 shadow-xl flex flex-col items-center text-center space-y-3 shrink-0">
              <span className="text-[11px] font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-wider">
                📱 Scannez au Comptoir
              </span>

              <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-inner inline-block">
                <QRCodeSVG
                  id="pharmintl-qr-svg"
                  value={effectiveUrl}
                  size={180}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <p className="text-[11px] text-gray-500 font-semibold max-w-[190px]">
                Pointez la caméra de votre smartphone vers ce code
              </p>

              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Télécharger l'image PNG du QR code"
                >
                  <Download size={13} />
                  <span>Télécharger</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                  title="Imprimer le flyer comptoir"
                >
                  <Printer size={13} />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: QR CODE MODAL, DIRECT SUBMIT, CONFIG URL, TEST FORM
          ========================================================================= */}

      {/* 1. Large QR Code & Printable Counter Flyer Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 text-center"
          >
            <div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">
                📱 Support Comptoir & Caisse
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">
                Scannez pour donner votre avis
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Affichez ou imprimez ce QR code pour vos comptoirs de vente.
              </p>
            </div>

            {/* Crisp QR Code Container */}
            <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-3xl border-2 border-amber-300 inline-block mx-auto shadow-inner">
              <QRCodeSVG
                value={effectiveUrl}
                size={220}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="space-y-1 bg-gray-50 p-3 rounded-2xl border border-gray-200 text-left">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Lien cible du QR code :
              </p>
              <p className="text-xs font-mono text-gray-800 break-all select-all font-semibold">
                {effectiveUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={15} />
                <span>Image PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrintFlyer}
                className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
              >
                <Printer size={15} />
                <span>Imprimer</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Direct Saisie Avis Client Modal (Staff Manual Entry) */}
      {showDirectSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6"
          >
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <MessageSquare className="text-amber-500" />
                  Saisie d'un Avis Client (« Micro Client »)
                </h4>
                <p className="text-xs text-gray-500">
                  Enregistrez une suggestion ou remarque transmise au comptoir.
                </p>
              </div>
              <button
                onClick={() => setShowDirectSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
                <h5 className="text-base font-black text-gray-800">Avis enregistré avec succès !</h5>
                <p className="text-xs text-gray-500">Il est maintenant visible sur le mur et la diapo Slido.</p>
              </div>
            ) : (
              <form onSubmit={handleDirectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Texte de l'avis / Remarque (Multiligne) *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Ex: Personnel très accueillant, temps d'attente très court ce matin..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nom / Patient (optionnel)
                    </label>
                    <input
                      type="text"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      placeholder="Ex: M. Diallo ou Anonyme"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Thème / Catégorie
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="Accueil & Conseils">Accueil & Conseils</option>
                      <option value="Caisse & Rapidité">Caisse & Rapidité</option>
                      <option value="Disponibilité Produits">Disponibilité Produits</option>
                      <option value="Service de Garde">Service de Garde</option>
                      <option value="Préparations & Ordonnances">Préparations & Ordonnances</option>
                      <option value="Suggestions & Confort">Suggestions & Confort</option>
                      <option value="Général">Général</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Note globale attribuée : {newRating} / 5 étoiles
                  </label>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewRating(s)}
                        className="p-1 cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Star size={22} className={s <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowDirectSubmitModal(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !newContent.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? 'Enregistrement...' : 'Publier sur le Mur'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* 3. Config Form URL Modal */}
      {showConfigUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6"
          >
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Sliders className="text-indigo-600" />
                  Configuration de l'URL du Formulaire
                </h4>
                <p className="text-xs text-gray-500">
                  Choisissez entre le portail intégré officiel ou votre propre Google Form.
                </p>
              </div>
              <button
                onClick={() => setShowConfigUrlModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoogleFormUrl} className="space-y-4">
              {/* Radio selection */}
              <div className="space-y-3">
                <label 
                  onClick={() => setUrlMode('builtin')}
                  className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    urlMode === 'builtin'
                      ? 'border-amber-500 bg-amber-50/60'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="url_mode"
                    checked={urlMode === 'builtin'}
                    onChange={() => setUrlMode('builtin')}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <h5 className="text-xs font-black text-gray-900">
                      ✨ Portail Intégré Pharmacie Internationale (Recommandé)
                    </h5>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      Toujours 100% actif et synchronisé en direct. Aucune configuration nécessaire, fonctionne instantanément sur tous les smartphones.
                    </p>
                  </div>
                </label>

                <label 
                  onClick={() => setUrlMode('external')}
                  className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    urlMode === 'external'
                      ? 'border-indigo-500 bg-indigo-50/60'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="url_mode"
                    checked={urlMode === 'external'}
                    onChange={() => setUrlMode('external')}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <h5 className="text-xs font-black text-gray-900">
                      🌐 Google Form / Sondage Externe Personnalisé
                    </h5>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      Saisissez l'URL d'un formulaire Google Form réel que vous avez créé.
                    </p>
                  </div>
                </label>
              </div>

              {urlMode === 'external' && (
                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Lien direct de votre Google Form (URL) *
                  </label>
                  <input
                    type="url"
                    required
                    value={tempGoogleFormUrl}
                    onChange={(e) => setTempGoogleFormUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowConfigUrlModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Enregistrer les paramètres
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. In-App Interactive Test Modal for the Patient Form */}
      {showTestFormModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl my-8">
            <ClientFeedbackPortal
              onAddFeedback={(fb) => {
                onUpdateFeedbacks([fb, ...feedbacks]);
                setShowTestFormModal(false);
              }}
              onClose={() => setShowTestFormModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
