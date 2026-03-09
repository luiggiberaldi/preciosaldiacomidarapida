import { useState, useEffect, useCallback } from "react";
import { safeGetJSON, safeSetJSON } from "../utils/storageService";

/**
 * Hook para detectar estado online/offline y cachear tasas.
 */
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const [queue, setQueue] = useState(() => safeGetJSON("offline_sync_queue", []));

  // Sincronizar cola entre hooks y pestañas
  useEffect(() => {
    const handleUpdate = () => {
      setQueue((prevQueue) => {
        const newQueue = safeGetJSON("offline_sync_queue", []);
        if (JSON.stringify(prevQueue) !== JSON.stringify(newQueue)) {
          return newQueue;
        }
        return prevQueue;
      });
    };
    window.addEventListener("offline_queue_updated", handleUpdate);
    window.addEventListener("storage", (e) => {
      if (e.key === "offline_sync_queue") handleUpdate();
    });
    return () => {
      window.removeEventListener("offline_queue_updated", handleUpdate);
    };
  }, []);

  // Actualiza persistencia inmediatamente al cambiar la cola
  useEffect(() => {
    const currentStr = localStorage.getItem("offline_sync_queue");
    const newStr = JSON.stringify(queue || []);

    // Solo guardar y disparar evento si la cola realmente cambió
    if (currentStr !== newStr) {
      safeSetJSON("offline_sync_queue", queue);
      window.dispatchEvent(new Event("offline_queue_updated"));
    }
  }, [queue]);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /** Guardar tasa en cache para uso offline */
  const cacheRates = useCallback((rates) => {
    if (rates && rates.bcv?.price > 0) {
      safeSetJSON("offline_cached_rates", {
        ...rates,
        cachedAt: new Date().toISOString(),
      });
    }
  }, []);

  /** Obtener tasa cacheada */
  const getCachedRates = useCallback(() => {
    return safeGetJSON("offline_cached_rates", null);
  }, []);

  /** Añadir acción a la cola genérica */
  const addToQueue = useCallback((action, payload) => {
    setQueue(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        action,
        payload,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  /** Procesar cola al tener red usando handlers provistos */
  const processQueue = useCallback(async (actionHandlers) => {
    if (!isOnline || queue.length === 0) return { processed: 0, failed: 0 };

    let processedCount = 0;
    const remaining = [];

    for (const job of queue) {
      try {
        if (actionHandlers[job.action]) {
          await actionHandlers[job.action](job.payload);
          processedCount++;
        } else {
          console.warn(`No handler for action: ${job.action}`);
          remaining.push(job);
        }
      } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        remaining.push(job);
      }
    }

    // Solo actualizamos el estado al final para no causar re-renders excesivos
    if (processedCount > 0 || remaining.length < queue.length) {
      setQueue(remaining);
    }

    return { processed: processedCount, failed: remaining.length };
  }, [isOnline, queue]);

  const queuedCount = queue.length;

  return { isOnline, cacheRates, getCachedRates, addToQueue, processQueue, queuedCount, queue };
}
