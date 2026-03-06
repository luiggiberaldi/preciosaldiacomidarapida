import React, { useState } from "react";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  Car,
} from "lucide-react";
import { supabase } from "../utils/supabase";

export default function CartOverlay({ cartHooks, isOpen, onClose }) {
  const { cart, removeFromCart, updateQty, clearCart, cartTotal, cartCount } =
    cartHooks;
  const [view, setView] = useState("cart"); // 'cart' | 'checkout' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("LOCAL"); // 'LOCAL' | 'LLEVAR'
  const [notes, setNotes] = useState("");

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setView("checkout");
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_notes: `${deliveryType === 'LLEVAR' ? '[PARA LLEVAR]' : '[EN EL LOCAL]'} ${notes.trim()}`.trim(),
        items: cart,
        total_usd: cartTotal,
        status: "pending",
      };

      const { error } = await supabase
        .from("web_orders")
        .insert([orderPayload]);
      if (error) throw error;

      clearCart();
      setView("success");

      // Optionally close after a few seconds
      setTimeout(() => {
        onClose();
        setView("cart"); // reset for next time
      }, 5000);
    } catch (error) {
      console.error("Error enviando orden:", error);
      alert("Hubo un error al enviar tu orden. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl flex flex-col transition-transform transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            {view === "success"
              ? "¡Orden Enviada!"
              : view === "checkout"
                ? "Finalizar Pedido"
                : "Tu Orden"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body Content based on View */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {view === "success" && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-4 border-4 border-green-50 dark:border-green-900/10">
                <ShoppingBag size={40} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                ¡Gracias por tu pedido!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-[250px]">
                Hemos recibido tu orden en cocina. Te escribiremos muy pronto
                por WhatsApp para confirmar los detalles del pago.
              </p>
            </div>
          )}

          {view === "cart" && cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-2">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                Tu carrito está vacío
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Agrega algunas deliciosas opciones de nuestro menú
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl active:scale-95 transition-all"
              >
                Explorar Menú
              </button>
            </div>
          )}

          {view === "cart" && cart.length > 0 && (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[20px] border border-slate-100 dark:border-slate-800"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-[16px] object-cover shrink-0 shadow-sm"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-[16px] flex items-center justify-center text-slate-400 shrink-0">
                      🍔
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[15px] leading-tight line-clamp-2">
                          {item.name}{" "}
                          {item.size &&
                            item.size !== "Sencillo" &&
                            `[${item.size}]`}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.cartId)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {item.selectedExtras?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          + {item.selectedExtras.map((e) => e.name).join(", ")}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 flex gap-1 line-clamp-1">
                          <span className="shrink-0 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                            Nota
                          </span>
                          {item.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-black text-red-600 dark:text-red-400">
                        ${parseFloat(item.priceUsd).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => updateQty(item.cartId, -1)}
                          className="text-slate-400 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-4 text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.cartId, 1)}
                          className="text-slate-400 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "checkout" && (
            <form
              id="checkout-form"
              onSubmit={handleSubmitOrder}
              className="space-y-6"
            >
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-[20px] border border-red-100 dark:border-red-900/20">
                <h3 className="font-bold text-red-800 dark:text-red-400 mb-1">
                  ¡Casi listo!
                </h3>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">
                  Déjanos tus datos para enviarte el total en Bolívares por
                  WhatsApp y procesar tu pedido inmediatamente.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. María Sánchez"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-800 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Teléfono (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 123 4567"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-800 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    ¿Para Llevar o Comer Aquí?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("LLEVAR")}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${deliveryType === "LLEVAR"
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-slate-200"
                        }`}
                    >
                      <Car
                        size={24}
                        className={
                          deliveryType === "LLEVAR" ? "animate-bounce" : ""
                        }
                      />
                      <span className="font-bold text-sm">Para Llevar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("LOCAL")}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${deliveryType === "LOCAL"
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-slate-200"
                        }`}
                    >
                      <UtensilsCrossed size={24} />
                      <span className="font-bold text-sm">En el Local</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Notas Adicionales (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Sin cebolla, extra salsa..."
                    rows="2"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer / Actions */}
        {view !== "success" && cart.length > 0 && (
          <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">Total Estimado</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {view === "cart" ? (
              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-black text-lg rounded-xl shadow-xl shadow-red-500/25 active:scale-[0.98] transition-all"
              >
                Procesar Pedido
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || !name || !phone}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black text-lg rounded-xl shadow-xl shadow-green-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>Enviar al Restaurante</>
                )}
              </button>
            )}

            {view === "checkout" && (
              <button
                onClick={() => setView("cart")}
                className="mt-4 w-full py-3 text-slate-500 font-bold hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Volver al Carrito
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
