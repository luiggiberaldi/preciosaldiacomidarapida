import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Check } from "lucide-react";
import { getPriceUsd } from "../utils/priceHelpers";

export default function ProductOptionsModal({
    isOpen,
    onClose,
    product,
    onAddToCart,
    exchangeRate = 1,
}) {
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState("");

    // Filter out redundant "Normal" base size if already covered by other sizes
    const combinedSizes = useMemo(() => {
        if (!product?.sizes || product.sizes.length === 0) return [];

        const basePrice = getPriceUsd(product);
        const hasBaseInjected = product.sizes.some(s => s.id === "base");

        if (hasBaseInjected) {
            const baseItem = product.sizes.find(s => s.id === "base");
            const otherSizes = product.sizes.filter(s => s.id !== "base");

            const sizeHasBasePrice = otherSizes.some(s => getPriceUsd(s) === basePrice);
            const userSetBaseName = baseItem.name !== "Normal" && baseItem.name.trim() !== "";

            if (!userSetBaseName && sizeHasBasePrice) {
                return otherSizes;
            }
            return product.sizes;
        }
        return product.sizes;
    }, [product]);

    // Reset state when product changes or modal opens
    useEffect(() => {
        if (isOpen && product) {
            if (combinedSizes.length > 0) {
                setSelectedSize(combinedSizes[0].name);
            } else {
                setSelectedSize("");
            }
            setSelectedExtras([]);
            setQty(1);
            setNote("");
        }
    }, [isOpen, product, combinedSizes]);

    if (!isOpen || !product) return null;

    // Calculate base price from size or product default
    const sizeObj = combinedSizes.find((s) => s.name === selectedSize);
    const basePrice = sizeObj ? getPriceUsd(sizeObj) : getPriceUsd(product);

    // Calculate extras total
    const extrasTotal = selectedExtras.reduce(
        (sum, extra) => sum + getPriceUsd(extra),
        0
    );

    // Calculate final unit price and total price
    const unitPrice = basePrice + extrasTotal;
    const totalPrice = unitPrice * qty;
    const totalPriceBs = totalPrice * exchangeRate;

    const handleToggleExtra = (extra) => {
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
        onAddToCart(product, qty, selectedSize, selectedExtras, note);
        onClose();
    };

    return (
        <div
            className={`fixed inset-0 z-50 overflow-clip flex items-end sm:items-center justify-center ${!isOpen ? "pointer-events-none" : ""
                }`}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"
                    }`}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full sm:w-[500px] max-h-[90vh] bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? "translate-y-0" : "translate-y-full sm:translate-y-10 sm:scale-95"
                    }`}
            >
                {/* Header Image */}
                <div className="relative h-48 sm:h-56 bg-slate-100 sm:rounded-t-3xl overflow-hidden shrink-0">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl opacity-50">
                            🍔
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/20" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full transition-colors"
                        aria-label="Cerrar opciones"
                    >
                        <X size={20} />
                    </button>

                    {/* Product Name Title Overlay */}
                    <div className="absolute bottom-4 left-5 right-5">
                        <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md capitalize">
                            {product.name}
                        </h2>
                        {product.description && (
                            <p className="text-sm text-white/90 line-clamp-4 mt-1 drop-shadow-sm font-medium" title={product.description}>
                                {product.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
                    {/* Sizes Selection */}
                    {combinedSizes.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center justify-between">
                                <span>Elige el tamano</span>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                    Requerido
                                </span>
                            </h3>
                            <div className="space-y-2" role="radiogroup" aria-label="Tamano del producto">
                                {combinedSizes.map((size, idx) => (
                                    <label
                                        key={idx}
                                        onClick={() => setSelectedSize(size.name)}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${selectedSize === size.name
                                            ? "border-red-500 bg-red-50/50"
                                            : "border-slate-100 bg-white hover:border-slate-200"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedSize === size.name
                                                    ? "border-red-500"
                                                    : "border-slate-300"
                                                    }`}
                                            >
                                                {selectedSize === size.name && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                                )}
                                            </div>
                                            <span
                                                className={`font-bold capitalize ${selectedSize === size.name
                                                    ? "text-red-900"
                                                    : "text-slate-700"
                                                    }`}
                                            >
                                                {size.name}
                                            </span>
                                        </div>
                                        <span className="font-bold text-slate-500">
                                            ${getPriceUsd(size).toFixed(2)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extras Selection */}
                    {product.extras?.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center justify-between">
                                <span>Adicionales</span>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                    Opcional
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {product.extras.map((extra, idx) => {
                                    const isSelected = selectedExtras.some(
                                        (e) => e.name === extra.name
                                    );
                                    return (
                                        <label
                                            key={idx}
                                            onClick={() => handleToggleExtra(extra)}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                                                ? "border-emerald-500 bg-emerald-50/50"
                                                : "border-slate-100 bg-white hover:border-slate-200"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected
                                                        ? "bg-emerald-500 border-emerald-500"
                                                        : "border-slate-300 bg-white"
                                                        }`}
                                                >
                                                    {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                                                </div>
                                                <span
                                                    className={`font-bold capitalize ${isSelected ? "text-emerald-900" : "text-slate-700"
                                                        }`}
                                                >
                                                    {extra.name}
                                                </span>
                                            </div>
                                            <span className="font-bold text-slate-500">
                                                +${getPriceUsd(extra).toFixed(2)}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2 pt-2">
                        <label htmlFor="product-note" className="font-bold text-slate-800">
                            Instrucciones para este plato
                        </label>
                        <textarea
                            id="product-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ej: Sin cebolla, carne bien cocida, extra salsa de ajo..."
                            rows={2}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow resize-none"
                        />
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-4 pb-2">
                        <span className="font-bold text-slate-800">Cantidad</span>
                        <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
                            <button
                                onClick={() => setQty((q) => Math.max(1, q - 1))}
                                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-red-500 transition-colors active:scale-95"
                                aria-label="Reducir cantidad"
                            >
                                <Minus size={18} strokeWidth={2.5} />
                            </button>
                            <span className="w-6 text-center font-black text-lg text-slate-800">
                                {qty}
                            </span>
                            <button
                                onClick={() => setQty((q) => q + 1)}
                                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-emerald-500 transition-colors active:scale-95"
                                aria-label="Aumentar cantidad"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer / Add to Cart Action */}
                <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                    {/* Live Summary */}
                    <div className="flex justify-between items-center mb-3 px-1">
                        <span className="text-xs font-bold text-slate-500">Resumen:</span>
                        <span className="text-xs font-black text-slate-700">
                            {qty}x {selectedSize?.name || "Normal"}
                            {selectedExtras.length > 0 ? ` • ${selectedExtras.length} extra${selectedExtras.length > 1 ? 's' : ''}` : ''}
                        </span>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className="w-full flex items-center justify-between py-4 px-6 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-red-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 group"
                    >
                        <span>Añadir al Carrito</span>
                        <div className="text-right flex flex-col group-hover:scale-105 transition-transform">
                            <span className="leading-none">${totalPrice.toFixed(2)}</span>
                            <span className="text-[11px] text-white/80 mt-1">
                                Bs {totalPriceBs.toFixed(2)}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
