# Diseño de Gestión de Mesas para Restaurante/Comida Rápida

Este documento detalla la arquitectura para adaptar la interfaz y lógica de mesas del POS al contexto de restaurantes y locales de comida rápida.

## Objetivos
- Permitir la apertura interactiva de mesas libres registrando cantidad de comensales, nombre de cliente y notas de la mesa.
- Asignar automáticamente el Mesero en base al usuario activo en la sesión del POS.
- Mostrar la información de la mesa de forma clara y premium en las tarjetas de la distribución y en el modal de detalles de consumo.

## Cambios Propuestos

### 1. `customerInfo` en Tab de Cuenta
Al abrir una mesa, los metadatos se guardarán en:
```json
{
  "tableId": "id_de_la_mesa",
  "waiter": "Nombre del Operador Activo",
  "guests": 4,
  "notes": "Observaciones opcionales"
}
```

### 2. Componentes

#### `OpenTableModal.jsx` (Nuevo)
Diálogo premium interactivo que solicita:
- **Comensales**: Selección táctil rápida (1 a 8+).
- **Cliente**: Campo editable pre-rellenado con el nombre de la mesa.
- **Mesero**: Muestra del usuario logueado en modo lectura.
- **Notas**: Campo de observaciones opcional.

#### `TablesFloorPlan.jsx` (Modificaciones)
- Sustituir el flujo directo al hacer clic en mesas libres por la apertura del `OpenTableModal`.
- Mostrar en las tarjetas ocupadas el mesero (`👤 Juan`), los comensales (`👥 4`) y un indicador de notas si existieran.

#### `TableDetailsModal.jsx` (Modificaciones)
- Mostrar los datos de la mesa (Mesero, Comensales, Notas) en el panel de detalles antes del desglose de consumo.

#### `SalesView.jsx` (Modificaciones)
- Sincronizar el estado del modal de apertura de mesas, importando `useAuthStore` para obtener el usuario activo y guardando la metadata apropiada al agregar un tab.
