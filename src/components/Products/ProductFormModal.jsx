import React, { useRef, useState } from "react";
import {
  Camera,
  X,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Modal } from "../Modal";

const PREP_TIMES = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
];

export default function ProductFormModal({
  isOpen,
  onClose,
  isEditing,

  image,
  setImage,
  name,
  setName,
  category,
  setCategory,
  priceUsd,
  handlePriceUsdChange,
  priceBs,
  handlePriceBsChange,
  costUsd,
  handleCostUsdChange,
  costBs,
  handleCostBsChange,

  // New food-specific fields
  description,
  setDescription,
  prepTime,
  setPrepTime,
  available,
  setAvailable,
  sizes,
  setSizes,
  extras,
  setExtras,

  handleImageUpload,
  handleSave,
  categories,

  // Legacy props (ignored but kept for compat)
  unit,
  setUnit,
  stock,
  setStock,
  lowStockAlert,
  setLowStockAlert,
  unitsPerPackage,
  setUnitsPerPackage,
  sellByUnit,
  setSellByUnit,
  unitPriceUsd,
  setUnitPriceUsd,
  packagingType,
  setPackagingType,
  stockInLotes,
  setStockInLotes,
  granelUnit,
  setGranelUnit,
}) {
  const fileInputRef = useRef(null);
  const [showExtras, setShowExtras] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraPrice, setNewExtraPrice] = useState("");
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizePrice, setNewSizePrice] = useState("");

  if (!isOpen) return null;

  const parsedPrice = parseFloat(priceUsd) || 0;
  const parsedCost = parseFloat(costUsd) || 0;
  const marginPct =
    parsedCost > 0 ? ((parsedPrice - parsedCost) / parsedCost) * 100 : null;

  const handleAddExtra = () => {
    if (!newExtraName.trim() || !newExtraPrice) return;
    const updated = [
      ...(extras || []),
      {
        id: crypto.randomUUID(),
        name: newExtraName.trim(),
        priceUsd: parseFloat(newExtraPrice) || 0,
      },
    ];
    setExtras(updated);
    setNewExtraName("");
    setNewExtraPrice("");
  };

  const handleRemoveExtra = (id) => {
    setExtras((extras || []).filter((e) => e.id !== id));
  };

  const handleAddSize = () => {
    if (!newSizeName.trim() || !newSizePrice) return;
    const updated = [
      ...(sizes || []),
      {
        id: crypto.randomUUID(),
        name: newSizeName.trim(),
        priceUsd: parseFloat(newSizePrice) || 0,
      },
    ];
    setSizes(updated);
    setNewSizeName("");
    setNewSizePrice("");
  };

  const handleRemoveSize = (id) => {
    setSizes((sizes || []).filter((s) => s.id !== id));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Plato" : "Nuevo Plato"}
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Photo Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-20 sm:h-28 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-500 transition-colors relative overflow-hidden"
        >
          {image ? (
            <img
              src={image}
              className="w-full h-full object-cover"
              alt="Preview"
            />
          ) : (
            <>
              <Camera size={24} className="text-slate-400 mb-2" />
              <span className="text-xs font-bold text-slate-500">
                Toca para subir foto del plato
              </span>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
          {image && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImage(null);
              }}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">
              Nombre del Plato
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Ej: Perro Caliente Especial"
              className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold text-sm sm:text-base text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 capitalize"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">
              Descripción corta
            </label>
            <input
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pan, salchicha, queso, papitas"
              className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>

          {/* Category + Prep Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 text-xs sm:text-sm"
              >
                {categories
                  .filter((c) => c.id !== "todos")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                <Clock size={10} /> Preparación
              </label>
              <select
                value={prepTime || 10}
                onChange={(e) => setPrepTime(parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 text-xs sm:text-sm"
              >
                {PREP_TIMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Available Toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <div
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${available !== false ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}
              onClick={() => setAvailable(available === false ? true : false)}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${available !== false ? "translate-x-[22px]" : "translate-x-0.5"}`}
              />
            </div>
            <div
              onClick={() => setAvailable(available === false ? true : false)}
            >
              <span
                className={`text-xs font-bold ${available !== false ? "text-green-600 dark:text-green-400" : "text-slate-500"}`}
              >
                {available !== false ? "✅ Disponible" : "⛔ No disponible"}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Desactívalo cuando se acabe un ingrediente
              </p>
            </div>
          </label>

          {/* ─── PRICE SECTION ─── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 ml-1 mb-1 block uppercase tracking-wider">
                Precio ($)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={priceUsd}
                onChange={(e) => handlePriceUsdChange(e.target.value)}
                placeholder="3.50"
                className="w-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3 rounded-xl font-black text-red-700 dark:text-red-400 outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-1 mb-1 block uppercase tracking-wider">
                Precio (Bs)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={priceBs}
                onChange={(e) => handlePriceBsChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-3 rounded-xl font-black text-indigo-800 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              />
            </div>
          </div>

          {/* Cost (collapsible, optional) */}
          <details className="group">
            <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-600 transition-colors flex items-center gap-1 ml-1">
              <ChevronDown
                size={12}
                className="group-open:rotate-180 transition-transform"
              />{" "}
              Costo (opcional)
            </summary>
            <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={costUsd}
                  onChange={(e) => handleCostUsdChange(e.target.value)}
                  placeholder="Costo $"
                  className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-slate-500/50 text-sm"
                />
              </div>
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={costBs}
                  onChange={(e) => handleCostBsChange(e.target.value)}
                  placeholder="Costo Bs"
                  className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-slate-500/50 text-sm"
                />
              </div>
              {marginPct !== null && (
                <div className="col-span-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Margen de ganancia
                  </span>
                  <span
                    className={`text-sm font-black ${marginPct >= 0 ? "text-green-500" : "text-rose-500"}`}
                  >
                    {marginPct.toFixed(0)}% · $
                    {(parsedPrice - parsedCost).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </details>

          {/* ─── SIZES (Phase 2) ─── */}
          <div
            className={`border rounded-xl overflow-hidden transition-all ${(sizes || []).length > 0 ? "border-orange-200 dark:border-orange-800/30" : "border-slate-200 dark:border-slate-700"}`}
          >
            <button
              onClick={() => setShowSizes(!showSizes)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span>
                📏 Tamaños{" "}
                {(sizes || []).length > 0 && (
                  <span className="text-orange-500 ml-1">
                    ({(sizes || []).length})
                  </span>
                )}
              </span>
              {showSizes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showSizes && (
              <div className="px-3 py-3 space-y-2 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-[10px] text-slate-400 italic">
                  Ej: Sencillo $2.50, Doble $4.00, Triple $5.50
                </p>

                {/* Existing sizes */}
                {(sizes || []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg border border-orange-100 dark:border-orange-800/20"
                  >
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-white">
                      {s.name}
                    </span>
                    <span className="text-sm font-black text-red-500">
                      ${s.priceUsd.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveSize(s.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Add new size */}
                <div className="flex gap-2">
                  <input
                    value={newSizeName}
                    onChange={(e) => setNewSizeName(e.target.value)}
                    placeholder="Nombre"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newSizePrice}
                    onChange={(e) => setNewSizePrice(e.target.value)}
                    placeholder="$"
                    className="w-20 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <button
                    onClick={handleAddSize}
                    className="px-3 bg-orange-500 text-white rounded-lg active:scale-95 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── EXTRAS (Phase 2) ─── */}
          <div
            className={`border rounded-xl overflow-hidden transition-all ${(extras || []).length > 0 ? "border-green-200 dark:border-green-800/30" : "border-slate-200 dark:border-slate-700"}`}
          >
            <button
              onClick={() => setShowExtras(!showExtras)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span>
                🧀 Extras / Adicionales{" "}
                {(extras || []).length > 0 && (
                  <span className="text-green-500 ml-1">
                    ({(extras || []).length})
                  </span>
                )}
              </span>
              {showExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showExtras && (
              <div className="px-3 py-3 space-y-2 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-[10px] text-slate-400 italic">
                  Ej: Queso extra +$0.50, Tocino +$1.00, Huevo +$0.50
                </p>

                {/* Existing extras */}
                {(extras || []).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 p-2 rounded-lg border border-green-100 dark:border-green-800/20"
                  >
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-white">
                      {e.name}
                    </span>
                    <span className="text-sm font-black text-green-600">
                      +${e.priceUsd.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveExtra(e.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Add new extra */}
                <div className="flex gap-2">
                  <input
                    value={newExtraName}
                    onChange={(e) => setNewExtraName(e.target.value)}
                    placeholder="Nombre"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newExtraPrice}
                    onChange={(e) => setNewExtraPrice(e.target.value)}
                    placeholder="$"
                    className="w-20 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                  <button
                    onClick={handleAddExtra}
                    className="px-3 bg-green-500 text-white rounded-lg active:scale-95 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-red-500/20 active:scale-95 transition-all text-sm sm:text-base"
        >
          {isEditing ? "Actualizar Plato" : "🔥 Guardar Plato"}
        </button>
      </div>
    </Modal>
  );
}
