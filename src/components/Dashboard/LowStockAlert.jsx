import React from "react";
import { AlertTriangle, Package } from "lucide-react";

export default function LowStockAlert({ lowStockProducts }) {
    if (lowStockProducts.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/30 shadow-sm mb-5">
            <h3 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-1">
                <AlertTriangle size={12} /> Bajo Stock ({lowStockProducts.length})
            </h3>
            <div className="space-y-2">
                {lowStockProducts.map((p) => (
                    <div
                        key={p.id}
                        className="flex justify-between items-center text-sm bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30"
                    >
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 line-clamp-1">
                            <Package size={14} className="text-amber-500 shrink-0" />
                            {p.name}
                        </span>
                        <span className="font-black text-red-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md shadow-sm border border-amber-100 dark:border-amber-900/50">
                            {p.stock}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
