import React, { useEffect, useState } from "react";
import { CheckCircle, Wallet, Send, X, Printer, Package, Utensils, MessageCircle } from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";
import { buildReceiptWhatsAppUrl } from "./ReceiptShareHelper";
import { usePrinter } from "../../hooks/usePrinter";

export default function ReceiptModal({ receipt, onClose, onShareWhatsApp }) {
  const { printTicket } = usePrinter();
  
  // States to keep track of configuration changes reactively
  const [currencyMode, setCurrencyMode] = useState(() => localStorage.getItem("pda_ticket_currency_mode") || "mixto");
  const [showBcv, setShowBcv] = useState(() => localStorage.getItem("pda_ticket_show_bcv_rate") !== "false");
  const [showEuro, setShowEuro] = useState(() => localStorage.getItem("pda_ticket_show_euro") === "true");

  useEffect(() => {
    const handleStorageUpdate = () => {
      setCurrencyMode(localStorage.getItem("pda_ticket_currency_mode") || "mixto");
      setShowBcv(localStorage.getItem("pda_ticket_show_bcv_rate") !== "false");
      setShowEuro(localStorage.getItem("pda_ticket_show_euro") === "true");
    };
    window.addEventListener("storage", handleStorageUpdate);
    return () => window.removeEventListener("storage", handleStorageUpdate);
  }, []);

  if (!receipt) return null;

  const getModalHeader = () => {
    return localStorage.getItem("bodega_store_name") || "PreciosAlDía Comida Rápida";
  };
  const tenantName = getModalHeader();
  const fecha = new Date(receipt.timestamp).toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleWhatsApp = () => {
    if (onShareWhatsApp) {
      onShareWhatsApp(receipt);
    } else {
      window.open(buildReceiptWhatsAppUrl(receipt), "_blank");
    }
  };

  // Euro calculations
  let euroRate = 0;
  if (showEuro) {
    try {
      const saved = JSON.parse(localStorage.getItem("monitor_rates_v12") || "{}");
      euroRate = saved?.euro?.price || 0;
    } catch (_) {}
  }
  const totalEur = euroRate > 0 ? (receipt.totalUsd * receipt.rate) / euroRate : 0;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden relative flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Botón X cerrar — siempre visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full flex items-center justify-center transition-all active:scale-90"
          title="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Bordes serrados efecto ticket */}
          <div
            className="h-4 bg-white shrink-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10px 0, transparent 10px, white 10px)",
              backgroundSize: "20px 20px",
            }}
          ></div>

          <div className="p-6 sm:p-8 pt-6 text-center bg-white border-b-2 border-dashed border-slate-200">
            <img src="/logoprincipal.png" alt="Logo" className="max-h-12 mx-auto mb-4 object-contain" />
            <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">
              {tenantName}
            </h2>

            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <CheckCircle size={36} className="text-red-500 relative z-10" />
              <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20"></div>
            </div>

            {receipt.customerName && receipt.customerName !== "Consumidor Final" && (
              <p className="text-base font-bold text-blue-600 mb-1">
                Pedido para: {receipt.customerName}
              </p>
            )}

            <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">
              Orden #{String(receipt.saleNumber).padStart(4, "0")}
            </h3>

            <p className="text-xs font-bold text-slate-500 mb-4">{fecha}</p>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest mb-4 ${receipt.deliveryType === "LLEVAR" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
            >
              {receipt.deliveryType === "LLEVAR" ? (
                <>
                  <Package size={12} className="shrink-0" />
                  <span>Para Llevar</span>
                </>
              ) : (
                <>
                  <Utensils size={12} className="shrink-0" />
                  <span>Comer Aquí</span>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total a Pagar</p>
              {currencyMode === "usd" && (
                <p className="text-4xl font-black text-red-600 mb-1 tracking-tighter leading-none">
                  ${receipt.totalUsd.toFixed(2)} USD
                </p>
              )}
              {currencyMode === "bs" && (
                <p className="text-4xl font-black text-red-600 mb-1 tracking-tighter leading-none">
                  {formatBs(receipt.totalBs)} Bs
                </p>
              )}
              {currencyMode === "mixto" && (
                <>
                  <p className="text-4xl font-black text-red-600 mb-1 tracking-tighter leading-none">
                    {formatBs(receipt.totalBs)} Bs
                  </p>
                  <p className="text-lg font-bold text-slate-500">
                    ${receipt.totalUsd.toFixed(2)} USD
                  </p>
                </>
              )}
              {showEuro && totalEur > 0 && (
                <p className="text-sm font-black text-indigo-600 mt-1">
                  € {totalEur.toFixed(2)} EUR
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 px-6 sm:px-8 py-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Detalle de Consumo
            </p>
            <div className="space-y-3 mb-6">
              {receipt.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-start text-sm border-b border-slate-200/50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex-1 pr-4">
                    <span className="font-bold text-slate-700 block leading-tight">
                      {item.qty}x {item.name} {item.size && <span className="opacity-70 font-medium">[{item.size}]</span>}
                    </span>
                    {item.selectedExtras?.length > 0 && (
                      <span className="block text-[11px] text-slate-500 my-0.5">
                        + {item.selectedExtras.map(e => e.name).join(", ")}
                      </span>
                    )}
                    {item.note && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 my-0.5">
                        <MessageCircle size={10} className="shrink-0 text-red-500" />
                        <span>{item.note}</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex gap-2">
                      {currencyMode !== "bs" && <span>${parseFloat(item.priceUsd || item.priceUsdt || item.price || 0).toFixed(2)} c/u</span>}
                      {currencyMode === "mixto" && <span>·</span>}
                      {currencyMode !== "usd" && <span>{formatBs(parseFloat(item.priceUsd || item.priceUsdt || item.price || 0) * receipt.rate)} Bs</span>}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 block">
                      {currencyMode === "bs" 
                        ? `${formatBs(parseFloat(item.priceUsd || item.priceUsdt || item.price || 0) * item.qty * receipt.rate)} Bs`
                        : `$${(parseFloat(item.priceUsd || item.priceUsdt || item.price || 0) * item.qty).toFixed(2)}`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 text-sm space-y-2">
              {showBcv && (
                <div className="flex justify-between text-slate-500 font-bold mb-3">
                  <span>Tasa BCV Aplicada:</span>
                  <span>{formatBs(receipt.rate)} Bs/$</span>
                </div>
              )}

              {showEuro && euroRate > 0 && (
                <div className="flex justify-between text-slate-500 font-bold mb-3">
                  <span>Tasa Euro BCV:</span>
                  <span>{formatBs(euroRate)} Bs/€</span>
                </div>
              )}

              {receipt.payments && receipt.payments.length > 0 && (
                <>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-4">
                    Métodos de Pago
                  </p>
                  {receipt.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-slate-700 mb-1 items-center"
                    >
                      <span className="flex items-center gap-1.5"><Wallet size={14} /> {p.methodLabel}</span>
                      <span className="font-black">
                        {p.amountInputCurrency === "USD" ? "$" : "Bs"} {formatBs(p.amountInput)}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {receipt.changeUsd > 0.009 && (
                <div className="flex justify-between text-green-600 font-black mt-3 pt-3 border-t border-slate-200">
                  <span>VUELTO EMITIDO:</span>
                  <div className="text-right">
                    {currencyMode !== "bs" && <span className="block">${receipt.changeUsd.toFixed(2)}</span>}
                    {currencyMode !== "usd" && <span className="block text-xs">{formatBs(receipt.changeBs)} Bs</span>}
                  </div>
                </div>
              )}

              {receipt.fiadoUsd > 0.009 && (
                <div className="flex justify-between text-red-600 font-bold mt-2 pt-2 border-t border-slate-200">
                  <span>Pendiente (Fiado):</span>
                  <span>
                    {currencyMode === "usd" && `$${receipt.fiadoUsd.toFixed(2)}`}
                    {currencyMode === "bs" && `${formatBs(receipt.fiadoUsd * receipt.rate)} Bs`}
                    {currencyMode === "mixto" && `$${receipt.fiadoUsd.toFixed(2)} / ${formatBs(receipt.fiadoUsd * receipt.rate)} Bs`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones sticky en la parte inferior */}
        <div className="p-4 bg-slate-50 flex gap-2 relative z-20 shrink-0 border-t border-slate-200/50 flex-col">
          <button
            onClick={() => printTicket(receipt)}
            className="w-full py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors tracking-wide text-sm flex items-center justify-center gap-2 focus:outline-none active:scale-95 shadow-md shadow-indigo-600/10"
          >
            <Printer size={18} /> Imprimir Ticket Termico
          </button>
          <button
            onClick={handleWhatsApp}
            className="w-full py-3.5 bg-amber-100 text-amber-700 font-black rounded-xl hover:bg-amber-200 transition-colors tracking-wide text-sm flex items-center justify-center gap-2 focus:outline-none active:scale-95 shadow-sm"
          >
            <Send size={18} /> Compartir ticket por WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-colors tracking-wide text-sm focus:outline-none active:scale-95 shadow-sm"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
}
