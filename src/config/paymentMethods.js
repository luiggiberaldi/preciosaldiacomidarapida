import { storageService } from '../utils/storageService';
import { Banknote, Smartphone, CreditCard, DollarSign, Store, ShoppingCart, Package, Coins, Key, Fingerprint } from 'lucide-react';

const PM_KEY = 'bodega_payment_methods_v1';

// ── MÉTODOS DE FÁBRICA (no editables, no eliminables) ──
export const FACTORY_PAYMENT_METHODS = [
    // Bolívares
    { id: 'efectivo_bs', label: 'Efectivo en Bolívares', icon: '💵', Icon: Banknote, currency: 'BS', isFactory: true },
    { id: 'pago_movil', label: 'Pago Móvil', icon: '📱', Icon: Smartphone, currency: 'BS', isFactory: true },
    { id: 'punto_venta', label: 'Punto de Venta', icon: '💳', Icon: CreditCard, currency: 'BS', isFactory: true },
    // Dólares
    { id: 'efectivo_usd', label: 'Efectivo en Dólares', icon: '💲', Icon: DollarSign, currency: 'USD', isFactory: true },
];

// Alias para compatibilidad
export const DEFAULT_PAYMENT_METHODS = FACTORY_PAYMENT_METHODS;

// ── PERSISTENCIA ──

/** Obtener métodos activos (fábrica + custom) */
export async function getActivePaymentMethods() {
    const saved = await storageService.getItem(PM_KEY, null);
    if (!saved) return [...FACTORY_PAYMENT_METHODS];

    // Rehidratar: reinyectar el componente Icon según id
    return saved.map(m => ({
        ...m,
        // Factory: por id | Custom: por iconKey string
        Icon: PAYMENT_ICONS[m.id] ?? ICON_COMPONENTS[m.icon] ?? null,
    }));
}

/** Guardar métodos (reemplaza todo el array) */
export async function savePaymentMethods(methods) {
    // Serializar: quitar campos no-clonables (Icon, componentes React)
    const serializable = methods.map(m => {
        const { Icon, ...rest } = m;
        return rest;
    });
    await storageService.setItem(PM_KEY, serializable);
}

/** Agregar un método custom */
export async function addPaymentMethod({ label, currency, icon }) {
    const methods = await getActivePaymentMethods();
    const newMethod = {
        id: 'custom_' + Date.now(),
        label,
        icon: icon || (currency === 'USD' ? '💲' : '💵'),
        currency,
        isFactory: false,
    };
    methods.push(newMethod);
    await savePaymentMethods(methods);
    return methods;
}

/** Eliminar un método (solo custom, no fábrica) */
export async function removePaymentMethod(id) {
    const methods = await getActivePaymentMethods();
    const filtered = methods.filter(m => m.id !== id || m.isFactory);
    await savePaymentMethods(filtered);
    return filtered;
}

// ── HELPERS ──

export const getPaymentLabel = (id) => {
    const all = FACTORY_PAYMENT_METHODS;
    const method = all.find(m => m.id === id);
    return method ? method.label : id;
};

// Icon lookup for React components
export const PAYMENT_ICONS = {
    efectivo_bs: Banknote,
    pago_movil: Smartphone,
    punto_venta: CreditCard,
    efectivo_usd: DollarSign,
};

// Mapa para rehidratar íconos custom por su key string
export const ICON_COMPONENTS = {
    Banknote, Smartphone, CreditCard, DollarSign,
    Store, ShoppingCart, Package, Coins, Key, Fingerprint,
};

export const getPaymentMethod = (id) => {
    return FACTORY_PAYMENT_METHODS.find(m => m.id === id) || FACTORY_PAYMENT_METHODS[0];
};

// Colores por método (para dashboard/historial)
export const PAYMENT_COLORS = {
    amber: {
        active: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
        icon: 'text-amber-500',
        bar: 'bg-amber-500',
    },
    indigo: {
        active: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        icon: 'text-indigo-500',
        bar: 'bg-indigo-500',
    },
    violet: {
        active: 'border-violet-500 bg-violet-50 dark:bg-violet-900/20',
        text: 'text-violet-600 dark:text-violet-400',
        icon: 'text-violet-500',
        bar: 'bg-violet-500',
    },
    blue: {
        active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        icon: 'text-blue-500',
        bar: 'bg-blue-500',
    },
};
