# Restaurant Isolation & Direct Dining Consumption Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Isolate dining table tabs from the cashier's Punto de Venta view and cart state until checkout, allowing waiters to add/modify consumption directly within `TableDetailsModal`.

**Architecture:** Filter out table tabs from the open tabs drawer in `SalesView.jsx`. Expand `TableDetailsModal.jsx` to manage its own "Consumo Actual" and "Añadir Productos" tabs, updating the storage directly via a callback.

**Tech Stack:** React, Tailwind CSS, Lucide React, Zustand.

---

### Task 1: Modify `SalesView.jsx` to isolate tables and configure callbacks

**Files:**
- Modify: `src/views/SalesView.jsx`

**Step 1: Update `handleConfirmOpenTable` to stay on Mesas view**
```javascript
  const handleConfirmOpenTable = ({ guests, clientName, notes }) => {
    if (!tableForOpenModal) return;
    const { usuarioActivo } = useAuthStore.getState();
    const activeWaiter = usuarioActivo?.nombre || "Cajero";

    setCart([]);
    setCartCustomerName(clientName);

    const newTab = addTab(clientName, [], {
      tableId: tableForOpenModal.id,
      waiter: activeWaiter,
      guests: guests,
      notes: notes,
    });

    setActiveTabId(newTab.id);
    // Stay in mesas, do not navigate to POS
    showToast(`Mesa ${tableForOpenModal.name} abierta con éxito.`, "success");
    setTableForOpenModal(null);
  };
```

**Step 2: Filter open tabs drawer in the JSX**
```jsx
          {/* Open Tabs Drawer (Horizontally scrollable panel above the cart) */}
          <OpenTabsPanel
            openTabs={openTabs.filter(t => !t.customerInfo?.tableId)}
            onSelectTab={handleSelectOpenTab}
            onRemoveTab={handleRemoveOpenTab}
            triggerHaptic={triggerHaptic}
          />
```

**Step 3: Pass `products` and `onUpdateTabItems` to `TableDetailsModal`**
```jsx
      {/* Table Details Modal */}
      {selectedTableForDetails && (
        <TableDetailsModal
          isOpen={!!selectedTableForDetails}
          onClose={() => setSelectedTableForDetails(null)}
          table={selectedTableForDetails}
          tab={openTabs.find(
            (t) =>
              t.customerInfo?.tableId === selectedTableForDetails.id ||
              t.name === selectedTableForDetails.name
          )}
          effectiveRate={effectiveRate}
          products={products}
          onUpdateTabItems={(tabId, newItems) => {
            updateTab(tabId, newItems);
            // If the active cashier cart is this tab, sync it too
            if (activeTabId === tabId) {
              setCart(newItems);
            }
          }}
          onAddProducts={() =>
            handleDetailsAddProducts(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          onPrintPrecuenta={() => {
            const tab = openTabs.find(
              (t) =>
                t.customerInfo?.tableId === selectedTableForDetails.id ||
                t.name === selectedTableForDetails.name
            );
            if (tab) {
              printPrecuenta(tab, effectiveRate);
            }
          }}
          onCheckout={() =>
            handleDetailsCheckout(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          onReleaseTable={() =>
            handleDetailsReleaseTable(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          triggerHaptic={triggerHaptic}
        />
      )}
```

**Step 4: Commit changes**
```bash
git add src/views/SalesView.jsx
git commit -m "feat: isolate dining tables from Punto de Venta cart view"
```

---

### Task 2: Redesign `TableDetailsModal.jsx` to support direct ordering

**Files:**
- Modify: `src/components/Sales/TableDetailsModal.jsx`

**Step 1: Add tabs state and product search/addition logic inside `TableDetailsModal.jsx`**
Update component to display:
- Tab selectors: **Consumo Actual** and **Añadir Productos**.
- Product Category chips: Todos, Hamburguesas, Bebidas, etc.
- Search input.
- Click product to add to `tab.items`.
- Adjust quantity (`+` / `-`) and delete buttons inline inside "Consumo Actual".

**Step 2: Commit changes**
```bash
git add src/components/Sales/TableDetailsModal.jsx
git commit -m "feat: add direct ordering and item edit inline in TableDetailsModal"
```

---

### Task 3: Verify and Build

**Step 1: Verify compilation**
- Run: `npm run build`
- Expected: Unified build completes successfully.
