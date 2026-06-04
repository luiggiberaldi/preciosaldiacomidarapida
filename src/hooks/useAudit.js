import { useState, useEffect, useCallback } from 'react';
import { logEvent, getAuditLog, purgeOldEntries, exportAuditLog } from '../services/auditService';

/**
 * Hook para consumir y registrar logs en el Audit Service.
 * Provee reactividad en el listado de logs locales y wrappers de registro sencillos.
 */
export function useAudit() {
    const [auditLog, setAuditLog] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cargar logs locales con filtros
    const loadLogs = useCallback(async (filters = {}) => {
        setLoading(true);
        try {
            const logs = await getAuditLog(filters);
            setAuditLog(logs);
        } catch (err) {
            console.error('[useAudit] Error loading logs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Registrar acción y recargar estado local
    const logAction = useCallback(async (cat, action, desc, meta = null) => {
        // Recuperar usuario activo de localstorage / session si existe (Zustand store de security)
        let activeUser = null;
        try {
            const storedSecurity = localStorage.getItem('bodega_security_v1') 
                || localStorage.getItem('security_store') 
                || null;
            if (storedSecurity) {
                const parsed = JSON.parse(storedSecurity);
                const userObj = parsed?.state?.user || parsed?.user;
                if (userObj) {
                    activeUser = {
                        id: userObj.id || userObj.userId,
                        nombre: userObj.name || userObj.nombre || userObj.userName,
                        rol: userObj.role || userObj.rol || 'EMPLOYEE'
                    };
                }
            }
        } catch (e) {
            // Silencioso
        }

        await logEvent(cat, action, desc, activeUser, meta);
        await loadLogs({ limit: 100 }); // Recargar últimos 100 logs
    }, [loadLogs]);

    const exportAudit = useCallback(async () => {
        await exportAuditLog();
    }, []);

    const purgeOld = useCallback(async () => {
        await purgeOldEntries();
        await loadLogs({ limit: 100 });
    }, [loadLogs]);

    // Carga inicial
    useEffect(() => {
        loadLogs({ limit: 100 });
    }, [loadLogs]);

    return {
        auditLog,
        loading,
        logAction,
        exportAudit,
        purgeOld,
        reloadAudit: loadLogs
    };
}
