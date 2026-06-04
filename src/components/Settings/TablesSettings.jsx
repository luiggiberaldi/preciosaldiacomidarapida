import React, { useState, useEffect } from "react";
import { Plus, Trash2, Utensils, GlassWater, Armchair, AlertTriangle, Check, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { showToast } from "../../components/Toast";
import { DEFAULT_TABLES } from "../../config/tablesConfig";
import ConfirmModal from "../ConfirmModal";

// Premium custom select component with rounded dropdown list
function CustomSelect({ value, onChange, options, placeholder = "Seleccionar..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 text-left transition-all"
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon && <selectedOption.icon size={13} className="shrink-0 text-slate-400" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1.5 duration-100">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                    isSelected
                      ? "text-red-500 bg-red-50/40 dark:bg-red-950/20"
                      : "text-slate-650 dark:text-slate-350"
                  }`}
                >
                  {opt.icon && <opt.icon size={13} className={`shrink-0 ${isSelected ? "text-red-500" : "text-slate-400"}`} />}
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function TablesSettings({ triggerHaptic }) {
  // 1. Activation State
  const [hasTablesSystem, setHasTablesSystem] = useState(() => {
    return localStorage.getItem("has_tables_system") !== "false";
  });

  // 2. Zones State
  const [zones, setZones] = useState(() => {
    try {
      const saved = localStorage.getItem("bodega_table_zones_v1");
      return saved ? JSON.parse(saved) : ["Salón", "Terraza", "Barra"];
    } catch {
      return ["Salón", "Terraza", "Barra"];
    }
  });

  // 3. Tables State
  const [tables, setTables] = useState(() => {
    try {
      const saved = localStorage.getItem("bodega_tables_v1");
      return saved ? JSON.parse(saved) : DEFAULT_TABLES;
    } catch {
      return DEFAULT_TABLES;
    }
  });

  // Confirmation modal states
  const [pendingDeleteZone, setPendingDeleteZone] = useState(null);
  const [pendingDeleteTable, setPendingDeleteTable] = useState(null);

  // Pagination states for Tables List
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Input states
  const [newZoneName, setNewZoneName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableZone, setNewTableZone] = useState("");
  const [newTableType, setNewTableType] = useState("table");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("has_tables_system", String(hasTablesSystem));
  }, [hasTablesSystem]);

  useEffect(() => {
    localStorage.setItem("bodega_table_zones_v1", JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem("bodega_tables_v1", JSON.stringify(tables));
  }, [tables]);

  // Set default selected zone when zones change
  useEffect(() => {
    if (zones.length > 0 && !newTableZone) {
      setNewTableZone(zones[0]);
    }
  }, [zones, newTableZone]);

  // Pagination bounds checking on data changes
  useEffect(() => {
    const totalPages = Math.ceil(tables.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [tables, currentPage]);

  // Handlers
  const handleToggleTables = () => {
    triggerHaptic?.();
    const nextVal = !hasTablesSystem;
    setHasTablesSystem(nextVal);
    showToast(
      nextVal ? "Módulo de Mesas activado con éxito" : "Módulo de Mesas desactivado",
      "success"
    );
  };

  const handleAddZone = (e) => {
    e.preventDefault();
    const name = newZoneName.trim();
    if (!name) return;

    if (zones.some((z) => z.toLowerCase() === name.toLowerCase())) {
      showToast("La zona ya existe", "error");
      return;
    }

    triggerHaptic?.();
    setZones((prev) => [...prev, name]);
    setNewZoneName("");
    showToast(`Zona "${name}" agregada`, "success");
  };

  const handleDeleteZone = (zoneName) => {
    // Check if zone contains tables
    const hasTables = tables.some((t) => t.zone === zoneName);
    if (hasTables) {
      showToast("No se puede eliminar: La zona contiene mesas activas", "error");
      return;
    }

    if (zones.length <= 1) {
      showToast("Debe haber al menos una zona activa", "error");
      return;
    }

    triggerHaptic?.();
    setPendingDeleteZone(zoneName);
  };

  const confirmDeleteZone = () => {
    if (!pendingDeleteZone) return;
    setZones((prev) => prev.filter((z) => z !== pendingDeleteZone));
    if (newTableZone === pendingDeleteZone) {
      setNewTableZone(zones.find((z) => z !== pendingDeleteZone) || "");
    }
    showToast(`Zona "${pendingDeleteZone}" eliminada`, "info");
    setPendingDeleteZone(null);
  };

  const handleAddTable = (e) => {
    e.preventDefault();
    const name = newTableName.trim();
    if (!name) return;

    if (tables.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      showToast("Ya existe una mesa con ese identificador", "error");
      return;
    }

    if (!newTableZone) {
      showToast("Por favor, selecciona o crea una zona primero", "error");
      return;
    }

    triggerHaptic?.();
    const newTable = {
      id: `mesa_${Date.now()}`,
      name,
      zone: newTableZone,
      type: newTableType,
    };

    setTables((prev) => [...prev, newTable]);
    setNewTableName("");
    showToast(`"${name}" agregada exitosamente`, "success");
    
    // Jump to the page of the newly created table
    const nextTotalPages = Math.ceil((tables.length + 1) / itemsPerPage);
    setCurrentPage(nextTotalPages);
  };

  const handleDeleteTable = (tableId, tableName) => {
    triggerHaptic?.();
    setPendingDeleteTable({ id: tableId, name: tableName });
  };

  const confirmDeleteTable = () => {
    if (!pendingDeleteTable) return;
    setTables((prev) => prev.filter((t) => t.id !== pendingDeleteTable.id));
    showToast(`"${pendingDeleteTable.name}" eliminada`, "info");
    setPendingDeleteTable(null);
  };

  const renderTableIcon = (type, size = 16) => {
    switch (type) {
      case "bar":
        return <GlassWater size={size} className="text-blue-500" />;
      case "lounge":
        return <Armchair size={size} className="text-amber-500" />;
      default:
        return <Utensils size={size} className="text-red-500" />;
    }
  };

  const getTableTypeLabel = (type) => {
    switch (type) {
      case "bar":
        return "Barra";
      case "lounge":
        return "Sofá / Lounge";
      default:
        return "Mesa";
    }
  };

  // Pagination Helpers
  const totalPages = Math.ceil(tables.length / itemsPerPage);
  const paginatedTables = tables.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Dropdown Select Options Mapping
  const zoneOptions = zones.map((z) => ({ value: z, label: z }));
  const typeOptions = [
    { value: "table", label: "Mesa", icon: Utensils },
    { value: "bar", label: "Barra", icon: GlassWater },
    { value: "lounge", label: "Sofá / Lounge", icon: Armchair },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-black text-slate-800 dark:text-white">
          Configuración de Mesas y Asientos
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Controla la habilitación del panel de mesas, zonas y distribución de asientos en el salón.
        </p>
      </div>

      {/* SECTION A: Activation Toggle */}
      <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-3xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0">
            <Utensils size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Activar Módulo de Mesas (Meseros)
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Habilita la cuadrícula de distribución y asignación de comandas por mesas.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleTables}
          className={`relative w-14 h-8 rounded-full transition-all duration-300 flex items-center px-1 shadow-inner ${
            hasTablesSystem ? "bg-red-500" : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
              hasTablesSystem ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {hasTablesSystem ? (
              <Check size={14} className="text-red-500 font-black animate-in zoom-in" />
            ) : null}
          </div>
        </button>
      </div>

      {hasTablesSystem && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* SECTION B: Zone Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Zonas del Establecimiento
            </h3>

            {/* Add Zone Form */}
            <form onSubmit={handleAddZone} className="flex gap-2">
              <input
                type="text"
                placeholder="Ej. VIP, Patio, Balcón"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white dark:text-slate-200 text-xs font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Añadir
              </button>
            </form>

            {/* Zones List */}
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {zones.map((zone) => {
                const count = tables.filter((t) => t.zone === zone).length;
                return (
                  <div
                    key={zone}
                    className="flex justify-between items-center p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{zone}</span>
                      <span className="ml-2 text-[10px] text-slate-400 font-medium">({count} {count === 1 ? "asiento" : "asientos"})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteZone(zone)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                      title="Eliminar zona"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION C: Tables Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Mesas y Distribución
            </h3>

            {/* Add Table Form */}
            <form onSubmit={handleAddTable} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej. Mesa 12"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20"
                />
                
                <CustomSelect
                  value={newTableZone}
                  onChange={setNewTableZone}
                  options={zoneOptions}
                  placeholder="Zona"
                />

                <CustomSelect
                  value={newTableType}
                  onChange={setNewTableType}
                  options={typeOptions}
                  placeholder="Tipo"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl active:scale-[0.99] transition-transform flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Registrar Mesa / Asiento
              </button>
            </form>

            {/* Tables List (Paginated) */}
            <div className="space-y-1.5 min-h-[220px]">
              {paginatedTables.map((table) => (
                <div
                  key={table.id}
                  className="flex justify-between items-center p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm shrink-0">
                      {renderTableIcon(table.type, 14)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{table.name}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                        Zona: {table.zone} · Tipo: {getTableTypeLabel(table.type)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table.id, table.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all shrink-0"
                    title="Eliminar mesa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {tables.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <AlertTriangle size={24} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs text-slate-400 font-medium">No hay mesas registradas</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => {
                    triggerHaptic?.();
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    triggerHaptic?.();
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!pendingDeleteZone}
        onClose={() => setPendingDeleteZone(null)}
        onConfirm={confirmDeleteZone}
        title={`¿Eliminar zona "${pendingDeleteZone}"?`}
        message="Se eliminará la zona de la lista permanentemente. Esta acción no se puede deshacer."
        confirmText="Sí, eliminar zona"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!pendingDeleteTable}
        onClose={() => setPendingDeleteTable(null)}
        onConfirm={confirmDeleteTable}
        title={`¿Eliminar "${pendingDeleteTable?.name}"?`}
        message="Se borrará permanentemente de la distribución del plano del POS. Esta acción no se puede deshacer."
        confirmText="Sí, eliminar mesa"
        variant="danger"
      />
    </div>
  );
}
