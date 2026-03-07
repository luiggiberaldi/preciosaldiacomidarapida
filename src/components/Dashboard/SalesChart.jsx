import React from "react";
import { BarChart3, ShoppingCart } from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";

/**
 * Gráfica de barras: Ventas de los últimos 7 días.
 * Pure CSS — cero dependencias externas.
 */
function SalesChart({ weekData, onNavigate, bcvRate }) {
  if (!weekData || weekData.length === 0) return null;

  const totalSemanaUsd = weekData.reduce((s, d) => s + d.total, 0);
  const maxVal = Math.max(...weekData.map((d) => d.total), 1);

  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // ESTADO VACÍO (NO HAY DATOS EN TODA LA SEMANA)
  if (totalSemanaUsd === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm mb-5 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
          <BarChart3 size={28} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto leading-relaxed mb-5">
          Aquí verás tus ventas de la semana. Haz tu primera venta desde Vender para comenzar.
        </p>
        <button
          onClick={() => onNavigate && onNavigate("ventas")}
          className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          <ShoppingCart size={16} /> Ir a Vender
        </button>
      </div>
    );
  }

  // ESTADO CON DATOS
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm mb-5">
      <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-1">
        <BarChart3 size={12} /> Ventas · Últimos 7 días
      </h3>

      <div className="flex items-end justify-between gap-1 h-32 mt-2">
        {weekData.map((day, i) => {
          const pct = maxVal > 0 ? (day.total / maxVal) * 100 : 0;
          const isToday = i === weekData.length - 1;
          const dayName = DAYS[new Date(day.date).getDay()];

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1.5 group relative"
            >
              {/* Tooltip Bs (hover) */}
              {day.total > 0 && bcvRate && (
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                  {formatBs(day.total * bcvRate)} Bs
                </div>
              )}

              {/* Amount label */}
              <span
                className={`text-[9px] font-bold ${day.total > 0 ? "text-slate-500 dark:text-slate-400" : "text-transparent"}`}
              >
                ${day.total.toFixed(0)}
              </span>

              {/* Bar */}
              <div className="w-full flex justify-center mt-auto h-24 items-end">
                <div
                  className={`w-full max-w-[28px] rounded-t-lg transition-all duration-700 ease-out ${isToday
                      ? "bg-gradient-to-t from-red-500 to-red-400 shadow-md shadow-red-500/20"
                      : day.total > 0
                        ? "bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600"
                        : "bg-slate-100 dark:bg-slate-800 h-1"
                    }`}
                  style={{
                    height: day.total > 0 ? `${Math.max(pct, 8)}%` : "4px",
                  }}
                />
              </div>

              {/* Day label */}
              <span
                className={`text-[10px] font-bold ${isToday ? "text-red-600 dark:text-red-400" : "text-slate-400"
                  }`}
              >
                {isToday ? "Hoy" : dayName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Total semana
        </span>
        <div className="flex flex-col items-end">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-baseline gap-1">
            {totalSemanaUsd.toFixed(2)} <span className="text-[10px] text-slate-400">USD</span>
          </span>
          {bcvRate && (
            <span className="text-[10px] font-bold text-slate-400">
              {formatBs(totalSemanaUsd * bcvRate)} Bs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(SalesChart);
