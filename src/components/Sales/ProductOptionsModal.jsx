import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Check } from "lucide-react";

export default function ProductOptionsModal({
    isOpen,
    onClose,
    product,
    onAddToCart,
    exchangeRate = 1,
    triggerHaptic,
}) {
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState("");

    // Generar array unificado de tamaños (Base + Adicionales)
    // Generar array unificado de tamaños (Base + Adicionales) solo si existen tamaños explícitamente registrados
    const combinedSizes = product?.sizes && product.sizes.length > 0 ? [
        {
            name: product.baseSizeName || "Normal",
            price: parseFloat(product.priceUsdt || product.priceUsd || product.price || 0)
        },
        ...product.sizes
    ] : [];

    // Reset state when product changes or modal opens
    useEffect(() => {
        if (isOpen && product) {
            if (product.size) {
                setSelectedSize(product.size);
            } else if (combinedSizes.length > 0) {
                // Pre-seleccionar el primer tamaño (el base)
                setSelectedSize(combinedSizes[0].name);
            } else {
                setSelectedSize("");
            }
            setSelectedExtras(product.selectedExtras || []);
            setQty(product.qty || 1);
            setNote(product.note || "");
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const getPriceValue = (obj) =>
        parseFloat(obj?.priceUsdt || obj?.priceUsd || obj?.price_usd || obj?.price || 0);

    // Calculate base price from size or product default
    const sizeObj = combinedSizes.find((s) => s.name === selectedSize);
    const basePrice = sizeObj ? getPriceValue(sizeObj) : parseFloat(product.priceUsdt || product.priceUsd || product.price || 0);

    // Calculate extras total
    const extrasTotal = selectedExtras.reduce(
        (sum, extra) => sum + getPriceValue(extra),
        0
    );

    // Final price
    const unitPrice = basePrice + extrasTotal;
    const totalPrice = unitPrice * qty;
    const totalPriceBs = totalPrice * exchangeRate;

    const handleToggleExtra = (extra) => {
        triggerHaptic && triggerHaptic();
        setSelectedExtras((prev) => {
            const exists = prev.find((e) => e.name === extra.name);
            if (exists) {
                return prev.filter((e) => e.name !== extra.name);
            } else {
                return [...prev, extra];
            }
        });
    };

    const handleAddToCart = () => {
        triggerHaptic && triggerHaptic();
        onAddToCart(product, qty, selectedSize, selectedExtras, note);
        onClose();
    };

    return (
        <div
            className={`fixed inset-0 z-[60] overflow-hidden flex items-center justify-center p-4 ${!isOpen ? "pointer-events-none" : ""
                }`}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"
                    }`}
                onClick={onClose}
            />

            {/* Modal Content - Adaptado para Desktop / POS rápido */}
            <div
                className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? "translate-y-0 scale-100" : "translate-y-10 scale-95"
                    }`}
                style={{ maxHeight: '90vh' }}
            >
                {/* Header simple y rápido */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                            {product.name}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            Armar Pedido
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">

                    {/* Tamaños */}
                    {combinedSizes.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                Tamaño <span className="text-xs text-red-500 font-normal bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Requerido</span>
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {combinedSizes.map((size) => {
                                    const isSelected = selectedSize === size.name;
                                    const price = getPriceValue(size);
                                    return (
                                        <button
                                            key={size.name}
                                            onClick={() => {
                                                triggerHaptic && triggerHaptic();
                                                setSelectedSize(size.name);
                                            }}
                                            className={`flex-1 relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95 ${isSelected
                                                ? "border-red-500 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400"
                                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-red-300"
                                                }`}
                                        >
                                            <span className="font-bold text-base mb-1 capitalize">{size.name}</span>
                                            <span className="text-sm font-black">${price.toFixed(2)}</span>
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Extras */}
                    {product.extras?.length > 0 && (
                        <section>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                Extras <span className="text-xs text-slate-400 font-normal">Opcional</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {product.extras.map((extra) => {
                                    const isSelected = selectedExtras.some((e) => e.name === extra.name);
                                    const extraPrice = getPriceValue(extra);
                                    return (
                                        <button
                                            key={extra.name}
                                            onClick={() => handleToggleExtra(extra)}
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95 ${isSelected
                                                ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                                                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500 hover:border-slate-200"
                                                }`}
                                        >
                                            <span className={`font-bold text-sm capitalize ${isSelected ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                                                {extra.name}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-slate-400">
                                                    +${extraPrice.toFixed(2)}
                                                </span>
                                                <div
                                                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${isSelected
                                                        ? "bg-red-500 border-red-500 text-white"
                                                        : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
                                                        }`}
                                                >
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Notes (Modo rápido POS) */}
                    <section>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Nota / Instrucción
                        </h3>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Refresco sin hielo, poca salsa, etc."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                        />
                    </section>

                    {/* Quantity selector */}
                    <section className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Cantidad</span>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl px-2 py-1 shadow-sm border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => {
                                    triggerHaptic && triggerHaptic();
                                    setQty(Math.max(1, qty - 1));
                                }}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all bg-slate-50 dark:bg-slate-800 rounded-lg"
                            >
                                <Minus size={20} strokeWidth={3} />
                            </button>
                            <span className="w-8 text-center text-xl font-black text-slate-800 dark:text-slate-100">
                                {qty}
                            </span>
                            <button
                                onClick={() => {
                                    triggerHaptic && triggerHaptic();
                                    setQty(qty + 1);
                                }}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all bg-slate-50 dark:bg-slate-800 rounded-lg"
                            >
                                <Plus size={20} strokeWidth={3} />
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer actions */}
                <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 rounded-b-3xl">
                    <button
                        onClick={handleAddToCart}
                        className="w-full flex items-center justify-between py-4 px-6 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/25 active:scale-[0.98] transition-all"
                    >
                        <span className="text-lg font-black tracking-wide">
                            METER A LA COMPRA
                        </span>
                        <div className="flex flex-col items-end">
                            <span className="font-black text-xl leading-none">
                                ${totalPrice.toFixed(2)}
                            </span>
                            <span className="text-sm font-bold opacity-80 mt-0.5">
                                Bs {totalPriceBs.toFixed(2)}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
