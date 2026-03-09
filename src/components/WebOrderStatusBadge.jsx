import React from "react";
import { Clock, Flame, Check, CheckCheck, XCircle } from "lucide-react";
import { WEB_ORDER_STATUS } from "../utils/constants";

export default function WebOrderStatusBadge({ status }) {
    const config = {
        [WEB_ORDER_STATUS.PENDING]: {
            label: "Pendiente",
            icon: Clock,
            colors: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
        },
        [WEB_ORDER_STATUS.CONFIRMED]: {
            label: "Confirmado",
            icon: Check,
            colors: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
        },
        [WEB_ORDER_STATUS.PREPARING]: {
            label: "En Preparación",
            icon: Flame,
            colors: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
        },
        [WEB_ORDER_STATUS.READY]: {
            label: "Listo",
            icon: Check, // Check o bandeja
            colors: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
        },
        [WEB_ORDER_STATUS.DELIVERED]: {
            label: "Entregado",
            icon: CheckCheck,
            colors: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
        },
        [WEB_ORDER_STATUS.CANCELLED]: {
            label: "Cancelado",
            icon: XCircle,
            colors: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
        },
    };

    const current = config[status] || config[WEB_ORDER_STATUS.PENDING];
    const Icon = current.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${current.colors}`}>
            <Icon size={12} strokeWidth={2.5} /> {current.label}
        </span>
    );
}
