import React, { useState } from "react";
import { Database, RefreshCw, Download, RotateCcw, X } from "lucide-react";
import { useAutoBackup } from "../../hooks/useAutoBackup";
import { showToast } from "../Toast";
import ConfirmModal from "../ConfirmModal";

export default function BackupSettings() {
  const {
    backups,
    lastBackupAt,
    triggerBackup,
    restoreBackup,
    exportBackup
  } = useAutoBackup();

  // States for custom modals
  const [showPrompt, setShowPrompt] = useState(false);
  const [backupLabel, setBackupLabel] = useState("Respaldo Manual");
  
  const [restoreTarget, setRestoreTarget] = useState(null); // holds backup object to restore

  const handleManualBackupSubmit = async (e) => {
    e.preventDefault();
    const name = backupLabel.trim() || "Respaldo Manual";
    setShowPrompt(false);
    
    const id = await triggerBackup(name);
    if (id) {
      showToast("Respaldo creado con éxito", "success");
    } else {
      showToast("Error al crear el respaldo", "error");
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    const success = await restoreBackup(restoreTarget.id);
    if (success) {
      showToast("Restaurado con éxito. Recargando...", "success");
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast("Error al restaurar respaldo", "error");
    }
    setRestoreTarget(null);
  };

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-4">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Database size={14} className="text-blue-500" />
        Copias de Seguridad (Auto)
      </h4>

      <div className="space-y-3">
        <div className="text-[10px] text-slate-500 dark:text-slate-400">
          Última copia local:{" "}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "Ninguna"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setBackupLabel("Respaldo Manual");
              setShowPrompt(true);
            }}
            className="flex-1 py-2 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 active:scale-95"
          >
            <RefreshCw size={12} /> Respaldar ahora
          </button>

          <button
            type="button"
            onClick={async () => {
              const success = await exportBackup();
              if (success) {
                showToast("Archivo JSON exportado", "success");
              } else {
                showToast("Error al exportar el archivo", "error");
              }
            }}
            className="py-2 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-95"
            title="Descargar copia JSON"
          >
            <Download size={12} /> JSON
          </button>
        </div>

        {/* Lista de las últimas 5 copias */}
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Últimos 5 Respaldos Locales
          </p>
          {backups.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">No hay copias guardadas todavía.</p>
          ) : (
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate" title={backup.label}>
                      {backup.label}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(backup.timestamp).toLocaleString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}{" "}
                      • {(backup.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRestoreTarget(backup)}
                    className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-md transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={10} />
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Custom de Prompt para Nombre de Respaldo */}
      {showPrompt && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleManualBackupSubmit}
            className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto">
              <Database size={24} />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Nuevo Respaldo Local
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Especifica un nombre para identificar esta copia de seguridad.
              </p>
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPrompt(false)}
                className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
              >
                Crear Respaldo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ConfirmModal para Restauración */}
      <ConfirmModal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleConfirmRestore}
        title="¿Restaurar Copia de Seguridad?"
        message={restoreTarget ? `¿Seguro que deseas restaurar "${restoreTarget.label}"?\n\nEsto reemplazará TODOS los datos actuales (productos, ventas y configuración) y recargará la aplicación.` : ""}
        confirmText="Sí, restaurar"
        variant="warning"
      />
    </div>
  );
}
