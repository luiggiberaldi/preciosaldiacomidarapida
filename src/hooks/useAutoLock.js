import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { logEvent } from '../services/auditService';
import { storageService } from '../utils/storageService';

const TIMEOUT_KEY = 'bodega_autolock_timeout_v1';
const CAJERO_LOCK_MINUTES = 5;

export function useAutoLock() {
    const { usuarioActivo, logout, requireLogin, setRequireLogin, cambiarPin } = useAuthStore();
    const timeoutRef = useRef(null);
    const [timeoutMinutes, setTimeoutMinutes] = useState(15);

    // Cargar el timeout configurado al montar
    useEffect(() => {
        storageService.getItem(TIMEOUT_KEY, 15).then(val => {
            const mins = parseInt(val, 10);
            setTimeoutMinutes(isNaN(mins) ? 15 : mins);
        });
    }, []);

    const getLockMinutes = useCallback(async () => {
        if (usuarioActivo?.rol === 'CAJERO' || usuarioActivo?.rol === 'MESERO' || usuarioActivo?.rol === 'COCINERO') {
            return CAJERO_LOCK_MINUTES;
        }
        // Leer el timeout configurado en el sistema
        const savedTimeout = await storageService.getItem(TIMEOUT_KEY, 15);
        const minutes = parseInt(savedTimeout, 10);
        return isNaN(minutes) || minutes < 1 ? 15 : minutes;
    }, [usuarioActivo]);

    const performLock = useCallback((reason = 'manual') => {
        if (!usuarioActivo) return;
        logEvent('AUTH', 'SESION_BLOQUEADA', `Bloqueo de ${usuarioActivo.nombre} (${usuarioActivo.rol}): ${reason}`, usuarioActivo);
        logout();
    }, [usuarioActivo, logout]);

    const resetTimer = useCallback(async () => {
        if (!usuarioActivo) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }
        const minutes = await getLockMinutes();
        const ms = minutes * 60 * 1000;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            performLock('inactividad');
        }, ms);
    }, [usuarioActivo, getLockMinutes, performLock]);

    useEffect(() => {
        if (!usuarioActivo) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        let tick = false;
        const throttledResetTimer = () => {
            if (!tick) {
                requestAnimationFrame(() => { resetTimer(); tick = false; });
                tick = true;
            }
        };

        events.forEach(e => window.addEventListener(e, throttledResetTimer, { passive: true }));

        const handleVisibilityChange = () => {
            const lockOnTabChange = localStorage.getItem('lock_on_tab_change') !== 'false';
            if (document.hidden) {
                if (usuarioActivo?.rol === 'ADMIN' && lockOnTabChange) {
                    performLock('app_minimizada');
                } else {
                    resetTimer();
                }
            } else {
                resetTimer();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        resetTimer();

        return () => {
            events.forEach(e => window.removeEventListener(e, throttledResetTimer));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [usuarioActivo, resetTimer, performLock]);

    const updateTimeout = async (mins) => {
        await storageService.setItem(TIMEOUT_KEY, mins);
        setTimeoutMinutes(mins);
        resetTimer();
    };

    const handleSetPin = async (newPin) => {
        if (!newPin) {
            setRequireLogin(false);
        } else {
            setRequireLogin(true);
            // Actualizar PIN del Administrador (id 1)
            await cambiarPin(1, newPin);
        }
    };

    return {
        isLocked: !usuarioActivo,
        hasPin: requireLogin,
        timeoutMinutes,
        lockNow: () => performLock('manual'),
        setPin: handleSetPin,
        setTimeout: updateTimeout,
        manualLock: () => performLock('manual')
    };
}
