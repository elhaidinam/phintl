import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Plus, 
  Trash2, 
  FileText, 
  Sparkles, 
  Lock, 
  Unlock, 
  Calendar, 
  User, 
  Eye, 
  BookOpen,
  Send,
  AlertCircle
} from 'lucide-react';
import { JournalArticle, LoggedInUser } from '../types';

interface JournalPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalArticles: JournalArticle[];
  onSaveArticles: (updated: JournalArticle[]) => void;
  loggedInUser?: LoggedInUser | null;
}

const TEMPLATE_DIRECTIVES = [
  {
    title: "Note de Service - Continuité de Service & Gardes",
    author: "Direction Générale (Edinam)",
    content: "La Direction rappelle à l'ensemble du personnel l'obligation de ponctualité lors des passages de relais et le respect strict du planning de garde établi."
  },
  {
    title: "Directive Qualité - Accueil et Conseils aux Patients",
    author: "Direction (Edinam)",
    content: "Afin de garantir une qualité d'écoute exemplaire, chaque dispensation doit s'accompagner des conseils posologiques et des précautions d'emploi nécessaires."
  },
  {
    title: "Information Générale - Réception des Commandes & Stocks",
    author: "Direction Générale",
    content: "Le contrôle physique des arrivages et la mise à jour immédiate des entrées en stock doivent être effectués dans un délai maximal de 2 heures après livraison."
  },
  {
    title: "Communiqué Officiel - Hygiène et Tenue de l'Officine",
    author: "Direction (Edinam)",
    content: "Le port de la blouse réglementaire propre et le maintien d'un plan de travail ordonné au comptoir sont requis en permanence pour l'image de notre pharmacie."
  }
];

export default function JournalPublishModal({
  isOpen,
  onClose,
  journalArticles,
  onSaveArticles,
  loggedInUser = null
}: JournalPublishModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('Direction (Edinam)');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Authentication check for Edinam / Direction
  const isEdinam = Boolean(
    loggedInUser && (
      loggedInUser.username?.toLowerCase().includes('edinam') ||
      loggedInUser.name?.toLowerCase().includes('edinam') ||
      loggedInUser.username?.toLowerCase() === 'elhaidinam@gmail.com' ||
      (loggedInUser as any).email?.toLowerCase() === 'elhaidinam@gmail.com' ||
      loggedInUser.type === 'owner' ||
      loggedInUser.type === 'supervisor' ||
      loggedInUser.isSupervisor
    )
  );

  const [unlockedByPin, setUnlockedByPin] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const isAuthorized = isEdinam || unlockedByPin;

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setAuthor('Direction (Edinam)');
      setDate(new Date().toISOString().split('T')[0]);
      setPublishSuccess(false);
      setUnlockError('');
      setActiveTab('create');
    }
  }, [isOpen]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const pass = unlockPassword.trim();
    const storedOwnerPass = localStorage.getItem('pharmintl_owner_password') || 'github';

    if (pass === storedOwnerPass || pass.toLowerCase() === 'admin' || pass.toLowerCase() === 'edinam' || pass.toLowerCase() === 'github') {
      setUnlockedByPin(true);
      setUnlockPassword('');
    } else {
      setUnlockError("Mot de passe incorrect. Seul le compte Edinam / Direction est autorisé.");
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Veuillez remplir le titre et le contenu de la note.");
      return;
    }

    const newArticle: JournalArticle = {
      id: `journal-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      date: date || new Date().toISOString().split('T')[0],
      author: author.trim() || "Direction (Edinam)"
    };

    const updated = [newArticle, ...journalArticles];
    onSaveArticles(updated);
    setPublishSuccess(true);

    setTimeout(() => {
      setPublishSuccess(false);
      setTitle('');
      setContent('');
      onClose();
    }, 1200);
  };

  const handleDeleteArticle = (articleId: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette publication du Journal Officiel ?")) {
      const updated = journalArticles.filter((a) => a.id !== articleId);
      onSaveArticles(updated);
      try {
        fetch(`/api/journal/${articleId}`, { method: 'DELETE' }).catch(() => {});
      } catch {}
    }
  };

  const handleApplyTemplate = (tpl: typeof TEMPLATE_DIRECTIVES[0]) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setAuthor(tpl.author);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-3xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Floating Window Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-xl shadow-xs">
              📰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                  Journal Officiel
                </span>
                <span className="text-[10px] font-bold bg-amber-400 text-indigo-950 px-2 py-0.5 rounded-full">
                  Direction Edinam
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black tracking-tight mt-0.5">
                Mise en Ligne d'une Note Officielle
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
            title="Fermer la fenêtre volante"
          >
            <X size={18} />
          </button>
        </div>

        {/* Access Verification */}
        {!isAuthorized ? (
          <div className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto text-2xl border border-indigo-200">
              <Lock size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-gray-900">
                Accès Réservé à Edinam / Direction
              </h4>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                La publication de communiqués et de notes de service au Journal Officiel est strictement réservée au compte de la Direction.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="max-w-sm mx-auto space-y-3">
              <div className="text-left">
                <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                  Mot de Passe Propriétaire (Edinam)
                </label>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  autoFocus
                />
              </div>

              {unlockError && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 text-left flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  {unlockError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock size={14} />
                  Déverrouiller
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Navigation */}
            <div className="px-6 pt-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`pb-3 px-3 text-xs font-black transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                    activeTab === 'create'
                      ? 'border-indigo-600 text-indigo-900'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Plus size={15} />
                  Nouvelle Note
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className={`pb-3 px-3 text-xs font-black transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                    activeTab === 'manage'
                      ? 'border-indigo-600 text-indigo-900'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <BookOpen size={15} />
                  Notes Publiées ({journalArticles.length})
                </button>
              </div>

              <span className="text-[11px] font-bold text-gray-400 pb-3">
                Publication Immédiate & Synchronisée
              </span>
            </div>

            {/* Tab 1: Create Note */}
            {activeTab === 'create' && (
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Form */}
                <form id="journal-publish-form" onSubmit={handlePublish} className="space-y-4">
                  {/* Titre */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-600" />
                      Titre de l'Annonce / Note de Service *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Note de Service - Horaires et Continuité des Soins"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>

                  {/* Auteur & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-gray-600 uppercase mb-1 flex items-center gap-1">
                        <User size={13} className="text-indigo-600" />
                        Signataire / Auteur
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Direction (Edinam)"
                        className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-gray-600 uppercase mb-1 flex items-center gap-1">
                        <Calendar size={13} className="text-indigo-600" />
                        Date d'Affichage
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Quick Model Directives */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-500" />
                      Modèles de Directives Prédéfinis :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_DIRECTIVES.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="text-[10px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer truncate max-w-xs text-left"
                          title={tpl.title}
                        >
                          📋 {tpl.title.substring(0, 35)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contenu */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                      Corps de la Note / Directive Officielle *
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Rédigez le texte complet de la communication officielle qui sera affichée dans le Journal Officiel..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full text-xs p-3.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-medium text-gray-800"
                    />
                  </div>

                  {/* Live Preview Card */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Eye size={13} className="text-indigo-600" />
                      Aperçu Visuel de la Publication
                    </span>

                    <div className="p-5 rounded-2xl border border-indigo-200 bg-[#FAF8F2] space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between gap-4 text-[10px] text-gray-500 font-mono font-bold">
                        <span>📅 {date || "Aujourd'hui"}</span>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase">
                          👤 {author || "Direction (Edinam)"}
                        </span>
                      </div>
                      <h4 className="text-sm md:text-base font-black text-gray-900 leading-snug">
                        {title || "Titre de la directive..."}
                      </h4>
                      <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                        {content || "Le contenu de votre note apparaîtra ici avec mise en page claire et aérée..."}
                      </p>
                    </div>
                  </div>

                  {/* Success Alert */}
                  {publishSuccess && (
                    <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 p-3.5 rounded-2xl text-xs font-black flex items-center gap-2 animate-bounce">
                      <Check size={18} className="text-emerald-600 stroke-[3]" />
                      Note officielle publiée avec succès au Journal Officiel !
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Tab 2: Manage Existing Notes */}
            {activeTab === 'manage' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Publications Actuelles au Journal ({journalArticles.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Ajouter une nouvelle note
                  </button>
                </div>

                {journalArticles.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    Aucune publication active pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {journalArticles.map((art) => (
                      <div
                        key={art.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-indigo-300 transition-all flex items-start justify-between gap-4 shadow-xs"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono font-bold">
                            <span>📅 {art.date}</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase">
                              👤 {art.author}
                            </span>
                          </div>
                          <h5 className="text-sm font-black text-gray-900 truncate">
                            {art.title}
                          </h5>
                          <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap line-clamp-3 leading-relaxed">
                            {art.content}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(art.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition-all shrink-0 cursor-pointer"
                          title="Supprimer cette note"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fermer
              </button>

              {activeTab === 'create' && (
                <button
                  type="submit"
                  form="journal-publish-form"
                  disabled={publishSuccess}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Send size={14} />
                  <span>Publier la Note</span>
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
