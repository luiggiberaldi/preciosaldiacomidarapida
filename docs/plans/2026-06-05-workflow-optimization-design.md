# Diseño de Optimización del Flujo de Trabajo: Mesas en Tiempo Real, Alertas de Cocina e Impresión en Cola

Este documento detalla el diseño arquitectónico y de componentes para implementar las tres mejoras optimizadas del flujo de trabajo (Enfoque A):
1. **Sincronización de Mesas en Tiempo Real:** Compartir el estado del salón y consumo de mesas entre tablets y caja vía Supabase Realtime Channels.
2. **Alertas e Interacción Reactiva en Cocina:** Unificar el flujo de comandas y despachos automáticos de WhatsApp desde el Cloudflare Edge.
3. **Cola de Impresión Silenciosa (Print Queue):** cola de IndexedDB para imprimir comanda/ticket de forma asíncrona sin bloquear la interfaz.

---

## 1. Sincronización de Mesas en Tiempo Real (Supabase Realtime)

### Arquitectura de Datos
Actualmente, las mesas abiertas y consumos activos (`openTabs`) se guardan solo en `localStorage` del dispositivo local. Diseñamos una tabla en Supabase para sincronizar este estado reactivamente.

```sql
CREATE TABLE IF NOT EXISTS public.pos_active_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL,
    name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' o 'CHECKOUT'
    customer_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_pos_active_tabs UNIQUE (user_id, table_id)
);

-- Habilitar RLS
ALTER TABLE public.pos_active_tabs ENABLE ROW LEVEL SECURITY;

-- Política de RLS: El tenant solo gestiona sus propias mesas
CREATE POLICY "Tenant manages own active tabs"
    ON public.pos_active_tabs FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

### Flujo en el Frontend (`src/hooks/useOpenTabs.js`)
- **Carga de Inicialización:** El hook consulta `pos_active_tabs` al abrir la aplicación y sincroniza IndexedDB.
- **Suscripción de Tiempo Real:**
  ```javascript
  const channel = supabase
    .channel('pos-tabs-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'pos_active_tabs',
      filter: `user_id=eq.${authUserId}`
    }, (payload) => {
      // Reconciliar estado de React local basado en el evento (INSERT, UPDATE, DELETE)
    })
    .subscribe();
  ```
- **Persistencia en la Nube:**
  - `addTab` / `updateTab` ejecutan un `upsert` en la tabla `pos_active_tabs`.
  - `removeTab` ejecuta un `delete` para remover la mesa de la base de datos de la nube.
  - Al cambiar de estado a `CHECKOUT` (Mesero pide pre-cuenta), se actualiza la columna `status` en la nube, lo que automáticamente bloquea las tablets de otros meseros mediante suscripción reactiva.

---

## 2. Alertas e Interacción Reactiva en Cocina

### Unificación del Stream
- **Webhook de Sincronización:** Añadiremos un Trigger en Supabase sobre `pos_active_tabs` para disparar webhooks al Cloudflare Worker ante cambios en las mesas (comandas nuevas locales).
- **Consumo SSE:** La Cocina (`KitchenView.jsx`) recibirá notificaciones de nuevos pedidos locales y web mediante un solo stream SSE reactivo (`/api/stream`), reduciendo llamadas REST.

### WhatsApp Automatizado de Despacho
- **Flujo:** Al despachar una orden web/mesa desde la pantalla de Cocina (`KitchenView.jsx`), se envía un fetch a `POST /api/order/ready`.
- **Worker Logic:** El Worker genera y despacha la plantilla del mensaje de WhatsApp del cliente para retirar comida o notificar que ya va en camino, conectándose con un servicio de WhatsApp en la nube (ej. Evolution API) o abriendo el atajo pre-rellenado en el POS de caja.

---

## 3. Cola de Impresión Silenciosa (Print Queue) con Auto-recuperación

### Almacenamiento Local de Cola
Guardaremos la cola de impresión en IndexedDB bajo la clave `my_print_queue`.

### Ciclo Asíncrono de Procesamiento (`src/hooks/usePrinter.js`)
- **Procesador de Cola:** Un bucle asíncrono se ejecuta cada 8 segundos si hay elementos en la cola.
- **Flujo de Ejecución:**
  1. Toma la primera tarea pendiente o fallida cronológicamente.
  2. Intenta imprimir de forma física vía Web Serial.
  3. **Éxito:** Elimina la tarea de la cola.
  4. **Fallo:** Aumenta el contador de intentos. Si supera 3 intentos fallidos, arroja un toast sutil en segundo plano e introduce un fallback copiando el ticket formateado al portapapeles del cajero.
- **Auto-recuperación:** En cuanto la impresora se conecta/enciende y procesa con éxito un trabajo, se ejecutan en ráfaga todas las tareas acumuladas en orden cronológico en IndexedDB.
