# Guía de Migración de Supabase

Esta guía te ayuda a migrar toda la base de datos y la configuración del sistema (POS y la Web de Pedidos) a tus nuevos proyectos de Supabase.

---

## Paso 1: Configurar las Bases de Datos en Supabase

Deberás ejecutar los scripts SQL correspondientes en el editor de consultas (SQL Editor) de cada uno de tus nuevos proyectos de Supabase.

### A. Proyecto Principal (POS / Licencias / Demos / Mesas)
1. Entra a la consola de Supabase de tu **nuevo proyecto principal (POS)**.
2. Ve a la pestaña **SQL Editor** y crea una nueva consulta.
3. Copia y pega el contenido del archivo [`pos_backend_schema.sql`](file:///c:/Users/luigg/Desktop/2026/proyectos%20terminados/tasas%20al%20dia/comida%20rapida/supabase_migration/pos_backend_schema.sql) y haz clic en **Run**.
   * *Esto creará las tablas `licenses`, `demos`, habilitará RLS, configurará las políticas públicas de lectura/escritura y registrará las funciones RPC `auto_register_device` y `heartbeat_device` necesarias.*
4. Crea otra consulta en **SQL Editor**, copia y pega el contenido de [`create_pos_active_tabs.sql`](file:///c:/Users/luigg/Desktop/2026/proyectos%20terminados/tasas%20al%20dia/comida%20rapida/supabase_migration/create_pos_active_tabs.sql) y haz clic en **Run**.
   * *Esto creará la tabla `pos_active_tabs` para sincronizar las mesas activas de salón en tiempo real y habilitará sus políticas RLS.*

### B. Proyecto Web de Pedidos (web-cliente)
1. Entra a la consola de Supabase de tu **nuevo proyecto para la Web de Pedidos**.
2. Ve a la pestaña **SQL Editor** y crea una nueva consulta.
3. Copia y pega el contenido del archivo [`web_cliente_orders_schema.sql`](file:///c:/Users/luigg/Desktop/2026/proyectos%20terminados/tasas%20al%20dia/comida%20rapida/supabase_migration/web_cliente_orders_schema.sql) y haz clic en **Run**.
   * *Esto creará las tablas `web_config`, `web_catalog`, `web_orders`, configurará índices de rendimiento, RLS y las políticas correspondientes para que los clientes puedan ver el menú y enviar pedidos.*

---

## Paso 2: Actualizar las Variables de Entorno en el Código

Una vez creados los proyectos de Supabase, debes actualizar las URL y Anon Keys en los archivos `.env` de las aplicaciones.

### A. En el Servidor POS (Directorio Raíz)
Edita el archivo [`/comida rapida/.env`](file:///c:/Users/luigg/Desktop/2026/proyectos%20terminados/tasas%20al%20dia/comida%20rapida/.env):

```env
# Credenciales del nuevo proyecto principal (POS)
VITE_SUPABASE_URL=https://asihxlvhphbjdirwiygp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaWh4bHZocGhiamRpcndpeWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTMwMTAsImV4cCI6Mj95OTg5MDEwF0.3x3ZJhnSk3IS9WxnaLeq5YMfb4ydDq9aB1ZjcuePUXM

# Credenciales del nuevo proyecto de la Web de Pedidos
VITE_WEB_SUPABASE_URL=https://asihxlvhphbjdirwiygp.supabase.co
VITE_WEB_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaWh4bHZocGhiamRpcndpeWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTMwMTAsImV4cCI6Mj95OTg5MDEwF0.3x3ZJhnSk3IS9WxnaLeq5YMfb4ydDq9aB1ZjcuePUXM
```

### B. En el Cliente de Pedidos (Directorio `web-cliente`)
Edita el archivo [`/comida rapida/web-cliente/.env`](file:///c:/Users/luigg/Desktop/2026/proyectos%20terminados/tasas%20al%20dia/comida%20rapida/web-cliente/.env):

```env
# Credenciales del nuevo proyecto de la Web de Pedidos
VITE_SUPABASE_URL=https://asihxlvhphbjdirwiygp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaWh4bHZocGhiamRpcndpeWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTMwMTAsImV4cCI6Mj95OTg5MDEwF0.3x3ZJhnSk3IS9WxnaLeq5YMfb4ydDq9aB1ZjcuePUXM
```

---

## Paso 3: Migración de Datos Existentes (Opcional)

Si tienes datos de licencias de tus clientes en el proyecto anterior de Supabase que deseas conservar:
1. En tu proyecto de Supabase anterior, ve a la tabla `licenses`.
2. Haz clic en **Export -> Export to CSV**.
3. En tu nuevo proyecto de Supabase, ve a la tabla `licenses`, haz clic en **Insert -> Import data from CSV** y sube el archivo exportado.
4. Repite el proceso para la tabla `demos` si deseas conservar los registros de los períodos de prueba.
