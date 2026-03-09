import React, { useState, useEffect, useRef } from "react";
import { storageService } from "../utils/storageService";
import { webSupabase, getTenantId } from "../utils/supabase";
import {
  Flame,
  CheckCircle2,
  Clock,
  Utensils,
  RotateCcw,
  ChefHat,
  UtensilsCrossed,
  Globe,
  MessageCircle,
  MapPin,
  Car
} from "lucide-react";
import { showToast } from "../components/Toast";
import { useSounds } from "../hooks/useSounds";

const SALES_KEY = "bodega_sales_v1";

export default function KitchenView({ triggerHaptic, onNavigate }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [now, setNow] = useState(new Date());

  const { playBell, playTap, playSuccess } = useSounds();
  const prevIdsRef = useRef([]);

  const loadOrders = async () => {
    // 1. Fetch Local Orders
    const sales = await storageService.getItem(SALES_KEY, []);
    const localPending = sales
      .filter((s) => s.kitchenStatus === "PENDING" && s.status !== "ANULADA")
      .map((s) => ({ ...s, source: "LOCAL", orderNotes: s.notes || "", customerPhone: s.customerPhone || "" }));

    // 2. Fetch Web Orders
    let webPending = [];
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await webSupabase
        .from("web_orders")
        .select("*")
        .eq("tenant_id", getTenantId())
        .gte("created_at", startOfDay.toISOString())
        .order("created_at", { ascending: true }); // Important to maintain index
      if (error) throw error;

      // Map web_orders to the expected structure
      webPending = (data || [])
        .map((wo, index) => {
          wo._dailySequence = index + 1;
          return wo;
        })
        .filter((wo) => wo.status === "kitchen")
        .map((wo) => {
          const notes = wo.customer_notes || "";
          let dType = "LLEVAR";
          let cleanNotes = notes;

          if (notes.includes("[EN EL LOCAL]")) {
            dType = "LOCAL";
            cleanNotes = notes.replace("[EN EL LOCAL]", "").trim();
          } else if (notes.includes("[PARA LLEVAR]")) {
            dType = "LLEVAR";
            cleanNotes = notes.replace("[PARA LLEVAR]", "").trim();
          } else if (notes.includes("[DELIVERY]")) {
            dType = "DELIVERY";
            cleanNotes = notes.replace("[DELIVERY]", "").trim();
          }

          return {
            id: wo.id,
            source: "WEB",
            saleNumber: `W${String(wo._dailySequence).padStart(2, "0")}`,
            customerName: wo.customer_name,
            customerPhone: wo.customer_phone || "",
            deliveryType: dType,
            orderNotes: cleanNotes,
            timestamp: wo.updated_at || wo.created_at,
            items: wo.items.map((wi) => {
              const extras = wi.selectedExtras?.length
                ? "Extras: " + wi.selectedExtras.map((e) => e.name).join(", ")
                : "";
              const instrucciones = wi.note ? `📝 ${wi.note}` : "";
              const noteText = [extras, instrucciones].filter(Boolean).join(" | ");
              return {
                id: wi.id,
                name: wi.name + (wi.size ? ` [${wi.size}]` : ""),
                qty: wi.qty,
                note: noteText,
              };
            }),
          };
        });
    } catch (error) {
      console.error("Error fetching web orders for kitchen:", error);
    }

    // 3. Merge and Sort by time
    const allPending = [...localPending, ...webPending];
    allPending.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const currentIds = allPending.map((o) => o.id);
    const hasNew = currentIds.some((id) => !prevIdsRef.current.includes(id));
    if (hasNew && prevIdsRef.current.length > 0) playBell();
    prevIdsRef.current = currentIds;

    setPendingOrders(allPending);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update timer every 30s
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatOrderNotes = (notes) => {
    if (!notes) return { text: "", link: null };
    const urlRegex = /(https:\/\/maps\.google\.com\/\?q=[^\s]+)/i;
    const match = notes.match(urlRegex);
    let link = null;
    let cleanText = notes;

    if (match) {
      link = match[1];
      cleanText = cleanText
        .replace(link, "")
        .replace(/Ubicación GPS:/gi, "")
        .replace(/\(Precisión aprox: [0-9]+m\)/gi, "")
        .replace(/\(Por favor añade referencias del lugar\)/gi, "")
        .replace(/^\s*[\r\n]/gm, "")
        .trim();
    }

    return { text: cleanText, link };
  };

  const handleNotifyWhatsApp = (order) => {
    let phoneToUse = order.customerPhone;
    if (!phoneToUse) {
      phoneToUse = window.prompt("Ingresa el número de WhatsApp (ej: 04141234567):");
    }
    if (!phoneToUse) return;

    const cleanPhone = phoneToUse.replace(/\D/g, "");
    if (!cleanPhone) {
      showToast("Número inválido", "error");
      return;
    }

    const correlative = order.source === "WEB" ? order.saleNumber : `#${String(order.saleNumber).padStart(2, "0")}`;
    const clName = order.customerName && order.customerName !== "Consumidor Final" ? order.customerName : "amigo";

    let text = "";
    if (order.deliveryType === "DELIVERY") {
      text = `¡Hola ${clName}! 👋\n\nTe avisamos desde *PreciosAlDía* que tu pedido ${correlative} ya va en camino 🛵💨.\n\n¡Atento a la puerta!`;
    } else {
      text = `¡Hola ${clName}! 👋\n\nTe avisamos desde *PreciosAlDía* que tu pedido ${correlative} ya está LISTO ✅🚀.\n\n¡Te esperamos!`;
    }

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleNotifyMotorizado = (order) => {
    const { text: notes, link } = formatOrderNotes(order.orderNotes);
    const correlative = order.source === "WEB" ? order.saleNumber : `#${String(order.saleNumber).padStart(2, "0")}`;

    let text = `📦 *NUEVO DELIVERY* ${correlative}\n`;
    text += `👤 ${order.customerName && order.customerName !== "Consumidor Final" ? order.customerName : "Cliente"}\n`;
    if (order.customerPhone) {
      text += `📞 ${order.customerPhone}\n`;
    }
    if (link) {
      text += `\n📍 *Ubicación GPS*:\n${link}\n`;
    }
    if (notes) {
      text += `\n📝 *Referencias*:\n${notes}\n`;
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleMarkAsReady = async (orderId, source) => {
    if (triggerHaptic) triggerHaptic();
    try {
      if (source === "WEB") {
        const { error } = await webSupabase
          .from("web_orders")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", orderId);
        if (error) throw error;
        // Currently, we don't support UNDO for web orders, but we can set the last completed for UI
        setLastCompletedOrder({ id: orderId, source: "WEB" });
      } else {
        const allSales = await storageService.getItem(SALES_KEY, []);
        const orderToComplete = allSales.find((s) => s.id === orderId);
        if (orderToComplete) {
          const updatedSales = allSales.map((s) =>
            s.id === orderId ? { ...s, kitchenStatus: "COMPLETED" } : s,
          );
          await storageService.setItem(SALES_KEY, updatedSales);
          setLastCompletedOrder({ ...orderToComplete, source: "LOCAL" });
        }
      }

      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      playSuccess();
      showToast("Orden lista para entregar", "success");
    } catch (error) {
      console.error("Error al actualizar orden:", error);
      showToast("Error al actualizar la orden", "error");
    }
  };

  const handleUndo = async () => {
    if (!lastCompletedOrder) return;
    if (lastCompletedOrder.source === "WEB") {
      showToast(
        "Las órdenes web una vez completadas no se pueden deshacer aquí.",
        "info",
      );
      return;
    }

    if (triggerHaptic) triggerHaptic();
    playTap();
    try {
      const allSales = await storageService.getItem(SALES_KEY, []);
      const updatedSales = allSales.map((s) =>
        s.id === lastCompletedOrder.id ? { ...s, kitchenStatus: "PENDING" } : s,
      );
      await storageService.setItem(SALES_KEY, updatedSales);
      setLastCompletedOrder(null);
      loadOrders();
      showToast(
        `Orden #${lastCompletedOrder.saleNumber || ""} restaurada`,
        "info",
      );
    } catch (error) {
      showToast("Error al restaurar la orden", "error");
    }
  };

  const getWaitTime = (timestamp) =>
    Math.floor((now - new Date(timestamp)) / 60000);

  const getWaitColor = (mins) => {
    if (mins >= 15)
      return {
        border: "border-red-500",
        bg: "bg-red-500",
        text: "text-red-500",
        badge: "bg-red-500 text-white",
        glow: "shadow-red-500/30",
      };
    if (mins >= 10)
      return {
        border: "border-orange-400",
        bg: "bg-orange-400",
        text: "text-orange-500",
        badge: "bg-orange-400 text-white",
        glow: "shadow-orange-400/20",
      };
    return {
      border: "border-emerald-400",
      bg: "bg-emerald-400",
      text: "text-emerald-500",
      badge: "bg-emerald-500 text-white",
      glow: "",
    };
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Flame size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none">
                Cocina
              </h1>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                {pendingOrders.length === 0
                  ? "Sin pedidos"
                  : `${pendingOrders.length} ${pendingOrders.length === 1 ? "pedido pendiente" : "pedidos pendientes"}`}
              </p>
            </div>
          </div>

          {lastCompletedOrder && (
            <button
              onClick={handleUndo}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw size={14} /> Deshacer
            </button>
          )}
        </div>

        {/* Summary pills */}
        {pendingOrders.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
            {(() => {
              const urgent = pendingOrders.filter(
                (o) => getWaitTime(o.timestamp) >= 15,
              ).length;
              const warning = pendingOrders.filter((o) => {
                const w = getWaitTime(o.timestamp);
                return w >= 10 && w < 15;
              }).length;
              const normal = pendingOrders.length - urgent - warning;
              return (
                <>
                  {urgent > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1 whitespace-nowrap">
                      🔴 {urgent} urgente{urgent > 1 ? "s" : ""}
                    </span>
                  )}
                  {warning > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1 whitespace-nowrap">
                      🟠 {warning} en espera
                    </span>
                  )}
                  {normal > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                      🟢 {normal} reciente{normal > 1 ? "s" : ""}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
        {pendingOrders.length === 0 ? (
          /* Empty State Premium */
          <div className="h-full flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] flex items-center justify-center">
                <UtensilsCrossed
                  size={48}
                  className="text-slate-300 dark:text-slate-600"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={20} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-700 dark:text-slate-300 mb-1">
              ¡Todo al día!
            </h2>
            <p className="text-sm text-slate-400 text-center max-w-[220px]">
              No hay pedidos pendientes. Los nuevos pedidos aparecerán aquí
              automáticamente.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-300 dark:text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Escuchando nuevos pedidos...
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => {
              const waitMins = getWaitTime(order.timestamp);
              const colors = getWaitColor(waitMins);
              const isUrgent = waitMins >= 15;
              const orderTime = new Date(order.timestamp).toLocaleTimeString(
                "es-VE",
                { hour: "2-digit", minute: "2-digit" },
              );

              return (
                <div
                  key={order.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border-2 ${colors.border} overflow-hidden shadow-lg ${colors.glow} transition-all ${isUrgent ? "animate-pulse" : ""}`}
                >
                  {/* Order Header */}
                  <div className="px-4 py-3 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-3xl font-black ${order.source === "WEB" ? "text-blue-600 dark:text-blue-400 text-2xl" : "text-slate-800 dark:text-white"} tracking-tighter leading-none`}
                      >
                        {order.source === "WEB" ? (
                          <div className="flex items-center gap-1">
                            <Globe size={24} /> WEB{" "}
                          </div>
                        ) : (
                          `#${String(order.saleNumber || 0).padStart(2, "0")}`
                        )}
                      </span>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${order.deliveryType === "LLEVAR" ||
                            order.deliveryType === "DELIVERY" ||
                            order.source === "WEB"
                            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                            : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            }`}
                        >
                          {order.source === "WEB"
                            ? "🌐 PEDIDO WEB"
                            : order.deliveryType === "DELIVERY"
                              ? "🛵 DELIVERY"
                              : order.deliveryType === "LLEVAR"
                                ? "📦 LLEVAR"
                                : "🍽️ LOCAL"}
                        </span>
                        {order.customerName &&
                          order.customerName !== "Consumidor Final" && (
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                              {order.customerName}
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${colors.badge}`}
                      >
                        <Clock size={12} />
                        {waitMins} min
                      </div>
                      <span className="text-[9px] text-slate-400">
                        {orderTime}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 space-y-2.5">
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-start gap-4"
                      >
                        <div
                          className={`w-9 h-9 rounded-2xl ${colors.bg}/10 dark:${colors.bg}/20 text-slate-800 dark:text-white font-black text-base flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border ${colors.border}/20`}
                        >
                          {item.qty}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-black text-slate-800 dark:text-slate-100 leading-tight">
                            {item.name}
                          </p>
                          {item.note && (
                            <div className="mt-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl inline-block max-w-full">
                              <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">
                                📝 {item.note}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Order Level Notes and GPS Map Link */}
                    {(() => {
                      const { text, link } = formatOrderNotes(order.orderNotes);
                      return (
                        <>
                          {text && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-lg">
                              <p className="text-[10px] uppercase font-black text-red-600 dark:text-red-400 mb-0.5">
                                Nota del Cliente:
                              </p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 italic leading-snug whitespace-pre-wrap">
                                "{text}"
                              </p>
                            </div>
                          )}
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 w-full py-2.5 bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border border-sky-200 dark:border-sky-800/50 flex justify-center gap-2 items-center hover:bg-sky-100 dark:hover:bg-sky-900/40"
                            >
                              <MapPin size={16} />
                              Abrir mapa para motorizado
                            </a>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Action */}
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    {(order.source === "WEB" ||
                      order.deliveryType === "LLEVAR" ||
                      order.deliveryType === "DELIVERY") && (
                        <button
                          onClick={() => handleNotifyWhatsApp(order)}
                          className={`w-full py-2 ${order.deliveryType === "DELIVERY" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100"} font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border flex justify-center gap-2 items-center`}
                        >
                          <MessageCircle size={16} />
                          {order.deliveryType === "DELIVERY" ? "Avisar en Camino" : "Avisar Listo"}
                        </button>
                      )}

                    {order.deliveryType === "DELIVERY" && formatOrderNotes(order.orderNotes).link && (
                      <button
                        onClick={() => handleNotifyMotorizado(order)}
                        className="w-full py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border border-indigo-200 dark:border-indigo-800/50 flex justify-center gap-2 items-center hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                      >
                        <Car size={16} />
                        Enviar Ruta al Motorizado
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkAsReady(order.id, order.source)}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex justify-center gap-2 items-center shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 size={18} />
                      ¡Listo para entregar!
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
