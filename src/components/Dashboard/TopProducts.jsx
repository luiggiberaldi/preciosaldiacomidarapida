import React from "react";
import { TrendingUp } from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";

export default function TopProducts({ topProducts }) {
    if (topProducts.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">
                <TrendingUp size={12} /> Más Vendidos
            </h3>
            <div className="space-y-2">
                {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                        <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${i === 0
                                    ? "bg-amber-100 text-amber-600"
                                    : i === 1
                                        ? "bg-slate-200 text-slate-500"
                                        : "bg-orange-50 text-orange-400"
                                }`}
                        >
                            {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                {p.name}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                {p.qty} vendidos
                            </p>
                            <p className="text-[10px] text-slate-400">
                                {formatBs(p.revenue)} Bs
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
