import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  Store,
  ShoppingCart,
  Package,
  Coins,
  Key,
  Fingerprint,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getActivePaymentMethods,
  savePaymentMethods,
  FACTORY_PAYMENT_METHODS,
  PAYMENT_ICONS,
  ICON_COMPONENTS,
} from "../../config/paymentMethods";
import { showToast } from "../Toast";

const ICON_OPTIONS = [
  { key: "Banknote", Icon: Banknote },
  { key: "Smartphone", Icon: Smartphone },
  { key: "CreditCard", Icon: CreditCard },
  { key: "DollarSign", Icon: DollarSign },
  { key: "Store", Icon: Store },
  { key: "ShoppingCart", Icon: ShoppingCart },
  { key: "Package", Icon: Package },
  { key: "Coins", Icon: Coins },
  { key: "Key", Icon: Key },
  { key: "Fingerprint", Icon: Fingerprint },
];

export default function PaymentMethodsManager({ triggerHaptic }) {
  const [methods, setMethods] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCurrency, setNewCurrency] = useState("BS");
  const [newIcon, setNewIcon] = useState("Banknote");
  const [newIsDigital, setNewIsDigital] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    getActivePaymentMethods().then(setMethods);
  }, []);

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      showToast("Escribe un nombre para el metodo", "error");
      return;
    }
    triggerHaptic && triggerHaptic();
    const updated = [
      ...methods,
      {
        id: "custom_" + Date.now(),
        label: newLabel.trim(),
        icon: newIcon,
        currency: newCurrency,
        isFactory: false,
        isDigital: newIsDigital,
        paymentDetails: "",
      },
    ];
    await savePaymentMethods(updated);
    const hydrated = await getActivePaymentMethods();
    setMethods(hydrated);
    setNewLabel("");
    setNewIsDigital(false);
    setShowAdd(false);
    showToast("Metodo de pago agregado", "success");
  };

  const handleRemove = async (id) => {
    triggerHaptic && triggerHaptic();
    const updated = methods.filter((m) => m.id !== id);
    await savePaymentMethods(updated);
    const hydrated = await getActivePaymentMethods();
    setMethods(hydrated);
    showToast("Metodo eliminado", "success");
  };

  const handleToggleDigital = async (id) => {
    triggerHaptic && triggerHaptic();
    const updated = methods.map((m) =>
      m.id === id ? { ...m, isDigital: !m.isDigital } : m,
    );
    await savePaymentMethods(updated);
    const hydrated = await getActivePaymentMethods();
    setMethods(hydrated);
    const method = updated.find((m) => m.id === id);
    showToast(
      method.isDigital
        ? `${method.label} marcado como digital`
        : `${method.label} marcado como efectivo`,
      "info",
    );
  };

  const handleUpdateDetails = async (id, details) => {
    const updated = methods.map((m) =>
      m.id === id ? { ...m, paymentDetails: details } : m,
    );
    await savePaymentMethods(updated);
    setMethods(
      updated.map((m) => ({
        ...m,
        Icon: PAYMENT_ICONS[m.id] ?? ICON_COMPONENTS[m.icon] ?? null,
      })),
    );
  };

  const methodsBs = methods.filter((m) => m.currency === "BS");
  const methodsUsd = methods.filter((m) => m.currency === "USD");

  const renderMethod = (m) => {
    const isExpanded = expandedId === m.id;
    return (
      <div key={m.id} className="mb-2">
        <div className="flex items-center justify-between py-2.5 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {(() => {
              const MIcon =
                m.Icon || PAYMENT_ICONS[m.id] || ICON_COMPONENTS[m.icon];
              return MIcon ? (
                <MIcon size={18} className="text-slate-500 shrink-0" />
              ) : (
                <span className="text-lg shrink-0">{m.icon}</span>
              );
            })()}
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
              {m.label}
            </span>
            {m.isFactory && (
              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                Base
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Digital/Cash toggle */}
            <button
              onClick={() => handleToggleDigital(m.id)}
              title={m.isDigital ? "Digital (prepago)" : "Efectivo (presencial)"}
              className={`p-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1 ${m.isDigital
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
            >
              {m.isDigital ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="text-[10px]">{m.isDigital ? "Digital" : "Efectivo"}</span>
            </button>
            {/* Expand for details */}
            {m.isDigital && (
              <button
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                title="Datos de pago"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {/* Delete custom */}
            {!m.isFactory && (
              <button
                onClick={() => handleRemove(m.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        {/* Payment details (expanded) */}
        {m.isDigital && isExpanded && (
          <div className="mt-1 mx-1 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2.5">
              Datos para el cliente (se envian por WhatsApp)
            </label>

            {m.id === "pago_movil" || (m.currency === "BS" && m.id !== "efectivo_bs" && m.id !== "punto_venta") ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-0.5">Telefono</span>
                    <input
                      type="text"
                      placeholder="0412-1234567"
                      className="w-full py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={(m.paymentDetails || "").split(" / ")[0] || ""}
                      onChange={(e) => {
                        const parts = (m.paymentDetails || " / / ").split(" / ");
                        parts[0] = e.target.value;
                        handleUpdateDetails(m.id, parts.join(" / "));
                      }}
                      onBlur={() => showToast("Datos guardados", "success")}
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-0.5">Cedula/RIF</span>
                    <input
                      type="text"
                      placeholder="V-12345678"
                      className="w-full py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={(m.paymentDetails || "").split(" / ")[1] || ""}
                      onChange={(e) => {
                        const parts = (m.paymentDetails || " / ").split(" / ");
                        parts[1] = e.target.value;
                        if (parts.length < 3) parts.push("");
                        handleUpdateDetails(m.id, parts.join(" / "));
                      }}
                      onBlur={() => showToast("Datos guardados", "success")}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-0.5">Banco</span>
                  <input
                    type="text"
                    placeholder="Banesco"
                    className="w-full py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={(m.paymentDetails || "").split(" / ")[2] || ""}
                    onChange={(e) => {
                      const parts = (m.paymentDetails || " / ").split(" / ");
                      parts[2] = e.target.value;
                      handleUpdateDetails(m.id, parts.join(" / "));
                    }}
                    onBlur={() => showToast("Datos guardados", "success")}
                  />
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-0.5">
                  Correo / ID / Billetera
                </span>
                <input
                  type="text"
                  placeholder={m.id === "zelle" ? "correo@ejemplo.com" : "ID o Dirección de cuenta"}
                  className="w-full py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={m.paymentDetails || ""}
                  onChange={(e) => handleUpdateDetails(m.id, e.target.value)}
                  onBlur={() => showToast("Datos guardados", "success")}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <CreditCard size={16} /> Metodos de Pago
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 hover:underline"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Info banner */}
      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl">
        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-snug">
          <Wifi size={12} className="inline mr-1" />
          Los metodos marcados como <strong>Digital</strong> se enviaran automaticamente en el WhatsApp de confirmacion cuando el prepago este activado.
        </p>
      </div>

      {/* Formulario agregar */}
      {showAdd && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nombre del metodo..."
            className="w-full py-2.5 px-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setNewCurrency("BS")}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${newCurrency === "BS" ? "bg-blue-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"}`}
            >
              Bolivares (Bs)
            </button>
            <button
              onClick={() => setNewCurrency("USD")}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${newCurrency === "USD" ? "bg-red-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"}`}
            >
              Dolares ($)
            </button>
          </div>
          {/* Digital toggle */}
          <button
            onClick={() => setNewIsDigital(!newIsDigital)}
            className={`w-full py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${newIsDigital
              ? "bg-blue-500 text-white"
              : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
              }`}
          >
            {newIsDigital ? <Wifi size={14} /> : <WifiOff size={14} />}
            {newIsDigital ? "Digital (prepago remoto)" : "Efectivo (presencial)"}
          </button>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map(({ key, Icon }) => (
              <button
                key={key}
                onClick={() => setNewIcon(key)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${newIcon === key ? "bg-red-500 text-white ring-2 ring-amber-300 scale-110" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"}`}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors active:scale-[0.98]"
          >
            Guardar Metodo
          </button>
        </div>
      )}

      {/* Seccion Dolares */}
      {methodsUsd.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">
            Dolares ($)
          </p>
          {methodsUsd.map(renderMethod)}
        </div>
      )}

      {/* Seccion Bolivares */}
      {methodsBs.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">
            Bolivares (Bs)
          </p>
          {methodsBs.map(renderMethod)}
        </div>
      )}
    </div>
  );
}
