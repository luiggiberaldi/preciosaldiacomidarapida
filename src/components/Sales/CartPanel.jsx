import React, { useState, useRef } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  CheckCircle,
  Package,
  Trash2,
} from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";

const SwipeableCartItem = ({
  item,
  effectiveRate,
  updateQty,
  removeFromCart,
  onEditNote,
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
      removeFromCart(item.id);
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
          <div
            className="flex-1 min-w-0 pr-1 cursor-pointer"
            onClick={() => onEditNote && onEditNote(item)}
          >
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mb-0.5 sm:mb-1 truncate">
              {item.name}
            </p>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap mt-1">
              <p className="text-[10px] sm:text-[11px] font-black text-red-600 bg-amber-50 dark:bg-amber-900/30 px-1 sm:px-1.5 rounded">
                ${item.priceUsd.toFixed(2)}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400">
                {formatBs(item.priceUsd * effectiveRate)} Bs
              </p>
            </div>
            {item.note && (
              <div className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md inline-block">
                💬 {item.note}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1.5 sm:gap-2">
          <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
            ${(item.priceUsd * item.qty).toFixed(2)}
          </p>
          <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-100 dark:border-slate-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQty(item.id, item.isWeight ? -0.1 : -1);
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
                updateQty(item.id, item.isWeight ? 0.1 : 1);
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
            removeFromCart(item.id);
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
  triggerHaptic,
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="shrink-0 px-4 pb-2 pt-3 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 rounded-t-2xl sm:rounded-t-3xl">
        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
          Cesta de Compra
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
            {cartItemCount} items
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
              Busca un producto para empezar a vender.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <SwipeableCartItem
                key={item.id}
                item={item}
                effectiveRate={effectiveRate}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
                onEditNote={onEditNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer — shrink-0, always visible at bottom of flex container */}
      <div className="shrink-0 p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl sm:rounded-b-3xl space-y-2 sm:space-y-3">
        <div className="flex justify-between items-end px-1 sm:px-0">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
            Total Venta
          </span>
          <div className="text-right flex items-center gap-3 sm:block w-full sm:w-auto justify-between">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-black text-red-600 dark:text-red-500 tracking-widest uppercase sm:hidden">
                Total (Ref)
              </span>
              <span className="text-[11px] font-bold text-slate-500 sm:hidden">
                {formatBs(cartTotalBs)} Bs
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tight">
              ${cartTotalUsd.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex justify-between items-center px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl">
          <span className="text-[11px] font-black text-red-600 dark:text-red-500 tracking-widest uppercase">
            Bolívares
          </span>
          <span className="text-xl font-black text-red-600 dark:text-red-400">
            {formatBs(cartTotalBs)} Bs
          </span>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={onCheckout}
          className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-red-500 rounded-xl sm:rounded-2xl shadow-red-500/30 shadow-lg blur-[2px] opacity-70 group-active:opacity-100 group-hover:blur-[4px] transition-all"></div>
          <div className="relative w-full py-3 sm:py-4 bg-red-500 text-white font-black text-sm sm:text-lg rounded-xl sm:rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 tracking-wide">
            <CheckCircle
              size={18}
              className="sm:w-[22px] sm:h-[22px] opacity-80"
            />
            PROCESAR COBRO
          </div>
        </button>
      </div>
    </div>
  );
}
