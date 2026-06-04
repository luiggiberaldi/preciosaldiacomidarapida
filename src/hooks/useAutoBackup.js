import { useEffect, useState, useCallback } from 'react';
import { storageService } from '../utils/storageService';

const BACKUP_METADATA_KEY = 'bodega_backups_metadata_v1';
const BACKUP_PREFIX = 'bodega_backup_data_v1_';
const CRITICAL_KEYS = [
  'my_products_v1',
  'my_customers_v1',
  'bodega_customers_v1', // backup de respaldo de ambas variaciones
  'bodega_sales_v1',
  'bodega_payment_methods_v1',
  'kitchen_orders_v1'
];
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export function useAutoBackup() {
  const [backups, setBackups] = useState([]);
  const [lastBackupAt, setLastBackupAt] = useState(null);

  // Obtener lista de metadatos de backups
  const loadBackupMeta = useCallback(async () => {
    try {
      const meta = await storageService.getItem(BACKUP_METADATA_KEY, []);
      // Ordenar por fecha (más reciente primero)
      const sortedMeta = meta.sort((a, b) => b.timestamp - a.timestamp);
      setBackups(sortedMeta);
      if (sortedMeta.length > 0) {
        setLastBackupAt(new Date(sortedMeta[0].timestamp).toISOString());
      }
    } catch (e) {
      console.error('[AutoBackup] Error loading metadata:', e);
    }
  }, []);

  // Crear backup manualmente o automático
  const triggerBackup = useCallback(async (label = 'Respaldo Automático') => {
    try {
      const snapshot = {};
      let hasData = false;

      for (const key of CRITICAL_KEYS) {
        const val = await storageService.getItem(key, null);
        if (val !== null) {
          snapshot[key] = val;
          hasData = true;
        }
      }

      if (!hasData) return null;

      const backupId = crypto.randomUUID();
      const timestamp = Date.now();
      
      // Guardar el snapshot completo bajo una clave única
      await storageService.setItem(`${BACKUP_PREFIX}${backupId}`, snapshot);

      // Actualizar metadatos
      const currentMeta = await storageService.getItem(BACKUP_METADATA_KEY, []);
      const newBackupMeta = {
        id: backupId,
        timestamp,
        label,
        size: JSON.stringify(snapshot).length
      };

      let updatedMeta = [newBackupMeta, ...currentMeta];

      // Rotación circular: Máximo 5 backups
      if (updatedMeta.length > 5) {
        // Eliminar el más viejo
        const sortedOldestFirst = [...updatedMeta].sort((a, b) => a.timestamp - b.timestamp);
        const toDelete = sortedOldestFirst.slice(0, updatedMeta.length - 5);
        
        for (const item of toDelete) {
          await storageService.removeItem(`${BACKUP_PREFIX}${item.id}`);
        }
        
        updatedMeta = updatedMeta.filter(item => !toDelete.some(del => del.id === item.id));
      }

      await storageService.setItem(BACKUP_METADATA_KEY, updatedMeta);
      await loadBackupMeta();

      console.log(`[AutoBackup] Respaldo "${label}" creado con éxito. ID: ${backupId}`);
      return backupId;
    } catch (e) {
      console.error('[AutoBackup] Error creating backup:', e);
      return null;
    }
  }, [loadBackupMeta]);

  // Restaurar desde un backup específico
  const restoreBackup = useCallback(async (backupId) => {
    try {
      const backupData = await storageService.getItem(`${BACKUP_PREFIX}${backupId}`, null);
      if (!backupData) {
        throw new Error('No se encontraron datos del respaldo solicitado.');
      }

      for (const [key, val] of Object.entries(backupData)) {
        await storageService.setItem(key, val);
      }

      // Disparar evento para actualizar vistas locales (Dashboard, Inventario, etc.)
      window.dispatchEvent(new CustomEvent('app_storage_update', { detail: { key: 'my_products_v1' } }));
      window.dispatchEvent(new CustomEvent('app_storage_update', { detail: { key: 'bodega_sales_v1' } }));

      console.log(`[AutoBackup] Estado restaurado con éxito desde el backup ID: ${backupId}`);
      return true;
    } catch (e) {
      console.error('[AutoBackup] Error restoring backup:', e);
      return false;
    }
  }, []);

  // Exportar el backup actual como archivo JSON descargable
  const exportBackup = useCallback(async () => {
    try {
      const snapshot = {};
      for (const key of CRITICAL_KEYS) {
        const val = await storageService.getItem(key, null);
        if (val !== null) {
          snapshot[key] = val;
        }
      }

      const payload = {
        app: 'precios_al_dia_comida_rapida',
        timestamp: Date.now(),
        data: snapshot
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_completo_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('[AutoBackup] Error exporting backup:', e);
      return false;
    }
  }, []);

  // Carga inicial y temporizador de backup en segundo plano
  useEffect(() => {
    loadBackupMeta();

    const checkAndBackup = async () => {
      const meta = await storageService.getItem(BACKUP_METADATA_KEY, []);
      const last = meta.reduce((max, item) => Math.max(max, item.timestamp), 0);
      
      // Si no hay backups, o el último tiene más de 4 horas
      if (last === 0 || (Date.now() - last) > FOUR_HOURS_MS) {
        await triggerBackup('Respaldo Automático Periódico');
      }
    };

    // Lanzar chequeo 15 segundos después del arranque
    const startupTimer = setTimeout(checkAndBackup, 15000);

    // Chequeo recurrente cada 30 minutos
    const intervalTimer = setInterval(checkAndBackup, 30 * 60 * 1000);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(intervalTimer);
    };
  }, [loadBackupMeta, triggerBackup]);

  return {
    backups,
    lastBackupAt,
    backupCount: backups.length,
    triggerBackup,
    restoreBackup,
    exportBackup
  };
}
