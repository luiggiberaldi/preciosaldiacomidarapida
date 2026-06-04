import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Utensils, GlassWater, Armchair, Clock, User, Sparkles } from "lucide-react";

export default function TablesFloorPlan({
  tables,
  openTabs,
  activeTabId,
  onSelectTable,
  onAddTable,
  onRemoveTable,
  effectiveRate,
  triggerHaptic,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'occupied' | 'free'
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for new table
  const [newTableName, setNewTableName] = useState("");
  const [newTableZone, setNewTableZone] = useState("Salón");
  const [newTableType, setNewTableType] = useState("table");

  // Timer to refresh elapsed time
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getTableTab = (table) => {
    return openTabs.find(
      (tab) => tab.customerInfo?.tableId === table.id || tab.name.toLowerCase() === table.name.toLowerCase()
    );
  };

  const getElapsedTimeStr = (createdAt) => {
    if (!createdAt) return "";
    const diffMs = now - new Date(createdAt);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Recién";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHrs = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHrs}h ${remainingMins}m`;
  };

  // Group tables by zone
  const zones = [...new Set(tables.map((t) => t.zone || "Otros"))];

  // Filtering logic
  const getFilteredTables = (zoneTables) => {
    return zoneTables.filter((table) => {
      const tab = getTableTab(table);
      const isOccupied = !!tab;

      if (filter === "occupied") return isOccupied;
      if (filter === "free") return !isOccupied;
      return true;
    });
  };

  const handleTableClick = (table, isOccupied) => {
    if (isEditing) return;
    triggerHaptic && triggerHaptic();
    onSelectTable(table, isOccupied);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    triggerHaptic && triggerHaptic();
    onAddTable({
      id: `mesa_${Date.now()}`,
      name: newTableName.trim(),
      zone: newTableZone,
      type: newTableType,
    });

    setNewTableName("");
    setShowAddForm(false);
  };

  const renderTableIcon = (type, size = 14, className = "") => {
    switch (type) {
      case "bar":
        return <GlassWater size={size} className={className} />;
      case "lounge":
        return <Armchair size={size} className={className} />;
      default:
        return <Utensils size={size} className={className} />;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-1 sm:p-2 select-none">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm">
        {/* Filters */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "occupied", label: "Ocupadas" },
            { id: "free", label: "Libres" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                triggerHaptic && triggerHaptic();
                setFilter(btn.id);
              }}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === btn.id
                  ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Edit Button / Add Button */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              triggerHaptic && triggerHaptic();
              setIsEditing(!isEditing);
              if (showAddForm) setShowAddForm(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-black rounded-xl border transition-all ${
              isEditing
                ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            {isEditing ? "Finalizar Edición" : "⚙️ Configurar Distribución"}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                triggerHaptic && triggerHaptic();
                setShowAddForm(true);
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Plus size={14} /> Agregar Asiento
            </button>
          )}
        </div>
      </div>

      {/* Add Table Drawer / Overlay Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mb-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-dashed border-red-200 dark:border-red-900/50 space-y-3 animate-in slide-in-from-top duration-200"
        >
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase text-red-600 dark:text-red-400 tracking-wider">
              Registrar Mesa o Asiento
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Identificador / Nombre *
              </label>
              <input
                autoFocus
                type="text"
                required
                placeholder="Ej. Mesa 13, Barra 5"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Zona
              </label>
              <select
                value={newTableZone}
                onChange={(e) => setNewTableZone(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value="Salón">Salón</option>
                <option value="Terraza">Terraza</option>
                <option value="Barra">Barra</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tipo de Asiento
              </label>
              <select
                value={newTableType}
                onChange={(e) => setNewTableType(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value="table">Mesa 🍽️</option>
                <option value="bar">Barra 🍻</option>
                <option value="lounge">Sofá/Lounge 🛋️</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Grid of Zones and Tables */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-0.5 scrollbar-thin">
        {zones.map((zone) => {
          const zoneTables = tables.filter((t) => (t.zone || "Otros") === zone);
          const filteredZoneTables = getFilteredTables(zoneTables);

          if (filteredZoneTables.length === 0) return null;

          return (
            <div key={zone} className="space-y-3">
              {/* Zone Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm" />
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {zone} ({filteredZoneTables.length})
                </h3>
              </div>

              {/* Table Cards Grid (Copying the Pool card aspect ratio and design) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {filteredZoneTables.map((table) => {
                  const tab = getTableTab(table);
                  const isOccupied = !!tab;
                  const isCurrentTab = tab && tab.id === activeTabId;

                  // Tab details if occupied
                  const totalUsd = isOccupied
                    ? tab.items.reduce(
                        (s, i) =>
                          s + (i.priceUsdt || i.priceUsd || i.price || 0) * i.qty,
                        0
                      )
                    : 0;
                  const totalBs = totalUsd * effectiveRate;
                  const itemCount = isOccupied
                    ? tab.items.reduce((s, i) => s + (i.isWeight ? 1 : i.qty), 0)
                    : 0;

                  // Check if customer name is custom (not just Table X)
                  const hasCustomCustomer = isOccupied && tab.name.toLowerCase() !== table.name.toLowerCase();

                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableClick(table, isOccupied)}
                      className={`relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 shadow-sm border-2 overflow-hidden transition-all duration-300 aspect-[1.1] ${
                        isEditing
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 cursor-default"
                          : isCurrentTab
                          ? "bg-gradient-to-br from-red-600 to-orange-500 border-transparent shadow-lg text-white scale-[1.03] ring-4 ring-red-500/20 cursor-pointer"
                          : isOccupied
                          ? "bg-gradient-to-br from-red-500/90 to-orange-500/95 border-transparent shadow-md text-white hover:scale-[1.01] hover:shadow-lg transition-transform cursor-pointer"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-700 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer active:scale-95"
                      }`}
                    >
                      {/* Top Row: Table Name & Status Badge */}
                      <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`p-1 rounded-md shrink-0 ${
                              isOccupied
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {renderTableIcon(table.type, 12)}
                          </span>
                          <h3
                            className={`text-sm sm:text-base font-black tracking-tight leading-none whitespace-nowrap truncate ${
                              isOccupied ? "text-white" : "text-slate-800 dark:text-white"
                            }`}
                          >
                            {table.name}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase shrink-0 ${
                            isOccupied
                              ? "bg-white/20 text-white backdrop-blur-md"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                          }`}
                        >
                          {isOccupied ? "OCUPADA" : "LIBRE"}
                        </div>
                      </div>

                      {/* Middle: Active order details / Elapsed timer */}
                      <div className="my-3 flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                        {isOccupied ? (
                          <>
                            {/* Waiter/Customer Name */}
                            <div className="flex flex-col gap-1 w-full text-[10px]">
                              {/* Cliente / Cuenta */}
                              <div className="flex items-center gap-1 font-black bg-white/10 px-1.5 py-0.5 rounded-md self-start truncate max-w-full">
                                <User size={10} className="shrink-0" />
                                <span className="truncate">
                                  {hasCustomCustomer ? tab.name : "Cliente"}
                                </span>
                              </div>

                              {/* Mesero */}
                              {tab.customerInfo?.waiter && (
                                <div className="flex items-center gap-1 font-bold opacity-90 truncate max-w-full text-red-50">
                                  <span>👤</span>
                                  <span className="truncate">{tab.customerInfo.waiter}</span>
                                </div>
                              )}

                              {/* Comensales */}
                              {tab.customerInfo?.guests && (
                                <div className="flex items-center gap-1 font-bold opacity-90 text-red-50">
                                  <span>👥</span>
                                  <span>
                                    {tab.customerInfo.guests} {tab.customerInfo.guests === 1 ? "persona" : "personas"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Food items counter */}
                            <div className="flex items-center gap-1 text-[10px] font-semibold opacity-90">
                              <span>🍔</span>
                              <span>
                                {itemCount} {itemCount === 1 ? "plato" : "platos"}
                              </span>
                            </div>

                            {/* Elapsed timer Display */}
                            <div className="flex items-center gap-1 text-[10px] font-black text-orange-100">
                              <Clock size={10} className="shrink-0" />
                              <span>{getElapsedTimeStr(tab.createdAt)}</span>
                            </div>

                            {/* Notes pill indicator if notes exist */}
                            {tab.customerInfo?.notes && (
                              <div className="text-[9px] font-semibold bg-amber-500/30 text-white rounded px-1.5 py-0.5 self-start truncate max-w-full" title={tab.customerInfo.notes}>
                                📝 {tab.customerInfo.notes}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                              Disponible
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Subtotal */}
                      <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-800/50 pt-2 shrink-0">
                        {isOccupied ? (
                          <div className="flex flex-col text-right w-full">
                            <span className="text-sm font-black text-white leading-none">
                              ${totalUsd.toFixed(2)}
                            </span>
                            <span className="text-[9px] font-bold text-red-100 leading-none mt-0.5">
                              {new Intl.NumberFormat("es-VE", {
                                maximumFractionDigits: 0,
                              }).format(totalBs)}{" "}
                              Bs
                            </span>
                          </div>
                        ) : (
                          <div className="w-full flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                              Capacidad: 2-4
                            </span>
                            <Sparkles size={10} className="text-slate-300 dark:text-slate-700" />
                          </div>
                        )}
                      </div>

                      {/* Delete Overlay Button in Edit Mode */}
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isOccupied) return;
                            triggerHaptic && triggerHaptic();
                            onRemoveTable(table.id);
                          }}
                          disabled={isOccupied}
                          className={`absolute -top-1 -right-1 p-1.5 rounded-full shadow-md text-white border transition-colors ${
                            isOccupied
                              ? "bg-slate-300 border-slate-400 opacity-50 cursor-not-allowed"
                              : "bg-red-500 border-red-600 hover:bg-red-600 active:scale-90"
                          }`}
                          title={isOccupied ? "Mesa ocupada, no se puede borrar" : "Eliminar Mesa"}
                        >
                          <Trash2 size={9} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
