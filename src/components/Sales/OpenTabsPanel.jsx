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
        <div className="shrink-0 mb-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-2 px-1">
                <Clock size={14} className="text-amber-600 dark:text-amber-500" />
                <span className="text-[11px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">
                    Cuentas Abiertas ({openTabs.length})
                </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {openTabs.map((tab) => {
                    const totalUsd = tab.items.reduce((s, i) => s + (i.priceUsdt || i.priceUsd || i.price || 0) * i.qty, 0);
                    const itemCount = tab.items.reduce((s, i) => s + (i.isWeight ? 1 : i.qty), 0);

                    return (
                        <div
                            key={tab.id}
                            className="shrink-0 w-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col active:scale-95 transition-transform"
                        >
                            <div
                                className="p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-1 flex flex-col justify-between"
                                onClick={() => {
                                    triggerHaptic && triggerHaptic();
                                    onSelectTab(tab);
                                }}
                            >
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {tab.name}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] font-medium text-slate-500">
                                        {itemCount} items
                                    </span>
                                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-500">
                                        ${totalUsd.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 px-2 py-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic && triggerHaptic();
                                        onRemoveTab(tab.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Eliminar Cuenta"
                                >
                                    <Trash2 size={12} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic && triggerHaptic();
                                        onSelectTab(tab);
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                                    title="Abrir y Editar"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
