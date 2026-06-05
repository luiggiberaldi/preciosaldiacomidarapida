import React, { useState } from "react";
import { Printer, Coins, Check, TrendingUp } from "lucide-react";
import { showToast } from "../Toast";

export default function PrinterSettings() {
  const [currencyMode, setCurrencyMode] = useState(() => localStorage.getItem("pda_ticket_currency_mode") || "mixto");
  const [showBcv, setShowBcv] = useState(() => localStorage.getItem("pda_ticket_show_bcv_rate") !== "false");
  const [showEuro, setShowEuro] = useState(() => localStorage.getItem("pda_ticket_show_euro") === "true");

  const handleCurrencyModeChange = (mode) => {
    localStorage.setItem("pda_ticket_currency_mode", mode);
    setCurrencyMode(mode);
    showToast(`Moneda del ticket configurada: ${mode === 'usd' ? 'Solo USD' : mode === 'bs' ? 'Solo Bs' : 'Doble Moneda'}.`, 'success');
    window.dispatchEvent(new Event("storage"));
  };

  const handleShowBcvToggle = () => {
    const next = !showBcv;
    localStorage.setItem("pda_ticket_show_bcv_rate", String(next));
    setShowBcv(next);
    showToast(next ? "Visualización de tasa BCV activada." : "Visualización de tasa BCV desactivada.", "success");
    window.dispatchEvent(new Event("storage"));
  };

  const handleShowEuroToggle = () => {
    const next = !showEuro;
    localStorage.setItem("pda_ticket_show_euro", String(next));
    setShowEuro(next);
    showToast(next ? "Visualización de Euros (€) activada." : "Visualización de Euros (€) desactivada.", "success");
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-4">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Printer size={14} className="text-indigo-500" />
        Configuración del Ticket
      </h4>

      <div className="space-y-4">
        {/* Moneda del Ticket */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Coins size={10} /> Moneda del Ticket
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "usd", label: "Solo $" },
              { id: "bs", label: "Solo Bs" },
              { id: "mixto", label: "Mixto ($/Bs)" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleCurrencyModeChange(mode.id)}
                className={`py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                  currencyMode === mode.id
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400"
                    : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {currencyMode === mode.id && <Check size={12} />}
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles de Visualización */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={10} /> Información y Tasas
          </label>
          
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleShowBcvToggle}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold transition-all ${
                showBcv
                  ? "bg-indigo-50/50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400"
                  : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Mostrar Referencia Tasa BCV ($)</span>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${showBcv ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                <div className={`w-3.5 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${showBcv ? "translate-x-3.5" : "translate-x-0"}`} />
              </div>
            </button>

            <button
              type="button"
              onClick={handleShowEuroToggle}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold transition-all ${
                showEuro
                  ? "bg-indigo-50/50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400"
                  : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Mostrar Equivalente en Euros (€)</span>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${showEuro ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                <div className={`w-3.5 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${showEuro ? "translate-x-3.5" : "translate-x-0"}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
