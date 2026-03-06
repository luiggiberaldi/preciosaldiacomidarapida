import React, { useRef, useState } from "react";
import {
  Camera,
  X,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Ruler,
  Cherry,
  Check,
  Ban,
  Save,
  Pencil,
  UtensilsCrossed,
  DollarSign,
  FileText,
  Tag,
} from "lucide-react";
import { Modal } from "../Modal";

const PREP_TIMES = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hora" },
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

  // Legacy props (kept for compat)
  unit, setUnit, stock, setStock, lowStockAlert, setLowStockAlert,
  unitsPerPackage, setUnitsPerPackage, sellByUnit, setSellByUnit,
  unitPriceUsd, setUnitPriceUsd, packagingType, setPackagingType,
  stockInLotes, setStockInLotes, granelUnit, setGranelUnit,
}) {
  const fileInputRef = useRef(null);
  const [showExtras, setShowExtras] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showCost, setShowCost] = useState(false);
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
      <div className="space-y-4">
        {/* ─── PHOTO UPLOAD ─── */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-32 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:from-red-50/50 hover:to-red-50/30 transition-all relative overflow-hidden group"
        >
          {image ? (
            <img
              src={image}
              className="w-full h-full object-cover"
              alt="Preview"
            />
          ) : (
            <>
              <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <Camera size={22} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                Toca para agregar foto
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
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ─── BASIC INFO ─── */}
        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
              <UtensilsCrossed size={10} /> Nombre del plato
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Ej: Perro Caliente Especial"
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-[15px] text-slate-800 dark:text-white outline-none focus:border-red-500 transition-colors capitalize placeholder:text-slate-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={10} /> Descripcion
            </label>
            <input
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pan, salchicha, queso, papitas"
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none focus:border-red-500 transition-colors placeholder:text-slate-300"
            />
          </div>

          {/* Category + Prep Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={10} /> Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:border-red-500 transition-colors text-sm"
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
              <label className="text-[11px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={10} /> Preparacion
              </label>
              <select
                value={prepTime || 10}
                onChange={(e) => setPrepTime(parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:border-red-500 transition-colors text-sm"
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
          <button
            type="button"
            onClick={() => setAvailable(available === false ? true : false)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${available !== false
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
          >
            <div
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${available !== false ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${available !== false ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
              />
            </div>
            <div className="text-left">
              <span
                className={`text-xs font-bold flex items-center gap-1 ${available !== false
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500"
                  }`}
              >
                {available !== false ? (
                  <><Check size={12} /> Disponible</>
                ) : (
                  <><Ban size={12} /> No disponible</>
                )}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {available !== false
                  ? "Este plato aparece en el menu"
                  : "Oculto temporalmente del menu"}
              </p>
            </div>
          </button>
        </div>

        {/* ─── PRICE SECTION ─── */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase tracking-widest flex items-center gap-1.5">
            <DollarSign size={10} /> Precio de venta
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-black text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={priceUsd}
                onChange={(e) => handlePriceUsdChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/40 pl-7 pr-3 py-3 rounded-xl font-black text-red-700 dark:text-red-400 outline-none focus:border-red-500 text-[15px] transition-colors"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-xs">Bs</span>
              <input
                type="number"
                inputMode="decimal"
                value={priceBs}
                onChange={(e) => handlePriceBsChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800/40 pl-8 pr-3 py-3 rounded-xl font-black text-indigo-800 dark:text-indigo-400 outline-none focus:border-indigo-500 text-[15px] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ─── COST (collapsible) ─── */}
        <div className={`border-2 rounded-xl overflow-hidden transition-all ${showCost ? "border-slate-300 dark:border-slate-600" : "border-slate-200 dark:border-slate-700"}`}>
          <button
            type="button"
            onClick={() => setShowCost(!showCost)}
            className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <DollarSign size={12} className="opacity-50" />
              Costo de produccion (opcional)
            </span>
            {showCost ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showCost && (
            <div className="px-3.5 pb-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={costUsd}
                  onChange={(e) => handleCostUsdChange(e.target.value)}
                  placeholder="Costo $"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:border-slate-400 text-sm transition-colors"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={costBs}
                  onChange={(e) => handleCostBsChange(e.target.value)}
                  placeholder="Costo Bs"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:border-slate-400 text-sm transition-colors"
                />
              </div>
              {marginPct !== null && (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Margen de ganancia
                  </span>
                  <span
                    className={`text-sm font-black ${marginPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {marginPct.toFixed(0)}% / ${(parsedPrice - parsedCost).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── SIZES SECTION ─── */}
        <div
          className={`border-2 rounded-xl overflow-hidden transition-all ${(sizes || []).length > 0
              ? "border-amber-200 dark:border-amber-800/40"
              : "border-slate-200 dark:border-slate-700"
            }`}
        >
          <button
            type="button"
            onClick={() => setShowSizes(!showSizes)}
            className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Ruler size={12} className="opacity-50" />
              Tamanos
              {(sizes || []).length > 0 && (
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                  {(sizes || []).length}
                </span>
              )}
            </span>
            {showSizes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showSizes && (
            <div className="px-3.5 pb-3 space-y-2">
              <p className="text-[10px] text-slate-400">
                Ej: Sencillo $2.50, Doble $4.00, Triple $5.50
              </p>

              {(sizes || []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-100 dark:border-amber-800/20"
                >
                  <span className="flex-1 text-sm font-bold text-slate-700 dark:text-white">
                    {s.name}
                  </span>
                  <span className="text-sm font-black text-amber-600">
                    ${s.priceUsd.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveSize(s.id)}
                    className="p-1 text-red-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  placeholder="Nombre"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-amber-500 transition-colors"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={newSizePrice}
                  onChange={(e) => setNewSizePrice(e.target.value)}
                  placeholder="$"
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  onClick={handleAddSize}
                  className="px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg active:scale-95 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── EXTRAS SECTION ─── */}
        <div
          className={`border-2 rounded-xl overflow-hidden transition-all ${(extras || []).length > 0
              ? "border-emerald-200 dark:border-emerald-800/40"
              : "border-slate-200 dark:border-slate-700"
            }`}
        >
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Cherry size={12} className="opacity-50" />
              Extras / Adicionales
              {(extras || []).length > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                  {(extras || []).length}
                </span>
              )}
            </span>
            {showExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showExtras && (
            <div className="px-3.5 pb-3 space-y-2">
              <p className="text-[10px] text-slate-400">
                Ej: Queso extra +$0.50, Tocino +$1.00
              </p>

              {(extras || []).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/20"
                >
                  <span className="flex-1 text-sm font-bold text-slate-700 dark:text-white">
                    {e.name}
                  </span>
                  <span className="text-sm font-black text-emerald-600">
                    +${e.priceUsd.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveExtra(e.id)}
                    className="p-1 text-red-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  value={newExtraName}
                  onChange={(e) => setNewExtraName(e.target.value)}
                  placeholder="Nombre"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={newExtraPrice}
                  onChange={(e) => setNewExtraPrice(e.target.value)}
                  placeholder="$"
                  className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  onClick={handleAddExtra}
                  className="px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg active:scale-95 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── SAVE BUTTON ─── */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-red-500/20 active:scale-[0.97] transition-all text-[15px] flex items-center justify-center gap-2"
        >
          {isEditing ? (
            <><Pencil size={18} /> Actualizar Plato</>
          ) : (
            <><Save size={18} /> Guardar Plato</>
          )}
        </button>
      </div>
    </Modal>
  );
}
