import React, { useState } from "react";
import {
  Cloud,
  RefreshCw,
  CloudOff,
  CloudUpload,
  Lock,
} from "lucide-react";
import { useCloudSync } from "../../hooks/useCloudSync";
import { useAuthStore } from "../../hooks/store/useAuthStore";
import { showToast } from "../Toast";
import ConfirmModal from "../ConfirmModal";

export default function SystemStatusPill({ rates, triggerHaptic }) {
  const { sync, syncStatus, pendingSalesCount } = useCloudSync();
  const { usuarioActivo, logout: localLogout } = useAuthStore();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleSyncClick = async (e) => {
    e.stopPropagation();
    if (triggerHaptic) triggerHaptic();
    showToast("Sincronizando...", "info");
    await sync();
  };

  const handleLocalLogout = (e) => {
    e.stopPropagation();
    if (triggerHaptic) triggerHaptic();
    setShowConfirmLogout(true);
  };

  const getSyncIcon = () => {
    if (syncStatus === "syncing") {
      return <RefreshCw size={14} className="text-blue-500 animate-spin" />;
    }
    if (syncStatus === "error") {
      return <CloudOff size={14} className="text-red-500 animate-pulse" />;
    }
    if (pendingSalesCount > 0) {
      return <CloudUpload size={14} className="text-amber-500 animate-bounce" />;
    }
    return <Cloud size={14} className="text-emerald-500" />;
  };

  const getSyncTextShort = () => {
    if (syncStatus === "syncing") return "Sincronizando";
    if (syncStatus === "error") return "Error Sync";
    if (pendingSalesCount > 0) return `${pendingSalesCount} pend.`;
    return "Al día";
  };

  return (
    <>
      <div className="h-9 flex items-center bg-slate-900/90 dark:bg-slate-950/95 border border-white/10 rounded-full shadow-lg backdrop-blur-md pointer-events-auto overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Botón Sincronizar */}
        <button
          onClick={syncStatus !== "syncing" ? handleSyncClick : undefined}
          className="h-full px-3.5 hover:bg-white/10 text-white flex items-center justify-center transition-colors"
          title={getSyncTextShort()}
        >
          {getSyncIcon()}
        </button>

        {/* Separador */}
        {usuarioActivo && <div className="w-[1px] h-4 bg-white/15" />}

        {/* Botón Bloqueo / Cerrar Sesión Local */}
        {usuarioActivo && (
          <button
            onClick={handleLocalLogout}
            className="h-full px-3.5 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
            title={`Bloquear pantalla (${usuarioActivo.nombre})`}
          >
            <Lock size={12} strokeWidth={2.5} />
            {/* Nombre visible solo en pantallas >= sm (desktop/tablet) */}
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider max-w-[80px] truncate">
              {usuarioActivo.nombre}
            </span>
          </button>
        )}
      </div>

      {/* ConfirmModal para bloquear pantalla local */}
      <ConfirmModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={localLogout}
        title="¿Bloquear Terminal?"
        message={usuarioActivo ? `¿Cerrar sesión de ${usuarioActivo.nombre} y bloquear pantalla?` : ""}
        confirmText="Sí, bloquear"
        variant="warning"
      />
    </>
  );
}
