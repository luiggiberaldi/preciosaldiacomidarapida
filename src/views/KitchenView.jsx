import React, { useState, useEffect, useRef } from "react";
import { storageService } from "../utils/storageService";
import { webSupabase, getTenantId } from "../utils/supabase";
import { parseOrderNotes } from "../utils/parseOrderNotes";
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
  Car,
  LayoutGrid,
  List,
  PlayCircle,
} from "lucide-react";
import { showToast } from "../components/Toast";
import { useSounds } from "../hooks/useSounds";
import { WEB_ORDER_STATUS } from "../utils/constants";
import WebOrderStatusBadge from "../components/WebOrderStatusBadge";

const SALES_KEY = "bodega_sales_v1";

// ─── HELPERS ──────────────────────────────────────────────
function formatWaitTime(mins) {
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getWaitColor(mins) {
  if (mins >= 15)
    return {
      border: "border-red-500",
      bg: "bg-red-500",
      text: "text-red-600",
      badge: "bg-red-500 text-white",
      glow: "shadow-red-500/30",
      ring: "ring-red-500/30",
    };
  if (mins >= 10)
    return {
      border: "border-orange-400",
      bg: "bg-orange-400",
      text: "text-orange-600",
      badge: "bg-orange-400 text-white",
      glow: "shadow-orange-400/20",
      ring: "ring-orange-400/20",
    };
  return {
    border: "border-emerald-400",
    bg: "bg-emerald-400",
    text: "text-emerald-600",
    badge: "bg-emerald-500 text-white",
    glow: "",
    ring: "",
  };
}

function getDeliveryConfig(order) {
  if (order.deliveryType === "DELIVERY")
    return { label: "DELIVERY", icon: "🛵", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" };
  if (order.deliveryType === "LLEVAR")
    return { label: "PARA LLEVAR", icon: "📦", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" };
  if (order.deliveryType === "MESA_QR")
    return { label: `MESA ${order.tableNumber || ""}`, icon: "🍽️", color: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" };
  if (order.source === "WEB")
    return { label: "PEDIDO WEB", icon: "🌐", color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" };
  return { label: "LOCAL", icon: "🍽️", color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" };
}

function getNormalizedStatus(order) {
  if (order.source === "WEB") return order.status;
  if (order.kitchenStatus === "READY") return WEB_ORDER_STATUS.READY;
  if (order.kitchenStatus === "PREPARING") return WEB_ORDER_STATUS.PREPARING;
  return WEB_ORDER_STATUS.PENDING;
}

// ─── MAIN COMPONENT ──────────────────────────────────────
export default function KitchenView({ triggerHaptic, onNavigate }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState("TODOS");
  const [viewMode, setViewMode] = useState("list"); // "list" | "kanban"
  const [showProduction, setShowProduction] = useState(false);

  const { playBell, playTap, playSuccess } = useSounds();
  const prevIdsRef = useRef([]);
  const urgentRef = useRef(null);

  // ─── DATA LOADING ─────────────────────────────────────
  const loadOrders = async () => {
    const sales = await storageService.getItem(SALES_KEY, []);
    const localPending = sales
      .filter((s) => (s.kitchenStatus === "PENDING" || s.kitchenStatus === "PREPARING" || s.kitchenStatus === "READY") && s.status !== "ANULADA")
      .map((s) => ({ ...s, source: "LOCAL", orderNotes: s.notes || "", customerPhone: s.customerPhone || "" }));

    let webPending = [];
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await webSupabase
        .from("web_orders")
        .select("*")
        .eq("tenant_id", getTenantId())
        .gte("created_at", startOfDay.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;

      webPending = (data || [])
        .map((wo, index) => { wo._dailySequence = index + 1; return wo; })
        .filter((wo) => [WEB_ORDER_STATUS.PENDING, WEB_ORDER_STATUS.CONFIRMED, WEB_ORDER_STATUS.PREPARING, WEB_ORDER_STATUS.READY].includes(wo.status))
        .map((wo) => {
          const parsed = parseOrderNotes(wo.customer_notes);
          let normalizedStatus = wo.status;
          if (wo.status === WEB_ORDER_STATUS.CONFIRMED) normalizedStatus = WEB_ORDER_STATUS.PENDING;
          return {
            id: wo.id,
            source: "WEB",
            status: normalizedStatus,
            saleNumber: `W${String(wo._dailySequence).padStart(2, "0")}`,
            customerName: wo.customer_name,
            customerPhone: wo.customer_phone || "",
            deliveryType: parsed.deliveryType,
            tableNumber: parsed.tableNumber,
            orderNotes: parsed.cleanNotes,
            _gpsLink: parsed.gpsLink,
            timestamp: wo.updated_at || wo.created_at,
            items: wo.items.map((wi) => {
              const extras = wi.selectedExtras?.length ? "Extras: " + wi.selectedExtras.map((e) => e.name).join(", ") : "";
              const instrucciones = wi.note ? `📝 ${wi.note}` : "";
              const noteText = [extras, instrucciones].filter(Boolean).join(" | ");
              return { id: wi.id, name: wi.name + (wi.size ? ` [${wi.size}]` : ""), qty: wi.qty, note: noteText };
            }),
          };
        });
    } catch (error) {
      console.error("Error fetching web orders for kitchen:", error);
    }

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to urgent
  useEffect(() => {
    if (urgentRef.current) {
      urgentRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [pendingOrders]);

  // ─── HANDLERS ─────────────────────────────────────────
  const getOrderNotesDisplay = (order) => ({
    text: order.orderNotes || "",
    link: order._gpsLink || null,
  });

  const handleNotifyWhatsApp = (order) => {
    let phoneToUse = order.customerPhone;
    if (!phoneToUse) phoneToUse = window.prompt("Ingresa el numero de WhatsApp (ej: 04141234567):");
    if (!phoneToUse) return;
    const cleanPhone = phoneToUse.replace(/\D/g, "");
    if (!cleanPhone) { showToast("Numero invalido", "error"); return; }
    const correlative = order.source === "WEB" ? order.saleNumber : `#${String(order.saleNumber).padStart(2, "0")}`;
    const clName = order.customerName && order.customerName !== "Consumidor Final" ? order.customerName : "amigo";
    let text = "";
    if (order.deliveryType === "DELIVERY") {
      text = `Hola ${clName}!\n\nTe avisamos desde *PreciosAlDia* que tu pedido ${correlative} ya va en camino.\n\nAtento a la puerta!`;
    } else {
      text = `Hola ${clName}!\n\nTe avisamos desde *PreciosAlDia* que tu pedido ${correlative} ya esta LISTO.\n\nTe esperamos!`;
    }
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleNotifyMotorizado = (order) => {
    const { text: notes, link } = getOrderNotesDisplay(order);
    const correlative = order.source === "WEB" ? order.saleNumber : `#${String(order.saleNumber).padStart(2, "0")}`;
    let text = `*NUEVO DELIVERY* ${correlative}\n`;
    text += `Cliente: ${order.customerName && order.customerName !== "Consumidor Final" ? order.customerName : "Cliente"}\n`;
    if (order.customerPhone) text += `Telefono: ${order.customerPhone}\n`;
    if (link) text += `\n*Ubicacion GPS*:\n${link}\n`;
    if (notes) text += `\n*Referencias*:\n${notes}\n`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // ─── 3-STEP FLOW ──────────────────────────────────────
  const handleStartPreparing = async (orderId, source) => {
    if (triggerHaptic) triggerHaptic();
    playTap();
    try {
      if (source === "WEB") {
        const { error } = await webSupabase
          .from("web_orders")
          .update({ status: WEB_ORDER_STATUS.PREPARING, updated_at: new Date().toISOString() })
          .eq("id", orderId);
        if (error) throw error;
      } else {
        const allSales = await storageService.getItem(SALES_KEY, []);
        const updatedSales = allSales.map((s) => s.id === orderId ? { ...s, kitchenStatus: "PREPARING" } : s);
        await storageService.setItem(SALES_KEY, updatedSales);
      }
      setPendingOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        return o.source === "WEB"
          ? { ...o, status: WEB_ORDER_STATUS.PREPARING }
          : { ...o, kitchenStatus: "PREPARING" };
      }));
      showToast("Preparando pedido...", "info");
    } catch (error) {
      console.error("Error:", error);
      showToast("Error al actualizar", "error");
    }
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
        setLastCompletedOrder({ id: orderId, source: "WEB" });
      } else {
        const allSales = await storageService.getItem(SALES_KEY, []);
        const orderToComplete = allSales.find((s) => s.id === orderId);
        if (orderToComplete) {
          const updatedSales = allSales.map((s) => s.id === orderId ? { ...s, kitchenStatus: "COMPLETED" } : s);
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
      showToast("Las ordenes web una vez completadas no se pueden deshacer aqui.", "info");
      return;
    }
    if (triggerHaptic) triggerHaptic();
    playTap();
    try {
      const allSales = await storageService.getItem(SALES_KEY, []);
      const updatedSales = allSales.map((s) => s.id === lastCompletedOrder.id ? { ...s, kitchenStatus: "PENDING" } : s);
      await storageService.setItem(SALES_KEY, updatedSales);
      setLastCompletedOrder(null);
      loadOrders();
      showToast(`Orden #${lastCompletedOrder.saleNumber || ""} restaurada`, "info");
    } catch (error) {
      showToast("Error al restaurar la orden", "error");
    }
  };

  const getWaitTime = (timestamp) => Math.floor((now - new Date(timestamp)) / 60000);

  // ─── FILTERING ────────────────────────────────────────
  const filteredOrders = pendingOrders.filter((o) => {
    if (filter === "TODOS") return true;
    const s = getNormalizedStatus(o);
    if (filter === "PENDING") return s === WEB_ORDER_STATUS.PENDING;
    if (filter === "PREPARING") return s === WEB_ORDER_STATUS.PREPARING;
    if (filter === "READY") return s === WEB_ORDER_STATUS.READY;
    return true;
  });

  // Categorized for Kanban
  const newOrders = pendingOrders.filter((o) => getNormalizedStatus(o) === WEB_ORDER_STATUS.PENDING);
  const preparingOrders = pendingOrders.filter((o) => getNormalizedStatus(o) === WEB_ORDER_STATUS.PREPARING);
  const readyOrders = pendingOrders.filter((o) => getNormalizedStatus(o) === WEB_ORDER_STATUS.READY);

  // Production summary
  const productionItems = {};
  pendingOrders.forEach((o) => {
    const s = getNormalizedStatus(o);
    if (s !== WEB_ORDER_STATUS.READY) {
      o.items.forEach((item) => {
        const key = item.name;
        if (!productionItems[key]) productionItems[key] = 0;
        productionItems[key] += item.qty;
      });
    }
  });
  const productionList = Object.entries(productionItems).sort((a, b) => b[1] - a[1]);

  // Counts
  const urgentCount = pendingOrders.filter((o) => getWaitTime(o.timestamp) >= 15).length;
  const warningCount = pendingOrders.filter((o) => { const w = getWaitTime(o.timestamp); return w >= 10 && w < 15; }).length;

  // ─── LOADING ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-red-500 animate-spin" />
      </div>
    );
  }

  // ─── ORDER CARD ───────────────────────────────────────
  const OrderCard = ({ order, isFirstUrgent = false }) => {
    const waitMins = getWaitTime(order.timestamp);
    const colors = getWaitColor(waitMins);
    const isUrgent = waitMins >= 15;
    const orderTime = new Date(order.timestamp).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
    const delivery = getDeliveryConfig(order);
    const status = getNormalizedStatus(order);

    return (
      <div
        ref={isFirstUrgent ? urgentRef : null}
        className={`bg-white dark:bg-slate-900 rounded-2xl border-2 ${colors.border} overflow-hidden shadow-lg ${colors.glow} transition-all ${isUrgent ? "ring-2 " + colors.ring : ""}`}
      >
        {/* Order Header */}
        <div className="px-4 py-3 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-2xl font-black ${order.source === "WEB" ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-white"} tracking-tighter leading-none shrink-0`}>
              {order.source === "WEB" ? (
                <div className="flex items-center gap-1"><Globe size={22} /> WEB</div>
              ) : (
                `#${String(order.saleNumber || 0).padStart(2, "0")}`
              )}
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit ${delivery.color}`}>
                {delivery.icon} {delivery.label}
              </span>
              <WebOrderStatusBadge status={status} />
              {order.customerName && order.customerName !== "Consumidor Final" && (
                <span className="text-[10px] font-bold text-slate-400 truncate">{order.customerName}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${colors.badge}`}>
              <Clock size={12} />
              {formatWaitTime(waitMins)}
            </div>
            <span className="text-[9px] text-slate-400">{orderTime}</span>
          </div>
        </div>

        {/* Items */}
        <div className="px-4 py-3 space-y-2">
          {order.items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl ${colors.bg}/10 text-slate-800 dark:text-white font-black text-sm flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border ${colors.border}/20`}>
                {item.qty}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{item.name}</p>
                {item.note && (
                  <div className="mt-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg inline-block max-w-full">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{item.note}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Order Notes & GPS */}
          {(() => {
            const { text, link } = getOrderNotesDisplay(order);
            return (
              <>
                {text && (
                  <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-lg">
                    <p className="text-[9px] uppercase font-black text-red-600 dark:text-red-400 mb-0.5">Nota del Cliente:</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 italic leading-snug whitespace-pre-wrap">"{text}"</p>
                  </div>
                )}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="mt-2 w-full py-2 bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border border-sky-200 dark:border-sky-800/50 flex justify-center gap-2 items-center hover:bg-sky-100">
                    <MapPin size={14} /> Abrir mapa
                  </a>
                )}
              </>
            );
          })()}
        </div>

        {/* Action Buttons — 3-Step Flow */}
        <div className="px-4 pb-3 flex flex-col gap-2">
          {/* WhatsApp notify */}
          {(order.source === "WEB" || order.deliveryType === "LLEVAR" || order.deliveryType === "DELIVERY") && (
            <button onClick={() => handleNotifyWhatsApp(order)}
              className={`w-full py-2 ${order.deliveryType === "DELIVERY" ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50"} font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border flex justify-center gap-2 items-center`}>
              <MessageCircle size={14} />
              {order.deliveryType === "DELIVERY" ? "Avisar en Camino" : "Avisar Listo"}
            </button>
          )}

          {/* Motorizado button */}
          {order.deliveryType === "DELIVERY" && getOrderNotesDisplay(order).link && (
            <button onClick={() => handleNotifyMotorizado(order)}
              className="w-full py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] border border-indigo-200 dark:border-indigo-800/50 flex justify-center gap-2 items-center hover:bg-indigo-100">
              <Car size={14} /> Enviar Ruta al Motorizado
            </button>
          )}

          {/* 3-Step: Pending → Preparing → Completed */}
          {status === WEB_ORDER_STATUS.PENDING && (
            <button onClick={() => handleStartPreparing(order.id, order.source)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex justify-center gap-2 items-center shadow-lg shadow-orange-500/20">
              <PlayCircle size={18} /> Preparar Pedido
            </button>
          )}
          {status === WEB_ORDER_STATUS.PREPARING && (
            <button onClick={() => handleMarkAsReady(order.id, order.source)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex justify-center gap-2 items-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={18} /> Listo para Entregar!
            </button>
          )}
          {status === WEB_ORDER_STATUS.READY && (
            <button onClick={() => handleMarkAsReady(order.id, order.source)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex justify-center gap-2 items-center shadow-lg shadow-blue-500/20">
              <CheckCircle2 size={18} /> Entregar y Cerrar
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── KANBAN COLUMN ────────────────────────────────────
  const KanbanColumn = ({ title, icon, orders, color, emptyText }) => (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className={`flex items-center gap-2 mb-2 px-1`}>
        {icon}
        <span className={`text-xs font-black uppercase tracking-wider ${color}`}>{title}</span>
        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{orders.length}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-[10px] font-bold text-slate-300 dark:text-slate-600">{emptyText}</div>
        ) : (
          orders.map((o, i) => <OrderCard key={o.id} order={o} isFirstUrgent={i === 0 && getWaitTime(o.timestamp) >= 15} />)
        )}
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Flame size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none">Cocina</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {pendingOrders.length === 0 ? "Sin pedidos" : `${pendingOrders.length} pedido${pendingOrders.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {lastCompletedOrder && (
              <button onClick={handleUndo}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95">
                <RotateCcw size={12} /> Deshacer
              </button>
            )}
            {/* Toggle Production View */}
            <button onClick={() => setShowProduction(!showProduction)}
              className={`p-2 rounded-xl text-xs transition-all active:scale-95 ${showProduction ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
              title="Vista Produccion">
              <ChefHat size={16} />
            </button>
            {/* Toggle Kanban (only on larger screens) */}
            <button onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
              className={`p-2 rounded-xl text-xs transition-all active:scale-95 hidden sm:flex ${viewMode === "kanban" ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
              title="Vista Kanban">
              {viewMode === "kanban" ? <List size={16} /> : <LayoutGrid size={16} />}
            </button>
          </div>
        </div>

        {/* Summary Pills */}
        {pendingOrders.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            {urgentCount > 0 && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1 whitespace-nowrap animate-pulse">
                🔴 {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1 whitespace-nowrap">
                🟠 {warningCount} en espera
              </span>
            )}
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center gap-1 whitespace-nowrap">
              🔵 {newOrders.length} nuevos • 🟠 {preparingOrders.length} preparando • 🟢 {readyOrders.length} listos
            </span>
          </div>
        )}

        {/* Production Summary */}
        {showProduction && productionList.length > 0 && (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
            <p className="text-[9px] uppercase font-black text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
              <ChefHat size={10} /> Resumen de Produccion
            </p>
            <div className="flex flex-wrap gap-1.5">
              {productionList.map(([name, qty]) => (
                <span key={name} className="text-[11px] font-black bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200">
                  <span className="text-red-500">{qty}x</span> {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters — only in list mode */}
        {viewMode === "list" && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-1">
            {["TODOS", "PENDING", "PREPARING", "READY"].map((f) => {
              const labels = { TODOS: "Todos", PENDING: "Nuevos", PREPARING: "Preparando", READY: "Listos" };
              const counts = { TODOS: pendingOrders.length, PENDING: newOrders.length, PREPARING: preparingOrders.length, READY: readyOrders.length };
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${filter === f ? "bg-slate-800 text-white dark:bg-slate-700" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700"}`}>
                  {labels[f]}
                  {counts[f] > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === f ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`}>{counts[f]}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden px-4 pb-24">
        {pendingOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] flex items-center justify-center">
                <UtensilsCrossed size={48} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={20} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-700 dark:text-slate-300 mb-1">Todo al dia!</h2>
            <p className="text-sm text-slate-400 text-center max-w-[220px]">No hay pedidos pendientes. Los nuevos aparecen automaticamente.</p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-300 dark:text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Escuchando nuevos pedidos...
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          /* KANBAN VIEW — Desktop */
          <div className="h-full flex gap-4 overflow-hidden">
            <KanbanColumn title="Nuevos" icon={<Clock size={14} className="text-red-500" />} orders={newOrders} color="text-red-600 dark:text-red-400" emptyText="Sin pedidos nuevos" />
            <KanbanColumn title="Preparando" icon={<Flame size={14} className="text-orange-500" />} orders={preparingOrders} color="text-orange-600 dark:text-orange-400" emptyText="Nada preparandose" />
            <KanbanColumn title="Listos" icon={<CheckCircle2 size={14} className="text-emerald-500" />} orders={readyOrders} color="text-emerald-600 dark:text-emerald-400" emptyText="Nada listo aun" />
          </div>
        ) : (
          /* LIST VIEW */
          <div className="h-full overflow-y-auto scrollbar-hide space-y-3 pb-4">
            {filteredOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-slate-400 text-center">No hay pedidos en esta categoria.</p>
              </div>
            ) : (
              filteredOrders.map((order, i) => (
                <OrderCard key={order.id} order={order} isFirstUrgent={i === 0 && getWaitTime(order.timestamp) >= 15} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
