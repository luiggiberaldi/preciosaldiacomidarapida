import React, { useState, useEffect } from "react";
import { X, Clock, Layers, ChevronRight, MessageSquare, Percent, Printer, ChefHat, Users } from "lucide-react";
import { useAuthStore } from "../../hooks/store/useAuthStore";
import DiscountModal from "./DiscountModal";

export default function TableBillModal({ tab, table, effectiveRate, onClose, onProceedToPayment, onPrintPrecuenta }) {
  const { usuarioActivo } = useAuthStore();
  const isCajeroOrAdmin = usuarioActivo?.rol === "ADMIN" || usuarioActivo?.rol === "CAJERO";

  const [discount, setDiscount] = useState({ type: "percentage", value: 0 });
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [now, setNow] = useState(new Date());

  // Update timer every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!tab || !table) return null;

  const getElapsedTimeStr = (createdAt) => {
    if (!createdAt) return "";
    const diffMs = now - new Date(createdAt);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Recién abierta";
    if (diffMins < 60) return `Abierta hace ${diffMins} min`;
    const diffHrs = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `Abierta hace ${diffHrs}h ${remainingMins}m`;
  };

  const subtotalUsd = tab.items.reduce(
    (sum, item) => sum + (item.priceUsdt || item.priceUsd || item.price || 0) * item.qty,
    0
  );
  const subtotalBs = subtotalUsd * effectiveRate;

  // Calculate discount amount
  const discountAmountUsd =
    discount.value > 0
      ? discount.type === "percentage"
        ? subtotalUsd * (discount.value / 100)
        : Math.min(discount.value, subtotalUsd)
      : 0;

  const finalTotalUsd = Math.max(0, subtotalUsd - discountAmountUsd);
  const finalTotalBs = finalTotalUsd * effectiveRate;

  const formatBs = (n) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-950 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-850/60 bg-slate-50/50 dark:bg-slate-900/10">
          <div className="w-11 h-11 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
            <Layers size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-slate-800 dark:text-white text-base leading-tight uppercase tracking-wide">
              Pre-cuenta: {table.name}
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1 font-bold">
              <Clock size={11} />
              {getElapsedTimeStr(tab.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-all active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Waiter/Metadata Box */}
        {(tab.customerInfo?.waiter || tab.customerInfo?.guests) && (
          <div className="shrink-0 px-5 pt-3 pb-1 flex flex-wrap gap-3 text-[10px] text-slate-500 font-bold border-b border-slate-100 dark:border-slate-850/60">
            {tab.customerInfo?.waiter && (
              <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg">
                <ChefHat size={11} className="text-red-500" />
                Atendido por: {tab.customerInfo.waiter}
              </span>
            )}
            {tab.customerInfo?.guests && (
              <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg">
                <Users size={11} className="text-red-500" />
                Comensales: {tab.customerInfo.guests} personas
              </span>
            )}
          </div>
        )}

        {/* Table Notes Box */}
        {tab.customerInfo?.notes && (
          <div className="shrink-0 mx-5 mt-3 flex items-start gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/20 rounded-xl">
            <MessageSquare size={13} className="text-amber-500 shrink-0 mt-0.5 animate-bounce-slow" />
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed italic">
              {tab.customerInfo.notes}
            </p>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
            Resumen de Productos Consumidos
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-850/60 border border-slate-100 dark:border-slate-850/80 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10">
            {tab.items.map((item, idx) => {
              const itemPrice = item.priceUsdt || item.priceUsd || item.price || 0;
              const totalLine = itemPrice * item.qty;

              return (
                <div key={idx} className="p-3 flex justify-between items-center bg-white dark:bg-slate-900/40">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {item.qty} u. x ${itemPrice.toFixed(2)}
                      </span>
                      {item.size && (
                        <span className="text-[9px] bg-red-50 dark:bg-red-950/20 text-red-600 px-1.5 py-0.2 rounded font-medium">
                          {item.size}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-black text-slate-800 dark:text-white shrink-0">
                    ${totalLine.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Discount details */}
          {discountAmountUsd > 0 && (
            <div className="bg-red-55/10 dark:bg-red-950/20 border border-red-200/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Descuento aplicado</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                  {discount.type === "percentage" ? `${discount.value}%` : `$${discount.value} de descuento`}
                </p>
              </div>
              <p className="text-sm font-black text-red-500">-${discountAmountUsd.toFixed(2)}</p>
            </div>
          )}

          {/* Total card */}
          <div
            className="rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-red-500/10"
            style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
          >
            <div>
              <p className="text-[10px] font-black text-white/80 uppercase tracking-wider">Total a Cobrar</p>
              <p className="text-[9px] text-white/60 font-bold mt-0.5">
                {tab.items.length} item{tab.items.length !== 1 ? "s" : ""}
                {discountAmountUsd > 0 ? ` − Desc $${discountAmountUsd.toFixed(2)}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-white leading-none">${finalTotalUsd.toFixed(2)}</p>
              <p className="text-[10px] font-bold text-white/70 mt-1">Bs {formatBs(finalTotalBs)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 dark:border-slate-850/60 space-y-2 bg-slate-50/50 dark:bg-slate-900/10">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl active:scale-95 transition-all outline-none"
            >
              Cerrar
            </button>
            <button
              onClick={onPrintPrecuenta}
              className="py-3 px-3.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-150 dark:border-blue-800/40 text-xs font-black rounded-xl active:scale-95 transition-all outline-none flex items-center gap-1"
              title="Imprimir Pre-cuenta"
            >
              <Printer size={14} /> Precuenta
            </button>
            {isCajeroOrAdmin && (
              <button
                onClick={() => setShowDiscountModal(true)}
                className={`py-3 px-3.5 text-xs font-black rounded-xl border transition-all active:scale-95 outline-none flex items-center gap-1 ${
                  discountAmountUsd > 0
                    ? "bg-red-50 border-red-200 text-red-500 dark:bg-red-950/20 dark:border-red-900/40"
                    : "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/40"
                }`}
              >
                <Percent size={14} /> {discountAmountUsd > 0 ? `${discount.type === "percentage" ? discount.value + "%" : "$" + discount.value}` : "Desc"}
              </button>
            )}
            <button
              onClick={() => onProceedToPayment(discount, finalTotalUsd)}
              className="flex-[2] py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl active:scale-95 transition-all outline-none shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5"
            >
              Proceder al Pago
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Discount Modal integration */}
        {showDiscountModal && (
          <DiscountModal
            currentDiscount={discount}
            onApply={(d) => {
              setDiscount(d);
              setShowDiscountModal(false);
            }}
            onClose={() => setShowDiscountModal(false)}
            cartSubtotalUsd={subtotalUsd}
            effectiveRate={effectiveRate}
            userRole={usuarioActivo?.rol || "CAJERO"}
            maxDiscountPercent={15} // Restringir descuentos sin PIN a max 15% para cajeros
          />
        )}
      </div>
    </div>
  );
}
