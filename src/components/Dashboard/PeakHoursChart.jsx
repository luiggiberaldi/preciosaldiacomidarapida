import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Gráfica de barras horizontales: Horas Pico (Histórico).
 * Pure CSS — cero dependencias externas.
 */
function PeakHoursChart({ sales }) {
    if (!sales || sales.length === 0) return null;

    // Calcular la frecuencia de ventas por cada hora (0-23)
    const hoursData = React.useMemo(() => {
        const counts = new Array(24).fill(0);
        sales.filter(s => s.status !== 'ANULADA' && s.tipo !== 'COBRO_DEUDA').forEach(s => {
            if (s.timestamp) {
                const d = new Date(s.timestamp);
                counts[d.getHours()] += 1;
            }
        });

        // Filtrar solo las horas que tienen ventas y ordenar para encontrar las más ocupadas
        const activeHours = counts
            .map((count, hour) => ({ hour, count }))
            .filter(d => d.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Tomamos las 5 franjas más ocupadas

        return activeHours;
    }, [sales]);

    if (hoursData.length === 0) return null;

    const maxCount = Math.max(...hoursData.map(d => d.count), 1);

    const formatHour = (h) => {
        const ampm = h >= 12 ? 'pm' : 'am';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${displayH}${ampm}`;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-1.5">
                <Clock size={12} /> Horas Pico (Histórico)
            </h3>

            <div className="space-y-3">
                {hoursData.map((data, i) => {
                    const pct = (data.count / maxCount) * 100;
                    const isTop = i === 0;

                    return (
                        <div key={data.hour} className="flex items-center gap-3">
                            {/* Label hora */}
                            <div className="w-10 shrink-0 text-right">
                                <span className={`text-xs font-bold ${isTop ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {formatHour(data.hour)}
                                </span>
                            </div>

                            {/* Barra */}
                            <div className="flex-1 flex items-center justify-start h-5 bg-slate-50 dark:bg-slate-800/50 rounded-r-lg overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-700 ease-out rounded-r-lg ${isTop
                                        ? 'bg-red-500 shadow-sm shadow-red-500/20'
                                        : 'bg-indigo-300 dark:bg-indigo-500/50'
                                        }`}
                                    style={{
                                        width: `${Math.max(pct, 2)}%`,
                                    }}
                                />
                            </div>

                            {/* Label count */}
                            <div className="w-12 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400">
                                    {data.count} <span className="font-medium opacity-80">vts</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">Las horas con mayor afluencia histórica.</p>
            </div>
        </div>
    );
}

export default React.memo(PeakHoursChart);
