import React, { useRef, useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Layers,
} from "lucide-react";
import { Modal } from "../Modal";
import { CATEGORY_ICONS } from "../../config/categories";

const PREP_TIMES = [
  { value: 0, label: "No aplica" },
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
  baseSizeName,
  setBaseSizeName,

  handleImageUpload,
  handleSave,
  categories,
  onAddCategoryDirect,
  effectiveRate,
}) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [hasSizes, setHasSizes] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [catInputName, setCatInputName] = useState("");
  const dropdownRef = useRef(null);

  const [prepDropdownOpen, setPrepDropdownOpen] = useState(false);
  const prepDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setIsAddingNewCat(false);
        setCatInputName("");
      }
      if (prepDropdownRef.current && !prepDropdownRef.current.contains(event.target)) {
        setPrepDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddCatSubmit = () => {
    if (!catInputName.trim()) return;
    if (onAddCategoryDirect) {
      const newId = onAddCategoryDirect(catInputName.trim());
      if (newId) {
        setCategory(newId);
      }
    }
    setIsAddingNewCat(false);
    setCatInputName("");
    setDropdownOpen(false);
  };

  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraPrice, setNewExtraPrice] = useState("");
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizePrice, setNewSizePrice] = useState("");

  // Reset steps and toggle state when opening the modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setHasSizes((sizes || []).length > 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedPrice = parseFloat(priceUsd) || 0;
  const parsedCost = parseFloat(costUsd) || 0;
  const marginPct =
    parsedCost > 0 ? ((parsedPrice - parsedCost) / parsedCost) * 100 : null;

  const profit = parsedPrice - parsedCost;
  let marginColorClass = "";
  let marginLabel = "";
  let marginBgClass = "";

  if (marginPct !== null && parsedCost > 0) {
    if (marginPct >= 30) {
      marginColorClass = "text-emerald-600 dark:text-emerald-400";
      marginBgClass = "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30";
      marginLabel = "Margen Saludable";
    } else if (marginPct >= 0) {
      marginColorClass = "text-amber-600 dark:text-amber-400";
      marginBgClass = "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30";
      marginLabel = "Margen Ajustado";
    } else {
      marginColorClass = "text-rose-650 dark:text-rose-450";
      marginBgClass = "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30";
      marginLabel = "Pérdida / Sin Margen";
    }
  }

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

  const onSaveClick = () => {
    if (!hasSizes) {
      setSizes([]);
      setBaseSizeName("");
    }
    handleSave();
  };

  // Validaciones de pasos para habilitar navegación
  const isStep1Valid = name && name.trim() !== "";
  const isStep2Valid = parsedPrice > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Plato" : "Nuevo Plato"}
    >
      <div className="space-y-6">
        {/* Stepper Progress bar */}
        <div className="relative flex items-center justify-between px-2 py-1 select-none">
          {/* Progress background line */}
          <div className="absolute left-8 right-8 top-[18px] h-1 bg-slate-100 dark:bg-slate-800 -z-10 rounded-full" />
          {/* Active progress line */}
          <div
            className="absolute left-8 top-[18px] h-1 bg-red-500 transition-all duration-300 rounded-full -z-10"
            style={{ width: `${(step - 1) * 44}%` }}
          />

          {/* Step 1 Button */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex flex-col items-center gap-1 group bg-transparent border-none cursor-pointer focus:outline-none"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                step === 1
                  ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30 scale-110"
                  : "bg-emerald-500 border-emerald-500 text-white"
              }`}
            >
              {step > 1 ? <Check size={16} strokeWidth={3} /> : "1"}
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${
                step === 1 ? "text-red-500" : "text-emerald-500"
              }`}
            >
              General
            </span>
          </button>

          {/* Step 2 Button */}
          <button
            type="button"
            onClick={() => isStep1Valid && setStep(2)}
            disabled={!isStep1Valid}
            className={`flex flex-col items-center gap-1 group bg-transparent border-none cursor-pointer focus:outline-none ${
              !isStep1Valid ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                step === 2
                  ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30 scale-110"
                  : step > 2
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
              }`}
            >
              {step > 2 ? <Check size={16} strokeWidth={3} /> : "2"}
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${
                step === 2
                  ? "text-red-500"
                  : step > 2
                  ? "text-emerald-500"
                  : "text-slate-400"
              }`}
            >
              Precios
            </span>
          </button>

          {/* Step 3 Button */}
          <button
            type="button"
            onClick={() => isStep1Valid && isStep2Valid && setStep(3)}
            disabled={!isStep1Valid || !isStep2Valid}
            className={`flex flex-col items-center gap-1 group bg-transparent border-none cursor-pointer focus:outline-none ${
              !isStep1Valid || !isStep2Valid ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                step === 3
                  ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30 scale-110"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
              }`}
            >
              3
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${
                step === 3 ? "text-red-500" : "text-slate-400"
              }`}
            >
              Opciones
            </span>
          </button>
        </div>

        {/* ─── STEP 1: GENERAL INFO ─── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* PHOTO UPLOAD */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-32 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-350 dark:border-slate-650 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:from-red-50/50 hover:to-red-50/30 transition-all relative overflow-hidden group"
            >
              {image ? (
                <img
                  src={image}
                  className="w-full h-full object-cover"
                  alt="Preview"
                />
              ) : (
                <>
                  <div className="w-11 h-11 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
                    <Camera size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
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

            {/* Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
                <UtensilsCrossed size={10} /> Nombre del plato <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Ej: Perro Caliente Especial"
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm text-slate-800 dark:text-white outline-none focus:border-red-500 transition-colors capitalize placeholder:text-slate-300"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={10} /> Descripción
              </label>
              <textarea
                value={description || ""}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Pan artesanal, doble salchicha, extra queso cheddar y papas fritas"
                rows={3}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 transition-colors placeholder:text-slate-400 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Category & Prep Time */}
            <div className="grid grid-cols-2 gap-3">
              <div ref={dropdownRef} className="relative">
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
                  <Tag size={10} /> Categoría
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-slate-750 dark:text-white outline-none focus:border-red-500 transition-colors text-xs flex items-center justify-between shadow-sm active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2 truncate">
                    {(() => {
                      const activeCat = categories.find((c) => c.id === category);
                      const IconComp = activeCat ? (CATEGORY_ICONS[activeCat.id] || Tag) : Tag;
                      return (
                        <>
                          <IconComp size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{activeCat?.label || "Seleccionar..."}</span>
                        </>
                      );
                    })()}
                  </span>
                  <ChevronDown size={14} className={`text-slate-450 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-[99] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-72 flex flex-col">
                    {/* List of categories */}
                    <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 max-h-[160px] scrollbar-hide">
                      {categories
                        .filter((c) => c.id !== "todos")
                        .map((c) => {
                          const IconComp = CATEGORY_ICONS[c.id] || Tag;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCategory(c.id);
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                                category === c.id
                                  ? "bg-red-50 dark:bg-red-950/40 text-red-500"
                                  : "text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <IconComp size={14} className={`shrink-0 ${category === c.id ? "text-red-500" : "text-slate-400 dark:text-slate-500"}`} />
                                <span className="truncate">{c.label}</span>
                              </span>
                              {category === c.id && <Check size={13} strokeWidth={3} className="text-red-500 shrink-0" />}
                            </button>
                          );
                        })}
                    </div>

                    {/* Inline Create Category Input */}
                    <div className="border-t border-slate-100 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-2">
                      {isAddingNewCat ? (
                        <div className="flex gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                          <input
                            value={catInputName}
                            onChange={(e) => setCatInputName(e.target.value)}
                            placeholder="Categoría..."
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-red-500 transition-colors min-w-0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCatSubmit();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCatSubmit}
                            className="px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs active:scale-95 transition-all shrink-0"
                          >
                            Crear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewCat(false);
                              setCatInputName("");
                            }}
                            className="p-1.5 bg-slate-205 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-300 transition-all shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingNewCat(true)}
                          className="w-full py-1.5 border border-dashed border-red-200 dark:border-red-800/40 text-red-500 dark:text-red-400 bg-red-500/5 rounded-xl hover:bg-red-500/10 active:scale-[0.98] transition-all font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <Plus size={13} /> Nueva Categoría
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div ref={prepDropdownRef} className="relative">
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={10} /> Preparación
                </label>
                <button
                  type="button"
                  onClick={() => setPrepDropdownOpen(!prepDropdownOpen)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-slate-750 dark:text-white outline-none focus:border-red-500 transition-colors text-xs flex items-center justify-between shadow-sm active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Clock size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">
                      {PREP_TIMES.find((t) => t.value === prepTime)?.label || "10 min"}
                    </span>
                  </span>
                  <ChevronDown size={14} className={`text-slate-450 shrink-0 transition-transform ${prepDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {prepDropdownOpen && (
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-[99] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-60 flex flex-col">
                    <div className="overflow-y-auto p-1.5 space-y-0.5 scrollbar-hide">
                      {PREP_TIMES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            setPrepTime(t.value);
                            setPrepDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                            prepTime === t.value
                              ? "bg-red-50 dark:bg-red-950/40 text-red-500"
                              : "text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <span>{t.label}</span>
                          {prepTime === t.value && <Check size={13} strokeWidth={3} className="text-red-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Available Toggle */}
            <button
              type="button"
              onClick={() => setAvailable(available === false ? true : false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                available !== false
                  ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
            >
              <div
                className={`w-10 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${
                  available !== false ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    available !== false ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
                />
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    available !== false ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {available !== false ? (
                    <>
                      <Check size={12} /> Disponible
                    </>
                  ) : (
                    <>
                      <Ban size={12} /> No disponible
                    </>
                  )}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {available !== false
                    ? "Este plato aparece activo en el menú"
                    : "Oculto temporalmente del menú"}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ─── STEP 2: PRICING & COSTS ─── */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Price section */}
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 mb-2 block uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign size={10} /> {hasSizes ? "Precio Base (Tamaño Principal)" : "Precio de venta"} <span className="text-red-500">*</span>
                </span>
                {effectiveRate && (
                  <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 flex items-center gap-1 normal-case tracking-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tasa: 1$ = {parseFloat(effectiveRate).toFixed(2)} Bs
                  </span>
                )}
              </label>
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* USD Input Group */}
                <div className="relative group/input flex items-center bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-red-500 dark:focus-within:border-red-500 transition-all shadow-sm">
                  <div className="flex items-center gap-1 pl-3 pr-2 border-r border-slate-100 dark:border-slate-750 select-none">
                    <span className="text-emerald-500 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">USD</span>
                    <span className="text-emerald-500 font-black text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={priceUsd}
                    onChange={(e) => handlePriceUsdChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent p-3 font-black text-slate-800 dark:text-white outline-none text-[15px] placeholder:text-slate-300"
                  />
                </div>

                {/* Bs Input Group */}
                <div className="relative group/input flex items-center bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-all shadow-sm">
                  <div className="flex items-center gap-1 pl-3 pr-2 border-r border-slate-100 dark:border-slate-750 select-none">
                    <span className="text-indigo-500 font-extrabold text-[10px] bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">VES</span>
                    <span className="text-indigo-500 font-black text-xs">Bs</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={priceBs}
                    onChange={(e) => handlePriceBsChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent p-3 font-black text-slate-800 dark:text-white outline-none text-[15px] placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Production Costs */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <DollarSign size={10} /> Costo de producción (Opcional)
              </span>
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* Cost USD Input */}
                <div className="relative group/input flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-slate-400 dark:focus-within:border-slate-650 transition-all shadow-sm">
                  <div className="flex items-center gap-1 pl-3 pr-2 border-r border-slate-100 dark:border-slate-750 select-none">
                    <span className="text-slate-500 font-extrabold text-[10px] bg-slate-105 dark:bg-slate-700 px-1.5 py-0.5 rounded">USD</span>
                    <span className="text-slate-400 font-bold text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={costUsd}
                    onChange={(e) => handleCostUsdChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent px-3 py-2.5 font-bold text-slate-750 dark:text-white outline-none text-sm placeholder:text-slate-350"
                  />
                </div>

                {/* Cost Bs Input */}
                <div className="relative group/input flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-slate-400 dark:focus-within:border-slate-650 transition-all shadow-sm">
                  <div className="flex items-center gap-1 pl-3 pr-2 border-r border-slate-100 dark:border-slate-750 select-none">
                    <span className="text-slate-500 font-extrabold text-[10px] bg-slate-105 dark:bg-slate-700 px-1.5 py-0.5 rounded">VES</span>
                    <span className="text-slate-400 font-bold text-xs">Bs</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={costBs}
                    onChange={(e) => handleCostBsChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent px-3 py-2.5 font-bold text-slate-750 dark:text-white outline-none text-sm placeholder:text-slate-350"
                  />
                </div>
              </div>

              {/* Visual Net Margin Dashboard */}
              {parsedCost > 0 && marginPct !== null ? (
                <div className={`p-3.5 rounded-xl border ${marginBgClass} flex items-center justify-between transition-all duration-300`}>
                  <div className="space-y-0.5 text-left">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Estructura de Margen
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-white dark:bg-slate-800 shadow-sm ${marginColorClass}`}>
                        {marginLabel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-black ${marginColorClass}`}>
                      +{marginPct.toFixed(0)}%
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Ganancia: +${profit.toFixed(2)} USD
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center select-none">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 leading-relaxed">
                    Ingresa el costo para calcular automáticamente el margen de ganancia neta.
                  </p>
                </div>
              )}
            </div>

            {/* Toggle Sizes Switch redesigned as premium clickable cards */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 block uppercase tracking-widest text-left">
                Formato de Presentación
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Tamaño Único Card */}
                <button
                  type="button"
                  onClick={() => setHasSizes(false)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                    !hasSizes
                      ? "bg-red-500/5 dark:bg-red-500/10 border-red-500 text-red-500 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-650"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <ChefHat size={18} className={!hasSizes ? "text-red-500" : "text-slate-405 dark:text-slate-500"} />
                    {!hasSizes && (
                      <div className="w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <Check size={9} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-black block ${!hasSizes ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                    Tamaño Único
                  </span>
                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 leading-snug">
                    Un solo tamaño y precio estándar.
                  </p>
                </button>

                {/* Varios Tamaños Card */}
                <button
                  type="button"
                  onClick={() => setHasSizes(true)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                    hasSizes
                      ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-650"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Layers size={18} className={hasSizes ? "text-amber-500" : "text-slate-405 dark:text-slate-500"} />
                    {hasSizes && (
                      <div className="w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center">
                        <Check size={9} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-black block ${hasSizes ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                    Varios Tamaños
                  </span>
                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 leading-snug">
                    Porciones diferentes con precios propios.
                  </p>
                </button>
              </div>

              {hasSizes && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[9.5px] font-black text-amber-700 dark:text-amber-500 mb-1.5 block uppercase tracking-wider text-left">
                    Nombre del tamaño principal/base
                  </label>
                  <input
                    type="text"
                    value={baseSizeName}
                    onChange={(e) => setBaseSizeName(e.target.value)}
                    placeholder="Ej: Normal, Sencilla, Regular"
                    className="w-full bg-white dark:bg-slate-800 border-2 border-amber-250 dark:border-amber-900/20 p-2.5 rounded-xl font-bold text-slate-850 dark:text-white outline-none focus:border-amber-500 text-xs capitalize transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 3: CUSTOMIZATION (SIZES & EXTRAS) ─── */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Sizes section (only if enabled) */}
            {hasSizes ? (
              <div className="border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 bg-amber-500/[0.01] space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/20 pb-2">
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers size={13} className="text-amber-500" /> Tamaños y Porciones adicionales
                  </span>
                  {(sizes || []).length > 0 &&
                    <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-black">
                      {(sizes || []).length} Adicionales
                    </span>
                  }
                </div>
                
                <p className="text-[9.5px] text-slate-400 dark:text-slate-550 leading-normal text-left">
                  Configura otras versiones de este plato. El precio que ingreses reemplazará el precio base.
                </p>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {/* Base size preview (Read-Only) */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors group">
                    <div className="flex items-center gap-2">
                      <ChefHat size={14} className="text-amber-500 animate-pulse" />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 capitalize">
                        {baseSizeName || "Normal"}
                      </span>
                      <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        Principal
                      </span>
                    </div>
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                      ${parsedPrice.toFixed(2)} USD
                    </span>
                  </div>

                  {(sizes || []).map((s, index) => (
                    <div
                      key={s.id || s.name || index}
                      className="flex items-center justify-between bg-white dark:bg-slate-805 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all animate-in fade-in duration-200"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350 capitalize truncate">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-amber-500 dark:text-amber-450">
                          ${parseFloat(s.priceUsdt || s.priceUsd || s.price || 0).toFixed(2)} USD
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(s.id)}
                          className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form to add Size */}
                <div className="flex gap-2.5 bg-white dark:bg-slate-850 p-2 rounded-xl border border-slate-200 dark:border-slate-750">
                  <input
                    value={newSizeName}
                    onChange={(e) => setNewSizeName(e.target.value)}
                    placeholder="Nombre: Mediano, Familiar..."
                    className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs font-bold text-slate-750 dark:text-white outline-none capitalize"
                  />
                  <div className="relative w-24 shrink-0 flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-2 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-450 font-bold">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={newSizePrice}
                      onChange={(e) => setNewSizePrice(e.target.value)}
                      placeholder="Precio"
                      className="w-full bg-transparent px-1.5 py-1.5 text-xs font-black text-slate-755 dark:text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-indigo-100/10 dark:from-indigo-950/10 dark:to-slate-900/50 border-2 border-dashed border-indigo-100 dark:border-indigo-950/40 rounded-2xl text-center space-y-2 select-none">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="text-xs font-black text-indigo-950 dark:text-indigo-350 block">
                    Producto con tamaño único
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-1 max-w-[270px] mx-auto leading-normal">
                    Este plato se venderá con un formato estándar de precio fijo. Si requieres porciones diferentes, regresa a Precios y selecciona <strong>Varios Tamaños</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Extras Section */}
            <div className="border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 bg-emerald-500/[0.01] space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/20 pb-2">
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Cherry size={13} className="text-emerald-500" /> Extras y Adicionales
                </span>
                {(extras || []).length > 0 &&
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black">
                    {(extras || []).length} Agregados
                  </span>
                }
              </div>
              
              <p className="text-[9.5px] text-slate-405 dark:text-slate-500 leading-normal text-left">
                Permite al cliente agregar ingredientes o extras pagando un valor adicional (ej. Papas, Queso, Tocino).
              </p>

              {(extras || []).length > 0 &&
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {(extras || []).map((e, index) => (
                    <div
                      key={e.id || e.name || index}
                      className="flex items-center justify-between bg-white dark:bg-slate-805 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 transition-all animate-in fade-in duration-200"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350 capitalize truncate">
                        {e.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-emerald-500 dark:text-emerald-450">
                          +${parseFloat(e.priceUsdt || e.priceUsd || e.price || 0).toFixed(2)} USD
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtra(e.id)}
                          className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              }

              {/* Form to add Extra */}
              <div className="flex gap-2.5 bg-white dark:bg-slate-850 p-2 rounded-xl border border-slate-200 dark:border-slate-750">
                <input
                  value={newExtraName}
                  onChange={(e) => setNewExtraName(e.target.value)}
                  placeholder="Ej: Extra Tocino, Huevo..."
                  className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs font-bold text-slate-750 dark:text-white outline-none capitalize"
                />
                <div className="relative w-24 shrink-0 flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-2 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-450 font-bold">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newExtraPrice}
                    onChange={(e) => setNewExtraPrice(e.target.value)}
                    placeholder="Precio"
                    className="w-full bg-transparent px-1.5 py-1.5 text-xs font-black text-slate-755 dark:text-white outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddExtra}
                  className="px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── NAVIGATION BUTTONS ─── */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <ChevronLeft size={16} /> Atrás
            </button>
          ) : (
            <div className="flex-1" /> // Spacer
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={
                (step === 1 && !isStep1Valid) ||
                (step === 2 && !isStep2Valid)
              }
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={onSaveClick}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3.5 rounded-xl font-black uppercase tracking-wider shadow-lg shadow-red-500/20 active:scale-[0.97] transition-all text-xs flex items-center justify-center gap-2"
            >
              {isEditing ? (
                <>
                  <Pencil size={15} /> Actualizar Plato
                </>
              ) : (
                <>
                  <Save size={15} /> Guardar Plato
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
