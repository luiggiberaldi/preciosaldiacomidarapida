import React, { useState, useEffect, useRef } from "react";
import { X, Percent, DollarSign, Calculator, ShieldAlert, Delete } from "lucide-react";
import { useAuthStore } from "../../hooks/store/useAuthStore";
import { logEvent } from "../../services/auditService";

export default function DiscountModal({
  currentDiscount,
  onApply,
  onClose,
  cartSubtotalUsd,
  effectiveRate,
  tasaCop = 0,
  copEnabled = false,
  userRole = "ADMIN",
  maxDiscountPercent = 100,
}) {
  const [type, setType] = useState(currentDiscount?.type || "percentage");
  const [value, setValue] = useState(currentDiscount?.value ? currentDiscount.value.toString() : "");
  const [screen, setScreen] = useState("discount"); // 'discount' | 'pin'
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinProcessing, setPinProcessing] = useState(false);
  const inputRef = useRef(null);

  const { verifyAdminPin, usuarioActivo } = useAuthStore();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const numValue = parseFloat(value) || 0;

  let discountAmountUsd = 0;
  if (type === "percentage") {
    discountAmountUsd = cartSubtotalUsd * (numValue / 100);
  } else {
    discountAmountUsd = numValue;
  }
  if (discountAmountUsd > cartSubtotalUsd) discountAmountUsd = cartSubtotalUsd;

  const newTotalUsd = cartSubtotalUsd - discountAmountUsd;
  const newTotalBs = newTotalUsd * effectiveRate;
  const formatBs = (n) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  // Check if cashier exceeds their max discount configuration (usually 10% or similar, if maxDiscountPercent is configured)
  const effectivePct = type === "percentage" ? numValue : cartSubtotalUsd > 0 ? (numValue / cartSubtotalUsd) * 100 : 0;
  const needsApproval = userRole !== "ADMIN" && maxDiscountPercent < 100 && effectivePct > maxDiscountPercent && numValue > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (needsApproval) {
      setScreen("pin");
      setAdminPin("");
      setPinError(false);
    } else {
      onApply({ type, value: numValue });
    }
  };

  const handleClear = () => onApply({ type: "percentage", value: 0 });

  // PIN pad digit handler
  const handlePinDigit = (d) => {
    if (adminPin.length >= 6 || pinProcessing) return;
    const next = adminPin + d;
    setAdminPin(next);
    if (next.length === 6 || (next.length === 4 && d === "0" && next === "0000")) {
      // Handle typical 4 or 6 digit PIN submittal
    }
    // Auto submit on typical lengths (we'll check length at 4 and 6 depending on active admin pins)
    if (next.length === 4 || next.length === 6) {
      submitPin(next);
    }
  };
  
  const handlePinDelete = () => {
    if (!pinProcessing) setAdminPin((p) => p.slice(0, -1));
  };

  const submitPin = async (pin) => {
    setPinProcessing(true);
    const ok = await verifyAdminPin(pin);
    if (ok) {
      logEvent(
        "VENTA",
        "DESCUENTO_APROBADO_ADMIN",
        `Descuento ${type === "percentage" ? numValue + "%" : "$" + numValue} aprobado por admin para cajero ${usuarioActivo?.nombre || ""}`,
        usuarioActivo,
        { discountType: type, discountValue: numValue, cashier: usuarioActivo?.nombre }
      );
      onApply({ type, value: numValue });
    } else {
      // If pin failed on length 4 but they might be typing a 6-digit pin, don't trigger error immediately unless length is 6
      if (pin.length === 4) {
        // Try to see if it works, if not let them keep typing up to 6
        const test6 = await verifyAdminPin(pin);
        if (test6) {
          logEvent(
            "VENTA",
            "DESCUENTO_APROBADO_ADMIN",
            `Descuento ${type === "percentage" ? numValue + "%" : "$" + numValue} aprobado por admin para cajero ${usuarioActivo?.nombre || ""}`,
            usuarioActivo,
            { discountType: type, discountValue: numValue, cashier: usuarioActivo?.nombre }
          );
          onApply({ type, value: numValue });
          return;
        }
        // Let them continue typing up to 6 digits
        setPinProcessing(false);
        return;
      }
      setPinError(true);
      setAdminPin("");
      setPinProcessing(false);
      setTimeout(() => setPinError(false), 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-sm mx-4 sm:mx-6 md:mx-auto rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2 uppercase tracking-wide">
            {screen === "pin" ? (
              <>
                <ShieldAlert size={18} className="text-red-500 animate-pulse" /> Aprobación Admin
              </>
            ) : (
              <>
                <Calculator size={18} className="text-red-500" /> Descuento
              </>
            )}
          </h3>
          <button
            onClick={screen === "pin" ? () => setScreen("discount") : onClose}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {screen === "discount" ? (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Toggle Type */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setType("percentage");
                  setValue("");
                  inputRef.current?.focus();
                }}
                className={`flex flex-1 items-center justify-center gap-1 py-2 text-xs font-black rounded-lg transition-all duration-300 ${
                  type === "percentage"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-red-600 scale-100 ring-1 ring-slate-900/5 dark:ring-white/10"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 scale-95"
                }`}
              >
                <Percent size={13} /> Porcentaje
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("fixed");
                  setValue("");
                  inputRef.current?.focus();
                }}
                className={`flex flex-1 items-center justify-center gap-1 py-2 text-xs font-black rounded-lg transition-all duration-300 ${
                  type === "fixed"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-red-600 scale-100 ring-1 ring-slate-900/5 dark:ring-white/10"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 scale-95"
                }`}
              >
                <DollarSign size={13} /> Monto ($)
              </button>
            </div>

            {/* Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                {type === "percentage" ? (
                  <Percent size={18} className="text-slate-400 group-focus-within:text-red-500 transition-colors" />
                ) : (
                  <DollarSign size={18} className="text-slate-400 group-focus-within:text-red-500 transition-colors" />
                )}
              </div>
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={value}
                onChange={(e) => {
                  let val = e.target.value;
                  if (type === "percentage" && parseFloat(val) > 100) val = "100";
                  setValue(val);
                }}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-xl font-black text-slate-800 dark:text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-center"
                placeholder={type === "percentage" ? "0%" : "0.00"}
                autoFocus
              />
            </div>

            {/* Limit warning */}
            {needsApproval && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2 animate-pulse">
                <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-snug">
                  Supera el límite de {maxDiscountPercent}% para cajeros. Se requerirá PIN de administrador para autorizar.
                </p>
              </div>
            )}

            {/* Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/65 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Subtotal original:</span>
                <span className="text-slate-700 dark:text-slate-300 font-black">${cartSubtotalUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-red-500 font-bold">Descuento aplicado:</span>
                <span className="text-red-500 font-black">-${discountAmountUsd.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-150 dark:border-slate-800/60 flex justify-between items-end">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Final:</span>
                <div className="text-right">
                  <span className="text-lg font-black text-red-600 dark:text-red-500 leading-none block">
                    ${newTotalUsd.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Bs {formatBs(newTotalBs)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={handleClear}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 text-xs font-bold rounded-xl active:scale-95 transition-all outline-none"
              >
                Quitar
              </button>
              <button
                type="submit"
                className={`py-3 text-xs font-black rounded-xl active:scale-95 transition-all outline-none shadow-md text-white ${
                  needsApproval
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
                    : "bg-red-500 hover:bg-red-600 shadow-red-500/10"
                }`}
              >
                {needsApproval ? "Solicitar →" : "Aplicar"}
              </button>
            </div>
          </form>
        ) : (
          /* PIN approval screen */
          <div className="p-5 flex flex-col items-center gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              El cajero solicita un descuento de{" "}
              <strong className="text-slate-800 dark:text-white">
                {type === "percentage" ? `${numValue}%` : `$${numValue}`}
              </strong>
              .<br />
              <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                Un Administrador debe ingresar su PIN para autorizar la transacción.
              </span>
            </p>

            {/* PIN dots indicators */}
            <div className={`flex justify-center gap-2.5 my-1 ${pinError ? "animate-shake" : ""}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border transition-all duration-150 ${
                    pinError
                      ? "bg-red-500 border-red-500"
                      : i < adminPin.length
                      ? "bg-red-500 border-red-500 scale-110"
                      : "bg-transparent border-slate-300 dark:border-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Numeric Numpad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[210px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePinDigit(String(n))}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white text-base font-black hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200/50 dark:border-slate-700/60 transition-all"
                >
                  {n}
                </button>
              ))}
              <div />
              <button
                key="0"
                type="button"
                onClick={() => handlePinDigit("0")}
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white text-base font-black hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200/50 dark:border-slate-700/60 transition-all"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 active:scale-95 border border-slate-200/50 dark:border-slate-700/60 transition-all"
              >
                <Delete size={17} />
              </button>
            </div>

            {pinError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">PIN Incorrecto</p>}

            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-6px); }
                40%, 80% { transform: translateX(6px); }
              }
              .animate-shake { animation: shake 0.4s ease-in-out; }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
