import React from 'react';
import { DollarSign, Wallet, FileText, CheckCircle2, ChevronRight, Calculator } from 'lucide-react';
import { getPaymentLabel, PAYMENT_ICONS } from '../../config/paymentMethods';
import { formatBs } from '../../utils/calculatorUtils';

export default function CashRegisterModal({
    isOpen,
    onClose,
    onConfirm,
    paymentBreakdown,
    todayTotalUsd,
    todayTotalBs,
    todaySalesCount,
    bcvRate
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center border-b border-indigo-100 dark:border-indigo-800/50 shrink-0">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-3">
                        <Calculator size={32} className="text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight text-center">Arqueo de Caja</h2>
                    <p className="text-xs font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 px-3 py-1 rounded-full mt-2">
                        {todaySalesCount} ventas totales
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Resumen Global */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Ingresos USD</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">${todayTotalUsd.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Ref. BS</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{formatBs(todayTotalBs)} Bs</p>
                        </div>
                    </div>

                    {/* Desglose por Método */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Desglose Físico y Digital</h3>
                        {Object.keys(paymentBreakdown).length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm font-medium">No hay pagos registrados hoy.</div>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(paymentBreakdown).map(([method, data]) => {
                                    const PayIcon = PAYMENT_ICONS[method] || Wallet;
                                    const label = getPaymentLabel(method);

                                    return (
                                        <div key={method} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                    <PayIcon size={16} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
                                            </div>
                                            <span className="text-base font-black text-slate-800 dark:text-white">
                                                {data.currency === 'USD' ? `$${data.total.toFixed(2)}` : `${formatBs(data.total)} Bs`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-800 dark:text-red-400 font-medium">
                        <FileText size={20} className="shrink-0 text-red-500 mt-0.5" />
                        <p>Al confirmar, se generará el PDF resumen del día y <strong className="font-black">las ventas de hoy se archivarán para liberar la caja</strong>. ¡No olvides enviar el reporte a tu administrador!</p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <CheckCircle2 size={18} />
                        Cerrar Turno
                    </button>
                </div>
            </div>
        </div>
    );
}
