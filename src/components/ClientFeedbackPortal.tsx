import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Send, CheckCircle2, MessageSquare, Sparkles, ArrowLeft, Heart, ShieldCheck } from 'lucide-react';
import { CustomerFeedback } from '../types';

interface ClientFeedbackPortalProps {
  onAddFeedback: (feedback: CustomerFeedback) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export default function ClientFeedbackPortal({
  onAddFeedback,
  onClose,
  isStandalone = false,
}: ClientFeedbackPortalProps) {
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Accueil & Conseils');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'Accueil & Conseils', label: '🤝 Accueil & Conseils', desc: 'Qualité du conseil, amabilité du personnel' },
    { id: 'Caisse & Rapidité', label: '⚡ Caisse & Rapidité', desc: "Temps d'attente, fluidité de passage" },
    { id: 'Disponibilité Produits', label: '📦 Disponibilité Produits', desc: 'Médicaments, parapharmacie, stocks' },
    { id: 'Service de Garde', label: '🌙 Service de Garde', desc: 'Disponibilité de nuit et week-end' },
    { id: 'Préparations & Ordonnances', label: '💊 Préparations & Ordonnances', desc: 'Précision et explications des ordonnances' },
    { id: 'Suggestions & Confort', label: '💡 Suggestions & Confort', desc: 'Idées pour améliorer nos services' },
    { id: 'Général', label: '✨ Remarque Générale', desc: 'Autre retour ou appréciation globale' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    const newFeedback: CustomerFeedback = {
      id: `fb-${Date.now()}`,
      content: content.trim(),
      author: author.trim() || 'Client Anonyme',
      category,
      rating,
      likes: 0,
      isPinned: false,
      submittedAt: new Date().toISOString(),
      formSource: 'qr_code_portal',
    };

    setTimeout(() => {
      onAddFeedback(newFeedback);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 400);
  };

  const handleReset = () => {
    setContent('');
    setAuthor('');
    setCategory('Accueil & Conseils');
    setRating(5);
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF8F2] via-[#F4EFE6] to-[#EAE3D2] py-8 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-xl">
        {/* Header Branding */}
        <div className="text-center mb-6 space-y-2">
          {onClose && (
            <div className="flex justify-start mb-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Retour au portail principal</span>
              </button>
            </div>
          )}

          <div className="inline-flex items-center justify-center gap-2 p-2 bg-white/90 rounded-2xl shadow-sm border border-amber-200/80 mb-1">
            <img 
              src="/Pharmintl.png" 
              alt="Pharmacie Internationale" 
              className="h-10 w-10 object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-left pr-2">
              <h1 className="text-sm font-black text-gray-900 leading-tight">
                PHARMACIE INTERNATIONALE
              </h1>
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                Excellence & Proximité Pharmaceutique
              </p>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            🎙️ Micros Clients & Suggestions
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            Votre expérience à l'officine compte pour nous. Partagez votre avis, vos suggestions ou vos encouragements en quelques secondes !
          </p>
        </div>

        {/* Form Card or Thank You screen */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-300/60 relative overflow-hidden"
        >
          {isSubmitted ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 text-center space-y-5"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>

              <div className="space-y-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Transmission Réussie
                </span>
                <h3 className="text-2xl font-black text-gray-900">
                  Merci pour votre retour !
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Votre avis a été enregistré avec succès et transmis en temps réel à l'équipe et à la direction de la Pharmacie Internationale.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} />
                  <span>Envoyer un autre avis</span>
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating Selection */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 text-center space-y-2">
                <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">
                  Votre niveau global de satisfaction *
                </label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      title={`${star} étoile${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={32}
                        className={`${
                          (hoverRating !== null ? star <= hoverRating : star <= rating)
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-gray-300'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-bold text-amber-800">
                  {rating === 5 && '🌟 Excellent — Service irréprochable'}
                  {rating === 4 && '👍 Très bien — Très satisfait'}
                  {rating === 3 && '👌 Correct — Bon dans l’ensemble'}
                  {rating === 2 && '⚠️ Moyen — Des améliorations nécessaires'}
                  {rating === 1 && '👎 Insatisfait — Expérience décevante'}
                </p>
              </div>

              {/* Theme / Category Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                  Thème ou service concerné *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex flex-col gap-0.5 ${
                        category === cat.id
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-gray-50 hover:bg-amber-50/50 text-gray-800 border-gray-200'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[10px] font-normal leading-tight ${category === cat.id ? 'text-amber-100' : 'text-gray-500'}`}>
                        {cat.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiline Message Content */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Votre avis, remarque ou suggestion *</span>
                  <span className="text-[10px] text-gray-400 font-normal">Obligatoire</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ex: Accueil chaleureux, l'équipe a bien pris le temps de m'expliquer mon traitement. Merci !"
                  className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none leading-relaxed transition-all"
                />
              </div>

              {/* Optional Author / Patient Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Votre Nom / Patient (Optionnel)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Anonymat préservé si vide</span>
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: M. Traoré, Mme Diallo (ou laissez vide pour anonyme)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all"
                />
              </div>

              {/* Privacy note */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Vos retours sont examinés attentivement pour l'amélioration continue de nos services.</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span>Enregistrement en cours...</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Envoyer mon avis au comptoir</span>
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Pharmacie Internationale • Système de Management de la Qualité</p>
        </div>
      </div>
    </div>
  );
}
