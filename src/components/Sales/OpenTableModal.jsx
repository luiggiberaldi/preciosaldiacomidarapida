import React, { useState } from "react";
import { X, Users, User, ClipboardList, Shield } from "lucide-react";

export default function OpenTableModal({
  isOpen,
  onClose,
  table,
  activeWaiter,
  onConfirm,
  triggerHaptic,
}) {
  const [guests, setGuests] = useState(2);
  const [clientName, setClientName] = useState(table?.name || "");
  const [notes, setNotes] = useState("");

  if (!isOpen || !table) return null;

  const guestOptions = [1, 2, 3, 4, 5, 6, 8];

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerHaptic && triggerHaptic();
    onConfirm({
      guests,
      clientName: clientName.trim() || table.name,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950/20">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              Ocupar {table.name}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">
              Configura los detalles de la mesa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-100 dark:border-slate-700/60 shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Guest Count Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Users size={12} /> Cantidad de Comensales
            </label>
            <div className="flex flex-wrap gap-2">
              {guestOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    triggerHaptic && triggerHaptic();
                    setGuests(opt);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                    guests === opt
                      ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {opt} {opt === 1 ? "persona" : "personas"}
                </button>
              ))}
            </div>
          </div>

          {/* Client Name Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <User size={12} /> Nombre de Cliente / Mesa
            </label>
            <input
              type="text"
              placeholder={`Ej. ${table.name} - Pérez`}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          {/* Waiter Display (Read-Only) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Shield size={12} /> Mesero Asignado
            </label>
            <div className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3.5 py-3 font-bold text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
              <span>👤</span>
              <span>{activeWaiter || "Usuario Activo"}</span>
              <span className="text-[9px] uppercase font-black bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-auto text-slate-400">
                Automático
              </span>
            </div>
          </div>

          {/* Observations/Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <ClipboardList size={12} /> Observaciones / Notas de Mesa
            </label>
            <textarea
              placeholder="Ej. Junto a la ventana, sin cebolla en las hamburguesas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            Abrir Mesa y Ordenar
          </button>
        </div>
      </form>
    </div>
  );
}
