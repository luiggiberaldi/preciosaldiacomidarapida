// Driver para Impresora Térmica utilizando la Web Serial API
// Basado en el protocolo estándar ESC/POS

// Helpers para limpiar caracteres especiales incompatibles con la mayoría de impresoras térmicas
function sanitizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos
    .replace(/[ñ]/g, 'n')
    .replace(/[Ñ]/g, 'N')
    .replace(/[íí]/g, 'i')
    .replace(/[óó]/g, 'o')
    .replace(/[áá]/g, 'a')
    .replace(/[éé]/g, 'e')
    .replace(/[úú]/g, 'u')
    .replace(/[üÜ]/g, 'u')
    .replace(/[¿¡]/g, '');
}

export class PrinterSerial {
  constructor() {
    this.port = null;
    this.writer = null;
    this.paperWidth = localStorage.getItem('bodega_printer_paper_width') || '58mm'; // '58mm' o '80mm'
  }

  // Verifica si el navegador soporta Web Serial API
  static isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  // Obtener puertos ya permitidos anteriormente
  async getAutoPort() {
    if (!PrinterSerial.isSupported()) return null;
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        return ports[0];
      }
    } catch (e) {
      console.error('[PrinterSerial] Error en getPorts:', e);
    }
    return null;
  }

  // Conectar solicitando permiso al usuario
  async connect() {
    if (!PrinterSerial.isSupported()) {
      throw new Error('Web Serial API no soportada en este navegador.');
    }

    try {
      // Solicita al usuario elegir un puerto
      this.port = await navigator.serial.requestPort();
      await this.openPort();
      return true;
    } catch (e) {
      console.error('[PrinterSerial] Error al conectar:', e);
      this.port = null;
      throw e;
    }
  }

  // Auto-conectar con puerto pre-aprobado
  async autoConnect() {
    if (!PrinterSerial.isSupported()) return false;
    try {
      const port = await this.getAutoPort();
      if (port) {
        this.port = port;
        await this.openPort();
        return true;
      }
    } catch (e) {
      console.warn('[PrinterSerial] Auto-conexión fallida:', e);
      this.port = null;
    }
    return false;
  }

  // Abrir el puerto configurado
  async openPort() {
    if (!this.port) return;
    if (this.port.readable || this.port.writable) {
      // Ya está abierto
      return;
    }
    // Abrir con baudRate común para impresoras POS
    await this.port.open({ baudRate: 9600 });
    console.log('[PrinterSerial] Puerto serial abierto con éxito.');
  }

  // Desconectar / Cerrar puerto
  async disconnect() {
    try {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      console.log('[PrinterSerial] Puerto cerrado.');
    } catch (e) {
      console.error('[PrinterSerial] Error al cerrar puerto:', e);
    }
  }

  // Cambiar el ancho del papel
  setPaperWidth(width) {
    if (width === '58mm' || width === '80mm') {
      this.paperWidth = width;
      localStorage.setItem('bodega_printer_paper_width', width);
    }
  }

  // Enviar bytes directos a la impresora
  async writeBytes(bytes) {
    if (!this.port) {
      // Intentar auto-conectar
      const success = await this.autoConnect();
      if (!success) {
        throw new Error('Impresora no conectada.');
      }
    }

    // Asegurarse de abrir si por alguna razón se cerró
    await this.openPort();

    const writable = this.port.writable;
    if (!writable) {
      throw new Error('El canal de escritura de la impresora no está disponible.');
    }

    const writer = writable.getWriter();
    try {
      await writer.write(new Uint8Array(bytes));
    } finally {
      writer.releaseLock();
    }
  }

  // Inicializa la impresora (resetea comandos)
  async init() {
    await this.writeBytes([0x1B, 0x40]);
  }

  // Cortar papel
  async cut() {
    // Comando GS V 66 0 (corta y avanza un poco)
    await this.writeBytes([0x1D, 0x56, 0x42, 0x00]);
  }

  // Abrir cajón monedero
  async openDrawer() {
    // Comando ESC p 0 25 250
    await this.writeBytes([0x1B, 0x70, 0x00, 0x19, 0xFA]);
  }

  // Genera los bytes formateados a partir de un string de comandos enriquecidos
  async printRawText(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    await this.writeBytes(bytes);
  }

  // Imprime una línea de texto con alineación y estilos
  // align: 'left', 'center', 'right'
  // style: 'normal', 'bold', 'double'
  async printLine(text, align = 'left', style = 'normal') {
    const commands = [];
    
    // Alineación
    if (align === 'center') {
      commands.push(0x1B, 0x61, 0x01); // Center
    } else if (align === 'right') {
      commands.push(0x1B, 0x61, 0x02); // Right
    } else {
      commands.push(0x1B, 0x61, 0x00); // Left
    }

    // Estilos de fuente
    if (style === 'bold') {
      commands.push(0x1B, 0x45, 0x01); // Bold ON
      commands.push(0x1D, 0x21, 0x00); // Size Normal
    } else if (style === 'double') {
      commands.push(0x1B, 0x45, 0x01); // Bold ON
      commands.push(0x1D, 0x21, 0x11); // Double width + double height
    } else {
      commands.push(0x1B, 0x45, 0x00); // Bold OFF
      commands.push(0x1D, 0x21, 0x00); // Size Normal
    }

    await this.writeBytes(commands);

    // Escribir texto sanitizado + nueva línea
    const cleanText = sanitizeText(text) + '\n';
    await this.printRawText(cleanText);
  }

  // Avanzar N líneas
  async feed(lines = 1) {
    // ESC d N (avanza N líneas)
    await this.writeBytes([0x1B, 0x64, lines]);
  }

  // Generar separador visual de acuerdo al ancho de papel
  async printSeparator() {
    const charsCount = this.paperWidth === '80mm' ? 48 : 32;
    const separator = '-'.repeat(charsCount);
    await this.printLine(separator, 'center', 'normal');
  }

  // Retorna el número de caracteres disponibles según el ancho del papel
  getMaxChars() {
    return this.paperWidth === '80mm' ? 48 : 32;
  }

  // Formatea dos columnas alineadas a los extremos (ej: "Producto   $10.00")
  formatColumns(leftText, rightText) {
    const maxChars = this.getMaxChars();
    const cleanLeft = sanitizeText(leftText);
    const cleanRight = sanitizeText(rightText);
    
    const spacesNeeded = maxChars - (cleanLeft.length + cleanRight.length);
    if (spacesNeeded <= 0) {
      // Si no cabe, recortamos el texto izquierdo
      const allowedLeftLength = maxChars - cleanRight.length - 1;
      const truncatedLeft = cleanLeft.substring(0, allowedLeftLength);
      return truncatedLeft + ' ' + cleanRight;
    }
    
    return cleanLeft + ' '.repeat(spacesNeeded) + cleanRight;
  }
}

// Instancia única (Singleton)
export const printerSerialInstance = new PrinterSerial();
