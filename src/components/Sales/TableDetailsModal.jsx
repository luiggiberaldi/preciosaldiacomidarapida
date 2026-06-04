import React from "react";
import { X, Printer, ShoppingCart, Trash2, Plus, CreditCard, Clock } from "lucide-react";

export default function TableDetailsModal({
  isOpen,
  onClose,
  table,
  tab,
  effectiveRate,
  onAddProducts,
  onPrintPrecuenta,
  onCheckout,
  onReleaseTable,
  triggerHaptic,
}) {
  if (!isOpen || !table || !tab) return null;

  const totalUsd = tab.items.reduce(
    (s, i) => s + (i.priceUsdt || i.priceUsd || i.price || 0) * i.qty,
    0
  );
  const totalBs = totalUsd * effectiveRate;
  const itemCount = tab.items.reduce((s, i) => s + (i.isWeight ? 1 : i.qty), 0);

  const formatBs = (n) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                Mesa Ocupada
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                {table.zone}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
              Consumo de {table.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-100 dark:border-slate-700/60 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex justify-between items-center bg-amber-500/5 dark:bg-amber-900/10 p-3 rounded-2xl border border-amber-200/40 dark:border-amber-800/30">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock size={16} />
              <span className="text-xs font-bold">Tiempo consumido:</span>
            </div>
            <span className="text-xs font-black text-amber-700 dark:text-amber-400">
              {new Date(tab.createdAt).toLocaleTimeString("es-VE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Metadata Box: Mesero, Comensales, Notas */}
          {(tab.customerInfo?.waiter || tab.customerInfo?.guests || tab.customerInfo?.notes) && (
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {tab.customerInfo?.waiter && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-400">Mesero:</span>
                  <span className="font-black text-slate-800 dark:text-white">{tab.customerInfo.waiter}</span>
                </div>
              )}
              {tab.customerInfo?.guests && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-400">Comensales:</span>
                  <span className="font-black text-slate-800 dark:text-white">{tab.customerInfo.guests} personas</span>
                </div>
              )}
              {tab.customerInfo?.notes && (
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 mt-1.5">
                  <span className="font-medium text-slate-400 block mb-0.5">Notas de la mesa:</span>
                  <p className="font-bold text-slate-700 dark:text-slate-200 italic bg-white dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60 leading-relaxed">{tab.customerInfo.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              Artículos Ordenados ({itemCount})
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              {tab.items.map((item, idx) => {
                const itemPrice = item.priceUsdt || item.priceUsd || item.price || 0;
                const qtyDisplay = item.isWeight ? `${item.qty.toFixed(3)} Kg` : `${item.qty} u`;
                
                return (
                  <div key={idx} className="p-3 flex justify-between items-center bg-white dark:bg-slate-900/40">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {qtyDisplay} x ${itemPrice.toFixed(2)}
                        </span>
                        {item.size && (
                          <span className="text-[9px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded font-medium">
                            {item.size}
                          </span>
                        )}
                        {item.selectedExtras?.length > 0 && (
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-medium">
                            +{item.selectedExtras.length} extras
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic mt-0.5 truncate">
                          Nota: {item.note}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 shrink-0">
                      ${(itemPrice * item.qty).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: Summary and Actions */}
        <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-4">
          {/* Totals */}
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Acumulado
            </span>
            <div className="text-right">
              <p className="text-2xl font-black text-red-600 dark:text-red-500 leading-none">
                {formatBs(totalBs)} Bs
              </p>
              <p className="text-sm font-bold text-slate-400 mt-1">
                ${totalUsd.toFixed(2)} USD ref.
              </p>
            </div>
          </div>

          {/* Action Grid */}
          <div className="space-y-2">
            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  onAddProducts();
                }}
                className="py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Agregar Productos
              </button>
              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  onPrintPrecuenta();
                }}
                className="py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> Imprimir Pre-cuenta
              </button>
            </div>

            {/* Checkout & Delete */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  onReleaseTable();
                }}
                className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-100 dark:border-red-900/50 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                title="Liberar Mesa (Cancelar cuenta)"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  onCheckout();
                }}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CreditCard size={16} /> COBRAR EN CAJA
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
