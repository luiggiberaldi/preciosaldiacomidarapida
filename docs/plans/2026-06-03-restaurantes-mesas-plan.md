# Restaurant Tables Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a custom interactive flow to open, configure, and manage dining tables specifically tailored to fast-food/restaurant properties.

**Architecture:** Create an `OpenTableModal` component that pops up when a free table is clicked. Capture guest count, custom client name, notes, and assign the active operator (from `useAuthStore`) as the waiter. Update the table card grid and consumption detail modals to render this metadata.

**Tech Stack:** React, Lucide React, Zustand (`useAuthStore`), Tailwind CSS.

---

### Task 1: Create `OpenTableModal` component

**Files:**
- Create: `src/components/Sales/OpenTableModal.jsx`

**Step 1: Write code for `OpenTableModal.jsx`**

```jsx
import React, { useState } from "react";
import { X, Users, User, ClipboardList, Shield } from "lucide-react";

export default function OpenTableModal({
  isOpen,
  onClose,
  table,
  activeWaiter,
  onConfirm,
  triggerHaptic,
}) {
  const [guests, setGuests] = useState(2);
  const [clientName, setClientName] = useState(table?.name || "");
  const [notes, setNotes] = useState("");

  if (!isOpen || !table) return null;

  const guestOptions = [1, 2, 3, 4, 5, 6, 8];

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerHaptic && triggerHaptic();
    onConfirm({
      guests,
      clientName: clientName.trim() || table.name,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950/20">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              Ocupar {table.name}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">
              Configura los detalles de la mesa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-100 dark:border-slate-700/60 shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Guest Count Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Users size={12} /> Cantidad de Comensales
            </label>
            <div className="flex flex-wrap gap-2">
              {guestOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    triggerHaptic && triggerHaptic();
                    setGuests(opt);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                    guests === opt
                      ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {opt} {opt === 1 ? "persona" : "personas"}
                </button>
              ))}
            </div>
          </div>

          {/* Client Name Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <User size={12} /> Nombre de Cliente / Mesa
            </label>
            <input
              type="text"
              placeholder={`Ej. ${table.name} - Pérez`}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          {/* Waiter Display (Read-Only) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Shield size={12} /> Mesero Asignado
            </label>
            <div className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3.5 py-3 font-bold text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
              <span>👤</span>
              <span>{activeWaiter || "Usuario Activo"}</span>
              <span className="text-[9px] uppercase font-black bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-auto text-slate-400">
                Automático
              </span>
            </div>
          </div>

          {/* Observations/Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <ClipboardList size={12} /> Observaciones / Notas de Mesa
            </label>
            <textarea
              placeholder="Ej. Junto a la ventana, sin cebolla en las hamburguesas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            Abrir Mesa y Ordenar
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Commit new component**
```bash
git add src/components/Sales/OpenTableModal.jsx
git commit -m "feat: create OpenTableModal component"
```

---

### Task 2: Modify `TablesFloorPlan.jsx` to render Waiter, Guests, and Notes

**Files:**
- Modify: `src/components/Sales/TablesFloorPlan.jsx:253-378`

**Step 1: Replace active order details / middle card section in `TablesFloorPlan.jsx`**

```jsx
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
                              <div className="text-[9px] font-semibold bg-amber-500/30 text-white rounded px-1 py-0.5 self-start truncate max-w-full" title={tab.customerInfo.notes}>
                                📝 {tab.customerInfo.notes}
                              </div>
                            )}
                          </>
```

**Step 2: Commit modifications**
```bash
git add src/components/Sales/TablesFloorPlan.jsx
git commit -m "feat: show waiter, guests and notes on active Table Cards"
```

---

### Task 3: Modify `TableDetailsModal.jsx` to render metadata

**Files:**
- Modify: `src/components/Sales/TableDetailsModal.jsx:58-73`

**Step 1: Insert metadata details section in `TableDetailsModal.jsx`**

```jsx
        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
```

**Step 2: Commit modifications**
```bash
git add src/components/Sales/TableDetailsModal.jsx
git commit -m "feat: render table metadata in TableDetailsModal"
```

---

### Task 4: Integrate `OpenTableModal` and Hook active user in `SalesView.jsx`

**Files:**
- Modify: `src/views/SalesView.jsx`

**Step 1: Import imports & hook up states/handlers in `SalesView.jsx`**
- Import `useAuthStore` and `OpenTableModal`.
- Create state for opening table modal: `const [tableForOpenModal, setTableForOpenModal] = useState(null);`
- Modify `handleSelectTable` to open modal:
  ```javascript
  const handleSelectTable = (table, isOccupied) => {
    if (isOccupied) {
      setSelectedTableForDetails(table);
    } else {
      // Free table -> Open table opening wizard modal
      setTableForOpenModal(table);
    }
  };
  ```
- Implement `handleConfirmOpenTable`:
  ```javascript
  const handleConfirmOpenTable = ({ guests, clientName, notes }) => {
    if (!tableForOpenModal) return;
    const { usuarioActivo } = useAuthStore.getState();
    const activeWaiter = usuarioActivo?.nombre || "Cajero";
    
    // Clear cashier cart
    setCart([]);
    setCartCustomerName(clientName);
    
    const newTab = addTab(clientName, [], {
      tableId: tableForOpenModal.id,
      waiter: activeWaiter,
      guests: guests,
      notes: notes,
    });
    
    setActiveTabId(newTab.id);
    onNavigate("ventas");
    setSalesViewMode("products");
    showToast(`Mesa ${tableForOpenModal.name} abierta con éxito.`, "success");
    setTableForOpenModal(null);
  };
  ```
- Render `OpenTableModal` in the JSX:
  ```jsx
      {/* Open Table Modal */}
      {tableForOpenModal && (
        <OpenTableModal
          isOpen={!!tableForOpenModal}
          onClose={() => setTableForOpenModal(null)}
          table={tableForOpenModal}
          activeWaiter={useAuthStore((s) => s.usuarioActivo)?.nombre || "Cajero"}
          onConfirm={handleConfirmOpenTable}
          triggerHaptic={triggerHaptic}
        />
      )}
  ```

**Step 2: Commit integration**
```bash
git add src/views/SalesView.jsx
git commit -m "feat: integrate OpenTableModal in SalesView"
```

---

### Task 5: Verify build compiles cleanly

**Step 1: Build production bundle**
- Run: `npm run build`
- Expected: No errors, output directory created.
