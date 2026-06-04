import React, { useState } from "react";
import { User, LogIn, LogOut, X, Shield, Lock, Mail, RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useCloudAuth } from "../../hooks/useCloudAuth";
import { showToast } from "../Toast";
import ConfirmModal from "../ConfirmModal";

export function CloudAuthBadge() {
  const { cloudUser, role, signOut } = useCloudAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOutConfirm = async () => {
    try {
      await signOut();
      showToast("Sesión cerrada en la nube", "info");
    } catch (err) {
      showToast("Error al cerrar sesión", "error");
    }
    setShowSignOutConfirm(false);
  };

  if (cloudUser) {
    // Usuario logueado: Mostrar su rol e inicial
    const userLetter = cloudUser.email ? cloudUser.email[0].toUpperCase() : "U";
    const roleColors = {
      admin: "bg-red-500/10 border-red-500/20 text-red-500",
      employee: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
      kitchen: "bg-amber-500/10 border-amber-500/20 text-amber-500"
    };

    return (
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <div className={`px-2.5 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${roleColors[role] || "bg-slate-500/10 border-slate-500/20 text-slate-500"}`}>
          {role || "Usuario"}
        </div>
        <button
          onClick={() => setShowSignOutConfirm(true)}
          title="Cerrar sesión en la nube"
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-red-600/20 hover:text-red-500 border border-white/10 flex items-center justify-center text-white transition-all duration-300 active:scale-90"
        >
          <LogOut size={13} />
        </button>

        {/* Modal de confirmación para cerrar sesión en la nube */}
        <ConfirmModal
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={handleSignOutConfirm}
          title="¿Cerrar Sesión en la Nube?"
          message="¿Seguro que deseas cerrar sesión en la nube? Se detendrá la sincronización en tiempo real con la web."
          confirmText="Sí, cerrar sesión"
          variant="danger"
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md pointer-events-auto transition-all active:scale-95 duration-200"
      >
        <LogIn size={13} />
        Conectar Nube
      </button>
      <CloudAuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function CloudAuthModal({ isOpen, onClose, isForceLogin, isRecoveryFlow, setRecoveryFlow }) {
  const { signIn, register, loading, error: authError, sendPasswordResetEmail, updatePassword, signOut } = useCloudAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  if (!isOpen && !isForceLogin) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRecoveryFlow) {
      if (!newPassword.trim() || newPassword.length < 6) {
        showToast("La contraseña debe tener al menos 6 caracteres", "warning");
        return;
      }
      try {
        await updatePassword(newPassword.trim());
        showToast("Contraseña restablecida con éxito", "success");
        if (setRecoveryFlow) setRecoveryFlow(false);
        // Desconectar al usuario temporal de la sesión de recovery
        await signOut();
        setIsForgotPassword(false);
        setIsRegistering(false);
      } catch (err) {
        showToast(err.message || "Error al actualizar contraseña", "error");
      }
      return;
    }

    if (isForgotPassword) {
      if (!email.trim()) {
        showToast("Ingresa tu correo electrónico", "warning");
        return;
      }
      try {
        await sendPasswordResetEmail(email.trim());
        showToast("Correo de recuperación enviado con éxito", "success");
        setIsForgotPassword(false);
      } catch (err) {
        showToast(err.message || "Error al enviar correo de recuperación", "error");
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      showToast("Ingresa tu correo y contraseña", "warning");
      return;
    }

    try {
      if (isRegistering) {
        await register(email.trim(), password.trim());
        showToast("Registro exitoso. Se ha iniciado sesión.", "success");
      } else {
        await signIn(email.trim(), password.trim());
        showToast("Sesión iniciada con éxito", "success");
      }
      if (onClose) onClose();
    } catch (err) {
      showToast(err.message || "Error de autenticación", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={isForceLogin ? undefined : onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!isForceLogin && !isRecoveryFlow && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        )}

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-60 h-16 flex items-center justify-center mx-auto mb-4">
            <img
              src="/pos/logoprincipal.png"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/logoprincipal.png";
              }}
              alt="Precios Al Día"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">
            {isRecoveryFlow
              ? "Crear Nueva Contraseña"
              : isForgotPassword
              ? "Recuperar Contraseña"
              : isRegistering
              ? "Crear Cuenta de Negocio"
              : "Acceso a la Nube"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
            {isRecoveryFlow
              ? "Ingresa tu nueva contraseña para acceder a la cuenta."
              : isForgotPassword
              ? "Te enviaremos un enlace para restablecer tu contraseña."
              : isRegistering
              ? "Regístrate para habilitar pedidos web y sincronización."
              : "Sincroniza tus tasas de cambio y catálogo en tiempo real."}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2 mb-4 leading-normal">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="flex-1">{authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRecoveryFlow ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Lock size={10} /> Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 pr-10 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ) : isForgotPassword ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Mail size={10} /> Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Mail size={10} /> Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock size={10} /> Contraseña
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] font-bold text-brand hover:text-brand-dark transition-colors uppercase tracking-wider"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand/10 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {isRecoveryFlow
                  ? "Guardar Contraseña"
                  : isForgotPassword
                  ? "Enviar Correo de Recuperación"
                  : isRegistering
                  ? "Registrar y Conectar"
                  : "Iniciar Sesión e Integrar"}
              </>
            )}
          </button>

          <div className="text-center mt-4">
            {isRecoveryFlow ? null : isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-brand hover:text-brand-dark dark:text-brand dark:hover:text-brand-light transition-colors"
              >
                Volver al inicio de sesión
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs font-bold text-brand hover:text-brand-dark dark:text-brand dark:hover:text-brand-light transition-colors"
              >
                {isRegistering
                  ? "¿Ya tienes una cuenta? Inicia sesión"
                  : "¿No tienes una cuenta? Regístrate gratis"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// Badge y control para el usuario local del POS (PIN)
import { useAuthStore } from "../../hooks/store/useAuthStore";

export function LocalUserBadge() {
  const { usuarioActivo, logout } = useAuthStore();
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  if (!usuarioActivo) return null;

  const isAdmin = usuarioActivo.rol === 'ADMIN';

  return (
    <div className="flex items-center gap-1.5 pointer-events-auto">
      <div className={`px-2.5 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
        isAdmin 
          ? "bg-sky-500/10 border-sky-500/20 text-sky-500" 
          : "bg-teal-500/10 border-teal-500/20 text-teal-500"
      }`}>
        {usuarioActivo.nombre}
      </div>
      <button
        onClick={() => setShowLockConfirm(true)}
        title="Cerrar sesión de usuario local"
        className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
      >
        <Lock size={12} />
      </button>

      {/* ConfirmModal para bloquear pantalla local */}
      <ConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={logout}
        title="¿Bloquear Terminal?"
        message={`¿Cerrar sesión de ${usuarioActivo.nombre} y bloquear terminal?`}
        confirmText="Sí, bloquear"
        variant="warning"
      />
    </div>
  );
}
