import React from "react";
import { Tag, Clock, Pencil, Trash2 } from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "../../config/categories";
import { formatUsd, formatBs } from "../../utils/calculatorUtils";

export default function ProductCard({
  product: p,
  effectiveRate,
  categories,
  onEdit,
  onDelete,
}) {
  const valBs = p.priceUsdt * effectiveRate;
  const catInfo = categories.find((c) => c.id === p.category);
  const isUnavailable = p.available === false;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border flex flex-col overflow-hidden group transition-all ${isUnavailable ? "opacity-50 border-slate-300 dark:border-slate-700 grayscale" : "border-slate-100 dark:border-slate-800"}`}
    >
      {/* Image */}
      <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden relative shrink-0">
        {p.image ? (
          <img
            src={p.image}
            className="w-full h-full object-contain p-1"
            alt={p.name}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <Tag size={24} />
          </div>
        )}
        {/* Category badge */}
        {catInfo && catInfo.id !== "otros" && (
          <div
            className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${CATEGORY_COLORS[catInfo.color] || ""}`}
          >
            {(() => {
              const CatIcon = CATEGORY_ICONS[catInfo.id];
              return CatIcon ? <CatIcon size={9} /> : catInfo.icon;
            })()}{" "}
            {catInfo.label}
          </div>
        )}
        {/* Unavailable badge */}
        {isUnavailable && (
          <div className="absolute top-1 right-1 bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded">
            ⛔ No disponible
          </div>
        )}
        {/* Prep time badge */}
        {p.prepTime && !isUnavailable && (
          <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Clock size={8} /> {p.prepTime} min
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-[13px] leading-tight line-clamp-2 mb-1">
          {p.name}
        </h3>

        {/* Description */}
        {p.description && (
          <p className="text-[10px] text-slate-400 leading-tight line-clamp-2 mb-2">
            {p.description}
          </p>
        )}

        {/* Prices */}
        <div className="mt-auto">
          <p className="text-lg font-black text-red-600 dark:text-red-400 leading-none">
            ${formatUsd(p.priceUsdt)}
          </p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">
            {formatBs(valBs)} Bs
          </p>
        </div>

        {/* Sizes preview */}
        {(p.sizes || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {p.sizes.map((s) => (
              <span
                key={s.id}
                className="text-[9px] font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded"
              >
                {s.name} ${parseFloat(s.priceUsdt || s.priceUsd || s.price || 0).toFixed(2)}
              </span>
            ))}
          </div>
        )}

        {/* Extras count */}
        {(p.extras || []).length > 0 && (
          <p className="text-[9px] font-bold text-green-500 mt-1">
            🧀 {p.extras.length} extra{p.extras.length > 1 ? "s" : ""}{" "}
            disponible{p.extras.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onEdit(p)}
          className="flex-1 py-1.5 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(p.id)}
          className="flex-1 py-1.5 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
