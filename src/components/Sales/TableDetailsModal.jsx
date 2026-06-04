import React, { useState } from "react";
import { X, Printer, Trash2, Plus, CreditCard, Clock, Search } from "lucide-react";

export default function TableDetailsModal({
  isOpen,
  onClose,
  table,
  tab,
  effectiveRate,
  products = [],
  onUpdateTabItems,
  onPrintPrecuenta,
  onCheckout,
  onReleaseTable,
  triggerHaptic,
}) {
  const [activeTab, setActiveTab] = useState("consumo"); // "consumo" | "productos"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");

  if (!isOpen || !table || !tab) return null;

  const totalUsd = tab.items.reduce(
    (s, i) => s + (i.priceUsdt || i.priceUsd || i.price || 0) * i.qty,
    0
  );
  const totalBs = totalUsd * effectiveRate;
  const itemCount = tab.items.reduce((s, i) => s + (i.isWeight ? 1 : i.qty), 0);

  const formatBs = (n) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  // Dynamic category extraction
  const categories = ["todos", ...new Set(products.map((p) => p.category).filter(Boolean))];

  // Product filtering
  const filteredProducts = products.filter((p) => {
    if (p.available === false) return false;
    const matchesCat = selectedCategory === "todos" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  // Quantity updates
  const handleUpdateQty = (index, delta) => {
    triggerHaptic && triggerHaptic();
    let updatedItems = [...tab.items];
    const newQty = Math.round((updatedItems[index].qty + delta) * 1000) / 1000;
    if (newQty <= 0) {
      updatedItems.splice(index, 1);
    } else {
      updatedItems[index].qty = newQty;
    }
    onUpdateTabItems(tab.id, updatedItems);
  };

  const handleRemoveItem = (index) => {
    triggerHaptic && triggerHaptic();
    let updatedItems = [...tab.items];
    updatedItems.splice(index, 1);
    onUpdateTabItems(tab.id, updatedItems);
  };

  const handleAddProduct = (p, sizeName = null, sizePrice = null) => {
    triggerHaptic && triggerHaptic();
    const price = sizePrice !== null ? sizePrice : parseFloat(p.priceUsdt || p.priceUsd || p.price || 0);
    const sizeLabel = sizeName;

    // Unique match by product ID and size
    const existingIndex = tab.items.findIndex(
      (item) => item.id === p.id && item.size === sizeLabel
    );

    let updatedItems = [...tab.items];
    if (existingIndex >= 0) {
      updatedItems[existingIndex].qty += 1;
    } else {
      updatedItems.push({
        id: p.id,
        cartId: sizeLabel ? `${p.id}_${sizeLabel.replace(/\s+/g, "")}` : p.id,
        name: sizeLabel ? `${p.name} (${sizeLabel})` : p.name,
        qty: 1,
        priceUsd: price,
        priceUsdt: price,
        price: price,
        size: sizeLabel,
        isWeight: p.unit === "kg" || p.unit === "litro",
        selectedExtras: [],
        note: "",
      });
    }
    onUpdateTabItems(tab.id, updatedItems);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                Mesa Ocupada
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                {table.zone}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">
              Consumo de {table.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-100 dark:border-slate-700/60 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="shrink-0 flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab("consumo")}
            className={`flex-1 py-3 text-xs font-black transition-all ${
              activeTab === "consumo"
                ? "border-b-2 border-red-500 text-red-600 dark:text-red-400 bg-slate-50/50 dark:bg-slate-950/10"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            🍔 Consumo Actual ({itemCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("productos")}
            className={`flex-1 py-3 text-xs font-black transition-all ${
              activeTab === "productos"
                ? "border-b-2 border-red-500 text-red-600 dark:text-red-400 bg-slate-50/50 dark:bg-slate-950/10"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            ➕ Añadir Productos
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "consumo" ? (
            <>
              {/* Elapsed Time & Metadata */}
              <div className="flex justify-between items-center bg-amber-500/5 dark:bg-amber-900/10 p-3 rounded-2xl border border-amber-200/40 dark:border-amber-800/30">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Clock size={16} />
                  <span className="text-xs font-bold">Tiempo consumido:</span>
                </div>
                <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                  {new Date(tab.createdAt).toLocaleTimeString("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Metadata Box: Mesero, Comensales, Notas */}
              {(tab.customerInfo?.waiter || tab.customerInfo?.guests || tab.customerInfo?.notes) && (
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {tab.customerInfo?.waiter && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-400">Mesero:</span>
                      <span className="font-black text-slate-800 dark:text-white">{tab.customerInfo.waiter}</span>
                    </div>
                  )}
                  {tab.customerInfo?.guests && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-400">Comensales:</span>
                      <span className="font-black text-slate-800 dark:text-white">{tab.customerInfo.guests} personas</span>
                    </div>
                  )}
                  {tab.customerInfo?.notes && (
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 mt-1.5">
                      <span className="font-medium text-slate-400 block mb-0.5">Notas de la mesa:</span>
                      <p className="font-bold text-slate-700 dark:text-slate-200 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60 leading-relaxed">{tab.customerInfo.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ordered Items */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Artículos Ordenados ({itemCount})
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {tab.items.map((item, idx) => {
                    const itemPrice = item.priceUsdt || item.priceUsd || item.price || 0;
                    
                    return (
                      <div key={idx} className="p-3 flex justify-between items-center bg-white dark:bg-slate-900/40">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-bold">
                              ${itemPrice.toFixed(2)}
                            </span>
                            {item.size && (
                              <span className="text-[9px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded font-medium">
                                {item.size}
                              </span>
                            )}
                            {item.selectedExtras?.length > 0 && (
                              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-medium">
                                +{item.selectedExtras.length} extras
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Adjust qty buttons */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 font-black text-sm active:scale-90 transition-all"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-800 dark:text-white">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 font-black text-sm active:scale-90 transition-all"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors ml-1"
                            title="Eliminar artículo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {tab.items.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-8 font-medium bg-white dark:bg-slate-900/40">
                      Mesa vacía. Añada productos desde la pestaña superior.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Add Products Tab
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 font-semibold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all whitespace-nowrap uppercase tracking-wider ${
                      selectedCategory === cat
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Products List */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
                {filteredProducts.map((p) => {
                  const price = parseFloat(p.priceUsdt || p.priceUsd || p.price || 0);
                  const sizes = p.sizes || [];
                  const hasSizes = sizes.length > 0;

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50/50 dark:bg-slate-950/25 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-slate-700 dark:text-white truncate">
                            {p.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            ${price.toFixed(2)} / {formatBs(price * effectiveRate)} Bs
                          </p>
                        </div>
                        {!hasSizes && (
                          <button
                            type="button"
                            onClick={() => handleAddProduct(p)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl shadow active:scale-95 transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>

                      {hasSizes && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-slate-250/20 dark:border-slate-800">
                          {/* Base Size */}
                          <button
                            type="button"
                            onClick={() => handleAddProduct(p, p.baseSizeName || "Normal", price)}
                            className="px-2 py-1 text-[9px] font-black bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <span>{p.baseSizeName || "Normal"} (${price.toFixed(2)})</span>
                            <Plus size={10} className="text-red-500" />
                          </button>
                          {/* Other Sizes */}
                          {sizes.map((s) => {
                            const sPrice = parseFloat(s.priceUsdt || s.priceUsd || s.price || 0);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleAddProduct(p, s.name, sPrice)}
                                className="px-2 py-1 text-[9px] font-black bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <span>{s.name} (${sPrice.toFixed(2)})</span>
                                <Plus size={10} className="text-red-500" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8 font-medium">
                    No se encontraron productos disponibles.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Summary and Actions */}
        <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-4">
          {/* Totals */}
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Acumulado
            </span>
            <div className="text-right">
              <p className="text-2xl font-black text-red-600 dark:text-red-500 leading-none">
                {formatBs(totalBs)} Bs
              </p>
              <p className="text-sm font-bold text-slate-400 mt-1">
                ${totalUsd.toFixed(2)} USD ref.
              </p>
            </div>
          </div>

          {/* Action Grid */}
          <div className="space-y-2">
            <button
              onClick={() => {
                triggerHaptic && triggerHaptic();
                onPrintPrecuenta();
              }}
              className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Printer size={14} /> Imprimir Pre-cuenta
            </button>

            {/* Checkout & Delete */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  onReleaseTable();
                }}
                className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-100 dark:border-red-900/50 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                title="Liberar Mesa (Cancelar cuenta)"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  onCheckout();
                }}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CreditCard size={16} /> COBRAR EN CAJA
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
