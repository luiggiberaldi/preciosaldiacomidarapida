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

  const [selectedSubMethods, setSelectedSubMethods] = useState(() => {
    const initial = {};
    if (paymentMethods.length > 0) {
      const bsEfectivo = paymentMethods.find(m => m.currency === "BS" && !m.isDigital && (m.id === "efectivo_bs" || m.label.toLowerCase().includes("efectivo")));
      const bsDigital = paymentMethods.find(m => m.currency === "BS" && m.isDigital);
      const bsPunto = paymentMethods.find(m => m.currency === "BS" && !m.isDigital && (m.id === "punto_venta" || (!m.id.includes("efectivo") && !m.label.toLowerCase().includes("efectivo"))));
      const usdEfectivo = paymentMethods.find(m => m.currency === "USD" && !m.isDigital);
      const usdDigital = paymentMethods.find(m => m.currency === "USD" && m.isDigital);

      if (bsEfectivo) initial["bs_efectivo"] = bsEfectivo.id;
      if (bsDigital) initial["bs_digital"] = bsDigital.id;
      if (bsPunto) initial["bs_punto"] = bsPunto.id;
      if (usdEfectivo) initial["usd_efectivo"] = usdEfectivo.id;
      if (usdDigital) initial["usd_digital"] = usdDigital.id;
    }
    return initial;
  });

  const handleSubMethodChange = useCallback((groupKey, oldMethodId, newMethodId) => {
    setBarValues(prev => {
      const val = prev[oldMethodId];
      if (!val) return prev;
      const next = { ...prev };
      next[newMethodId] = val;
      delete next[oldMethodId];
      return next;
    });
    setSelectedSubMethods(prev => ({ ...prev, [groupKey]: newMethodId }));
  }, []);

  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [changeUsdGiven, setChangeUsdGiven] = useState("");
  const [changeBsGiven, setChangeBsGiven] = useState("");
  const [saveChangeToWallet, setSaveChangeToWallet] = useState(false);
  const [deliveryType, setDeliveryType] = useState(() => {
    if (customerName && customerName.toLowerCase().startsWith("mesa")) {
      return "MESA_QR";
    }
    return "LOCAL";
  });


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

  const remainingUsd = Number(Math.max(0, cartTotalUsd - totalPaidUsd).toFixed(2));
  const remainingBs = Number((remainingUsd * effectiveRate).toFixed(2));
  const changeUsd = Number(Math.max(0, totalPaidUsd - cartTotalUsd).toFixed(2));
  const changeBs = Number(Math.max(0, totalPaidBs - cartTotalBs).toFixed(2));
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

  // Billetes rápidos desactivados

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

    let tableNumber = "";
    if (deliveryType === "MESA_QR" && customerName) {
      tableNumber = customerName.replace(/mesa\s+/gi, "").trim();
    }

    onConfirmSale(payments, {
      changeUsdGiven: saveChangeToWallet ? 0 : Math.min(parseFloat(changeUsdGiven) || 0, changeUsd),
      changeBsGiven: saveChangeToWallet ? 0 : Math.min(
        parseFloat(changeBsGiven) || 0,
        changeUsd * effectiveRate,
      ),
      deliveryType: deliveryType,
      tableNumber: tableNumber,
      saveChangeToWallet: saveChangeToWallet,
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
    customerName,
    saveChangeToWallet,
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

  // ── Agrupación y Estado de Sub-métodos ──
  const groupedMethodsUi = useMemo(() => {
    const bsEfectivo = paymentMethods.filter(m => m.currency === "BS" && !m.isDigital && (m.id === "efectivo_bs" || m.label.toLowerCase().includes("efectivo")));
    const bsDigital = paymentMethods.filter(m => m.currency === "BS" && m.isDigital);
    const bsPunto = paymentMethods.filter(m => m.currency === "BS" && !m.isDigital && m.id !== "efectivo_bs" && (!m.id.includes("efectivo") && !m.label.toLowerCase().includes("efectivo")));

    const usdEfectivo = paymentMethods.filter(m => m.currency === "USD" && !m.isDigital);
    const usdDigital = paymentMethods.filter(m => m.currency === "USD" && m.isDigital);

    return [
      { key: "usd_efectivo", currency: "USD", items: usdEfectivo },
      { key: "usd_digital", currency: "USD", items: usdDigital },
      { key: "bs_digital", currency: "BS", items: bsDigital },
      { key: "bs_efectivo", currency: "BS", items: bsEfectivo },
      { key: "bs_punto", currency: "BS", items: bsPunto },
    ].filter(g => g.items.length > 0);
  }, [paymentMethods]);



  const groupsUsd = groupedMethodsUi.filter((g) => g.currency === "USD");
  const groupsBs = groupedMethodsUi.filter((g) => g.currency === "BS");

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

  const renderPaymentGroup = (group, styles) => {
    const selectedId = selectedSubMethods[group.key] || group.items[0].id;
    const selectedMethod = group.items.find(m => m.id === selectedId) || group.items[0];

    const val = barValues[selectedId] || "";
    const hasValue = parseFloat(val) > 0;
    const equivUsd =
      group.currency === "BS" && hasValue
        ? (parseFloat(val) / effectiveRate).toFixed(2)
        : null;

    return (
      <div key={group.key} className="mb-3 last:mb-0">
        <div className="flex items-center gap-2 mb-1.5 ml-0.5">
          {(() => {
            const MIcon =
              selectedMethod.Icon ||
              PAYMENT_ICONS[selectedMethod.id] ||
              ICON_COMPONENTS[selectedMethod.icon];
            return MIcon ? (
              <MIcon size={16} className={hasValue ? "" : "text-slate-400"} />
            ) : (
              <span className="text-base leading-none">{selectedMethod.icon}</span>
            );
          })()}

          {group.items.length > 1 ? (
            <select
              value={selectedId}
              onChange={(e) => handleSubMethodChange(group.key, selectedId, e.target.value)}
              className={`text-[11px] font-bold uppercase tracking-wide bg-transparent outline-none cursor-pointer hover:underline ${hasValue ? styles.title : "text-slate-500 dark:text-slate-400"}`}
            >
              {group.items.map(m => (
                <option className="text-slate-800 dark:text-slate-900" key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          ) : (
            <span
              className={`text-[11px] font-bold uppercase tracking-wide ${hasValue ? styles.title : "text-slate-400 dark:text-slate-500"}`}
            >
              {selectedMethod.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => handleBarChange(selectedId, e.target.value)}
              placeholder={selectedId.includes("efectivo") ? "Monto recibido" : "0.00"}
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
              {group.currency === "USD" ? "$" : "Bs"}
            </span>
          </div>
          <button
            onClick={() => fillBar(selectedId, group.currency)}
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

      {/* ═══ TOTAL A PAGAR (Sticky at the top) ═══ */}
      <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-5 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Total a Pagar
          </span>
          {customerName && (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mt-0.5 max-w-[220px] truncate" title={customerName}>
              Pedido para: {customerName}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-500 block leading-tight">
            {formatBs(cartTotalBs)} Bs
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
            ${cartTotalUsd.toFixed(2)} USD ref.
          </span>
        </div>
      </div>

      {/* ═══ SCROLLABLE BODY ═══ */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4">
        {/* DELIVERY TYPE SELECTOR */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner max-w-[320px] mx-auto mb-1">
          {customerName && customerName.toLowerCase().startsWith("mesa") && (
            <button
              onClick={() => {
                triggerHaptic && triggerHaptic();
                setDeliveryType("MESA_QR");
              }}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                deliveryType === "MESA_QR"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Mesa ({customerName})
            </button>
          )}
          <button
            onClick={() => {
              triggerHaptic && triggerHaptic();
              setDeliveryType("LOCAL");
            }}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              deliveryType === "LOCAL"
                ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Comer Aquí
          </button>
          <button
            onClick={() => {
              triggerHaptic && triggerHaptic();
              setDeliveryType("LLEVAR");
            }}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              deliveryType === "LLEVAR"
                ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Para Llevar
          </button>
        </div>

        {/* ── SECCIÓN DÓLARES ($) ── */}
        {groupsUsd.length > 0 && (
          <div
            className={`rounded-2xl border ${sectionStyles.USD.bg} ${sectionStyles.USD.border} p-3`}
          >
            <h3
              className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${sectionStyles.USD.title}`}
            >
              <span className={`p-1 rounded-lg ${sectionStyles.USD.titleBg}`}>
                💲
              </span>
              Dólares ($)
            </h3>
            {/* Billetes rápidos removidos */}
            {groupsUsd.map((g) => renderPaymentGroup(g, sectionStyles.USD))}
          </div>
        )}

        {/* ── SECCIÓN BOLÍVARES (Bs) ── */}
        {groupsBs.length > 0 && (
          <div
            className={`rounded-2xl border ${sectionStyles.BS.bg} ${sectionStyles.BS.border} p-3`}
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
            {groupsBs.map((g) => renderPaymentGroup(g, sectionStyles.BS))}
          </div>
        )}

        {/* ── CLIENTE (colapsable) ── */}
        {customers.length > 0 && (
          <div className="py-1">
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
                        className={`ml-2 text-xs font-bold text-red-500`}
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
          <div className="py-1">
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

      {/* ═══ FOOTER FIJO (Vuelto + CTA) ═══ */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col">
        {/* BANNER VUELTO / RESTANTE / MONEDERO */}
        <div className="px-3 pt-3 pb-1 bg-slate-50/50 dark:bg-slate-900/10">
          {!isPaid ? (
            <div className="text-center py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl">
              <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-red-500 mb-1 flex items-center justify-center gap-1.5">
                {totalPaidUsd > 0 ? <Zap size={14} className="animate-pulse" /> : null}
                {totalPaidUsd > 0 ? "Monto insuficiente, faltan:" : "Resta por Cobrar"}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
                <span className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tighter">
                  Bs {formatBs(remainingBs)}
                </span>
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                  ({remainingUsd.toFixed(2)} USD ref.)
                </span>
              </div>
            </div>
          ) : changeUsd <= 0.009 ? (
            <div className="text-center py-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 rounded-2xl">
              <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                PAGO EXACTO
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                No requiere vuelto
              </p>
            </div>
          ) : (
            (() => {
              const totalGivenUsd = saveChangeToWallet
                ? changeUsd
                : (parseFloat(changeUsdGiven) || 0) + ((parseFloat(changeBsGiven) || 0) / effectiveRate);
              const remainingChangeUsd = Math.max(0, changeUsd - totalGivenUsd);
              const excessChangeUsd = Math.max(0, totalGivenUsd - changeUsd);
              const distributionPercent = changeUsd > 0 ? (totalGivenUsd / changeUsd) * 100 : 0;
              const isExact = Math.abs(totalGivenUsd - changeUsd) < 0.01;
              const isExcess = totalGivenUsd > changeUsd + 0.01;

              return (
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-150 dark:border-emerald-900/40 rounded-2xl p-3 shadow-sm space-y-3">
                  {/* Barra de progreso reactiva de 3px de alto absoluta en el borde superior */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-800">
                    <div
                      style={{ width: `${Math.min(100, distributionPercent)}%` }}
                      className={`h-full transition-all duration-300 ${
                        isExact
                          ? "bg-emerald-500"
                          : isExcess
                            ? "bg-red-500"
                            : "bg-amber-500"
                      }`}
                    />
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                    {/* Columna 1: Totales e Información */}
                    <div className="shrink-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          Vuelto del Cliente
                        </span>
                        <span className={
                          `text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                            isExact
                              ? "bg-emerald-500/10 border-emerald-200/50 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                              : isExcess
                                ? "bg-red-50 border-red-200 text-red-500 dark:bg-red-950/20 dark:border-red-900/50"
                                : "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50"
                          }`
                        }>
                          {isExact
                            ? "100%"
                            : isExcess
                              ? `Exceso $${excessChangeUsd.toFixed(2)}`
                              : `Falta $${remainingChangeUsd.toFixed(2)}`
                          }
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tighter">
                          ${changeUsd.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">USD ref.</span>
                        <span className="text-slate-350 dark:text-slate-700 text-xs">|</span>
                        <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                          {formatBs(changeBs)} Bs
                        </span>
                      </div>
                    </div>

                    {/* Columna 2: Inputs de distribución */}
                    {!saveChangeToWallet ? (
                      <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full">
                        {/* Input USD + Botón Todo */}
                        <div className="w-full sm:flex-1 flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={changeUsdGiven}
                              onChange={(e) => {
                                const v = e.target.value.replace(",", ".");
                                if (!/^[0-9.]*$/.test(v)) return;
                                const dots = v.match(/\./g);
                                if (dots && dots.length > 1) return;
                                
                                const parsedVal = parseFloat(v) || 0;
                                setChangeUsdGiven(v);
                                
                                const remaining = Math.max(0, changeUsd - parsedVal);
                                setChangeBsGiven(remaining > 0 ? (remaining * effectiveRate).toFixed(0) : "0");
                              }}
                              className="w-full py-1.5 px-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm text-slate-850 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950 px-1 py-0.5 rounded border border-amber-200">
                              USD
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic && triggerHaptic();
                              setChangeUsdGiven(changeUsd.toFixed(2));
                              setChangeBsGiven("0");
                            }}
                            className="h-8 px-2.5 bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 active:scale-95 transition-all font-extrabold text-[11px] rounded-lg shadow-sm shrink-0"
                          >
                            Todo
                          </button>
                        </div>

                        <span className="hidden sm:inline text-slate-350 font-bold text-xs">+</span>

                        {/* Input Bs + Botón Todo */}
                        <div className="w-full sm:flex-1 flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={changeBsGiven}
                              onChange={(e) => {
                                const v = e.target.value.replace(",", ".");
                                if (!/^[0-9.]*$/.test(v)) return;
                                const dots = v.match(/\./g);
                                if (dots && dots.length > 1) return;

                                const parsedVal = parseFloat(v) || 0;
                                setChangeBsGiven(v);
                                
                                const remaining = Math.max(0, changeUsd - (parsedVal / effectiveRate));
                                setChangeUsdGiven(remaining > 0 ? remaining.toFixed(2) : "0.00");
                              }}
                              className="w-full py-1.5 px-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm text-slate-850 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950 px-1 py-0.5 rounded border border-blue-200">
                              Bs
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic && triggerHaptic();
                              setChangeUsdGiven("0");
                              setChangeBsGiven((changeUsd * effectiveRate).toFixed(0));
                            }}
                            className="h-8 px-2.5 bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 active:scale-95 transition-all font-extrabold text-[11px] rounded-lg shadow-sm shrink-0"
                          >
                            Todo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 py-1.5 px-3 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-1.5 w-full">
                        <Check size={14} /> Vuelto abonado al monedero de {selectedCustomer?.name}
                      </div>
                    )}

                    {/* Columna 3: Botón de Monedero */}
                    <div className="shrink-0 w-full lg:w-auto flex justify-end">
                      {selectedCustomer ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic && triggerHaptic();
                            setSaveChangeToWallet(!saveChangeToWallet);
                          }}
                          className={`w-full lg:w-auto py-2 px-3.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 border ${
                            saveChangeToWallet
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-600/10"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm"
                          }`}
                        >
                          <Wallet size={13} />
                          {saveChangeToWallet ? "En Monedero ✓" : "A Monedero"}
                        </button>
                      ) : (
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-right w-full leading-tight">
                          Elige un cliente para usar monedero
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* BOTÓN CTA */}
        <div className="px-3 py-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedCustomerId && remainingUsd > 0.01}
            className={`w-full py-4 text-white font-black text-base sm:text-lg rounded-xl shadow-lg transition-all tracking-wide flex items-center justify-center gap-2.5 ${isPaid
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/25 active:scale-[0.98]"
              : selectedCustomerId
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/25 active:scale-[0.98]"
                : "bg-slate-300 dark:bg-slate-800 text-slate-500 shadow-none cursor-not-allowed"
              }`}
          >
            {isPaid ? (
              <>
                <Receipt size={20} /> CONFIRMAR VENTA
              </>
            ) : selectedCustomerId ? (
              <>
                <Users size={20} /> FIAR RESTANTE (${remainingUsd.toFixed(2)})
              </>
            ) : (
              <>
                <Receipt size={20} /> INGRESA LOS PAGOS
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
