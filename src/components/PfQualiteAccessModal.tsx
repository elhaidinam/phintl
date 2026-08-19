import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Lock, ArrowRight, X, CheckCircle2, UserCheck } from 'lucide-react';

interface PfQualiteAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tileTitle: string;
  loggedInUser: {
    type: string;
    employeeId?: string;
    username: string;
    name: string;
    isPfQualite?: boolean;
    isSupervisor?: boolean;
  } | null;
  onOpenLogin: () => void;
}

export const PfQualiteAccessModal: React.FC<PfQualiteAccessModalProps> = ({
  isOpen,
  onClose,
  tileTitle,
  loggedInUser,
  onOpenLogin
}) => {
  if (!isOpen) return null;

  const isConnected = !!loggedInUser;
  const isSupervisor = loggedInUser?.type === 'supervisor';

  return (
    <AnimatePresence>
      <div 
        id="pf-qualite-access-modal-overlay" 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          id="pf-qualite-access-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-amber-200"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-amber-100 shadow-inner">
                <Lock className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-base uppercase tracking-wider text-white">
                  Accès Restreint : PF Qualité
                </h3>
                <p className="text-xs text-amber-100 font-medium">
                  Dallette : <span className="font-bold underline">{tileTitle}</span>
                </p>
              </div>
            </div>
            <button
              id="pf-qualite-modal-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-bold text-sm text-amber-950">
                  Prérogative exclusive du Point Focal Qualité
                </p>
                <p className="text-amber-800">
                  Conformément aux protocoles opérationnels de la <strong>Pharmacie Internationale</strong>, les dallettes financières et administratives 
                  (<strong>Versements</strong>, <strong>Redditions</strong>, <strong>Factures</strong> et <strong>Règlements</strong>) 
                  ne sont actives que pour les collaborateurs habilités <strong>« PF qualité »</strong> ou la <strong>Direction</strong>.
                </p>
              </div>
            </div>

            {/* Current Auth Status */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck size={14} className="text-gray-400" /> Statut de connexion actuel
              </h4>
              {isConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="font-bold text-gray-800">{loggedInUser.name}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {isSupervisor ? 'Superviseur' : 'Collaborateur'}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ Votre compte actuel ne dispose pas de l'habilitation <strong>PF qualité</strong>.
                  </p>
                  <p className="text-[11px] text-gray-500 italic">
                    Pour obtenir cette habilitation, veuillez vous adresser au Propriétaire / Direction dans l'espace administration.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    Vous n'êtes actuellement pas connecté à l'application.
                  </p>
                  <p className="text-xs text-amber-800 font-semibold">
                    Veuillez vous authentifier avec un compte disposant du rôle <strong>PF qualité</strong> ou avec le compte <strong>Propriétaire</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="pf-qualite-modal-dismiss-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>

              {!isConnected ? (
                <button
                  id="pf-qualite-modal-login-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="px-5 py-2.5 text-xs font-black uppercase text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Se connecter</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  id="pf-qualite-modal-ok-btn"
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-black uppercase text-white bg-gray-800 hover:bg-gray-900 rounded-xl shadow transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 size={14} />
                  <span>Compris</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
