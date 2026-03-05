import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../utils/storageService';
import { webSupabase } from '../utils/supabase';
import { Flame, CheckCircle2, Clock, Utensils, RotateCcw, ChefHat, UtensilsCrossed, Globe } from 'lucide-react';
import { showToast } from '../components/Toast';
import { useSounds } from '../hooks/useSounds';

const SALES_KEY = 'bodega_sales_v1';

export default function KitchenView({ triggerHaptic, onNavigate }) {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
    const [now, setNow] = useState(new Date());

    const { playBell, playTap, playSuccess } = useSounds();
    const prevIdsRef = useRef([]);

    const loadOrders = async () => {
        // 1. Fetch Local Orders
        const sales = await storageService.getItem(SALES_KEY, []);
        const localPending = sales
            .filter(s => s.kitchenStatus === 'PENDING' && s.status !== 'ANULADA')
            .map(s => ({ ...s, source: 'LOCAL' }));

        // 2. Fetch Web Orders
        let webPending = [];
        try {
            const { data, error } = await webSupabase
                .from('web_orders')
                .select('*')
                .eq('status', 'kitchen');
            if (error) throw error;

            // Map web_orders to the expected structure
            webPending = (data || []).map(wo => ({
                id: wo.id,
                source: 'WEB',
                saleNumber: 'WEB',
                customerName: wo.customer_name,
                deliveryType: 'LLEVAR',
                timestamp: wo.updated_at || wo.created_at, // time it entered the kitchen
                items: wo.items.map(wi => ({
                    id: wi.id,
                    name: wi.name + (wi.size && wi.size !== 'Sencillo' ? ` [${wi.size}]` : ''),
                    qty: wi.qty,
                    note: wi.selectedExtras ? '+ ' + wi.selectedExtras.map(e => e.name).join(', ') : ''
                }))
            }));
        } catch (error) {
            console.error('Error fetching web orders for kitchen:', error);
        }

        // 3. Merge and Sort by time
        const allPending = [...localPending, ...webPending];
        allPending.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const currentIds = allPending.map(o => o.id);
        const hasNew = currentIds.some(id => !prevIdsRef.current.includes(id));
        if (hasNew && prevIdsRef.current.length > 0) playBell();
        prevIdsRef.current = currentIds;

        setPendingOrders(allPending);
        setLoading(false);
    };

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    // Update timer every 30s
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const handleMarkAsReady = async (orderId, source) => {
        if (triggerHaptic) triggerHaptic();
        try {
            if (source === 'WEB') {
                const { error } = await webSupabase
                    .from('web_orders')
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq('id', orderId);
                if (error) throw error;
                // Currently, we don't support UNDO for web orders, but we can set the last completed for UI
                setLastCompletedOrder({ id: orderId, source: 'WEB' });
            } else {
                const allSales = await storageService.getItem(SALES_KEY, []);
                const orderToComplete = allSales.find(s => s.id === orderId);
                if (orderToComplete) {
                    const updatedSales = allSales.map(s => s.id === orderId ? { ...s, kitchenStatus: 'COMPLETED' } : s);
                    await storageService.setItem(SALES_KEY, updatedSales);
                    setLastCompletedOrder({ ...orderToComplete, source: 'LOCAL' });
                }
            }

            setPendingOrders(prev => prev.filter(o => o.id !== orderId));
            playSuccess();
            showToast('✅ ¡Orden lista para entregar!', 'success');
        } catch (error) {
            console.error('Error al actualizar orden:', error);
            showToast('Error al actualizar la orden', 'error');
        }
    };

    const handleUndo = async () => {
        if (!lastCompletedOrder) return;
        if (lastCompletedOrder.source === 'WEB') {
            showToast('Las órdenes web una vez completadas no se pueden deshacer aquí.', 'info');
            return;
        }

        if (triggerHaptic) triggerHaptic();
        playTap();
        try {
            const allSales = await storageService.getItem(SALES_KEY, []);
            const updatedSales = allSales.map(s => s.id === lastCompletedOrder.id ? { ...s, kitchenStatus: 'PENDING' } : s);
            await storageService.setItem(SALES_KEY, updatedSales);
            setLastCompletedOrder(null);
            loadOrders();
            showToast(`Orden #${lastCompletedOrder.saleNumber || ''} restaurada`, 'info');
        } catch (error) {
            showToast('Error al restaurar la orden', 'error');
        }
    };

    const getWaitTime = (timestamp) => Math.floor((now - new Date(timestamp)) / 60000);

    const getWaitColor = (mins) => {
        if (mins >= 15) return { border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-500', badge: 'bg-red-500 text-white', glow: 'shadow-red-500/30' };
        if (mins >= 10) return { border: 'border-orange-400', bg: 'bg-orange-400', text: 'text-orange-500', badge: 'bg-orange-400 text-white', glow: 'shadow-orange-400/20' };
        return { border: 'border-emerald-400', bg: 'bg-emerald-400', text: 'text-emerald-500', badge: 'bg-emerald-500 text-white', glow: '' };
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
                            <Flame size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none">Cocina</h1>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                                {pendingOrders.length === 0
                                    ? 'Sin pedidos'
                                    : `${pendingOrders.length} ${pendingOrders.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'}`
                                }
                            </p>
                        </div>
                    </div>

                    {lastCompletedOrder && (
                        <button
                            onClick={handleUndo}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <RotateCcw size={14} /> Deshacer
                        </button>
                    )}
                </div>

                {/* Summary pills */}
                {pendingOrders.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                        {(() => {
                            const urgent = pendingOrders.filter(o => getWaitTime(o.timestamp) >= 15).length;
                            const warning = pendingOrders.filter(o => { const w = getWaitTime(o.timestamp); return w >= 10 && w < 15; }).length;
                            const normal = pendingOrders.length - urgent - warning;
                            return (
                                <>
                                    {urgent > 0 && (
                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1 whitespace-nowrap">
                                            🔴 {urgent} urgente{urgent > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {warning > 0 && (
                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1 whitespace-nowrap">
                                            🟠 {warning} en espera
                                        </span>
                                    )}
                                    {normal > 0 && (
                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                                            🟢 {normal} reciente{normal > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Orders */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
                {pendingOrders.length === 0 ? (
                    /* Empty State Premium */
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="relative mb-6">
                            <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] flex items-center justify-center">
                                <UtensilsCrossed size={48} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CheckCircle2 size={20} className="text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl font-black text-slate-700 dark:text-slate-300 mb-1">¡Todo al día!</h2>
                        <p className="text-sm text-slate-400 text-center max-w-[220px]">
                            No hay pedidos pendientes. Los nuevos pedidos aparecerán aquí automáticamente.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-300 dark:text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Escuchando nuevos pedidos...
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingOrders.map(order => {
                            const waitMins = getWaitTime(order.timestamp);
                            const colors = getWaitColor(waitMins);
                            const isUrgent = waitMins >= 15;
                            const orderTime = new Date(order.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white dark:bg-slate-900 rounded-2xl border-2 ${colors.border} overflow-hidden shadow-lg ${colors.glow} transition-all ${isUrgent ? 'animate-pulse' : ''}`}
                                >
                                    {/* Order Header */}
                                    <div className="px-4 py-3 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-3xl font-black ${order.source === 'WEB' ? 'text-blue-600 dark:text-blue-400 text-2xl' : 'text-slate-800 dark:text-white'} tracking-tighter leading-none`}>
                                                {order.source === 'WEB' ? (
                                                    <div className="flex items-center gap-1"><Globe size={24} /> WEB </div>
                                                ) : (
                                                    `#${String(order.saleNumber || 0).padStart(2, '0')}`
                                                )}
                                            </span>
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${order.deliveryType === 'LLEVAR' || order.source === 'WEB'
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                    }`}>
                                                    {order.source === 'WEB' ? '🌐 PEDIDO WEB' : (order.deliveryType === 'LLEVAR' ? '📦 LLEVAR' : '🍽️ LOCAL')}
                                                </span>
                                                {order.customerName && order.customerName !== 'Consumidor Final' && (
                                                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                                                        {order.customerName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${colors.badge}`}>
                                                <Clock size={12} />
                                                {waitMins} min
                                            </div>
                                            <span className="text-[9px] text-slate-400">{orderTime}</span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="px-4 py-3 space-y-2.5">
                                        {order.items.map((item, index) => (
                                            <div key={`${item.id}-${index}`} className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-xl ${colors.bg}/10 dark:${colors.bg}/20 text-slate-700 dark:text-white font-black text-sm flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800`}>
                                                    {item.qty}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">
                                                        {item.name}
                                                    </p>
                                                    {item.note && (
                                                        <div className="mt-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg inline-block">
                                                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                                                📝 {item.note}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action */}
                                    <div className="px-4 pb-4">
                                        <button
                                            onClick={() => handleMarkAsReady(order.id, order.source)}
                                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex justify-center gap-2 items-center shadow-lg shadow-emerald-500/20"
                                        >
                                            <CheckCircle2 size={18} />
                                            ¡Listo para entregar!
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
