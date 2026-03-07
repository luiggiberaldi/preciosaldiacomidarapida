import React, { useState, useCallback, useMemo } from "react";
import {
  X,
  Users,
  Receipt,
  ChevronDown,
  Wallet,
  Zap,
  UserPlus,
  Check,
  ArrowLeftRight,
} from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";
import { PAYMENT_ICONS, ICON_COMPONENTS } from "../../config/paymentMethods";

/**
 * CheckoutModal — Zona de Cobro con Barras de Pago (Estilo Listo POS)
 * Cada método de pago tiene su propia barra con input + botón TOTAL.
 */
export default function CheckoutModal({
  onClose,
  cartTotalUsd,
  cartTotalBs,
  effectiveRate,
  tasaBcv,
  customerName,
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  paymentMethods,
  onConfirmSale,
  onUseSaldoFavor,
  triggerHaptic,
  onCreateCustomer,
}) {
  // ── State: un valor por barra ──
  const [barValues, setBarValues] = useState({});
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [changeUsdGiven, setChangeUsdGiven] = useState("");
  const [changeBsGiven, setChangeBsGiven] = useState("");
  const [deliveryType, setDeliveryType] = useState("LOCAL"); // LOCAL | LLEVAR

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // ── Cálculos bimoneda ──
  const totalPaidUsd = useMemo(() => {
    return paymentMethods.reduce((sum, m) => {
      const val = parseFloat(barValues[m.id]) || 0;
      return sum + (m.currency === "USD" ? val : val / effectiveRate);
    }, 0);
  }, [barValues, paymentMethods, effectiveRate]);

  const totalPaidBs = useMemo(
    () =>
      paymentMethods.reduce((sum, m) => {
        const val = parseFloat(barValues[m.id]) || 0;
        return sum + (m.currency === "BS" ? val : val * effectiveRate);
      }, 0),
    [barValues, paymentMethods, effectiveRate],
  );

  const remainingUsd = Math.max(0, cartTotalUsd - totalPaidUsd);
  const remainingBs = remainingUsd * effectiveRate;
  const changeUsd = Math.max(0, totalPaidUsd - cartTotalUsd);
  const changeBs = Math.max(0, totalPaidBs - cartTotalBs);
  const isPaid = remainingUsd <= 0.01;

  // ── Handlers ──
  const handleBarChange = useCallback((methodId, value) => {
    // Solo números y punto decimal
    let v = value.replace(",", ".");
    if (!/^[0-9.]*$/.test(v)) return;
    const dots = v.match(/\./g);
    if (dots && dots.length > 1) return;
    setBarValues((prev) => ({ ...prev, [methodId]: v }));
  }, []);

  const handleFastCash = useCallback(
    (amount) => {
      triggerHaptic && triggerHaptic();
      const current = parseFloat(barValues["efectivo_usd"]) || 0;
      setBarValues((prev) => ({
        ...prev,
        efectivo_usd: (current + amount).toString(),
      }));
    },
    [barValues, triggerHaptic],
  );

  const fillBar = useCallback(
    (methodId, currency) => {
      triggerHaptic && triggerHaptic();
      const remaining = currency === "USD" ? remainingUsd : remainingBs;
      if (remaining <= 0) return;
      const val = Number(remaining.toFixed(2)).toString();
      setBarValues((prev) => ({ ...prev, [methodId]: val }));
    },
    [remainingUsd, remainingBs, triggerHaptic],
  );

  // Construir payments[] desde barValues al confirmar
  const handleConfirm = useCallback(() => {
    triggerHaptic && triggerHaptic();
    const payments = paymentMethods
      .filter((m) => parseFloat(barValues[m.id]) > 0)
      .map((m) => {
        const amount = parseFloat(barValues[m.id]);
        return {
          id: crypto.randomUUID(),
          methodId: m.id,
          methodLabel: m.label,
          currency: m.currency,
          amountInput: amount,
          amountInputCurrency: m.currency,
          amountUsd: m.currency === "USD" ? amount : amount / effectiveRate,
          amountBs: m.currency === "BS" ? amount : amount * effectiveRate,
        };
      });
    onConfirmSale(payments, {
      changeUsdGiven: Math.min(parseFloat(changeUsdGiven) || 0, changeUsd),
      changeBsGiven: Math.min(
        parseFloat(changeBsGiven) || 0,
        changeUsd * effectiveRate,
      ),
      deliveryType: deliveryType,
    });
  }, [
    barValues,
    paymentMethods,
    effectiveRate,
    onConfirmSale,
    triggerHaptic,
    changeUsdGiven,
    changeBsGiven,
    changeUsd,
    deliveryType,
  ]);

  // Saldo a favor
  const handleSaldoFavor = useCallback(() => {
    triggerHaptic && triggerHaptic();
    if (onUseSaldoFavor) onUseSaldoFavor();
  }, [onUseSaldoFavor, triggerHaptic]);

  // Crear cliente inline
  const handleCreateClient = async () => {
    if (!newClientName.trim() || !onCreateCustomer) return;
    setSavingClient(true);
    try {
      const newCustomer = await onCreateCustomer(
        newClientName.trim(),
        newClientPhone.trim(),
      );
      setSelectedCustomerId(newCustomer.id);
      setNewClientName("");
      setNewClientPhone("");
      setShowNewCustomerForm(false);
      setShowCustomerPicker(false);
    } finally {
      setSavingClient(false);
    }
  };

  // Agrupar métodos por moneda y reordenarlos (Pago Móvil > Efectivo Bs > Efectivo USD)
  const sortMethods = (a, b) => {
    const order = { pago_movil: 1, efectivo_bs: 2, efectivo_usd: 3, punto_venta: 4 };
    const aOrder = order[a.id] || 99;
    const bOrder = order[b.id] || 99;
    return aOrder - bOrder;
  };

  const methodsUsd = paymentMethods.filter((m) => m.currency === "USD").sort(sortMethods);
  const methodsBs = paymentMethods.filter((m) => m.currency === "BS").sort(sortMethods);

  // ── Estilos de barra por moneda ──
  const sectionStyles = {
    USD: {
      bg: "bg-amber-50/50 dark:bg-amber-950/20",
      border: "border-amber-100 dark:border-amber-900/50",
      title: "text-amber-800 dark:text-amber-300",
      titleBg: "bg-amber-100 dark:bg-amber-900/50",
      titleIcon: "text-red-600 dark:text-red-400",
      inputBorder:
        "border-amber-200 dark:border-amber-800 focus:border-red-500 focus:ring-red-500/20",
      inputActive:
        "border-red-400 dark:border-red-600 bg-amber-50 dark:bg-amber-950/30",
      btnBg:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 active:bg-amber-300",
    },
    BS: {
      bg: "bg-blue-50/50 dark:bg-blue-950/20",
      border: "border-blue-100 dark:border-blue-900/50",
      title: "text-blue-800 dark:text-blue-300",
      titleBg: "bg-blue-100 dark:bg-blue-900/50",
      titleIcon: "text-blue-600 dark:text-blue-400",
      inputBorder:
        "border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:ring-blue-500/20",
      inputActive:
        "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30",
      btnBg:
        "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 active:bg-blue-300",
    },
  };

  const renderPaymentBar = (method, styles) => {
    const val = barValues[method.id] || "";
    const hasValue = parseFloat(val) > 0;
    const equivUsd =
      method.currency === "BS" && hasValue
        ? (parseFloat(val) / effectiveRate).toFixed(2)
        : null;

    return (
      <div key={method.id} className="mb-3 last:mb-0">
        <div className="flex items-center gap-2 mb-1 ml-0.5">
          {(() => {
            const MIcon =
              method.Icon ||
              PAYMENT_ICONS[method.id] ||
              ICON_COMPONENTS[method.icon];
            return MIcon ? (
              <MIcon size={16} className={hasValue ? "" : "text-slate-400"} />
            ) : (
              <span className="text-base">{method.icon}</span>
            );
          })()}
          <span
            className={`text-[11px] font-bold uppercase tracking-wide ${hasValue ? styles.title : "text-slate-400 dark:text-slate-500"}`}
          >
            {method.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => handleBarChange(method.id, e.target.value)}
              placeholder={method.id.includes("efectivo") ? "Monto recibido" : "0.00"}
              className={`w-full py-3 px-4 pr-14 rounded-xl border-2 text-lg font-bold outline-none transition-all ${hasValue
                  ? styles.inputActive
                  : `bg-white dark:bg-slate-900 ${styles.inputBorder}`
                } text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-4`}
            />
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black px-2 py-0.5 rounded-md border ${hasValue
                  ? `${styles.titleBg} ${styles.title} ${styles.border}`
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
            >
              {method.currency === "USD" ? "$" : "Bs"}
            </span>
          </div>
          <button
            onClick={() => fillBar(method.id, method.currency)}
            className={`shrink-0 py-3 px-3.5 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center gap-1 ${styles.btnBg}`}
          >
            <Zap size={14} fill="currentColor" /> Total
          </button>
        </div>
        {equivUsd && (
          <p className="text-[11px] font-bold text-blue-500 dark:text-blue-400 mt-1 ml-1">
            ≈ ${equivUsd}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={22} />
        </button>
        <h2 className="text-base font-black text-slate-800 dark:text-white tracking-wide">
          COBRAR
        </h2>
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
          {formatBs(tasaBcv || effectiveRate)} Bs/$
        </span>
      </div>

      {/* ═══ SCROLLABLE BODY ═══ */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-28">
        {/* ── TOTAL BIMONEDA ── */}
        <div className="px-4 py-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center mb-1">
            Total a Pagar
          </p>
          {customerName && (
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 text-center mb-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg inline-block mx-auto">
              Pedido para: {customerName}
            </p>
          )}
          <div className="text-center mb-4 flex flex-col items-center">
            <span className="text-4xl font-black text-red-600 dark:text-red-500 leading-none tracking-tighter mb-1">
              {formatBs(cartTotalBs)} Bs
            </span>
            <span className="text-sm font-bold text-slate-400 block mb-1">
              {cartTotalUsd.toFixed(2)} USD ref.
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Tasa BCV: {formatBs(tasaBcv || effectiveRate)} Bs/$
            </span>
          </div>

          {/* DELIVERY TYPE SELECTOR */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner max-w-[240px] mx-auto">
            <button
              onClick={() => {
                triggerHaptic && triggerHaptic();
                setDeliveryType("LOCAL");
              }}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${deliveryType === "LOCAL" ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Comer Aquí
            </button>
            <button
              onClick={() => {
                triggerHaptic && triggerHaptic();
                setDeliveryType("LLEVAR");
              }}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${deliveryType === "LLEVAR" ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Para Llevar
            </button>
          </div>
        </div>

        {/* ── SECCIÓN DÓLARES ($) ── */}
        {methodsUsd.length > 0 && (
          <div
            className={`mx-3 mb-3 rounded-2xl border ${sectionStyles.USD.bg} ${sectionStyles.USD.border} p-3`}
          >
            <h3
              className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${sectionStyles.USD.title}`}
            >
              <span className={`p-1 rounded-lg ${sectionStyles.USD.titleBg}`}>
                💲
              </span>
              Dólares ($)
            </h3>
            {/* ── BILLETES RÁPIDOS ── */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[1, 5, 10, 20].map((bill) => (
                <button
                  key={bill}
                  onClick={() => handleFastCash(bill)}
                  className="bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 hover:border-red-400 dark:hover:bg-amber-900/40 text-amber-700 dark:text-red-400 font-black py-2.5 rounded-[14px] text-sm transition-all active:scale-[0.97]"
                >
                  ${bill}
                </button>
              ))}
            </div>
            {methodsUsd.map((m) => renderPaymentBar(m, sectionStyles.USD))}
          </div>
        )}

        {/* ── SECCIÓN BOLÍVARES (Bs) ── */}
        {methodsBs.length > 0 && (
          <div
            className={`mx-3 mb-3 rounded-2xl border ${sectionStyles.BS.bg} ${sectionStyles.BS.border} p-3`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${sectionStyles.BS.title}`}
              >
                <span className={`p-1 rounded-lg ${sectionStyles.BS.titleBg}`}>
                  💵
                </span>
                Bolívares (Bs)
              </h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${sectionStyles.BS.titleBg} ${sectionStyles.BS.title}`}
              >
                Tasa: {formatBs(effectiveRate)}
              </span>
            </div>
            {methodsBs.map((m) => renderPaymentBar(m, sectionStyles.BS))}
          </div>
        )}

        {/* ── BANNER VUELTO / RESTANTE ── */}
        <div className="px-3 py-2">
          <div
            className={`p-4 rounded-xl border-2 transition-all ${isPaid
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              }`}
          >
            {isPaid ? (
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">
                  SU VUELTO ES:
                </p>
                <p className="text-4xl font-black text-green-700 dark:text-green-400 tracking-tighter">
                  {changeUsd.toFixed(2)} USD
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-500 mt-1">
                  · {formatBs(changeBs)} Bs ·
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-1">
                  {totalPaidUsd > 0 ? "⚠️ Monto insuficiente, faltan:" : "Resta por Cobrar"}
                </p>
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tighter leading-none">
                    Bs {formatBs(remainingBs)}
                  </span>
                  <span className="text-sm font-bold text-slate-500 mt-0.5">
                    ({remainingUsd.toFixed(2)} USD)
                  </span>
                </div>
              </div>
            )}

            {/* DESGLOSE DE VUELTO — solo visible cuando hay vuelto */}
            {isPaid && changeUsd > 0.009 && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800 space-y-2">
                <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1">
                  <ArrowLeftRight size={10} />
                  Desglosar vuelto
                </p>

                {/* Fila: input USD + input Bs */}
                <div className="flex items-center gap-2">
                  {/* Input USD */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={changeUsdGiven}
                      onChange={(e) => {
                        const v = e.target.value;
                        const usd = Math.min(
                          Math.max(0, parseFloat(v) || 0),
                          changeUsd,
                        );
                        setChangeUsdGiven(v);
                        setChangeBsGiven(
                          Math.max(
                            0,
                            (changeUsd - usd) * effectiveRate,
                          ).toFixed(0),
                        );
                      }}
                      className="w-full py-2 px-3 pr-10 rounded-lg border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-900 font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-red-600 bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded">
                      USD
                    </span>
                  </div>

                  <span className="text-slate-400 font-black text-xs shrink-0">
                    +
                  </span>

                  {/* Input Bs */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={changeBsGiven}
                      onChange={(e) => {
                        const v = e.target.value;
                        const bsTotal = changeUsd * effectiveRate;
                        const bs = Math.min(
                          Math.max(0, parseFloat(v) || 0),
                          bsTotal,
                        );
                        setChangeBsGiven(v);
                        setChangeUsdGiven(
                          Math.max(0, changeUsd - bs / effectiveRate).toFixed(
                            2,
                          ),
                        );
                      }}
                      className="w-full py-2 px-3 pr-8 rounded-lg border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">
                      Bs
                    </span>
                  </div>
                </div>

                {/* Botones rápidos */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setChangeUsdGiven(changeUsd.toFixed(2));
                      setChangeBsGiven("0");
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 active:scale-95 transition-all border border-amber-200 dark:border-amber-800"
                  >
                    Todo $
                  </button>
                  <button
                    onClick={() => {
                      setChangeUsdGiven("0");
                      setChangeBsGiven((changeUsd * effectiveRate).toFixed(0));
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 active:scale-95 transition-all border border-blue-200 dark:border-blue-800"
                  >
                    Todo Bs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CLIENTE (colapsable) ── */}
        {customers.length > 0 && (
          <div className="px-3 py-2">
            <button
              onClick={() => setShowCustomerPicker(!showCustomerPicker)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  {selectedCustomer
                    ? selectedCustomer.name
                    : "Consumidor Final"}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${showCustomerPicker ? "rotate-180" : ""}`}
              />
            </button>
            {showCustomerPicker && (
              <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg max-h-40 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCustomerId("");
                    setShowCustomerPicker(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${!selectedCustomerId ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  Consumidor Final
                </button>
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setShowCustomerPicker(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium border-t border-slate-100 dark:border-slate-800 transition-colors ${selectedCustomerId === c.id ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  >
                    {c.name}
                    {c.deuda !== 0 && (
                      <span
                        className={`ml-2 text-xs font-bold ${c.deuda > 0 ? "text-red-500" : "text-red-500"}`}
                      >
                        {c.deuda > 0
                          ? `Debe $${c.deuda.toFixed(2)}`
                          : `Favor $${Math.abs(c.deuda).toFixed(2)}`}
                      </span>
                    )}
                  </button>
                ))}

                {/* Separador */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Botón/Form nuevo cliente */}
                {!showNewCustomerForm ? (
                  <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <UserPlus size={14} />
                    Nuevo cliente...
                  </button>
                ) : (
                  <div className="p-3 space-y-2 bg-slate-50 dark:bg-slate-900/50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Nombre del cliente *"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateClient()
                      }
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50"
                    />
                    <div className="w-full flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-red-500/50 transition-all overflow-hidden">
                      <span className="px-2 py-2 text-xs font-black text-blue-500 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0 select-none">
                        +58
                      </span>
                      <input
                        type="tel"
                        placeholder="0412 1234567"
                        value={newClientPhone}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/^\+?58/, "");
                          setNewClientPhone(clean);
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCreateClient()
                        }
                        className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-700 dark:text-white outline-none placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowNewCustomerForm(false);
                          setNewClientName("");
                          setNewClientPhone("");
                        }}
                        className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateClient}
                        disabled={!newClientName.trim() || savingClient}
                        className="flex-1 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check size={13} />
                        {savingClient ? "Guardando..." : "Crear"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Saldo a Favor */}
        {selectedCustomer?.deuda < -0.01 && remainingUsd > 0.01 && (
          <div className="px-3 py-1">
            <button
              onClick={handleSaldoFavor}
              className="w-full py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-red-400 hover:bg-amber-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Wallet size={16} /> Usar Saldo a Favor ($
              {Math.abs(selectedCustomer.deuda).toFixed(2)})
            </button>
          </div>
        )}
      </div>

      {/* ═══ BOTÓN CTA FIJO ═══ */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleConfirm}
          disabled={!selectedCustomerId && remainingUsd > 0.01}
          className={`w-full py-4 text-white font-black text-base rounded-2xl shadow-lg transition-all tracking-wide flex items-center justify-center gap-2 ${isPaid
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/25 active:scale-[0.98]"
              : selectedCustomerId
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/25 active:scale-[0.98]"
                : "bg-slate-300 dark:bg-slate-800 text-slate-500 shadow-none cursor-not-allowed"
            }`}
        >
          {isPaid ? (
            <>
              <Receipt size={18} /> CONFIRMAR VENTA
            </>
          ) : selectedCustomerId ? (
            <>
              <Users size={18} /> FIAR RESTANTE (${remainingUsd.toFixed(2)})
            </>
          ) : (
            <>
              <Receipt size={18} /> INGRESA LOS PAGOS
            </>
          )}
        </button>
      </div>
    </div>
  );
}
