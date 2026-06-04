import React, { useState } from "react";
import { Lock, Shield, Clock, Layers } from "lucide-react";
import { useAutoLock } from "../../hooks/useAutoLock";
import { showToast } from "../Toast";
import ConfirmModal from "../ConfirmModal";

export default function SecuritySettings({ onClose }) {
  const {
    isLocked,
    hasPin,
    timeoutMinutes,
    lockNow,
    setPin,
    setTimeout: setLockTimeout
  } = useAutoLock();

  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [lockOnTabChange, setLockOnTabChange] = useState(() => localStorage.getItem('lock_on_tab_change') !== 'false');
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);

  const handleSavePin = async (e) => {
    e.preventDefault();
    if ((pinInput.length !== 4 && pinInput.length !== 6) || !/^\d+$/.test(pinInput)) {
      showToast("El PIN debe tener 4 o 6 números", "error");
      return;
    }
    if (pinInput !== confirmPinInput) {
      showToast("Los PINs no coinciden", "error");
      return;
    }
    await setPin(pinInput);
    setPinInput("");
    setConfirmPinInput("");
    setIsChangingPin(false);
    showToast("PIN configurado con éxito", "success");
  };

  const handleTogglePin = () => {
    if (hasPin) {
      setShowConfirmDisable(true);
    } else {
      setIsChangingPin(true);
    }
  };

  const handleConfirmDisable = async () => {
    await setPin("");
    showToast("PIN de seguridad desactivado", "info");
    setShowConfirmDisable(false);
  };

  const handleToggleTabChangeLock = () => {
    const newVal = !lockOnTabChange;
    setLockOnTabChange(newVal);
    localStorage.setItem('lock_on_tab_change', String(newVal));
    showToast(
      newVal
        ? "Bloqueo al cambiar de pestaña activado"
        : "Bloqueo al cambiar de pestaña desactivado",
      "info"
    );
  };

  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Shield size={16} className="text-teal-500" />
        Seguridad y Bloqueo
      </h3>

      {isChangingPin ? (
        <form onSubmit={handleSavePin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Nuevo PIN (4 o 6 dígitos)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full p-2.5 text-center text-lg font-black tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Confirmar PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full p-2.5 text-center text-lg font-black tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              required
            />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsChangingPin(false);
                setPinInput("");
                setConfirmPinInput("");
              }}
              className="flex-1 py-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-2xl transition-all shadow-md shadow-teal-500/10"
            >
              Guardar PIN
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* PIN Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
                  PIN de Pantalla
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {hasPin ? "Activo (Solicita PIN por inactividad)" : "Inactivo"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePin}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner ${
                hasPin ? "bg-teal-500" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  hasPin ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle Lock on Tab Change */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
                  Cerrar sesión al salir
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bloquea la sesión al cambiar de pestaña del navegador
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleTabChangeLock}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner ${
                lockOnTabChange ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  lockOnTabChange ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {hasPin && (
            <>
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  Tiempo de inactividad
                </label>
                <select
                  value={timeoutMinutes}
                  onChange={(e) => setLockTimeout(Number(e.target.value))}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsChangingPin(true)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                >
                  Cambiar PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    lockNow();
                    onClose();
                  }}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 active:scale-95"
                >
                  <Lock size={12} /> Bloquear ahora
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ConfirmModal para Desactivar PIN */}
      <ConfirmModal
        isOpen={showConfirmDisable}
        onClose={() => setShowConfirmDisable(false)}
        onConfirm={handleConfirmDisable}
        title="¿Desactivar PIN de Seguridad?"
        message="¿Seguro que deseas desactivar el PIN de seguridad y el bloqueo de pantalla automático?"
        confirmText="Sí, desactivar"
        variant="danger"
      />
    </div>
  );
}
