import React from "react";
import { Printer } from "lucide-react";
import { usePrinter } from "../../hooks/usePrinter";

export default function PrinterSettings() {
  const {
    isConnected: printerConnected,
    isSupported: printerSupported,
    paperWidth,
    connect: connectPrinter,
    disconnect: disconnectPrinter,
    changePaperWidth,
    printTest
  } = usePrinter();

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-4">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Printer size={14} className="text-indigo-500" />
        Impresora Termica (ESC/POS)
      </h4>

      {!printerSupported ? (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-normal">
            La API Web Serial no es compatible con este navegador. Usa Chrome o Edge para conectar hardware local.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">
                Estado de Conexion
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {printerConnected ? "Conectada (Puerto Serial Activo)" : "Desconectada"}
              </p>
            </div>

            <button
              type="button"
              onClick={printerConnected ? disconnectPrinter : connectPrinter}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                printerConnected
                  ? "bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
              }`}
            >
              {printerConnected ? "Desconectar" : "Conectar"}
            </button>
          </div>

          {printerConnected && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Ancho del Papel
                </label>
                <div className="flex gap-2">
                  {['58mm', '80mm'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => changePaperWidth(size)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        paperWidth === size
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400"
                          : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={printTest}
                className="w-full py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer size={12} />
                Imprimir Ticket de Prueba
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
