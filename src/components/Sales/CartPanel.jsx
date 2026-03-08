import React, { useState, useRef } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  CheckCircle,
  Package,
  Trash2,
  Clock,
} from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";

const SwipeableCartItem = ({
  item,
  effectiveRate,
  updateQty,
  removeFromCart,
  onEditNote,
  onEditOptions,
}) => {
  const qtyDisplay = item.isWeight ? `${item.qty.toFixed(3)} Kg` : item.qty;
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (diff < 0) {
      // Solo desliza hacia la izquierda
      setOffset(Math.max(diff, -80)); // Límite de 80px
    } else {
      setOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (offset < -50) {
      removeFromCart(item.cartId || item.id);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
      {/* Background Delete Action */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-xl sm:rounded-2xl">
        <Trash2 className="text-white" size={20} />
      </div>

      {/* Foreground Item Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 0.2s ease-out" : "none",
        }}
        className="group bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-2 pr-6 sm:p-3 sm:pr-10 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 hover:border-amber-200 dark:hover:border-amber-800 transition-colors relative z-10"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden">
            {item.image ? (
              <img
                src={item.image}
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                loading="lazy"
              />
            ) : (
              <Package
                size={16}
                className="text-slate-300 sm:w-[18px] sm:h-[18px]"
              />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center py-0.5">
            {/* Top row: Name and Unit Price */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {item.name}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  ${parseFloat(item.priceUsd || item.priceUsdt || item.price || 0).toFixed(2)} c/u
                </p>
              </div>
            </div>

            {/* Middle row: Badges (Size and Extras) */}
            {((item.size) || (item.selectedExtras?.length > 0)) && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {item.size && (
                  <button
                    onClick={() => onEditOptions && onEditOptions(item)}
                    className="group flex items-center gap-1 text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/50 transition-colors"
                    title="Editar opciones"
                  >
                    {item.size}
                  </button>
                )}
                {item.selectedExtras?.length > 0 && (
                  <button
                    onClick={() => onEditOptions && onEditOptions(item)}
                    className="group flex items-center gap-1 text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/50 transition-colors"
                    title="Editar opciones"
                  >
                    <span className="opacity-60 group-hover:opacity-100 transition-opacity">✨</span> {item.selectedExtras.length} xtra
                  </button>
                )}
              </div>
            )}

            {/* Bottom row: Note and Action Links */}
            <div className="flex flex-wrap items-center gap-3">
              {item.note ? (
                <button
                  onClick={() => onEditNote && onEditNote(item)}
                  className="text-[10px] sm:text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors line-clamp-1 max-w-[140px] text-left"
                  title={item.note}
                >
                  <span className="opacity-60 mr-1">📝</span>{item.note}
                </button>
              ) : (
                <button
                  onClick={() => onEditNote && onEditNote(item)}
                  className="text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
                >
                  + Nota
                </button>
              )}

              {/* Opciones link (Only if the product has configurable options) */}
              {((item.sizes && item.sizes.length > 0) || (item.extras && item.extras.length > 0)) && (
                <button
                  onClick={() => onEditOptions && onEditOptions(item)}
                  className="text-[10px] sm:text-[11px] font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Editar opciones
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1.5 sm:gap-2">
          <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
            ${(parseFloat(item.priceUsd || item.priceUsdt || item.price || 0) * item.qty).toFixed(2)}
          </p>
          <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-100 dark:border-slate-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQty(item.cartId || item.id, item.isWeight ? -0.1 : -1);
              }}
              className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors rounded-l-md active:bg-slate-200 dark:active:bg-slate-700"
            >
              <Minus size={14} strokeWidth={3} />
            </button>
            <span className="w-10 sm:w-12 text-center font-black text-slate-700 dark:text-white text-[11px] sm:text-xs">
              {qtyDisplay}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQty(item.cartId || item.id, item.isWeight ? 0.1 : 1);
              }}
              className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors rounded-r-md active:bg-slate-200 dark:active:bg-slate-700"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
        {/* Botón clásico X (oculto en móviles x el touch, visible hover en PC) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeFromCart(item.cartId || item.id);
          }}
          className="absolute -top-1 -right-1 sm:top-2 sm:right-2 p-1.5 bg-red-50 dark:bg-red-900/40 text-red-500 sm:bg-transparent sm:text-slate-300 sm:hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full sm:rounded-lg"
        >
          <X size={12} className="sm:w-[14px] sm:h-[14px]" />
        </button>
      </div>
    </div>
  );
};

export default function CartPanel({
  cart,
  effectiveRate,
  cartTotalUsd,
  cartTotalBs,
  cartItemCount,
  updateQty,
  removeFromCart,
  onCheckout,
  onClearCart,
  onEditNote,
  onOpenTab,
  triggerHaptic,
  activeTabName,
  onEditOptions,
}) {
  const [customerName, setCustomerName] = useState("");
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="shrink-0 px-4 pb-2 pt-3 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 rounded-t-2xl sm:rounded-t-3xl">
        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
          Pedido actual
        </span>
        <div className="flex items-center gap-3">
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-[10px] sm:text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg"
            >
              <Trash2 size={12} /> Vaciar
            </button>
          )}
          <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {cartItemCount} platos
          </span>
        </div>
      </div>

      {/* Cart Items — scrollable area with touch support */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 p-6 text-center h-full">
            <ShoppingCart
              size={48}
              className="mb-4 opacity-50 sm:w-[72px] sm:h-[72px]"
              strokeWidth={1}
            />
            <p className="text-sm sm:text-base font-bold text-slate-400">
              Cesta vacía
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Toca un plato del menú para agregarlo al pedido.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item, index) => (
              <SwipeableCartItem
                key={index}
                item={item}
                effectiveRate={effectiveRate}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
                onEditNote={onEditNote}
                onEditOptions={onEditOptions}
                triggerHaptic={triggerHaptic}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer — shrink-0, always visible at bottom of flex container */}
      <div className="shrink-0 p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl sm:rounded-b-3xl space-y-3">

        {/* Total Bimonetario */}
        <div className="flex justify-between items-center px-1 sm:px-2">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
            Total a Cobrar
          </span>
          <div className="text-right flex flex-col items-end">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-500 leading-none tracking-tight">
              {formatBs(cartTotalBs)} Bs
            </span>
            <span className="text-sm font-bold text-slate-400 mt-1">
              {cartTotalUsd.toFixed(2)} USD ref.
            </span>
          </div>
        </div>

        {/* Input Nombre de Cliente */}
        <div className="px-1 pt-1">
          <input
            type="text"
            placeholder="Nombre del cliente (opcional)"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (showError) setShowError(false);
            }}
            className={`w-full bg-slate-50 dark:bg-slate-800 border ${showError
              ? "border-red-400 dark:border-red-500 ring-2 ring-red-500/20"
              : "border-slate-200 dark:border-slate-700"
              } rounded-xl px-4 py-2 font-medium text-sm text-slate-700 dark:text-white outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-slate-400`}
          />
          {showError && (
            <p className="text-xs text-red-500 font-medium px-2 py-1 flex items-center gap-1 mt-1 transition-opacity animate-in fade-in slide-in-from-top-1">
              ⚠️ Ingresa un nombre para poder aplazar la cuenta
            </p>
          )}
        </div>

        <div className="flex gap-2 w-full mt-2">
          {/* Botón Dejar Abierta */}
          <button
            disabled={cart.length === 0}
            onClick={() => {
              if (!customerName.trim()) {
                setShowError(true);
                return;
              }
              onOpenTab && onOpenTab(customerName);
            }}
            className="w-1/3 relative group disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/50 hover:border-amber-500 rounded-xl sm:rounded-2xl flex items-center justify-center p-2 text-amber-600 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 active:scale-95 transition-all"
            title="Guardar cuenta sin cobrar"
          >
            <Clock size={20} strokeWidth={2.5} />
          </button>

          {/* Botón Cobrar */}
          <button
            disabled={cart.length === 0}
            onClick={() => onCheckout(customerName)}
            className="w-2/3 relative group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-red-500 rounded-xl sm:rounded-2xl shadow-red-500/30 shadow-lg blur-[2px] opacity-70 group-active:opacity-100 group-hover:blur-[4px] transition-all"></div>
            <div className="relative w-full py-3 sm:py-4 bg-red-500 text-white font-black text-sm sm:text-lg rounded-xl sm:rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 tracking-wide">
              <CheckCircle size={18} className="sm:w-[22px] sm:h-[22px] opacity-80" />
              COBRAR
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
