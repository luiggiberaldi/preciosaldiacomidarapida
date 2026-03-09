import React, { useState } from "react";
import { Modal } from "./Modal";
import { X, Search, Globe, Eye, EyeOff, CheckCircle } from "lucide-react";
import { webSupabase, generateProductId } from "../utils/supabase";
import { getPriceUsd } from "../utils/priceHelpers";

export default function PublishWebModal({
    isOpen,
    onClose,
    products,
    tenantId,
    onUpdateProductPublish,
    triggerHaptic,
    effectiveRate,
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isSyncing, setIsSyncing] = useState({});

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggle = async (product) => {
        if (triggerHaptic) triggerHaptic();

        const newStatus = product.publishWeb === false ? true : false;

        // Set loading state for this specific product switch
        setIsSyncing((prev) => ({ ...prev, [product.id]: true }));

        try {
            const webId = generateProductId(tenantId, product.id);

            if (newStatus) {
                // Upsert to web_catalog live
                const webItem = {
                    id: webId,
                    local_id: Number(product.id) || 0,
                    tenant_id: tenantId,
                    name: product.name,
                    description: product.description || "",
                    price_usd: getPriceUsd(product),
                    category: product.category || "otros",
                    image_url: product.image || "",
                    is_available: product.available !== false,
                    prep_time: String([0, 5, 10, 15, 20, 30, 45, 60].includes(Number(product.prepTime)) ? Number(product.prepTime) : (product.prepTime === undefined ? 10 : 0)),
                    sizes: (() => {
                        if (!product.sizes || product.sizes.length === 0) return [];
                        const basePrice = getPriceUsd(product);
                        const userSetBaseName = product.baseSizeName && product.baseSizeName.trim() !== "" && product.baseSizeName !== "Normal";
                        const sizeHasBasePrice = product.sizes.some(s => getPriceUsd(s) === basePrice);
                        if (userSetBaseName || !sizeHasBasePrice) {
                            return [{ id: "base", name: product.baseSizeName || "Normal", price: basePrice }, ...product.sizes];
                        }
                        return product.sizes;
                    })(),
                    extras: product.extras || [],
                    updated_at: new Date().toISOString(),
                };
                const { error } = await webSupabase.from("web_catalog").upsert(webItem, { onConflict: "id" });
                if (error) console.error("Error upserting product to web", error);
            } else {
                // Delete from web live
                const { error } = await webSupabase.from("web_catalog").delete().eq("id", webId);
                if (error) console.error("Error deleting product from web", error);
            }

            // Sync the exchange rate continuously to ensure accurate web display
            await webSupabase.from("web_config").update({ exchange_rate: effectiveRate || 1 }).eq("tenant_id", tenantId);

            // Update local state (which triggers storage save)
            onUpdateProductPublish(product.id, newStatus);
        } finally {
            setIsSyncing((prev) => ({ ...prev, [product.id]: false }));
        }
    };

    const publishedCount = products.filter(p => p.publishWeb !== false).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Menú Web en Vivo">
            <div className="flex flex-col h-[80vh] sm:h-[600px] max-h-screen bg-slate-50 relative">
                {/* Header content */}
                <div className="p-4 sm:p-5 bg-white border-b border-slate-100 shrink-0 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg leading-tight">Gestión del Catálogo Web</h3>
                            <p className="text-sm text-slate-500">
                                {publishedCount} de {products.length} productos publicados
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto para publicar/ocultar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-shadow outline-none"
                        />
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <p>No se encontraron productos</p>
                        </div>
                    )}
                    {filteredProducts.map((p) => {
                        const isPublished = p.publishWeb !== false;
                        const syncing = isSyncing[p.id];

                        return (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {p.image ? (
                                        <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 text-xl shrink-0">🍔</div>
                                    )}
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            ${parseFloat(p.priceUsdt || p.priceUsd || p.price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center">
                                    <button
                                        disabled={syncing}
                                        onClick={() => handleToggle(p)}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner disabled:opacity-50 ${isPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex flex-col justify-center items-center ${isPublished ? 'translate-x-6' : 'translate-x-0'}`}>
                                            {syncing ? (
                                                <div className="w-3 h-3 border-2 border-emerald-500 border-t-white rounded-full animate-spin" />
                                            ) : isPublished ? (
                                                <CheckCircle size={14} className="text-emerald-500" />
                                            ) : (
                                                <EyeOff size={14} className="text-slate-400" />
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}
