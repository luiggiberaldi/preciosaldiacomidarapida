import React, { useMemo, useState } from "react";
import { Smartphone, Check, ChefHat, MessageCircle, X, Edit, CreditCard, Trash2 } from "lucide-react";
import { useWebOrders } from "../hooks/useWebOrders";
import { formatBs } from "../utils/calculatorUtils";
import ConfirmDialog from "../components/ConfirmDialog";

export const InboxView = ({ rates, storeConfig, onNavigate }) => {
  const { orders, loading, updateOrderStatus } = useWebOrders();
  const [confirmCancel, setConfirmCancel] = useState(null);

  // The store needs a whatsapp number to send messages from. If it's not set, they can't easily reply.
  const storePhone = storeConfig?.whatsappNumber || "";

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "pending"),
    [orders],
  );
  const confirmedOrders = useMemo(
    () => orders.filter((o) => o.status === "confirmed"),
    [orders],
  );

  const handleConfirmWhatsApp = async (order) => {
    try {
      console.log("handleConfirmWhatsApp clicked for order:", order);
      // Construct the WhatsApp message
      let text = `Hola ${order.customer_name || 'Cliente'}, recibimos tu pedido en *${storeConfig?.name || "Comida Rapida"}*.\n\n`;
      text += `*Resumen de tu Orden:*\n`;

      const safeItems = order.items || [];
      safeItems.forEach((item) => {
        let itemDesc = `- ${item.qty || 1}x ${item.name || 'Producto'} ($${(Number(item.priceUsd || 0) * Number(item.qty || 1)).toFixed(2)})`;
        if (item.size) itemDesc += ` [${item.size}]`;
        item.selectedExtras?.forEach((ext) => {
          itemDesc += `\n  + ${ext.name}`;
        });
        if (item.note) itemDesc += `\n  📝 Nota: ${item.note}`;
        text += `${itemDesc}\n`;
      });

      text += `\n*TOTAL: $${Number(order.total_usd || 0).toFixed(2)}*`;
      if (rates?.euro?.price) {
        // We use a clean replace to avoid breaking URL encodings with rare spaces from Intl locales
        const totalBs = (Number(order.total_usd || 0) * rates.euro.price).toFixed(2);
        text += ` / *Bs ${totalBs}*`;
      }

      if (order.customer_notes) {
        text += `\n*Notas:* ${order.customer_notes}`;
      }

      text += `\n\nPor favor indicanos tu metodo de pago para procesarlo.`;

      // We open the chat with the CUSTOMER's phone
      const cleanPhone = (order.customer_phone || "").replace(/\D/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

      console.log("Updating order to confirmed status...");
      // Update status to confirmed
      await updateOrderStatus(order.id, "confirmed");

      console.log("Opening WhatsApp URL:", waUrl);
      // Open WhatsApp
      window.open(waUrl, "_blank");
    } catch (e) {
      console.error("Error in handleConfirmWhatsApp:", e);
      alert("Error procesando la accion: " + e.message);
    }
  };

  const handlePassToPos = (order, action = "checkout") => {
    // Convert Web order items to POS cart format
    const formattedItems = order.items.map((item) => {
      const notes = [];
      if (item.note) notes.push(`Nota: ${item.note}`);
      if (item.selectedExtras?.length > 0) {
        notes.push(`Extras: ${item.selectedExtras.map(e => e.name).join(", ")}`);
      }

      return {
        id: item.local_id || item.id,
        name: item.name + (item.size ? ` [${item.size}]` : ""),
        qty: item.qty || 1,
        priceUsd: parseFloat(item.priceUsd) || parseFloat(item.price) || 0,
        costBs: item.costBs || 0,
        isWeight: false,
        note: notes.join(" | "),
        _isWebItem: true
      };
    });

    const event = new CustomEvent("inject_cart", {
      detail: {
        items: formattedItems,
        webOrderId: order.id,
        action: action,
        clientName: order.customer_name,
        deliveryType: order.customer_notes?.includes("DELIVERY") ? "LLEVAR" : "LOCAL"
      }
    });

    window.dispatchEvent(event);
    if (onNavigate) onNavigate("ventas");
  };

  const handleCancel = (orderId) => {
    console.log("handleCancel clicked for orderId:", orderId);
    setConfirmCancel(orderId);
  };

  const confirmCancelOrder = async () => {
    if (confirmCancel) {
      await updateOrderStatus(confirmCancel, "cancelled");
      setConfirmCancel(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-pulse w-8 h-8 bg-red-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Bandeja de Pedidos</h1>
            <p className="text-red-100 text-sm opacity-90">
              Órdenes recibidas desde la página web
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Pending Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Nuevos Pedidos ({pendingOrders.length})
          </h2>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100">
              <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">
                No hay pedidos nuevos entrantes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  rates={rates}
                  actions={
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      {/* ACCIÓN SECUNDARIA: Ignorar */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }}
                        className="p-2.5 bg-gray-100 text-gray-400 hover:text-red-500 rounded-xl transition-colors active:scale-95 flex items-center justify-center pointer-events-auto"
                        title="Ignorar Pedido"
                      >
                        <Trash2 size={20} />
                      </button>

                      {/* ACCIÓN SECUNDARIA: Editar Localmente */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePassToPos(order, "edit"); }}
                        className="py-2.5 px-4 bg-blue-50 text-blue-600 font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2 pointer-events-auto"
                        title="Pasar a Caja para Editar"
                      >
                        <Edit size={16} /> Editar
                      </button>

                      {/* ACCIÓN PRIMARIA: Whatsapp Confirmación */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConfirmWhatsApp(order); }}
                        className="flex-[2] flex justify-center items-center gap-2 py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 active:scale-95 transition-transform pointer-events-auto"
                      >
                        <MessageCircle size={18} />
                        Confirmar WhatsApp
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Confirmed / Waiting for Payment Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Esperando Pago ({confirmedOrders.length})
          </h2>

          {confirmedOrders.length === 0 ? (
            <p className="text-gray-400 text-sm italic ml-7">
              Ningún pedido pendiente de pago.
            </p>
          ) : (
            <div className="space-y-4">
              {confirmedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  rates={rates}
                  isConfirmed={true}
                  actions={
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      {/* ACCIÓN SECUNDARIA: Cancelar Venta */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }}
                        className="p-2.5 bg-gray-100 text-gray-400 hover:text-red-500 rounded-xl transition-colors active:scale-95 flex items-center justify-center pointer-events-auto"
                        title="Cancelar Venta"
                      >
                        <X size={20} />
                      </button>

                      {/* ACCIÓN SECUNDARIA: Editar Localmente */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePassToPos(order, "edit"); }}
                        className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors active:scale-95 flex items-center justify-center pointer-events-auto"
                        title="Editar Pedido Libremente"
                      >
                        <Edit size={20} />
                      </button>

                      {/* ACCIÓN PRIMARIA: Pasar a Caja y Cobrar */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePassToPos(order, "checkout"); }}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 bg-[#1e293b] hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-slate-900/30 active:scale-95 transition-transform pointer-events-auto"
                      >
                        <CreditCard size={18} />
                        Cobrar en Caja
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        isOpen={!!confirmCancel}
        title="Cancelar pedido"
        message="Este pedido sera marcado como cancelado y no se podra revertir."
        confirmText="Si, cancelar"
        cancelText="Volver"
        variant="danger"
        onConfirm={confirmCancelOrder}
        onCancel={() => setConfirmCancel(null)}
      />
    </div>
  );
};

// Internal sub-component for repeated order structure
const OrderCard = ({ order, rates, isConfirmed, actions }) => {
  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border ${isConfirmed ? "border-green-100" : "border-orange-100"}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-lg leading-tight">
            {order.customer_name}
          </h3>
          <p className="text-gray-500 text-sm font-mono mt-0.5">
            {order.customer_phone}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-800 text-lg leading-tight">
            ${order.total_usd.toFixed(2)}
          </p>
          <p className="text-gray-400 text-xs">
            Bs{" "}
            {rates?.euro?.price
              ? formatBs(order.total_usd * rates.euro.price)
              : "..."}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm">
            <div className="flex justify-between text-gray-700">
              <span className="font-medium">
                <span className="text-red-500 font-bold mr-1">{item.qty}x</span>
                {item.name}{" "}
                {item.size ? `[${item.size}]` : ""}
              </span>
            </div>
            {item.selectedExtras && item.selectedExtras.length > 0 && (
              <p className="text-xs text-gray-500 ml-5 mt-0.5">
                + {item.selectedExtras.map((e) => e.name).join(", ")}
              </p>
            )}
            {item.note && (
              <p className="text-xs text-amber-600 ml-5 mt-0.5 italic">
                📝 Nota: {item.note}
              </p>
            )}
          </div>
        ))}
      </div>

      {order.customer_notes && (
        <div className="bg-yellow-50 text-yellow-800 text-sm p-2.5 rounded-lg border border-yellow-100 mb-3 italic">
          <span className="font-bold not-italic mr-1">Nota:</span>
          {order.customer_notes}
        </div>
      )}

      <div className="text-xs text-gray-400 flex justify-between items-center">
        <span>
          {new Date(order.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full font-medium ${isConfirmed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
        >
          {isConfirmed ? "WhatsApp Enviado" : "Recién llegado"}
        </span>
      </div>

      {actions}
    </div>
  );
};
