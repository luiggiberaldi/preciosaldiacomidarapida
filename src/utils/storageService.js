import localforage from "localforage";

// Configuración inicial de IndexedDB
localforage.config({
  name: "TasasAlDiaApp",
  storeName: "app_data",
  description: "Almacenamiento local optimizado para PWA",
});

const SCHEMA_VERSION = 2;

/**
 * Executes migrations for backward compatibility.
 */
async function runMigrations(key, value) {
  if (!value) return value;

  // Check if it's an array to apply element-wise migrations
  if (Array.isArray(value)) {
    let modified = false;

    // my_products_v1 migration
    if (key === "my_products_v1") {
      value.forEach(item => {
        if (item && typeof item === "object") {
          // Defaults for SCHEMA_VERSION=2
          if (item._schemaVersion !== SCHEMA_VERSION) {
            item._schemaVersion = SCHEMA_VERSION;
            item.sizes = item.sizes || [];
            item.extras = item.extras || [];
            if (item.available === undefined) item.available = true;
            if (item.prepTime === undefined) item.prepTime = 10;
            if (item.source === undefined) item.source = "LOCAL";
            modified = true;
          }
        }
      });
    }

    if (modified) {
      // Fire-and-forget saving
      localforage.setItem(key, value).catch(() => { });
    }
  } else if (typeof value === "object" && value !== null) {
    if (value._schemaVersion !== SCHEMA_VERSION) {
      value._schemaVersion = SCHEMA_VERSION;
      localforage.setItem(key, value).catch(() => { });
    }
  }

  return value;
}

/**
 * Servicio de almacenamiento que previene el límite de 5MB de localStorage
 * Migrando los datos pesados a IndexedDB a través de localforage.
 */
export const storageService = {
  /**
   * Obtiene un item de IndexedDB.
   * Si no existe, intenta leerlo de localStorage (Retrocompatibilidad),
   * lo guarda en IndexedDB y lo borra de localStorage.
   */
  async getItem(key, defaultValue = null) {
    try {
      // 1. Intentar leer de IndexedDB
      const value = await localforage.getItem(key);
      let resultValue = null;

      if (value !== null) {
        resultValue = value;
      } else {
        // 2. Si no existe, revisar LocalStorage (Migración al vuelo)
        const fallbackValue = localStorage.getItem(key);
        if (fallbackValue !== null) {
          // Migración silenciosa de localStorage a IndexedDB
          let parsedValue;
          try {
            parsedValue = JSON.parse(fallbackValue);
          } catch (e) {
            parsedValue = fallbackValue; // A veces guardamos strings directos
          }

          // Guardar en la nueva base de datos
          await localforage.setItem(key, parsedValue);

          // Borrar el viejo para liberar el preciado espacio de 5MB
          localStorage.removeItem(key);

          resultValue = parsedValue;
        } else {
          // 3. No existe en ningún lado
          resultValue = defaultValue;
        }
      }

      return await runMigrations(key, resultValue);
    } catch (error) {
      console.error(`[Storage Error] Leyendo ${key}:`, error);
      // Fallback drástico en caso de que el navegador bloquee IndexedDB por privacidad extrema
      const backup = localStorage.getItem(key);
      if (backup) {
        try {
          return JSON.parse(backup);
        } catch (e) {
          return backup;
        }
      }
      return defaultValue;
    }
  },

  /**
   * Guarda un item directamente en IndexedDB
   */
  async setItem(key, value) {
    try {
      await localforage.setItem(key, value);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app_storage_update", { detail: { key } })
        );
      }
    } catch (error) {
      console.error(`[Storage Error] Guardando ${key}:`, error);
      // Fallback de emergencia a localStorage si falla algo catastrófico
      try {
        localStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("app_storage_update", { detail: { key } })
          );
        }
      } catch (e) {
        console.error(
          `[Storage Error CRÍTICO] Ni IndexedDB ni LocalStorage funcionan para ${key}`,
          e,
        );
      }
    }
  },

  /**
   * Elimina un item
   */
  async removeItem(key) {
    try {
      await localforage.removeItem(key);
      localStorage.removeItem(key); // Por si acaso quedó algún residuo
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app_storage_update", { detail: { key } })
        );
      }
    } catch (error) {
      console.error(`[Storage Error] Borrando ${key}:`, error);
    }
  },

  async clearAll() {
    try {
      await localforage.clear();
      const keysToClear = [
        "my_products_v1",
        "bodega_sales_v1",
        "bodega_open_tabs_v1",
        "bodega_table_zones_v1",
        "bodega_tables_v1",
        "abasto-auth-storage",
        "abasto-device-session",
        "pending_cart",
        "recycled_cart",
        "pda_cloud_role",
        "pda_last_sync_time",
        "has_tables_system",
        "has_delivery",
        "requires_prepayment",
        "street_rate_bs",
        "catalog_use_auto_usdt",
        "catalog_custom_usdt_price",
        "catalog_show_cash_price",
        "bodega_use_auto_rate",
        "bodega_custom_rate",
        "bodega_auto_rate_source",
        "cierre_notified_date"
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));

      // Limpiar cualquier token de autenticación de Supabase de la máquina
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.error("Error al limpiar datos locales del tenant:", e);
    }
  },
};

/**
 * Safe localStorage JSON read. Wraps try/catch for private browsing,
 * corrupt data, or missing keys.
 * @param {string} key
 * @param {*} fallback - Default value if read fails
 * @returns {*}
 */
export function safeGetJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Safe localStorage JSON write. Silently fails on quota errors or private browsing.
 * @param {string} key
 * @param {*} value
 */
export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail (private browsing, quota exceeded)
  }
}

/**
 * Safe localStorage string read.
 */
export function safeGetItem(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safe localStorage string write.
 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail
  }
}
