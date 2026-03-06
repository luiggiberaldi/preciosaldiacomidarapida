import React, { useState } from "react";
import { Plus, Clock, Info } from "lucide-react";

export default function ProductCard({ product, onAdd }) {
  // For this simple version, we assume "Sencillo" size by default and no extras if not handled by a modal.
  // Ideally, when clicking '+', a modal opens. For now, we'll just add it directly or show a modal.
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddClick = () => {
    onAdd(product);
  };

  return (
    <div className="animate-reveal group bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
      {/* Image Section */}
      <div className="relative h-44 sm:h-48 lg:h-52 bg-slate-100 dark:bg-slate-800 overflow-hidden w-full shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <span className="text-4xl">🍔</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-1.5 rounded-xl shadow-lg border border-white/20 dark:border-slate-700/50">
          <p className="font-black text-red-600 dark:text-red-500 leading-none">
            ${parseFloat(product.price_usd).toFixed(2)}
          </p>
        </div>

        {/* Prep Time */}
        {product.prep_time && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
            <Clock size={12} className="text-amber-400" />
            <span className="text-[11px] font-bold text-white">
              {product.prep_time}m
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 lg:p-6 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight line-clamp-2">
            {product.name}
          </h3>
        </div>

        {product.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4 flex-1">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
          <button
            onClick={handleAddClick}
            className="col-span-2 flex items-center justify-center gap-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:text-slate-200 dark:hover:text-red-400 font-bold py-3 rounded-xl transition-colors group/btn"
          >
            <Plus
              size={18}
              className="transform group-hover/btn:scale-110 transition-transform"
            />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
