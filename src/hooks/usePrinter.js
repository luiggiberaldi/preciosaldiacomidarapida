import { useState, useEffect, useCallback } from 'react';
import { printerSerialInstance, PrinterSerial } from '../services/PrinterSerial';
import { showToast } from '../components/Toast';

// Helper to copy precuenta to clipboard as formatted text
async function copyPrecuentaToClipboard(tab, rate) {
  const d = new Date();
  const dateStr = d.toLocaleDateString('es-VE');
  const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  
  let textTicket = `*** PRE-CUENTA ***\n`;
  textTicket += `Mesa/Cuenta: ${tab.name || 'Sin Nombre'}\n`;
  textTicket += `Fecha: ${dateStr} ${timeStr}\n`;
  if (tab.customerInfo?.waiter) {
    textTicket += `Atendido por: ${tab.customerInfo.waiter}\n`;
  }
  textTicket += `--------------------------------\n`;
  textTicket += `CANT  DESCRIPCION        IMPORTE\n`;
  textTicket += `--------------------------------\n`;
  
  let totalUsd = 0;
  if (tab.items && tab.items.length > 0) {
    for (const item of tab.items) {
      const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
      const unit = item.isWeight ? 'Kg' : 'u';
      const itemPrice = item.priceUsdt || item.priceUsd || item.price || 0;
      const sub = itemPrice * item.qty;
      totalUsd += sub;
      
      const leftPart = `${qty}${unit} x ${item.name}`;
      const rightPart = `$${sub.toFixed(2)}`;
      const spaces = Math.max(1, 32 - (leftPart.length + rightPart.length));
      textTicket += `${leftPart}${' '.repeat(spaces)}${rightPart}\n`;
    }
  }
  textTicket += `--------------------------------\n`;
  textTicket += `TOTAL ESTIMADO: $${totalUsd.toFixed(2)}\n`;
  textTicket += `Ref Bs: ${(totalUsd * rate).toFixed(2)} (Tasa: ${rate.toFixed(2)})\n`;
  textTicket += `--------------------------------\n`;
  textTicket += `Documento informativo de consumo\n`;
  
  await navigator.clipboard.writeText(textTicket);
}

export function usePrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported] = useState(() => PrinterSerial.isSupported());
  const [paperWidth, setPaperWidthState] = useState(() => printerSerialInstance.paperWidth);

  // Intentar auto-conectar al montar el hook
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (isSupported) {
        const connected = await printerSerialInstance.autoConnect();
        setIsConnected(connected);
      }
    };
    tryAutoConnect();
  }, [isSupported]);

  // Listener para desconexión física del puerto USB/Serial
  useEffect(() => {
    if (!isSupported) return;

    const handleDisconnect = (e) => {
      console.log('[usePrinter] Dispositivo desconectado fisicamente:', e.target);
      if (printerSerialInstance.port === e.target) {
        printerSerialInstance.disconnect();
        setIsConnected(false);
        showToast('Impresora desconectada fisicamente.', 'info');
      }
    };

    navigator.serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      navigator.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [isSupported]);

  // Conectar solicitando puerto
  const connect = useCallback(async () => {
    try {
      const ok = await printerSerialInstance.connect();
      setIsConnected(ok);
      if (ok) {
        showToast('Impresora conectada con exito.', 'success');
      }
    } catch (e) {
      console.error('[usePrinter] Error al conectar:', e);
      setIsConnected(false);
      showToast('No se selecciono ningun puerto de impresion.', 'warning');
    }
  }, []);

  // Desconectar
  const disconnect = useCallback(async () => {
    await printerSerialInstance.disconnect();
    setIsConnected(false);
    showToast('Impresora desconectada.', 'info');
  }, []);

  // Cambiar ancho de papel
  const changePaperWidth = useCallback((width) => {
    printerSerialInstance.setPaperWidth(width);
    setPaperWidthState(width);
    showToast(`Ancho del papel configurado a ${width}.`, 'success');
  }, []);

  // Imprimir un Ticket de Venta
  const printTicket = useCallback(async (sale, bcvRate) => {
    if (!isSupported) {
      showToast('Tu navegador no soporta impresion serial directa (Web Serial).', 'error');
      return false;
    }
    
    try {
      const rate = sale.rate || bcvRate || 1;
      await printerSerialInstance.init();
      
      // Encabezado
      await printerSerialInstance.printLine('PRECIOS AL DIA', 'center', 'double');
      await printerSerialInstance.printLine('Comida Rapida', 'center', 'bold');
      await printerSerialInstance.printSeparator();

      // Info Ticket
      const saleNum = String(sale.saleNumber || 0).padStart(7, '0');
      const d = new Date(sale.timestamp);
      const dateStr = d.toLocaleDateString('es-VE');
      const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      
      await printerSerialInstance.printLine(`Ticket: #${saleNum}`, 'left', 'bold');
      await printerSerialInstance.printLine(`Fecha: ${dateStr} ${timeStr}`, 'left', 'normal');
      await printerSerialInstance.printLine(`Cliente: ${sale.customerName || 'Consumidor Final'}`, 'left', 'normal');
      await printerSerialInstance.printSeparator();

      // Encabezado items
      await printerSerialInstance.printLine(
        printerSerialInstance.formatColumns('CANT  DESCRIPCION', 'IMPORTE'),
        'left',
        'bold'
      );
      await printerSerialInstance.printSeparator();

      // Items
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
          const unit = item.isWeight ? 'Kg' : 'u';
          const sub = item.priceUsd * item.qty;
          
          // Imprimimos el nombre del item
          await printerSerialInstance.printLine(item.name, 'left', 'bold');
          
          // Debajo la cantidad, precio unitario y subtotal
          const leftDetails = `${qty}${unit} x $${item.priceUsd.toFixed(2)} (Bs ${(item.priceUsd * rate).toFixed(2)})`;
          const rightDetails = `$${sub.toFixed(2)}`;
          await printerSerialInstance.printLine(
            printerSerialInstance.formatColumns(leftDetails, rightDetails),
            'left',
            'normal'
          );
        }
      }

      await printerSerialInstance.printSeparator();

      // Tasa cambiaria
      await printerSerialInstance.printLine(`Tasa BCV: Bs ${rate.toFixed(2)} / $1`, 'center', 'normal');
      await printerSerialInstance.printSeparator();

      // Totales
      await printerSerialInstance.printLine('TOTAL A PAGAR', 'center', 'bold');
      await printerSerialInstance.printLine(`$${parseFloat(sale.totalUsd || 0).toFixed(2)}`, 'center', 'double');
      await printerSerialInstance.printLine(`Bs ${(sale.totalBs || 0).toFixed(2)}`, 'center', 'bold');
      await printerSerialInstance.printSeparator();

      // Pagos realizados
      if ((sale.payments && sale.payments.length > 0) || sale.fiadoUsd > 0) {
        await printerSerialInstance.printLine('PAGOS REALIZADOS', 'left', 'bold');
        
        if (sale.payments && sale.payments.length > 0) {
          for (const p of sale.payments) {
            const isBs = p.methodId?.includes('_bs') || p.methodId === 'pago_movil';
            const val = isBs
              ? `Bs ${(p.amountUsd * rate).toFixed(2)}`
              : `$${(p.amountUsd || 0).toFixed(2)}`;
            await printerSerialInstance.printLine(
              printerSerialInstance.formatColumns(p.methodLabel || 'Pago', val),
              'left',
              'normal'
            );
          }
        }

        if (sale.fiadoUsd > 0) {
          await printerSerialInstance.printLine(
            printerSerialInstance.formatColumns('Deuda pendiente:', `$${sale.fiadoUsd.toFixed(2)}`),
            'left',
            'bold'
          );
          await printerSerialInstance.printLine(
            printerSerialInstance.formatColumns('', `Bs ${(sale.fiadoUsd * rate).toFixed(2)}`),
            'left',
            'normal'
          );
        }
        await printerSerialInstance.printSeparator();
      }

      // Pie de ticket
      await printerSerialInstance.printLine('¡Gracias por tu compra!', 'center', 'bold');
      await printerSerialInstance.printLine('Comprobante sin valor fiscal', 'center', 'normal');
      
      await printerSerialInstance.feed(4);
      await printerSerialInstance.cut();
      return true;
    } catch (e) {
      console.error('[usePrinter] Error al imprimir ticket:', e);
      showToast('Error de impresion de ticket. Revisa conexion.', 'error');
      return false;
    }
  }, [isSupported]);

  // Imprimir un Ticket de Pre-cuenta de Consumo
  const printPrecuenta = useCallback(async (tab, bcvRate) => {
    const rate = bcvRate || 1;

    if (!isSupported) {
      try {
        await copyPrecuentaToClipboard(tab, rate);
        showToast('Pre-cuenta copiada al portapapeles (Impresora no soportada).', 'success');
        return true;
      } catch (clipErr) {
        console.error('[usePrinter] Error copying to clipboard:', clipErr);
        showToast('Tu navegador no soporta impresion ni copiado.', 'error');
        return false;
      }
    }
    
    try {
      await printerSerialInstance.init();
      
      // Encabezado
      await printerSerialInstance.printLine('PRECIOS AL DIA', 'center', 'double');
      await printerSerialInstance.printLine('Comida Rapida', 'center', 'bold');
      await printerSerialInstance.printLine('*** PRE-CUENTA ***', 'center', 'bold');
      await printerSerialInstance.printSeparator();
      
      // Info Pre-cuenta
      const d = new Date();
      const dateStr = d.toLocaleDateString('es-VE');
      const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      
      await printerSerialInstance.printLine(`Mesa/Cuenta: ${tab.name || 'Sin Nombre'}`, 'left', 'bold');
      await printerSerialInstance.printLine(`Fecha: ${dateStr} ${timeStr}`, 'left', 'normal');
      await printerSerialInstance.printSeparator();

      // Encabezado items
      await printerSerialInstance.printLine(
        printerSerialInstance.formatColumns('CANT  DESCRIPCION', 'IMPORTE'),
        'left',
        'bold'
      );
      await printerSerialInstance.printSeparator();

      // Items
      let totalUsd = 0;
      if (tab.items && tab.items.length > 0) {
        for (const item of tab.items) {
          const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
          const unit = item.isWeight ? 'Kg' : 'u';
          const itemPrice = item.priceUsdt || item.priceUsd || item.price || 0;
          const sub = itemPrice * item.qty;
          totalUsd += sub;
          
          await printerSerialInstance.printLine(item.name, 'left', 'bold');
          
          const leftDetails = `${qty}${unit} x $${itemPrice.toFixed(2)} (Bs ${(itemPrice * rate).toFixed(2)})`;
          const rightDetails = `$${sub.toFixed(2)}`;
          await printerSerialInstance.printLine(
            printerSerialInstance.formatColumns(leftDetails, rightDetails),
            'left',
            'normal'
          );
        }
      }

      await printerSerialInstance.printSeparator();

      // Tasa cambiaria
      await printerSerialInstance.printLine(`Tasa BCV: Bs ${rate.toFixed(2)} / $1`, 'center', 'normal');
      await printerSerialInstance.printSeparator();

      // Totales
      await printerSerialInstance.printLine('TOTAL ESTIMADO', 'center', 'bold');
      await printerSerialInstance.printLine(`$${totalUsd.toFixed(2)}`, 'center', 'double');
      await printerSerialInstance.printLine(`Bs ${(totalUsd * rate).toFixed(2)}`, 'center', 'bold');
      await printerSerialInstance.printSeparator();

      // Pie
      await printerSerialInstance.printLine('Favor solicitar su factura en caja.', 'center', 'bold');
      await printerSerialInstance.printLine('Documento informativo de consumo', 'center', 'normal');
      
      await printerSerialInstance.feed(4);
      await printerSerialInstance.cut();
      return true;
    } catch (e) {
      console.error('[usePrinter] Error al imprimir pre-cuenta:', e);
      
      // Intentar copiar al portapapeles como fallback inteligente
      try {
        await copyPrecuentaToClipboard(tab, rate);
        showToast('Impresora no conectada. Pre-cuenta copiada al portapapeles.', 'success');
        return true;
      } catch (clipErr) {
        console.error('[usePrinter] Error copying to clipboard:', clipErr);
        showToast('Error de impresion de pre-cuenta.', 'error');
        return false;
      }
    }
  }, [isSupported]);


  // Imprimir comanda de cocina
  const printKitchen = useCallback(async (order) => {
    if (!isSupported) return false;
    try {
      await printerSerialInstance.init();

      // Encabezado
      await printerSerialInstance.printLine('COMANDA DE COCINA', 'center', 'double');
      const orderNum = order.source === 'WEB' ? order.saleNumber : `#${String(order.saleNumber || 0).padStart(2, '0')}`;
      await printerSerialInstance.printLine(`ORDEN ${orderNum}`, 'center', 'double');
      await printerSerialInstance.printSeparator();

      // Detalles de orden
      const typeLabel = order.deliveryType || 'LOCAL';
      await printerSerialInstance.printLine(`Tipo: ${typeLabel}`, 'left', 'bold');
      if (order.tableNumber) {
        await printerSerialInstance.printLine(`Mesa: ${order.tableNumber}`, 'left', 'double');
      }
      await printerSerialInstance.printLine(`Cliente: ${order.customerName || 'Consumidor Final'}`, 'left', 'normal');
      if (order.timestamp) {
        const orderTime = new Date(order.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        await printerSerialInstance.printLine(`Hora: ${orderTime}`, 'left', 'normal');
      }
      await printerSerialInstance.printSeparator();

      // Items en letra doble para visibilidad de los cocineros
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
          await printerSerialInstance.printLine(`${qty}x ${item.name}`, 'left', 'double');
          if (item.note) {
            await printerSerialInstance.printLine(`  Nota: ${item.note}`, 'left', 'bold');
          }
          await printerSerialInstance.feed(1); // Espacio entre productos
        }
      }

      // Notas de la orden general
      if (order.orderNotes) {
        await printerSerialInstance.printSeparator();
        await printerSerialInstance.printLine('NOTAS GENERALES:', 'left', 'bold');
        await printerSerialInstance.printLine(order.orderNotes, 'left', 'normal');
      }

      await printerSerialInstance.printSeparator();
      await printerSerialInstance.feed(4);
      await printerSerialInstance.cut();
      return true;
    } catch (e) {
      console.error('[usePrinter] Error al imprimir comanda:', e);
      showToast('Error de impresion de comanda de cocina.', 'error');
      return false;
    }
  }, [isSupported]);

  // Imprimir Cierre Diario de Caja
  const printClose = useCallback(async (closeData) => {
    if (!isSupported) return false;
    try {
      const {
        sales,
        bcvRate,
        paymentBreakdown,
        topProducts,
        todayTotalUsd,
        todayTotalBs,
        todayProfit,
        todayItemsSold,
      } = closeData;

      await printerSerialInstance.init();

      // Encabezado
      await printerSerialInstance.printLine('PRECIOS AL DIA', 'center', 'double');
      await printerSerialInstance.printLine('CIERRE DEL DIA', 'center', 'bold');
      
      const now = new Date();
      await printerSerialInstance.printLine(
        now.toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
        'center',
        'normal'
      );
      await printerSerialInstance.printLine(`Hora: ${now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`, 'center', 'normal');
      await printerSerialInstance.printSeparator();

      // Resumen general
      await printerSerialInstance.printLine('RESUMEN GENERAL', 'left', 'bold');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Ventas realizadas', String(sales.length)), 'left', 'normal');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Articulos vendidos', String(todayItemsSold)), 'left', 'normal');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Ingresos brutos ($)', `$${todayTotalUsd.toFixed(2)}`), 'left', 'normal');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Ingresos brutos (Bs)', `Bs ${todayTotalBs.toFixed(2)}`), 'left', 'normal');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Ganancia est. ($)', `$${(todayProfit / bcvRate).toFixed(2)}`), 'left', 'normal');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Ganancia est. (Bs)', `Bs ${todayProfit.toFixed(2)}`), 'left', 'normal');
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Tasa BCV', `Bs ${bcvRate.toFixed(2)}`), 'left', 'normal');
      await printerSerialInstance.printSeparator();

      // Pagos por metodo
      if (Object.keys(paymentBreakdown).length > 0) {
        await printerSerialInstance.printLine('PAGOS POR METODO', 'left', 'bold');
        for (const [methodId, data] of Object.entries(paymentBreakdown)) {
          const val = data.currency === 'USD'
            ? `$${data.total.toFixed(2)}`
            : data.currency === 'COP'
            ? `${data.total.toFixed(0)} COP`
            : `Bs ${data.total.toFixed(2)}`;
          await printerSerialInstance.printLine(printerSerialInstance.formatColumns(data.label, val), 'left', 'normal');
        }
        await printerSerialInstance.printSeparator();
      }

      // Top productos
      if (topProducts && topProducts.length > 0) {
        await printerSerialInstance.printLine('PRODUCTOS MAS VENDIDOS', 'left', 'bold');
        for (let i = 0; i < topProducts.length; i++) {
          const p = topProducts[i];
          await printerSerialInstance.printLine(`${i+1}. ${p.name}`, 'left', 'bold');
          await printerSerialInstance.printLine(`   ${p.qty} vendidos · Bs ${p.revenue.toFixed(2)}`, 'left', 'normal');
        }
        await printerSerialInstance.printSeparator();
      }

      // Pie
      await printerSerialInstance.printLine('Cierre generado exitosamente', 'center', 'bold');
      await printerSerialInstance.printLine('Control Administrativo', 'center', 'normal');

      await printerSerialInstance.feed(4);
      await printerSerialInstance.cut();
      return true;
    } catch (e) {
      console.error('[usePrinter] Error al imprimir cierre:', e);
      showToast('Error de impresion de cierre de caja.', 'error');
      return false;
    }
  }, [isSupported]);

  // Ticket de prueba para validar hardware
  const printTest = useCallback(async () => {
    if (!isSupported) return false;
    try {
      await printerSerialInstance.init();
      await printerSerialInstance.printLine('TICKET DE PRUEBA', 'center', 'double');
      await printerSerialInstance.printLine('Precios Al Dia - Comida Rapida', 'center', 'bold');
      await printerSerialInstance.printSeparator();
      await printerSerialInstance.printLine('Conexion establecida con exito.', 'center', 'normal');
      await printerSerialInstance.printLine(`Papel configurado: ${paperWidth}`, 'center', 'bold');
      await printerSerialInstance.printSeparator();
      await printerSerialInstance.printLine(printerSerialInstance.formatColumns('Columna A', 'Columna B'), 'left', 'normal');
      await printerSerialInstance.printLine('Caracteres: abcdefghijklmnNopqrs', 'left', 'normal');
      await printerSerialInstance.printLine('1234567890!@#$%^&*()_+', 'left', 'normal');
      await printerSerialInstance.printSeparator();
      await printerSerialInstance.feed(4);
      await printerSerialInstance.cut();
      return true;
    } catch (e) {
      console.error('[usePrinter] Error al imprimir test:', e);
      showToast('Error al imprimir ticket de prueba.', 'error');
      return false;
    }
  }, [isSupported, paperWidth]);

  return {
    isConnected,
    isSupported,
    paperWidth,
    connect,
    disconnect,
    changePaperWidth,
    printTicket,
    printPrecuenta,
    printKitchen,
    printClose,
    printTest
  };
}
