import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    // z-[100] para estar encima de la barra de navegación (z-30)
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal — full-screen en móvil, card en tablet+ */}
      <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[95vh] sm:max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-black text-slate-800 dark:text-white text-base sm:text-lg tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-8 sm:pb-10 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
};