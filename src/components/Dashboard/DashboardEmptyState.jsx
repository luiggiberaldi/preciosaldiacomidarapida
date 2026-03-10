import React from "react";

export default function DashboardEmptyState({ onNavigate }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-red-500/5 mb-6 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4 relative z-10">
                <span>👋</span> ¿Primera vez aquí?
            </h2>

            <div className="space-y-3 relative z-10">
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 font-bold text-xs">
                        1
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug pt-0.5">
                        <strong>Crea tu menú</strong> con tus hamburguesas, perros y bebidas desde la pestaña Menú.
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 font-bold text-xs">
                        2
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug pt-0.5">
                        <strong>Configura tu tasa BCV</strong> y moneda base en la configuración del menú.
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs">
                        3
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug pt-0.5">
                        <strong className="text-slate-800 dark:text-slate-200">
                            Haz tu primera venta
                        </strong>{" "}
                        desde Vender para comenzar a ver tus reportes aquí.
                    </p>
                </div>
            </div>
            <button
                onClick={() => onNavigate && onNavigate("ventas")}
                className="w-full mt-6 bg-red-500 text-white rounded-xl py-3 font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95"
            >
                Ir a Vender
            </button>
        </div>
    );
}
