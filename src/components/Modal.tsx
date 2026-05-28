import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'default' | 'danger' | 'warning';
  showPinInput?: boolean;
  pinValue?: string;
  onPinChange?: (value: string) => void;
  isAlert?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  type = 'default',
  showPinInput = false,
  pinValue = '',
  onPinChange,
  isAlert = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={clsx(
            "relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border transition-all duration-300",
            type === 'danger' ? "border-red-500/50 shadow-red-500/10" : 
            type === 'warning' ? "border-amber-500/50 shadow-amber-500/10" : 
            "border-amber-200/20 shadow-amber-200/5"
          )}
        >
          {/* Top Logo Section */}
          <div className="pt-8 pb-4 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-2 border-amber-200 p-1 bg-white mb-4 shadow-lg shadow-amber-200/20 overflow-hidden group">
              <img 
                src="/assets/DFIT_LOGO.jpeg" 
                alt="DFIT Logo" 
                className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          </div>

          <div className="px-8 pb-8 text-center">
            <h3 className={clsx(
              "text-xl font-bold mb-3",
              type === 'danger' ? "text-red-500" : "text-zinc-900 dark:text-white"
            )}>
              {title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 whitespace-pre-wrap text-sm leading-relaxed">
              {message}
            </p>

            {showPinInput && (
              <div className="mb-6 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">PIN de Confirmación</label>
                <input
                  type="password"
                  value={pinValue}
                  onChange={(e) => onPinChange?.(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="••••"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3 mt-2">
              {!isAlert && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onConfirm?.();
                  if (!showPinInput) onClose();
                }}
                className={clsx(
                  "flex-1 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-95",
                  type === 'danger' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : 
                  "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
