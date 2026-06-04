import React, { useState } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import UserCard from './UserCard';
import LoginPinModal from './LoginPinModal';
import ConfirmModal from '../ConfirmModal';

export default function LockScreen() {
  const { usuarios, login } = useAuthStore();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCloudLogoutConfirm, setShowCloudLogoutConfirm] = useState(false);

  const handlePinSubmit = async (pin, userId) => {
    const success = await login(pin, userId);
    if (success) {
      setSelectedUser(null);
    }
    return success;
  };

  const handleCloudLogoutConfirm = async () => {
    const { supabase } = await import('../../utils/supabase');
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden flex flex-col transition-colors duration-300">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[30%] -left-[15%] w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-6">
        {/* Header */}
        <div className="text-center mb-14 animate-in fade-in duration-500">
          <div className="flex justify-center mb-4 transform -translate-x-10">
            <img
              src={`${import.meta.env.BASE_URL || "/"}logoprincipal.png`}
              alt="Logo PreciosAlDía"
              className="h-24 sm:h-32 w-auto object-contain drop-shadow-md dark:hidden"
            />
            <img
              src={`${import.meta.env.BASE_URL || "/"}logodark.png`}
              alt="Logo PreciosAlDía"
              className="h-24 sm:h-32 w-auto object-contain drop-shadow-md hidden dark:block"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-[0.15em] text-slate-500 dark:text-slate-400">
            ¿Quién está{' '}
            <strong className="text-slate-800 dark:text-white font-bold">operando</strong>?
          </h1>
        </div>

        {/* User Grid */}
        <div className="w-full grid grid-cols-2 md:flex md:flex-row md:flex-wrap md:justify-center gap-8 sm:gap-14 max-w-[320px] md:max-w-5xl mx-auto">
          {usuarios.map(user => (
            <UserCard
              key={user.id}
              user={user}
              onClick={() => setSelectedUser(user)}
            />
          ))}
        </div>

        {/* Anuncio informativo sobre PIN por defecto */}
        <div className="mt-8 px-4 py-2.5 bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 rounded-full flex items-center gap-2 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
          <span className="text-xs">💡</span>
          <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide text-center">
            El PIN por defecto para todos los usuarios es <span className="font-extrabold underline">0000</span> (Cámbialo en Ajustes)
          </p>
        </div>
      </div>

      {/* Footer sutil */}
      <div className="relative z-10 pb-6 text-center flex flex-col items-center gap-3">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wider">
          PIN de 4 o 6 dígitos requerido
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
            Recargar
          </button>
          <button
            onClick={() => setShowCloudLogoutConfirm(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-red-500/60 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* PIN Modal */}
      <LoginPinModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
        onSubmit={handlePinSubmit}
      />

      {/* ConfirmModal para cerrar sesión en la nube */}
      <ConfirmModal
        isOpen={showCloudLogoutConfirm}
        onClose={() => setShowCloudLogoutConfirm(false)}
        onConfirm={handleCloudLogoutConfirm}
        title="¿Cerrar Sesión en la Nube?"
        message="Se cerrará tu sesión en la nube. Deberás iniciar sesión en la nube nuevamente para continuar sincronizando."
        confirmText="Sí, cerrar sesión"
        variant="danger"
      />
    </div>
  );
}
