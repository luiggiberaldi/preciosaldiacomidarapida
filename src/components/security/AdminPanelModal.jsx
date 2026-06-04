import React, { useState } from "react";
import { Key } from "lucide-react";

export default function AdminPanelModal({
  isOpen,
  onClose,
  generateCodeForClient,
  triggerHaptic,
  onOpenTester,
}) {
  const [clientDeviceId, setClientDeviceId] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!clientDeviceId) return;
    const code = await generateCodeForClient(clientDeviceId);
    setGeneratedCode(code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="text-red-500" /> Admin Gen
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleGenerateCode}>
          <label className="block text-xs uppercase text-slate-500 font-bold mb-2">
            ID del Cliente
          </label>
          <input
            type="text"
            value={clientDeviceId}
            onChange={(e) => setClientDeviceId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white mb-4 font-mono uppercase"
            placeholder="PDA-XXXX"
          />
          <button className="w-full bg-red-500 hover:bg-red-600 text-black font-bold py-3 rounded-lg mb-4 active:scale-95 transition-transform">
            Generar Código
          </button>
        </form>

        <button
          onClick={() => {
            triggerHaptic();
            onOpenTester();
            onClose();
          }}
          className="w-full bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 font-bold py-2 rounded-lg text-xs uppercase tracking-tighter hover:bg-indigo-600/30 transition-colors"
        >
          🚀 Abrir Tester
        </button>

        {generatedCode && (
          <div className="mt-4 bg-green-900/30 border border-green-500/50 p-4 rounded-lg text-center">
            <p className="text-xs text-green-400 mb-1">Código Generado:</p>
            <p className="text-xl font-mono font-bold text-white tracking-widest selectable select-all">
              {generatedCode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
