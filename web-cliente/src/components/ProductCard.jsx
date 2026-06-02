import React, { useState } from "react";
import { Plus, Minus, Clock } from "lucide-react";
import { getPriceUsd } from "../utils/priceHelpers";

export default function ProductCard({ product, onAdd, cartItems = [], onUpdateQty, onRemove, exchangeRate = 1, onOptionsClick }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const productCartItems = cartItems.filter((item) => item.id === product.id);
  const cartItem = productCartItems[0];
  const quantityInCart = productCartItems.reduce((sum, item) => sum + item.qty, 0);

  const hasOptions = (product.sizes?.length > 0) || (product.extras?.length > 0);

  const priceUsd = getPriceUsd(product);

  // Calculate minimum price for "Desde" display if sizes exist
  const displayPrice = product.sizes?.length > 0
    ? Math.min(priceUsd, ...product.sizes.map(s => getPriceUsd(s)))
    : priceUsd;
  const isDesdePrice = product.sizes?.length > 0;

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasOptions && onOptionsClick) {
      onOptionsClick(product);
    } else {
      onAdd(product);
    }
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      const targetId = cartItem.cartId || cartItem.id;
      onUpdateQty(targetId, 1);
    } else {
      if (hasOptions && onOptionsClick) {
        onOptionsClick(product);
      } else {
        onAdd(product);
      }
    }
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      const targetId = cartItem.cartId || cartItem.id;
      if (cartItem.qty <= 1 && onRemove) {
        onRemove(targetId);
      } else {
        onUpdateQty(targetId, -1);
      }
    }
  };

  return (
    <div className="animate-reveal group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full relative">
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden w-full shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
            <span className="text-5xl opacity-50">🍔</span>
          </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/50 flex flex-col items-start pr-4">
          <p className="font-black text-slate-800 leading-none flex items-baseline gap-1">
            {isDesdePrice && <span className="text-[10px] text-slate-500 font-bold mr-0.5 uppercase tracking-wider">Desde</span>}
            <span className="text-xs text-slate-500 font-bold mr-0.5">$</span>
            {displayPrice.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Bs {(displayPrice * exchangeRate).toFixed(2)}
          </p>
        </div>

        {/* Prep Time */}
        {product.prep_time && product.prep_time !== "0" && String(product.prep_time).toLowerCase() !== "no aplica" && String(product.prep_time).toLowerCase() !== "n/a" && Number(product.prep_time) > 1 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/50 flex items-center gap-1.5 shadow-sm">
            <Clock size={12} className="text-slate-600" />
            <span className="text-[11px] font-black text-slate-700">
              {product.prep_time}m
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col bg-white">
        <div className="mb-2">
          <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2 capitalize">
            {product.name}
          </h3>
        </div>

        {product.description && (
          <div className="mb-4 flex-1 flex flex-col items-start">
            <p
              onClick={() => {
                if (product.description.length > 130) setIsExpanded(!isExpanded);
              }}
              className={`text-[13px] text-slate-500 leading-relaxed transition-all ${product.description.length > 130 ? "cursor-pointer" : ""
                } ${isExpanded ? "" : "line-clamp-3"}`}
              title={!isExpanded ? product.description : ""}
            >
              {product.description}
            </p>
            {product.description.length > 130 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 mt-1 active:scale-95 transition-transform"
              >
                {isExpanded ? "Ver menos" : "Leer mas..."}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto relative z-10 w-full pt-2">
          {quantityInCart > 0 && !hasOptions ? (
            <div className="flex items-center justify-between w-full bg-slate-100 rounded-2xl p-1 shadow-inner border border-slate-200/50">
              <button
                onClick={handleDecrease}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-200 shrink-0"
                aria-label="Reducir cantidad"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 flex text-center justify-center items-center">
                <span className="font-black text-lg text-slate-800 w-8 tabular-nums">
                  {quantityInCart}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 hidden sm:inline-block">en orden</span>
              </div>
              <button
                onClick={handleIncrease}
                className="w-10 h-10 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md shadow-red-500/30 transition-all active:scale-95 shrink-0"
                aria-label="Aumentar cantidad"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddClick}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl transition-colors border group/btn relative font-bold ${quantityInCart > 0 ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200" : "bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 border-slate-200 hover:border-red-200"}`}
              aria-label={`Anadir ${product.name} al carrito`}
            >
              <div className="flex items-center gap-1.5 justify-center">
                <Plus
                  size={18}
                  className={`shrink-0 transform group-hover/btn:scale-110 transition-transform ${quantityInCart > 0 ? "text-red-500" : "text-slate-400 group-hover/btn:text-red-500"}`}
                />
                <span className="text-sm sm:text-base whitespace-nowrap">
                  {hasOptions ? "Elegir opciones" : "Añadir"}
                </span>
              </div>

              {quantityInCart > 0 && hasOptions && (
                <span className="absolute -top-2.5 -right-2.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white shadow-sm border-2 border-white">
                  {quantityInCart}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
