import React, { useEffect, useState } from "react";
import { CreditCard, ChevronRight, Timer, Utensils, User, ChefHat } from "lucide-react";

/**
 * Panel shown in SalesView (cashier) listing all tables/tabs that have requested checkout.
 * Cashier taps a row to open the TableBillModal for that tab.
 */
export default function TableQueuePanel({ openTabs = [], tables = [], effectiveRate = 1, onCheckoutTable }) {
  const [now, setNow] = useState(new Date());

  // Update timer every 30 seconds for elapsed calculation
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingTabs = openTabs.filter((tab) => tab.status === "CHECKOUT");

  if (pendingTabs.length === 0) return null;

  const getElapsedTimeStr = (createdAt) => {
    if (!createdAt) return "";
    const diffMs = now - new Date(createdAt);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Recién";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHrs = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHrs}h ${remainingMins}m`;
  };

  const formatBs = (n) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="mb-4 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-400 dark:border-orange-600/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg shadow-orange-500/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-200 dark:border-orange-800/40 bg-orange-100/60 dark:bg-orange-900/20">
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/30">
          <CreditCard size={17} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">Cuentas Pendientes de Cobro</p>
          <p className="text-[10px] text-orange-500/80 font-bold">Toca una fila para revisar precuenta y pagar</p>
        </div>
        <div className="relative">
          <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black">
            {pendingTabs.length}
          </div>
          <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-40" />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-orange-100 dark:divide-orange-850/30">
        {pendingTabs.map((tab) => {
          const matchedTable = tables.find(
            (t) => t.id === tab.customerInfo?.tableId || t.name.toLowerCase() === tab.name.toLowerCase()
          );

          const totalUsd = tab.items.reduce(
            (sum, item) => sum + (item.priceUsdt || item.priceUsd || item.price || 0) * item.qty,
            0
          );
          const totalBs = totalUsd * effectiveRate;
          const itemCount = tab.items.reduce((s, i) => s + (i.isWeight ? 1 : i.qty), 0);

          return (
            <button
              key={tab.id}
              onClick={() => onCheckoutTable(tab)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-orange-100/70 dark:hover:bg-orange-900/10 active:scale-[0.99] transition-all text-left"
            >
              {/* Badge Icon */}
              <div className="w-11 h-11 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-orange-500/20">
                {matchedTable ? (matchedTable.name.replace(/[^0-9]/g, "") || matchedTable.name.charAt(0)) : "T"}
              </div>

              {/* Description info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">
                  {matchedTable ? matchedTable.name : tab.name}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                  {tab.customerInfo?.waiter && (
                    <span className="flex items-center gap-0.5 font-bold text-orange-600 dark:text-orange-400">
                      <ChefHat size={10} /> {tab.customerInfo.waiter}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Timer size={10} /> {getElapsedTimeStr(tab.createdAt)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Utensils size={10} /> {itemCount} {itemCount === 1 ? "plato" : "platos"}
                  </span>
                </div>
                {tab.customerInfo?.notes && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5 italic">
                    Nota: {tab.customerInfo.notes}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="text-right shrink-0">
                <p className="font-black text-orange-600 dark:text-orange-400 text-base">
                  ${totalUsd.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {formatBs(totalBs)} Bs
                </p>
              </div>

              <ChevronRight size={18} className="text-orange-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
