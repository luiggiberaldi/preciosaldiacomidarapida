import React from "react";
import { Clock, Plus, Trash2 } from "lucide-react";

export default function OpenTabsPanel({
    openTabs,
    onSelectTab,
    onRemoveTab,
    triggerHaptic,
}) {
    if (!openTabs || openTabs.length === 0) return null;

    return (
        <div className="shrink-0 mb-3 mx-1 mt-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-1.5 overflow-hidden flex flex-col">
            <div className="flex items-center gap-1.5 mb-1 px-1">
                <Clock size={12} className="text-amber-600 dark:text-amber-500" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider">
                    Cuentas Abiertas ({openTabs.length})
                </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide snap-x">
                {openTabs.map((tab) => {
                    const totalUsd = tab.items.reduce((s, i) => s + (i.priceUsdt || i.priceUsd || i.price || 0) * i.qty, 0);
                    const itemCount = tab.items.reduce((s, i) => s + (i.isWeight ? 1 : i.qty), 0);

                    return (
                        <div
                            key={tab.id}
                            className="shrink-0 w-32 bg-white dark:bg-slate-900 rounded-lg border border-amber-100 dark:border-amber-900/40 shadow-sm overflow-hidden flex flex-col active:scale-95 transition-transform snap-start relative group"
                        >
                            <div
                                className="p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-1 flex flex-col justify-between"
                                onClick={() => {
                                    triggerHaptic && triggerHaptic();
                                    onSelectTab(tab);
                                }}
                            >
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate pr-4">
                                    {tab.name}
                                </p>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[9px] font-medium text-slate-400">
                                        {itemCount} itm
                                    </span>
                                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-500">
                                        ${totalUsd.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Overlayed Delete Button (Hover) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic && triggerHaptic();
                                    onRemoveTab(tab.id);
                                }}
                                className="absolute top-0 right-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-bl-lg transition-colors"
                                title="Eliminar Cuenta"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
