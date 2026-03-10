import React from "react";
import { formatBs } from "../../utils/calculatorUtils";
import { getPaymentLabel, PAYMENT_ICONS } from "../../config/paymentMethods";

export default function PaymentBreakdown({ paymentBreakdown, todayTotalBs, bcvRate }) {
    if (Object.keys(paymentBreakdown).length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
                Pagos del día
            </h3>
            <div className="space-y-2">
                {Object.entries(paymentBreakdown).map(([method, data]) => {
                    const label = getPaymentLabel(method);
                    const PayIcon = PAYMENT_ICONS[method];
                    const totalBsEquiv =
                        data.currency === "USD" ? data.total * bcvRate : data.total;
                    const pct =
                        todayTotalBs > 0 ? (totalBsEquiv / todayTotalBs) * 100 : 0;
                    return (
                        <div key={method}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                                    {PayIcon && (
                                        <PayIcon size={14} className="text-slate-400" />
                                    )}
                                    {label}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-white">
                                    {data.currency === "USD"
                                        ? `$ ${data.total.toFixed(2)}`
                                        : `${formatBs(data.total)} Bs`}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
