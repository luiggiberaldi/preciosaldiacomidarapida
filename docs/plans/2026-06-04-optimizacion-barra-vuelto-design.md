# Diseño: Optimización de la Barra de Vuelto

Este documento define la estructura y diseño para la optimización de la barra de vuelto en el CheckoutModal de la aplicación POS.

## Objetivo
Reducir la altura vertical de la zona de cambio/vuelto en `CheckoutModal.jsx` en al menos un 50% en PC, organizando los elementos horizontalmente (inline) e integrando los atajos de "Todo" directamente al lado de cada campo de texto.

## Estructura Propuesta (Opción A: Inline Row)
* **Contenedor Principal:** Una tarjeta compacta con fondo emerald y bordes redondeados.
* **Barra de Progreso Reactiva:** Una línea ultra-fina de 2px de altura en el borde superior de la tarjeta que cambia de color según el estado de la distribución:
  * Verde (exacto): `#10b981` (100% de la barra)
  * Ámbar (faltan fondos): `#f59e0b` (proporcional al monto distribuido)
  * Rojo (exceso): `#ef4444` (100% de la barra)
* **Fila Inline (PC):**
  * **Sección de Totales (Izquierda):** Vuelto total a entregar en letra grande verde (`$84.23`), con el equivalente en bolívares en letra pequeña gris abajo (`3,116.00 Bs`).
  * **Inputs de Distribución (Centro):**
    * Campo `USD` con un botón pequeño `Todo` a su derecha.
    * Campo `Bs` con un botón pequeño `Todo` a su derecha.
    * En PC se organizan como `flex flex-row items-center gap-3`. En pantallas móviles se apilan en `flex flex-col gap-2` manteniendo la alineación inline de cada input con su botón "Todo".
  * **Monedero Digital (Derecha):** El botón de guardar en monedero digital se compacta y se coloca en línea con los inputs. Si no hay cliente seleccionado, muestra una versión ultra-reducida de ayuda.
