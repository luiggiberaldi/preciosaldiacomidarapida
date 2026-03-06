import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", variant = "default" }) {
    if (!isOpen) return null;

    const variants = {
        default: {
            icon: "bg-slate-100 text-slate-600",
            btn: "bg-slate-900 hover:bg-black text-white shadow-lg",
        },
        danger: {
            icon: "bg-red-50 text-red-500",
            btn: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20",
        },
        success: {
            icon: "bg-emerald-50 text-emerald-500",
            btn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20",
        },
    };

    const v = variants[variant] || variants.default;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[320px] overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                <div className="p-6 text-center space-y-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${v.icon}`}>
                        <AlertTriangle size={26} />
                    </div>
                    <h3 className="text-[17px] font-black text-slate-800 leading-tight">
                        {title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-[0.97] transition-all text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 font-bold rounded-xl active:scale-[0.97] transition-all text-sm ${v.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
