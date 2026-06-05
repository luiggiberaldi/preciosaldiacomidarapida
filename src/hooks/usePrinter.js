import { useCallback, useState, useEffect, useRef } from 'react';
import { showToast } from '../components/Toast';

// ─── INDEXEDDB PRINT QUEUE ────────────────────────────────
// Persiste trabajos de impresión para auto-recovery si el popup
// es bloqueado o la impresora falla durante la sesión.

const DB_NAME = 'pda_print_queue';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';

function openPrintQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueJob(type, payload) {
  const db = await openPrintQueueDB();
  return new Promise((resolve, reject) => {
    const job = {
      id: crypto.randomUUID(),
      type,           // 'ticket' | 'kitchen' | 'precuenta' | 'close' | 'test'
      payload,        // sale, order, tab, closeData, etc.
      status: 'pending',
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now(),
      lastAttemptAt: null,
    };
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(job);
    tx.oncomplete = () => resolve(job);
    tx.onerror = () => reject(tx.error);
  });
}

async function dequeueJob(id) {
  const db = await openPrintQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function markJobFailed(id) {
  const db = await openPrintQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const job = req.result;
      if (job) {
        job.status = 'failed';
        job.retries = (job.retries || 0) + 1;
        job.lastAttemptAt = Date.now();
        store.put(job);
      }
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingJobs() {
  const db = await openPrintQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).index('status').getAll('pending');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getAllJobs() {
  const db = await openPrintQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ─── PRINT HTML HELPERS ───────────────────────────────────

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

function getTicketHeaderAndSubtitle() {
  return {
    header: localStorage.getItem("bodega_store_name") || "PRECIOS AL DIA",
    subtitle: "Comida Rápida"
  };
}

function _printSystemHTML(sale, bcvRate) {
  const rate = sale.rate || bcvRate || 1;
  const saleNum = String(sale.saleNumber || 0).padStart(7, '0');
  const d = new Date(sale.timestamp);
  const fecha = d.toLocaleDateString('es-VE');
  const hora = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  
  const { header } = getTicketHeaderAndSubtitle();

  const currencyMode = localStorage.getItem("pda_ticket_currency_mode") || "mixto";
  const showBcv = localStorage.getItem("pda_ticket_show_bcv_rate") !== "false";
  const showEuro = localStorage.getItem("pda_ticket_show_euro") === "true";

  let euroRate = 0;
  if (showEuro) {
    try {
      const saved = JSON.parse(localStorage.getItem("monitor_rates_v12") || "{}");
      euroRate = saved?.euro?.price || 0;
    } catch (_) {}
  }
  
  const itemsHtml = (sale.items || []).map(item => {
    const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
    const unit = item.isWeight ? 'Kg' : 'u';
    const itemPrice = item.priceUsd || item.priceUsdt || item.price || 0;
    const sub = itemPrice * item.qty;
    const subBs = sub * rate;
    const name = item.name.length > 22 ? item.name.substring(0, 22) + '...' : item.name;

    let rightPart = '';
    let subtext = '';

    if (currencyMode === 'usd') {
      rightPart = `$${sub.toFixed(2)}`;
      subtext = `$${itemPrice.toFixed(2)} c/u`;
    } else if (currencyMode === 'bs') {
      rightPart = `Bs ${Number(subBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      subtext = `Bs ${Number(itemPrice * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u`;
    } else {
      rightPart = `$${sub.toFixed(2)}`;
      subtext = `$${itemPrice.toFixed(2)} c/u - Bs ${Number(subBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return `
      <tr>
        <td style="text-align:left;font-size:11px;padding:2px 0;">${qty}${unit}</td>
        <td style="text-align:left;font-size:11px;padding:2px 0;line-height:1.2;">${name}</td>
        <td style="text-align:right;font-size:11px;font-weight:bold;padding:2px 0;">${rightPart}</td>
      </tr>
      <tr>
        <td></td>
        <td colspan="2" style="font-size:9px;color:#333;padding:0 0 4px;">${subtext}</td>
      </tr>`;
  }).join('');

  const paymentsHtml = (sale.payments || []).map(p => {
    const isBs = p.methodId?.includes('_bs') || p.methodId === 'pago_movil';
    const val = isBs
      ? 'Bs ' + Number(p.amountUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '$' + Number(p.amountUsd || 0).toFixed(2);
    return `
      <tr>
        <td style="font-size:11px;padding:2px 0;">${p.methodLabel || 'Pago'}</td>
        <td style="font-size:11px;font-weight:bold;text-align:right;padding:2px 0;">${val}</td>
      </tr>`;
  }).join('');

  let totalHtml = '';
  if (currencyMode === 'usd') {
    totalHtml = `<div class="total-usd">$${parseFloat(sale.totalUsd || 0).toFixed(2)}</div>`;
  } else if (currencyMode === 'bs') {
    totalHtml = `<div class="total-usd">Bs ${Number(sale.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
  } else {
    totalHtml = `
      <div class="total-usd">$${parseFloat(sale.totalUsd || 0).toFixed(2)}</div>
      <div class="total-bs">Bs ${Number(sale.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
  }

  const totalEur = euroRate > 0 ? (sale.totalUsd * rate) / euroRate : 0;
  if (showEuro && totalEur > 0) {
    totalHtml += `<div style="font-size: 13px; font-weight: bold; text-align: center; margin-top: 2px;">€ ${totalEur.toFixed(2)} EUR</div>`;
  }

  let ratesHtml = '';
  if (showBcv) {
    ratesHtml += `<div class="center" style="font-size:9px;margin:2px 0;">Tasa BCV: Bs ${Number(rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por $1</div>`;
  }
  if (showEuro && euroRate > 0) {
    ratesHtml += `<div class="center" style="font-size:9px;margin:2px 0;">Tasa Euro BCV: Bs ${Number(euroRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por €1</div>`;
  }
  const ratesContainer = ratesHtml ? `<div style="margin:4px 0;">${ratesHtml}</div><hr class="dash">` : '';

  let fiadoHtml = '';
  if (sale.fiadoUsd > 0) {
    let fiadoRow = '';
    if (currencyMode === 'usd') {
      fiadoRow = `
        <tr>
          <td style="color:#dc3545;font-weight:bold;font-size:11px;">Deuda pendiente:</td>
          <td style="color:#dc3545;font-weight:bold;font-size:11px;text-align:right;">$${sale.fiadoUsd.toFixed(2)}</td>
        </tr>`;
    } else if (currencyMode === 'bs') {
      fiadoRow = `
        <tr>
          <td style="color:#dc3545;font-weight:bold;font-size:11px;">Deuda pendiente:</td>
          <td style="color:#dc3545;font-weight:bold;font-size:11px;text-align:right;">Bs ${Number(sale.fiadoUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
    } else {
      fiadoRow = `
        <tr>
          <td style="color:#dc3545;font-weight:bold;font-size:11px;">Deuda pendiente:</td>
          <td style="color:#dc3545;font-weight:bold;font-size:11px;text-align:right;">$${sale.fiadoUsd.toFixed(2)}</td>
        </tr>
        <tr>
          <td></td>
          <td style="color:#dc3545;font-size:9px;text-align:right;">Bs ${Number(sale.fiadoUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }
    fiadoHtml = `
      <div style="margin-top:6px;padding:4px 0;border-top:1px dashed #000;">
        <table style="width:100%">${fiadoRow}</table>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket #${saleNum}</title>
<style>
    @page {
        size: 58mm auto;
        margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: Arial, Helvetica, sans-serif;
        width: 48mm;
        max-width: 48mm;
        margin: 0 auto;
        padding: 4mm 2mm;
        color: #000;
        background: #fff;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dash {
        border: none;
        border-top: 1px dashed #000;
        margin: 4px 0;
    }
    .total-usd {
        font-size: 24px;
        font-weight: bold;
        color: #000;
        text-align: center;
        margin: 2px 0;
    }
    .total-bs {
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 2px;
    }
    table { width: 100%; border-collapse: collapse; }
    @media print {
        body { width: 48mm; max-width: 48mm; }
    }
    @media screen {
        body {
            border: 1px solid #ccc;
            margin-top: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
    }
</style>
</head>
<body>
    <div class="center" style="margin-bottom:6px;line-height:1.2;">
        <img src="/logoprincipal.png" style="max-width: 100%; height: auto; display: block; margin: 0 auto 8px;" />
    </div>

    <hr class="dash">

    <table>
        <tr>
            <td style="font-size:10px;font-weight:bold;">N: #${saleNum}</td>
            <td style="font-size:9px;text-align:right;">${fecha} ${hora}</td>
        </tr>
    </table>
    <div style="font-size:10px;margin:3px 0 2px;">
        <span style="font-weight:bold;">Cliente:</span> ${sale.customerName || 'Consumidor Final'}
    </div>

    <hr class="dash">

    <table style="margin-bottom:4px;">
        <tr style="font-size:9px;font-weight:bold;">
            <td style="text-align:left;">CANT</td>
            <td style="text-align:left;">DESCRIPCION</td>
            <td style="text-align:right;">IMPORTE</td>
        </tr>
    </table>

    <table>${itemsHtml}</table>

    <hr class="dash">

    ${ratesContainer}

    <div style="margin:8px 0;">
        <div class="center bold" style="font-size:10px;margin-bottom:4px;">TOTAL A PAGAR</div>
        ${totalHtml}
    </div>

    <hr class="dash">

    ${((sale.payments && sale.payments.length > 0) || sale.fiadoUsd > 0) ? `
    <div style="margin:4px 0;">
        <div style="font-size:9px;font-weight:bold;margin-bottom:4px;">PAGOS REALIZADOS</div>
        <table>${paymentsHtml}</table>
        ${fiadoHtml}
    </div>
    <hr class="dash">
    ` : ''}

    <div class="center bold" style="font-size:11px;margin:8px 0 4px;">¡Gracias por tu compra!</div>
    <div class="center" style="font-size:7.5px;color:#333;margin-top:4px;line-height:1.4;">Este documento no constituye factura fiscal.<br>Comprobante de control interno sin validez tributaria.</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:58mm;height:auto;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 300);
    };
    return true;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  let printed = false;
  printWindow.onload = () => {
    setTimeout(() => {
      if (!printed) {
        printed = true;
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      }
    }, 400);
  };

  setTimeout(() => {
    if (!printed) {
      printed = true;
      try {
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      } catch(_) {}
    }
  }, 1500);

  return true;
}

function _printSystemPrecuentaHTML(tab, bcvRate) {
  const rate = bcvRate || 1;
  const d = new Date();
  const dateStr = d.toLocaleDateString('es-VE');
  const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  
  const currencyMode = localStorage.getItem("pda_ticket_currency_mode") || "mixto";
  const showBcv = localStorage.getItem("pda_ticket_show_bcv_rate") !== "false";
  const showEuro = localStorage.getItem("pda_ticket_show_euro") === "true";

  let euroRate = 0;
  if (showEuro) {
    try {
      const saved = JSON.parse(localStorage.getItem("monitor_rates_v12") || "{}");
      euroRate = saved?.euro?.price || 0;
    } catch (_) {}
  }

  let totalUsd = 0;
  const itemsHtml = (tab.items || []).map(item => {
    const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
    const unit = item.isWeight ? 'Kg' : 'u';
    const itemPrice = item.priceUsdt || item.priceUsd || item.price || 0;
    const sub = itemPrice * item.qty;
    totalUsd += sub;
    const subBs = sub * rate;
    const name = item.name.length > 22 ? item.name.substring(0, 22) + '...' : item.name;

    let rightPart = '';
    let subtext = '';

    if (currencyMode === 'usd') {
      rightPart = `$${sub.toFixed(2)}`;
      subtext = `$${itemPrice.toFixed(2)} c/u`;
    } else if (currencyMode === 'bs') {
      rightPart = `Bs ${Number(subBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      subtext = `Bs ${Number(itemPrice * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u`;
    } else {
      rightPart = `$${sub.toFixed(2)}`;
      subtext = `$${itemPrice.toFixed(2)} c/u - Bs ${Number(subBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return `
      <tr>
        <td style="text-align:left;font-size:11px;padding:2px 0;">${qty}${unit}</td>
        <td style="text-align:left;font-size:11px;padding:2px 0;line-height:1.2;">${name}</td>
        <td style="text-align:right;font-size:11px;font-weight:bold;padding:2px 0;">${rightPart}</td>
      </tr>
      <tr>
        <td></td>
        <td colspan="2" style="font-size:9px;color:#333;padding:0 0 4px;">${subtext}</td>
      </tr>`;
  }).join('');

  let totalHtml = '';
  if (currencyMode === 'usd') {
    totalHtml = `<div class="total-usd">$${totalUsd.toFixed(2)}</div>`;
  } else if (currencyMode === 'bs') {
    totalHtml = `<div class="total-usd">Bs ${Number(totalUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
  } else {
    totalHtml = `
      <div class="total-usd">$${totalUsd.toFixed(2)}</div>
      <div class="total-bs">Bs ${Number(totalUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
  }

  const totalEur = euroRate > 0 ? (totalUsd * rate) / euroRate : 0;
  if (showEuro && totalEur > 0) {
    totalHtml += `<div style="font-size: 13px; font-weight: bold; text-align: center; margin-top: 2px;">€ ${totalEur.toFixed(2)} EUR</div>`;
  }

  let ratesHtml = '';
  if (showBcv) {
    ratesHtml += `<div class="center" style="font-size:9px;margin:2px 0;">Tasa BCV: Bs ${Number(rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por $1</div>`;
  }
  if (showEuro && euroRate > 0) {
    ratesHtml += `<div class="center" style="font-size:9px;margin:2px 0;">Tasa Euro BCV: Bs ${Number(euroRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por €1</div>`;
  }
  const ratesContainer = ratesHtml ? `<div style="margin:4px 0;">${ratesHtml}</div><hr class="dash">` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Precuenta - ${tab.name || 'Sin Nombre'}</title>
<style>
    @page {
        size: 58mm auto;
        margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: Arial, Helvetica, sans-serif;
        width: 48mm;
        max-width: 48mm;
        margin: 0 auto;
        padding: 4mm 2mm;
        color: #000;
        background: #fff;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dash {
        border: none;
        border-top: 1px dashed #000;
        margin: 4px 0;
    }
    .total-usd {
        font-size: 20px;
        font-weight: bold;
        color: #000;
        text-align: center;
        margin: 2px 0;
    }
    .total-bs {
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 2px;
    }
    table { width: 100%; border-collapse: collapse; }
    @media print {
        body { width: 48mm; max-width: 48mm; }
    }
    @media screen {
        body {
            border: 1px solid #ccc;
            margin-top: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
    }
</style>
</head>
<body>
    <div class="center" style="margin-bottom:6px;line-height:1.2;">
        <img src="/logoprincipal.png" style="max-width: 100%; height: auto; display: block; margin: 0 auto 8px;" />
        <div class="bold" style="font-size:11px;margin-top:3px;">*** PRE-CUENTA ***</div>
    </div>

    <hr class="dash">

    <table>
        <tr>
            <td style="font-size:10px;font-weight:bold;">Mesa/Cuenta:</td>
            <td style="font-size:10px;font-weight:bold;text-align:right;">${tab.name || 'Sin Nombre'}</td>
        </tr>
        <tr>
            <td style="font-size:9px;color:#555;">Fecha:</td>
            <td style="font-size:9px;color:#555;text-align:right;">${dateStr} ${timeStr}</td>
        </tr>
    </table>

    <hr class="dash">

    <table style="margin-bottom:4px;">
        <tr style="font-size:9px;font-weight:bold;">
            <td style="text-align:left;">CANT</td>
            <td style="text-align:left;">DESCRIPCION</td>
            <td style="text-align:right;">IMPORTE</td>
        </tr>
    </table>

    <table>${itemsHtml}</table>

    <hr class="dash">

    ${ratesContainer}

    <div style="margin:8px 0;">
        <div class="center bold" style="font-size:10px;margin-bottom:4px;">TOTAL ESTIMADO</div>
        ${totalHtml}
    </div>

    <hr class="dash">

    <div class="center bold" style="font-size:9px;margin:6px 0 2px;">Favor solicitar su factura en caja.</div>
    <div class="center" style="font-size:7.5px;color:#333;margin-top:2px;line-height:1.4;">Documento informativo de consumo.</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:58mm;height:auto;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 300);
    };
    return true;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  let printed = false;
  printWindow.onload = () => {
    setTimeout(() => {
      if (!printed) {
        printed = true;
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      }
    }, 400);
  };

  setTimeout(() => {
    if (!printed) {
      printed = true;
      try {
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      } catch(_) {}
    }
  }, 1500);

  return true;
}

function _printSystemKitchenHTML(order) {
  const orderNum = order.source === 'WEB' ? order.saleNumber : `#${String(order.saleNumber || 0).padStart(2, '0')}`;
  const typeLabel = order.deliveryType || 'LOCAL';
  const orderTime = order.timestamp ? new Date(order.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
  
  const itemsHtml = (order.items || []).map(item => {
    const qty = item.isWeight ? item.qty.toFixed(2) : String(item.qty);
    return `
      <div style="font-size:15px;font-weight:black;margin-bottom:6px;line-height:1.2;">
        ${qty}x ${item.name}
        ${item.note ? `<div style="font-size:11px;font-weight:bold;margin-top:2px;color:#000;">  Nota: ${item.note}</div>` : ''}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Comanda - ${orderNum}</title>
<style>
    @page { size: 58mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: Arial, Helvetica, sans-serif;
        width: 48mm;
        max-width: 48mm;
        margin: 0 auto;
        padding: 4mm 2mm;
        color: #000;
        background: #fff;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dash {
        border: none;
        border-top: 1px dashed #000;
        margin: 4px 0;
    }
</style>
</head>
<body>
    <div class="center" style="margin-bottom:6px;">
        <div style="font-size:12px;font-weight:black;text-transform:uppercase;">*** COMANDA DE COCINA ***</div>
        <div style="font-size:16px;font-weight:black;">ORDEN ${orderNum}</div>
    </div>
    
    <hr class="dash">
    
    <div style="font-size:10px;line-height:1.4;margin-bottom:4px;">
        <div><strong>Tipo:</strong> ${typeLabel}</div>
        ${order.tableNumber ? `<div style="font-size:12px;"><strong>Mesa:</strong> ${order.tableNumber}</div>` : ''}
        <div><strong>Cliente:</strong> ${order.customerName || 'Consumidor Final'}</div>
        ${orderTime ? `<div><strong>Hora:</strong> ${orderTime}</div>` : ''}
    </div>
    
    <hr class="dash">
    
    <div style="margin:6px 0;">
        ${itemsHtml}
    </div>
    
    ${order.orderNotes ? `
    <hr class="dash">
    <div style="font-size:10px;margin-top:4px;">
        <strong>NOTAS GENERALES:</strong><br>
        ${order.orderNotes}
    </div>
    ` : ''}
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:58mm;height:auto;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 300);
    };
    return true;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  let printed = false;
  printWindow.onload = () => {
    setTimeout(() => {
      if (!printed) {
        printed = true;
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      }
    }, 400);
  };
  setTimeout(() => {
    if (!printed) {
      printed = true;
      try {
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      } catch(_) {}
    }
  }, 1500);
  return true;
}

function _printSystemCloseHTML(closeData) {
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
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

  const paymentsHtml = Object.entries(paymentBreakdown).map(([methodId, data]) => {
    const val = data.currency === 'USD'
      ? `$${data.total.toFixed(2)}`
      : data.currency === 'COP'
      ? `${data.total.toFixed(0)} COP`
      : `Bs ${data.total.toFixed(2)}`;
    return `
      <tr>
        <td style="font-size:11px;padding:2px 0;">${data.label}</td>
        <td style="font-size:11px;font-weight:bold;text-align:right;padding:2px 0;">${val}</td>
      </tr>`;
  }).join('');

  const topProductsHtml = (topProducts || []).map((p, i) => `
    <div style="font-size:11px;margin-bottom:4px;">
      <strong>${i+1}. ${p.name}</strong><br>
      <span style="color:#555;">${p.qty} vendidos · Bs ${p.revenue.toFixed(2)}</span>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Cierre Diario</title>
<style>
    @page { size: 58mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: Arial, Helvetica, sans-serif;
        width: 48mm;
        max-width: 48mm;
        margin: 0 auto;
        padding: 4mm 2mm;
        color: #000;
        background: #fff;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dash {
        border: none;
        border-top: 1px dashed #000;
        margin: 4px 0;
    }
    table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
    <div class="center" style="margin-bottom:6px;line-height:1.2;">
        <img src="/logoprincipal.png" style="max-width: 100%; height: auto; display: block; margin: 0 auto 8px;" />
        <div style="font-size:11px;font-weight:bold;margin-top:2px;">CIERRE DEL DIA</div>
        <div style="font-size:9px;color:#555;margin-top:2px;">${dateStr} ${timeStr}</div>
    </div>
    
    <hr class="dash">
    
    <div style="font-size:11px;margin:4px 0;">
        <div style="font-size:11px;font-weight:bold;margin-bottom:4px;">RESUMEN GENERAL</div>
        <table style="width:100%">
            <tr><td>Ventas:</td><td style="text-align:right;">${sales.length}</td></tr>
            <tr><td>Artículos:</td><td style="text-align:right;">${todayItemsSold}</td></tr>
            <tr><td>Ingresos ($):</td><td style="text-align:right;">$${todayTotalUsd.toFixed(2)}</td></tr>
            <tr><td>Ingresos (Bs):</td><td style="text-align:right;">Bs ${todayTotalBs.toFixed(2)}</td></tr>
            <tr><td>Ganancia ($):</td><td style="text-align:right;">$${(todayProfit / bcvRate).toFixed(2)}</td></tr>
            <tr><td>Ganancia (Bs):</td><td style="text-align:right;">Bs ${todayProfit.toFixed(2)}</td></tr>
            <tr><td>Tasa BCV:</td><td style="text-align:right;">Bs ${bcvRate.toFixed(2)}</td></tr>
        </table>
    </div>

    ${paymentsHtml ? `
    <hr class="dash">
    <div style="font-size:11px;margin:4px 0;">
        <div style="font-size:11px;font-weight:bold;margin-bottom:4px;">PAGOS POR METODO</div>
        <table>${paymentsHtml}</table>
    </div>
    ` : ''}

    ${topProductsHtml ? `
    <hr class="dash">
    <div style="font-size:11px;margin:4px 0;">
        <div style="font-size:11px;font-weight:bold;margin-bottom:4px;">MAS VENDIDOS</div>
        ${topProductsHtml}
    </div>
    ` : ''}

    <hr class="dash">
    <div class="center bold" style="font-size:11px;margin-top:6px;">Cierre Exitoso</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:58mm;height:auto;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 300);
    };
    return true;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  let printed = false;
  printWindow.onload = () => {
    setTimeout(() => {
      if (!printed) {
        printed = true;
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      }
    }, 400);
  };
  setTimeout(() => {
    if (!printed) {
      printed = true;
      try {
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      } catch(_) {}
    }
  }, 1500);
  return true;
}

// ─── SCHEDULER ────────────────────────────────────────────
// Retries pending IDB print jobs that are older than 30s.
// Max 3 retries, then marks as failed.

const RETRY_AFTER_MS = 30_000;   // reintenta jobs pendientes cada 30s
const SCHEDULER_INTERVAL = 60_000; // comprueba cada 60s

async function _executeJob(job) {
  switch (job.type) {
    case 'ticket':
      return _printSystemHTML(job.payload.sale, job.payload.bcvRate);
    case 'kitchen':
      return _printSystemKitchenHTML(job.payload.order);
    case 'precuenta':
      return _printSystemPrecuentaHTML(job.payload.tab, job.payload.bcvRate);
    case 'close':
      return _printSystemCloseHTML(job.payload.closeData);
    case 'test':
      return _printSystemHTML(job.payload.sale, job.payload.bcvRate);
    default:
      console.warn('[usePrinter] Unknown job type:', job.type);
      return false;
  }
}

// ─── HOOK ─────────────────────────────────────────────────

export function usePrinter() {
  // El sistema de impresión usa window.open() — siempre está disponible.
  // Se expone como `true` para que SalesView/KitchenView llamen a printTicket/printKitchen.
  const isConnected = true;
  const isSupported = true;
  const paperWidth = '58mm';
  const printerType = 'system';

  // Cola visual: número de trabajos pendientes
  const [printQueueLength, setPrintQueueLength] = useState(0);
  const [pendingPrintJobs, setPendingPrintJobs] = useState([]);
  const schedulerRef = useRef(null);

  // Refrescar estado de cola desde IDB
  const refreshQueueState = useCallback(async () => {
    try {
      const jobs = await getAllJobs();
      const pending = jobs.filter(j => j.status === 'pending');
      setPrintQueueLength(pending.length);
      setPendingPrintJobs(jobs);
    } catch (e) {
      console.warn('[usePrinter] Could not refresh queue state:', e.message);
    }
  }, []);

  // Scheduler: reintenta jobs pendientes que lleven más de 30s sin completarse
  useEffect(() => {
    const runScheduler = async () => {
      try {
        const jobs = await getPendingJobs();
        const now = Date.now();
        for (const job of jobs) {
          const age = now - (job.lastAttemptAt || job.createdAt);
          if (age < RETRY_AFTER_MS) continue;

          if (job.retries >= job.maxRetries) {
            await markJobFailed(job.id);
            console.warn(`[usePrinter] Job ${job.id} (${job.type}) exceeded max retries. Marked failed.`);
            continue;
          }

          console.log(`[usePrinter] Retrying job ${job.id} (${job.type}), attempt ${job.retries + 1}/${job.maxRetries}`);
          try {
            const ok = await _executeJob(job);
            if (ok) {
              await dequeueJob(job.id);
            } else {
              await markJobFailed(job.id);
            }
          } catch (e) {
            await markJobFailed(job.id);
            console.error(`[usePrinter] Job execution error:`, e.message);
          }
        }
        await refreshQueueState();
      } catch (e) {
        console.warn('[usePrinter] Scheduler error:', e.message);
      }
    };

    // Correr el scheduler al montar y luego periódicamente
    runScheduler();
    schedulerRef.current = setInterval(runScheduler, SCHEDULER_INTERVAL);

    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
    };
  }, [refreshQueueState]);

  const connect = useCallback(async () => {}, []);
  const disconnect = useCallback(async () => {}, []);
  const changePaperWidth = useCallback((_width) => {}, []);
  const changePrinterType = useCallback((_type) => {}, []);

  // ── Ticket de Venta ──────────────────────────────────────
  const printTicket = useCallback(async (sale, bcvRate) => {
    const job = await enqueueJob('ticket', { sale, bcvRate });
    try {
      const ok = _printSystemHTML(sale, bcvRate);
      if (ok) await dequeueJob(job.id);
      else     await markJobFailed(job.id);
      await refreshQueueState();
      return ok;
    } catch (e) {
      await markJobFailed(job.id);
      await refreshQueueState();
      throw e;
    }
  }, [refreshQueueState]);

  // ── Pre-cuenta ───────────────────────────────────────────
  const printPrecuenta = useCallback(async (tab, bcvRate) => {
    const rate = bcvRate || 1;
    const job = await enqueueJob('precuenta', { tab, bcvRate: rate });
    try {
      const ok = _printSystemPrecuentaHTML(tab, rate);
      if (ok) await dequeueJob(job.id);
      else     await markJobFailed(job.id);
      await refreshQueueState();
      return ok;
    } catch (e) {
      await markJobFailed(job.id);
      await refreshQueueState();
      throw e;
    }
  }, [refreshQueueState]);

  // ── Comanda de Cocina ────────────────────────────────────
  const printKitchen = useCallback(async (order) => {
    const job = await enqueueJob('kitchen', { order });
    try {
      const ok = _printSystemKitchenHTML(order);
      if (ok) await dequeueJob(job.id);
      else     await markJobFailed(job.id);
      await refreshQueueState();
      return ok;
    } catch (e) {
      await markJobFailed(job.id);
      await refreshQueueState();
      throw e;
    }
  }, [refreshQueueState]);

  // ── Cierre de Caja ───────────────────────────────────────
  const printClose = useCallback(async (closeData) => {
    const job = await enqueueJob('close', { closeData });
    try {
      const ok = _printSystemCloseHTML(closeData);
      if (ok) await dequeueJob(job.id);
      else     await markJobFailed(job.id);
      await refreshQueueState();
      return ok;
    } catch (e) {
      await markJobFailed(job.id);
      await refreshQueueState();
      throw e;
    }
  }, [refreshQueueState]);

  // ── Ticket de Prueba ─────────────────────────────────────
  const printTest = useCallback(async () => {
    const dummySale = {
      saleNumber: 1,
      timestamp: Date.now(),
      customerName: "Cliente de Prueba",
      items: [
        { name: "Producto de Prueba", qty: 1, priceUsd: 10 }
      ],
      totalUsd: 10,
      totalBs: 360,
      rate: 36,
      payments: [
        { methodLabel: "Efectivo", amountUsd: 10 }
      ]
    };
    const job = await enqueueJob('test', { sale: dummySale, bcvRate: 36 });
    try {
      const ok = _printSystemHTML(dummySale, 36);
      if (ok) await dequeueJob(job.id);
      else     await markJobFailed(job.id);
      await refreshQueueState();
      return ok;
    } catch (e) {
      await markJobFailed(job.id);
      await refreshQueueState();
      throw e;
    }
  }, [refreshQueueState]);

  // ── Reintentar manualmente un job fallido ────────────────
  const retryJob = useCallback(async (jobId) => {
    try {
      const db = await openPrintQueueDB();
      const job = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).get(jobId);
        req.onsuccess = () => {
          const j = req.result;
          if (j) {
            j.status = 'pending';
            j.retries = 0;
            j.lastAttemptAt = null;
            tx.objectStore(STORE_NAME).put(j);
          }
          tx.oncomplete = () => resolve(j);
          tx.onerror = () => reject(tx.error);
        };
      });
      if (job) {
        const ok = await _executeJob(job);
        if (ok) await dequeueJob(jobId);
        await refreshQueueState();
        showToast(ok ? 'Reimpresión exitosa' : 'Error al reimprimir', ok ? 'success' : 'error');
      }
    } catch (e) {
      console.error('[usePrinter] retryJob error:', e.message);
      showToast('Error al reimprimir', 'error');
    }
  }, [refreshQueueState]);

  return {
    isConnected,
    isSupported,
    paperWidth,
    printerType,
    // Cola de impresión
    printQueueLength,
    pendingPrintJobs,
    retryJob,
    // Métodos de impresión
    connect,
    disconnect,
    changePaperWidth,
    changePrinterType,
    printTicket,
    printPrecuenta,
    printKitchen,
    printClose,
    printTest
  };
}
