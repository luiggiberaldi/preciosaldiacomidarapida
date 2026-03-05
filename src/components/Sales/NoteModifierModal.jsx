import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

const QUICK_NOTES = [
    "¡Con Todo!",
    "Sin Cebolla",
    "Sin Salsas",
    "Salsa Aparte",
    "Bien Cocido",
    "Papas Extras",
    "Doble Queso",
    "Para Llevar",
];

export default function NoteModifierModal({ item, onClose, onSave, triggerHaptic }) {
    const [note, setNote] = useState(item?.note || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (item) {
            setNote(item.note || '');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [item]);

    const handleSave = () => {
        triggerHaptic && triggerHaptic();
        onSave(item.id, note.trim());
    };

    const addQuickNote = (qn) => {
        triggerHaptic && triggerHaptic();
        setNote(prev => prev ? `${prev}, ${qn}` : qn);
        inputRef.current?.focus();
    };

    if (!item) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 outline-none">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <h3 className="font-black text-slate-800 dark:text-white text-lg truncate pr-4">Notas: {item.name}</h3>
                    <button onClick={onClose} className="shrink-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition-colors bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-4">
                    <div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ej: Sin cebolla, extra salsa..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-red-500 transition-colors font-medium"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                        />
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notas Rápidas</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_NOTES.map(qn => (
                                <button
                                    key={qn}
                                    onClick={() => addQuickNote(qn)}
                                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-red-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    {qn}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <button
                        onClick={handleSave}
                        className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={20} /> Guardar Nota
                    </button>
                </div>
            </div>
        </div>
    );
}
