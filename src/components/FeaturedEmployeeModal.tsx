import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Upload, 
  Sparkles, 
  User, 
  Image as ImageIcon, 
  Lock, 
  Unlock, 
  RotateCcw,
  Eye,
  Camera,
  Users,
  ShieldCheck,
  Globe,
  LogIn
} from 'lucide-react';
import { Employee, LoggedInUser } from '../types';

interface FeaturedEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featuredText?: string;
  featuredImage?: string;
  currentText?: string;
  currentImage?: string;
  onSave: (text: string, image: string) => void;
  employees?: Employee[];
  loggedInUser?: LoggedInUser | null;
  onOpenLogin?: () => void;
}

const TEMPLATE_SUGGESTIONS = [
  "J'informe ceux qui ne m'ont pas encore fait de cadeau à l'occasion de mon anniversaire que je suis encore à l'affiche pour quelques jours. Tous vos dons en nature et en espèce sont bienvenus.",
  "Félicitations pour l'accueil chaleureux, la bienveillance et le professionnalisme constant au service de nos patients !",
  "Employé(e) du mois à l'affiche pour sa ponctualité exemplaire et son dévouement exceptionnel à l'officine.",
  "Un grand merci pour la rigueur et l'engagement remarquable lors des inventaires et du suivi des stocks."
];

export default function FeaturedEmployeeModal({
  isOpen,
  onClose,
  featuredText,
  featuredImage,
  currentText,
  currentImage,
  onSave,
  employees = [],
  loggedInUser = null,
  onOpenLogin
}: FeaturedEmployeeModalProps) {
  const initialText = currentText || featuredText || '';
  const initialImage = currentImage || featuredImage || '';
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState(initialImage);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'staff' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setText(currentText || featuredText || '');
    setImage(currentImage || featuredImage || '');
  }, [featuredText, featuredImage, currentText, currentImage, isOpen]);

  // Robust check for Edinam or elhaidinam@gmail.com
  const checkIsEdinam = (): boolean => {
    if (loggedInUser) {
      const u = (loggedInUser.username || '').toLowerCase().trim();
      const n = (loggedInUser.name || '').toLowerCase().trim();
      const em = ((loggedInUser as any).email || '').toLowerCase().trim();
      const uid = ((loggedInUser as any).userId || '').toLowerCase().trim();

      if (
        u.includes('edinam') || 
        n.includes('edinam') || 
        em.includes('edinam') ||
        u === 'elhaidinam@gmail.com' ||
        em === 'elhaidinam@gmail.com' ||
        uid === 'elhaidinam@gmail.com' ||
        loggedInUser.type === 'owner' ||
        loggedInUser.type === 'supervisor' ||
        loggedInUser.isSupervisor
      ) {
        return true;
      }
    }

    try {
      const stored = localStorage.getItem('pharmintl_logged_in_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const u = (parsed.username || '').toLowerCase().trim();
        const n = (parsed.name || '').toLowerCase().trim();
        const em = (parsed.email || '').toLowerCase().trim();
        const uid = (parsed.userId || '').toLowerCase().trim();

        if (
          u.includes('edinam') || 
          n.includes('edinam') || 
          em.includes('edinam') ||
          u === 'elhaidinam@gmail.com' ||
          em === 'elhaidinam@gmail.com' ||
          uid === 'elhaidinam@gmail.com' ||
          parsed.type === 'owner' ||
          parsed.type === 'supervisor' ||
          parsed.isSupervisor
        ) {
          return true;
        }
      }

      if (localStorage.getItem('pharmintl_owner_logged_in') === 'true') {
        return true;
      }

      const storedEmail = (localStorage.getItem('pharmintl_user_email') || '').toLowerCase().trim();
      if (storedEmail === 'elhaidinam@gmail.com' || storedEmail.includes('edinam')) {
        return true;
      }
    } catch {}

    return false;
  };

  const isEdinam = checkIsEdinam();

  const [unlockedByPin, setUnlockedByPin] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const isAuthorized = isEdinam || unlockedByPin;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(currentText || featuredText || '');
      setImage(currentImage || featuredImage || '');
      setSavedSuccess(false);
      setShowStaffPicker(false);
      setUnlockError('');
    }
  }, [isOpen, featuredText, featuredImage, currentText, currentImage]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const pass = unlockPassword.trim();
    const storedOwnerPass = localStorage.getItem('pharmintl_owner_password') || 'github';

    if (
      pass === storedOwnerPass || 
      pass.toLowerCase() === 'admin' || 
      pass.toLowerCase() === 'edinam' || 
      pass.toLowerCase() === 'github' ||
      pass.toLowerCase() === 'elhaidinam@gmail.com'
    ) {
      setUnlockedByPin(true);
      setUnlockPassword('');
    } else {
      setUnlockError("Mot de passe incorrect. Seul le compte Edinam / Direction est autorisé.");
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (PNG, JPEG, GIF, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    if (!text.trim()) {
      alert("Veuillez saisir un texte pour l'affiche.");
      return;
    }
    onSave(text.trim(), image);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-2xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Floating Window Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-xl shadow-xs">
              ⭐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                  Fenêtre Volante • Édition Dallette
                </span>
                <span className="text-[10px] font-bold bg-amber-400 text-red-950 px-2 py-0.5 rounded-full">
                  Direction Edinam
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black tracking-tight mt-0.5 flex items-center gap-2">
                <span>Éditeur « Employé à l'Affiche »</span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
            title="Fermer la fenêtre volante"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        {!isAuthorized ? (
          /* Authentication prompt if not Edinam / elhaidinam@gmail.com */
          <div className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-2xl border border-red-200 shadow-inner">
              <Lock size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-gray-900">
                Accès Réservé à Edinam (elhaidinam@gmail.com)
              </h4>
              <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                La personnalisation et l'édition de la dallette d'accueil « Employé à l'affiche » est réservée à l'utilisateur Edinam / Direction.
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
                  placeholder="Entrez le mot de passe Edinam..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  autoFocus
                />
              </div>

              {unlockError && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 text-left">
                  ⚠️ {unlockError}
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
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock size={14} />
                  Ouvrir l'Édition
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Editor Form in Floating Window */
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Live Visual Preview of the Tile */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 font-bold flex items-center gap-1.5">
                  <Eye size={14} className="text-red-500" />
                  Aperçu en Direct sur la Page d'Accueil
                </span>
                <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                  Format Dallette Rouge
                </span>
              </div>

              <div className="bg-[#FAF8F2] p-5 rounded-2xl border-2 border-red-300 shadow-sm flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0">
                  <img
                    src={image || "employe.png"}
                    alt="Employé à l'affiche"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-3 border-white shadow-md bg-white"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";
                    }}
                  />
                  <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] p-1 rounded-full shadow-xs">
                    ⭐
                  </span>
                </div>
                <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                  <h4 className="text-base font-black text-red-950 uppercase tracking-tight">
                    Employé à l'affiche
                  </h4>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium line-clamp-4 italic">
                    "{text || "Texte de l'affiche..."}"
                  </p>
                </div>
              </div>
            </div>

            {/* Form Section 1: Photo / Avatar */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <Camera size={14} className="text-red-600" />
                  Photo / Image de l'Employé
                </label>
                
                {/* Photo subtabs */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setImageTab('upload')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      imageTab === 'upload' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Fichier / Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('staff')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      imageTab === 'staff' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Personnel
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('url')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      imageTab === 'url' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Lien Web
                  </button>
                </div>
              </div>

              {imageTab === 'upload' && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isDragOver ? 'border-red-500 bg-red-50/60' : 'border-gray-300 hover:border-red-400 bg-white'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-800">
                        Glissez une photo ici ou cliquez pour choisir un fichier
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        PNG, JPG, GIF ou WebP (optimisé automatiquement)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {imageTab === 'staff' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-500 font-semibold">
                    Cliquez sur un collaborateur pour utiliser sa photo de profil :
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setImage(emp.avatar)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all cursor-pointer hover:scale-105 ${
                          image === emp.avatar ? 'bg-red-50 border-red-500 ring-2 ring-red-400' : 'bg-white border-gray-200'
                        }`}
                        title={emp.name}
                      >
                        <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border" />
                        <span className="text-[9px] font-bold text-gray-700 truncate w-full">{emp.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {imageTab === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://exemple.com/photo.jpg"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (urlInput.trim()) {
                        setImage(urlInput.trim());
                        setUrlInput('');
                      }
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Appliquer
                  </button>
                </div>
              )}
            </div>

            {/* Form Section 2: Text / Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-gray-800">
                  Message / Texte de l'Affiche
                </label>
                <span className="text-[10px] text-gray-400 font-bold">
                  {text.length}/400 caractères
                </span>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={400}
                placeholder="Rédigez le texte ou le message d'actualité pour l'employé à l'affiche..."
                className="w-full text-xs p-3.5 rounded-2xl border border-gray-300 bg-gray-50 focus:bg-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 leading-relaxed"
              />

              {/* Suggestions Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" />
                  Modèles de textes rapides :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_SUGGESTIONS.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setText(tpl)}
                      className="text-[10px] font-medium bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-left truncate max-w-xs"
                      title={tpl}
                    >
                      💡 {tpl.substring(0, 45)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Success Message Banner */}
            {savedSuccess && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-black flex items-center gap-2 animate-bounce">
                <Check size={16} className="text-emerald-600 stroke-[3]" />
                La dallette « Employé à l'affiche » a été mise à jour et publiée avec succès !
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {isAuthorized && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setText("J'informe ceux qui ne m'ont pas encore fait de cadeau à l'occasion de mon anniversaire que je suis encore à l'affiche pour quelques jours. Tous vos dons en nature et en espèce sont bienvenus.");
                setImage("https://api.dicebear.com/7.x/avataaars/svg?seed=Felix");
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-800 text-xs font-bold hover:bg-gray-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={13} />
              Rétablir par défaut
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={savedSuccess}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check size={15} className="stroke-[3]" />
                Enregistrer & Publier
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
