import React, { useState, useEffect } from "react";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  Car,
  Trash2,
  MapPin,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { supabase } from "../utils/supabase";

/** Safe localStorage helper */
function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private browsing */ }
}
function safeRemoveItem(key) {
  try { localStorage.removeItem(key); } catch { /* private browsing */ }
}

export default function CartOverlay({ cartHooks, isOpen, onClose, tenantId, exchangeRate = 1, tableNumberFromUrl, hasDelivery = true }) {
  const { cart, removeFromCart, updateQty, updateNote, clearCart, cartTotal, cartCount } =
    cartHooks;
  const [view, setView] = useState("cart"); // 'cart' | 'checkout' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsLink, setGpsLink] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("LOCAL");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [tableNumber, setTableNumber] = useState(null);

  // Load saved customer data (Zero Friction)
  useEffect(() => {
    if (isOpen) {
      const savedName = safeGetItem("pad_customer_name");
      const savedPhone = safeGetItem("pad_customer_phone");
      const savedAddress = safeGetItem("pad_customer_address");
      const savedGps = safeGetItem("pad_customer_gps");

      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
      if (savedAddress) setAddress(savedAddress);
      if (savedGps) setGpsLink(savedGps);

      if (tableNumberFromUrl) {
        setTableNumber(tableNumberFromUrl);
        setDeliveryType("LOCAL");
      } else {
        setTableNumber(null);
      }
    }
  }, [isOpen, tableNumberFromUrl]);

  // Clear GPS when switching away from DELIVERY
  useEffect(() => {
    if (deliveryType !== "DELIVERY") {
      setGpsLink(null);
    }
  }, [deliveryType]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setView("checkout");
  };

  const handleGetLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Tu navegador no soporta geolocalizacion.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        setGpsLink(mapsLink);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "No se pudo obtener la ubicacion.";
        if (error.code === 1) errorMsg = "Permiso de ubicacion denegado.";
        else if (error.code === 2) errorMsg = "Ubicacion no disponible.";
        else if (error.code === 3) errorMsg = "Tiempo de espera agotado al obtener ubicacion.";
        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      // Save data for next purchase
      safeSetItem("pad_customer_name", name.trim());
      safeSetItem("pad_customer_phone", phone.trim());

      let finalAddress = address.trim();
      if (deliveryType === 'DELIVERY') {
        safeSetItem("pad_customer_address", finalAddress);
        if (gpsLink) {
          safeSetItem("pad_customer_gps", gpsLink);
          finalAddress = `${finalAddress ? finalAddress + "\n\n" : ""}Ubicacion GPS: ${gpsLink}`;
        } else {
          safeRemoveItem("pad_customer_gps");
        }
      }

      let formattedNotes = tableNumber ? `[MESA ${tableNumber}]` : (deliveryType === 'LLEVAR' ? '[PARA LLEVAR]' : deliveryType === 'DELIVERY' ? `[DELIVERY] Dir: ${finalAddress}` : '[EN EL LOCAL]');
      if (notes.trim()) formattedNotes += ` - Notas: ${notes.trim()}`;

      const orderPayload = {
        tenant_id: tenantId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_notes: formattedNotes,
        items: cart.map(item => ({
          ...item,
          id: item.local_id || item.id
        })),
        total_usd: cartTotal,
        status: "pending",
      };

      const { error } = await supabase
        .from("web_orders")
        .insert([orderPayload]);
      if (error) throw error;

      clearCart();
      setView("success");

      setTimeout(() => {
        onClose();
        setTimeout(() => setView("cart"), 300);
      }, 5000);
    } catch (error) {
      console.error("Error enviando orden:", error);
      alert("Hubo un error al enviar tu orden. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isSubmitDisabled = isSubmitting || !name.trim() || !phone.trim() || (deliveryType === 'DELIVERY' && !address.trim() && !gpsLink);

  return (
    <div className={`fixed inset-0 z-50 overflow-clip ${!isOpen ? 'pointer-events-none' : ''}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => { if (!isSubmitting) onClose(); }}
      />

      {/* Panel (Bottom Sheet on Mobile, Drawer on Desktop) */}
      <div
        className={`absolute sm:top-0 bottom-0 sm:right-0 w-full sm:w-[450px] sm:max-w-md bg-white sm:h-full max-h-[92vh] sm:max-h-full rounded-t-[32px] sm:rounded-none shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
          }`}
      >
        {/* Mobile Drag Handle */}
        <div className="w-full h-6 flex items-center justify-center sm:hidden shrink-0" onTouchStart={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex flex-col border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              {view === "success"
                ? "Resumen de la Orden"
                : view === "checkout"
                  ? "Datos de Entrega"
                  : "Tu Carrito"}
            </h2>
            <div className="flex items-center gap-1 -mr-2">
              {view === "cart" && cart.length > 0 && (
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && window.confirm("¿Seguro que deseas vaciar tu carrito?")) {
                      clearCart();
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 active:bg-red-50 rounded-full transition-colors flex items-center justify-center gap-1.5 px-3"
                  aria-label="Vaciar carrito"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-bold sm:hidden lg:inline-block">Vaciar</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Cerrar carrito"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 pb-4 flex items-center justify-center">
            <div className="flex items-center w-full max-w-[280px]">
              {/* Step 1 */}
              <div className={`flex flex-col items-center gap-1.5 w-1/3 relative z-10 transition-colors duration-300 ${view === 'cart' || view === 'checkout' || view === 'success' ? 'text-slate-800' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 transition-all duration-300 ${view === 'cart' || view === 'checkout' || view === 'success' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  1
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold">Carrito</span>
              </div>

              {/* Line 1-2 */}
              <div className={`flex-1 h-0.5 transition-colors duration-500 ${view === 'checkout' || view === 'success' ? 'bg-slate-800' : 'bg-slate-200'}`} />

              {/* Step 2 */}
              <div className={`flex flex-col items-center gap-1.5 w-1/3 relative z-10 transition-colors duration-300 ${view === 'checkout' || view === 'success' ? 'text-slate-800' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 transition-all duration-300 ${view === 'checkout' || view === 'success' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  2
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold">Datos</span>
              </div>

              {/* Line 2-3 */}
              <div className={`flex-1 h-0.5 transition-colors duration-500 ${view === 'success' ? 'bg-slate-800' : 'bg-slate-200'}`} />

              {/* Step 3 */}
              <div className={`flex flex-col items-center gap-1.5 w-1/3 relative z-10 transition-colors duration-300 ${view === 'success' ? 'text-emerald-600' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 transition-all duration-300 ${view === 'success' ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30' : 'bg-white border-slate-200'}`}>
                  3
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold">Listo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body Content based on View */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {view === "success" && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 border-4 border-green-50">
                <ShoppingBag size={40} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">
                Gracias por tu pedido!
              </h3>
              <p className="text-slate-500 max-w-[250px]">
                Hemos recibido tu orden en cocina. Te escribiremos muy pronto
                por WhatsApp para confirmar los detalles del pago.
              </p>
            </div>
          )}

          {view === "cart" && cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-700">
                Tu carrito esta vacio
              </h3>
              <p className="text-slate-500">
                Agrega algunas deliciosas opciones de nuestro menu
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl active:scale-95 transition-all"
              >
                Explorar Menu
              </button>
            </div>
          )}

          {view === "cart" && cart.length > 0 && (
            <div className="space-y-4">
              {/* Instructions Info Banner */}
              <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-2xl flex items-start gap-3 border border-blue-100">
                <span className="text-lg leading-none mt-0.5">💡</span>
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  Toca <strong className="font-bold">Agregar instrucciones</strong> debajo de tu producto si necesitas personalizarlo (ej: sin cebolla, extra salsa, etc).
                </p>
              </div>
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-[16px] object-cover shrink-0 shadow-sm"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 rounded-[16px] flex items-center justify-center text-slate-400 shrink-0">
                      🍔
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 text-[15px] leading-tight line-clamp-2">
                          {item.name}{" "}
                          {item.size &&
                            `[${item.size}]`}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.cartId)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-1"
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {item.selectedExtras?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          + {item.selectedExtras.map((e) => e.name).join(", ")}
                        </p>
                      )}

                      {/* Per-item Note */}
                      {expandedNotes[item.cartId] ? (
                        <div className="mt-2">
                          <textarea
                            autoFocus
                            value={item.note || ""}
                            onChange={(e) => updateNote(item.cartId, e.target.value)}
                            onBlur={() => setExpandedNotes(prev => ({ ...prev, [item.cartId]: false }))}
                            placeholder="Ej: sin cebolla, poca sal, extra salsa..."
                            rows={2}
                            className="w-full text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-400 resize-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [item.cartId]: true }))}
                          className="mt-1.5 flex items-center gap-1.5 group"
                        >
                          {item.note ? (
                            <span className="text-[11px] text-amber-600 flex gap-1 items-center">
                              <span className="bg-amber-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0">Nota</span>
                              <span className="line-clamp-1">{item.note}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 group-hover:text-amber-500 transition-colors flex items-center gap-1">
                              Agregar instrucciones
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <p className="font-black text-red-600 leading-none mb-0.5">
                          ${parseFloat(item.priceUsd).toFixed(2)}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400">
                          Bs {(parseFloat(item.priceUsd) * exchangeRate).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-slate-200">
                        <button
                          onClick={() => updateQty(item.cartId, -1)}
                          className="text-slate-400 hover:text-red-500 active:scale-90 transition-all"
                          aria-label="Reducir cantidad"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-4 text-center font-bold text-sm text-slate-700">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.cartId, 1)}
                          className="text-slate-400 hover:text-red-500 active:scale-90 transition-all"
                          aria-label="Aumentar cantidad"
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
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <h3 className="font-bold text-emerald-800 mb-1">
                  Casi listo
                </h3>
                <p className="text-sm text-emerald-700/80 leading-relaxed">
                  Confirma tus datos para enviarte el total en Bolivares por WhatsApp.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="checkout-name" className="block text-sm font-bold text-slate-700 mb-2">
                    Tu Nombre
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Maria Sanchez"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="block text-sm font-bold text-slate-700 mb-2">
                    Telefono (WhatsApp)
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 123 4567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>

                {tableNumberFromUrl ? (
                  <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Pedido para</span>
                      <span className="font-black text-lg">Mesa {tableNumberFromUrl}</span>
                    </div>
                    <div className="w-10 h-10 bg-emerald-100/50 rounded-full flex items-center justify-center">
                      <UtensilsCrossed size={20} className="text-emerald-600" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Metodo de Entrega
                    </label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("LOCAL")}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryType === "LOCAL" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        Mesa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("LLEVAR")}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryType === "LLEVAR" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        Llevar
                      </button>
                      {hasDelivery && (
                        <button
                          type="button"
                          onClick={() => setDeliveryType("DELIVERY")}
                          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryType === "DELIVERY" ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                          Delivery
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!tableNumberFromUrl && deliveryType === "DELIVERY" && (
                  <div className="animate-reveal space-y-3">
                    <div className="pt-2">
                      <label htmlFor="checkout-address" className="block text-sm font-bold text-slate-700 mb-1">
                        Dirección de Entrega
                      </label>
                      <textarea
                        id="checkout-address"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Urb. El Pinar, Calle 4, Casa #12..."
                        rows="2"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none shadow-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="checkout-notes" className="block text-sm font-bold text-slate-700 mb-2">
                    {deliveryType === "DELIVERY"
                      ? "Indicaciones para el Delivery (Opcional)"
                      : "Notas Generales del Pedido"}
                  </label>
                  <textarea
                    id="checkout-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      deliveryType === "DELIVERY"
                        ? "Ej: Timbre danado, casa rejas negras, billete de 20$..."
                        : "Ej: Traer la comida rapido, necesito envoltorio, etc."
                    }
                    rows="2"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none shadow-sm"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer / Actions */}
        {view !== "success" && cart.length > 0 && (
          <div className="p-6 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10 pb-8 sm:pb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-bold">Total a pagar</span>
              <div className="text-right">
                <span className="block text-3xl font-black text-slate-800 leading-none mb-1">
                  ${cartTotal.toFixed(2)}
                </span>
                <span className="block text-sm font-bold text-slate-400">
                  Bs {(cartTotal * exchangeRate).toFixed(2)}
                </span>
              </div>
            </div>

            {view === "cart" ? (
              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all"
              >
                Continuar al Pago
                <ArrowRight size={20} />
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitDisabled}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>Confirmar Pedido</>
                  )}
                </button>
                <button
                  onClick={() => setView("cart")}
                  className="w-full py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors bg-slate-50 rounded-xl"
                >
                  Modificar Carrito
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
