import React from "react";
import { DollarSign, ShoppingBag, Flame, TrendingUp, FileText } from "lucide-react";
import { formatBs } from "../../utils/calculatorUtils";
import AnimatedCounter from "../AnimatedCounter";

export default function DashboardStats({
    todayTotalUsd,
    todayTotalBs,
    todaySalesLength,
    todayItemsSold,
    todayProfit,
    bcvRate,
    handleDailyClose,
}) {
    return (
        <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Ventas Hoy */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-red-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-full blur-2xl"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                            <DollarSign size={20} className="stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                                Ventas de hoy
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Tasa BCV: {formatBs(bcvRate)} Bs/$
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDailyClose}
                        className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Cierre de caja"
                    >
                        <FileText size={14} /> Cierre
                    </button>
                </div>
                <div className="relative z-10">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                            <AnimatedCounter value={todayTotalUsd} />
                        </span>
                        <span className="text-sm font-bold text-slate-400 uppercase">
                            USD
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                            {formatBs(todayTotalBs)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                            Bs
                        </span>
                    </div>
                </div>
            </div>

            {/* Pedidos de hoy */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                        <ShoppingBag size={16} className="text-indigo-500" />
                    </div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase">
                        Pedidos de hoy
                    </h3>
                </div>
                <p className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-2">
                    <AnimatedCounter value={todaySalesLength} />
                </p>
            </div>

            {/* Platos vendidos */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                        <Flame size={16} className="text-orange-500" />
                    </div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase">
                        Platos vendidos
                    </h3>
                </div>
                <p className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-2">
                    <AnimatedCounter value={todayItemsSold} />
                </p>
            </div>

            {/* Ganancia Estimada */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-50 dark:bg-green-900/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                            <TrendingUp
                                size={20}
                                className="text-green-600 dark:text-green-400"
                                strokeWidth={2.5}
                            />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase">
                                Ganancia estimada
                            </h3>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span
                                    className={`text-xl font-black tracking-tight ${todayProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-amber-500"}`}
                                >
                                    {todayProfit >= 0 ? "+" : ""}
                                    {(todayProfit / bcvRate).toFixed(2)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    USD
                                </span>
                                <span className="text-slate-300 mx-1">·</span>
                                <span className="text-sm font-bold text-slate-500">
                                    {formatBs(todayProfit)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Bs
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
