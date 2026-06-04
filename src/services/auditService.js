/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                      AUDIT SERVICE – Bitácora Universal Oculta                     ║
 * ║  Registra todas las acciones de la app con usuario, timestamp y metadatos.         ║
 * ║                                                                                  ║
 * ║  Cloud sync: requiere tabla en Supabase (Se configurará en la Fase 5):            ║
 * ║    CREATE TABLE audit_log (                                                      ║
 * ║      id UUID PRIMARY KEY,                                                        ║
 * ║      ts BIGINT NOT NULL,                                                         ║
 * ║      cat TEXT NOT NULL,                                                          ║
 * ║      action TEXT NOT NULL,                                                       ║
 * ║      desc TEXT,                                                                  ║
 * ║      user_id TEXT,                                                               ║
 * ║      user_name TEXT,                                                             ║
 * ║      user_role TEXT,                                                             ║
 * ║      email TEXT,                                                                 ║
 * ║      device_id TEXT,                                                             ║
 * ║      meta JSONB,                                                                 ║
 * ║      synced_at TIMESTAMPTZ DEFAULT NOW()                                         ║
 * ║    );                                                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */
import { storageService } from '../utils/storageService';

const AUDIT_KEY = 'bodega_audit_log_v1';
const AUDIT_SYNC_CURSOR = 'bodega_audit_sync_cursor';
const MAX_ENTRIES = 15000;
const MAX_AGE_DAYS = 90;
const SYNC_BATCH = 50; // logs per cloud push

/**
 * Registra un evento en el audit log local.
 * 
 * @param {string} cat - Categoría (AUTH, VENTA, INVENTARIO, CLIENTE, CONFIG, SISTEMA)
 * @param {string} action - Código de acción (ej: SALE_CREATED, PRODUCT_MODIFIED)
 * @param {string} desc - Descripción legible del suceso
 * @param {Object} [user=null] - { id, nombre, rol } del usuario activo
 * @param {Object} [meta=null] - Metadatos extra del evento
 */
export async function logEvent(cat, action, desc, user = null, meta = null) {
    try {
        const entry = {
            id: crypto.randomUUID(),
            ts: Date.now(),
            cat,
            action,
            desc,
            userId: user?.id ?? null,
            userName: user?.nombre ?? 'Sistema',
            userRole: user?.rol ?? 'SYSTEM',
        };
        if (meta) entry.meta = meta;

        const log = await storageService.getItem(AUDIT_KEY, []);
        log.unshift(entry); // Más reciente primero

        // Límite duro de tamaño
        if (log.length > MAX_ENTRIES) {
            log.length = MAX_ENTRIES;
        }

        await storageService.setItem(AUDIT_KEY, log);
    } catch (err) {
        // Silencioso – el log de auditoría nunca debe romper la aplicación
        console.warn('[AuditService] Error writing log:', err);
    }
}

/**
 * Obtiene los logs con filtros opcionales.
 * 
 * @param {Object} [filters={}]
 * @param {string} [filters.cat] - Filtrar por categoría
 * @param {string} [filters.userId] - Filtrar por usuario
 * @param {number} [filters.fromTs] - Desde timestamp
 * @param {number} [filters.toTs] - Hasta timestamp
 * @param {number} [filters.limit] - Máximo de resultados
 * @returns {Promise<Array>}
 */
export async function getAuditLog(filters = {}) {
    try {
        let log = await storageService.getItem(AUDIT_KEY, []);

        if (filters.cat) {
            log = log.filter(e => e.cat === filters.cat);
        }
        if (filters.userId) {
            log = log.filter(e => e.userId === filters.userId);
        }
        if (filters.fromTs) {
            log = log.filter(e => e.ts >= filters.fromTs);
        }
        if (filters.toTs) {
            log = log.filter(e => e.ts <= filters.toTs);
        }
        if (filters.limit) {
            log = log.slice(0, filters.limit);
        }

        return log;
    } catch (err) {
        console.warn('[AuditService] Error reading log:', err);
        return [];
    }
}

/**
 * Cuenta total de registros.
 */
export async function getAuditCount() {
    try {
        const log = await storageService.getItem(AUDIT_KEY, []);
        return log.length;
    } catch {
        return 0;
    }
}

/**
 * Elimina registros con más de MAX_AGE_DAYS días.
 * Llamar al iniciar la app.
 */
export async function purgeOldEntries() {
    try {
        const log = await storageService.getItem(AUDIT_KEY, []);
        const cutoff = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
        const filtered = log.filter(e => e.ts >= cutoff);
        
        if (filtered.length < log.length) {
            await storageService.setItem(AUDIT_KEY, filtered);
            console.log(`[AuditService] Purged ${log.length - filtered.length} old entries`);
        }
    } catch (err) {
        console.warn('[AuditService] Error purging:', err);
    }
}

/**
 * Borra todo el audit log.
 */
export async function clearAuditLog() {
    await storageService.setItem(AUDIT_KEY, []);
}

/**
 * Exporta el log como JSON descargable.
 */
export async function exportAuditLog() {
    const log = await storageService.getItem(AUDIT_KEY, []);
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Sincroniza entradas del audit log local a Supabase (Se consumirá en la Fase 5).
 * 
 * @param {string} adminEmail - Email de la cuenta admin
 * @param {string} deviceId - ID del dispositivo actual
 */
export async function syncAuditToCloud(deviceId) {
    try {
        const { supabase } = await import('../utils/supabase');
        if (!supabase) return;

        // Verificar si hay usuario autenticado (requerido por RLS)
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return; // No sincronizar si no hay sesión iniciada en la nube

        const log = await storageService.getItem(AUDIT_KEY, []);
        if (!log.length) return;

        // Cursor: el timestamp del último entry ya sincronizado
        const cursor = parseInt(localStorage.getItem(AUDIT_SYNC_CURSOR) || '0', 10);

        // Entries no sincronizadas ordenadas cronológicamente
        const pending = log.filter(e => e.ts > cursor).reverse().slice(0, SYNC_BATCH);
        if (!pending.length) return;

        const rows = pending.map(e => {
            // Validar que el userId local sea un UUID válido para la relación FK de auth.users.
            // Si no lo es, asociar al ID del usuario actualmente conectado
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const isValidUserUuid = e.userId && uuidRegex.test(e.userId);
            
            return {
                id: e.id,
                local_id: e.id,
                action: e.action,
                details: e.desc || "",
                user_id: isValidUserUuid ? e.userId : user.id,
                timestamp: new Date(e.ts).toISOString(),
                metadata: {
                    cat: e.cat,
                    userName: e.userName || 'Sistema',
                    userRole: e.userRole || 'SYSTEM',
                    device_id: deviceId || 'unknown',
                    ...(e.meta || {})
                }
            };
        });

        const { error } = await supabase
            .from('audit_log')
            .upsert(rows, { onConflict: 'id' });

        if (!error) {
            const newCursor = Math.max(...pending.map(e => e.ts));
            localStorage.setItem(AUDIT_SYNC_CURSOR, String(newCursor));
            console.log(`[AuditService] Sincronizados ${rows.length} logs de auditoría a la nube.`);
        } else {
            console.warn('[AuditService] Error en upsert de auditoría:', error.message);
        }
    } catch (err) {
        // Silencioso – sync cloud nunca debe romper la app
        console.warn('[AuditService] Cloud sync error:', err);
    }
}
